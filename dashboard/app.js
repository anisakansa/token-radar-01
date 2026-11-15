// Token Radar's page: a static board, no network. It reads window.RADAR (written by
// main.ts from the same board the gate scores), renders the ranked pre-token board,
// the live-token set it is measured against, and a detail view for every protocol
// with the model's working and an eight-step farm plan.
//
// The value model, in one place so the page and the program cannot drift:
//   implied = TVL x multiple x growth x maturity
//   multiple = category median (live mcap/TVL, 3+ comparables, else the overall
//              median 0.205), clamped to [0.05, 1.00], times 1 + 0.02 per extra
//              chain (max 1.10)
//   growth   = 1 + half the seven-day change, clamped to [-60%, +120%]
//   maturity = 0.60 new, rising to 1.00 at three years with no token
// The farm plan is generated in lib/model.ts and carried in the row; this page
// only renders it, so the screenshots and the board can never disagree.

(function () {
  'use strict';
  var DATA = window.RADAR;
  if (!DATA) { document.body.textContent = 'Token Radar: no data (data.js missing).'; return; }

  var $ = function (id) { return document.getElementById(id); };

  function money(n) {
    if (n === null || n === undefined) return '—';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(n >= 1e11 ? 0 : 2).replace(/\.00$/, '') + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(n >= 1e8 ? 0 : 1).replace(/\.0$/, '') + 'M';
    if (n >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return '$' + Math.round(n).toLocaleString('en-US');
  }
  function moneyFull(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function pct(n) {
    if (n === null || n === undefined) return '—';
    return (n > 0 ? '+' : '') + n.toFixed(1) + '%';
  }
  function age(n) {
    if (n === null || n === undefined) return '—';
    if (n >= 365) return (n / 365).toFixed(1).replace(/\.0$/, '') + 'y';
    return n + 'd';
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ---- Header, lede, facts -------------------------------------------------
  $('top-meta').innerHTML =
    '<span>Snapshot ' + esc(DATA.as_of) + '</span>' +
    '<span>' + DATA.protocol_total + ' protocols in the snapshot</span>' +
    '<span>Static page · no network</span>';
  var setAside = DATA.protocol_total - DATA.rows.length;

  var belowFloor = DATA.rows.filter(function (r) { return r.tvl_usd < DATA.floor_usd; }).length;
  $('lede-text').textContent =
    DATA.rows.length + ' protocols that record no token yet, ranked by an implied launch value. ' +
    'The multiple for each category comes from the protocols in that category whose token already trades — ' +
    'the market\u2019s own pricing, read off this snapshot — not from a list of names. ' +
    'Every row carries an eight-step farm plan, sized to the protocol.';
  $('record-note').textContent =
    'A protocol \u201Crecords no token\u201D when the snapshot lists no market cap, no CoinGecko id and no symbol for it. ' +
    'That is the record, not proof it has none.';

  $('facts').innerHTML =
    fact('Rows on the board', String(DATA.rows.length)) +
    fact('On the watchlist', DATA.watchlist_size + ' · all ranked') +
    fact('Below the $50M floor', belowFloor + ' ranked too') +
    fact('Live-token protocols set aside', String(DATA.live_total)) +
    fact('Overall median mcap / TVL', DATA.overall_median.toFixed(3)) +
    fact('Largest implied value', money(DATA.rows[0].value_model.implied_usd));
  function fact(label, value) {
    return '<div><dt>' + esc(label) + '</dt><dd>' + esc(value) + '</dd></div>';
  }

  // ---- Model panel ---------------------------------------------------------
  $('model-formula').textContent = 'implied value = TVL × multiple × growth × maturity';
  $('model-explain').textContent =
    'multiple — the category\u2019s median market-cap / TVL among its live protocols (three or more comparables, ' +
    'otherwise the overall median ' + DATA.overall_median.toFixed(3) + '), clamped to [0.05, 1.00], times 1 + 0.02 per extra chain (max 1.10). ' +
    'growth — 1 + half the seven-day change, clamped to [−60%, +120%]. ' +
    'maturity — 0.60 for a new protocol, rising to 1.00 at three years with no token; an unknown listing date counts as one year.';
  $('cal-note').textContent =
    'Multiple used is the median clamped to [0.05, 1.00]; categories with fewer than three live comparables use the overall median. ' +
    'Bridges and liquid-staking tokens price far above or below their TVL, which is why the clamp matters.';
  $('cal-table').querySelector('tbody').innerHTML = DATA.calibration.map(function (c) {
    return '<tr><td>' + esc(c.category) + '</td><td class="num">' + c.live_n + '</td>' +
      '<td class="num">' + c.median.toFixed(3) + '</td><td class="used">' + c.used.toFixed(3) + '</td></tr>';
  }).join('');
  $('model-excl').textContent =
    'Set aside, not ranked: ' + setAside + ' protocols — wrapped, staked and bridged products, exchange-branded ' +
    'forks and versioned copies. They are transfers of a token that already trades, not a launch of their own, ' +
    'so ranking them would put WBTC and staked ETH at the top of a board about launches that have not happened yet.';

  // ---- Filters ---------------------------------------------------------------
  var state = { q: '', category: '', chain: '', watchlist: false, tab: 'early', sort: 'rank', dir: 1 };
  var categories = Array.from(new Set(DATA.rows.map(function (r) { return r.category || '(none)'; }))).sort();
  var chains = Array.from(new Set(DATA.rows.flatMap(function (r) { return r.chains; }))).sort();
  $('category').innerHTML = '<option value="">All categories</option>' + categories.map(function (c) {
    return '<option value="' + esc(c) + '">' + esc(c) + '</option>';
  }).join('');
  $('chain').innerHTML = '<option value="">All chains</option>' + chains.map(function (c) {
    return '<option value="' + esc(c) + '">' + esc(c) + '</option>';
  }).join('');

  $('q').addEventListener('input', function () { state.q = this.value.trim().toLowerCase(); render(); });
  $('category').addEventListener('change', function () { state.category = this.value; render(); });
  $('chain').addEventListener('change', function () { state.chain = this.value; render(); });
  $('watchlist-only').addEventListener('change', function () { state.watchlist = this.checked; render(); });
  $('tab-early').addEventListener('click', function () { state.tab = 'early'; render(); });
  $('tab-live').addEventListener('click', function () { state.tab = 'live'; render(); });

  document.querySelectorAll('.sort').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var key = btn.getAttribute('data-sort');
      if (state.sort === key) state.dir = -state.dir; else { state.sort = key; state.dir = 1; }
      render();
    });
  });

  function filtered() {
    return DATA.rows.filter(function (r) {
      if (state.watchlist && !r.is_watchlist) return false;
      if (state.category && (r.category || '(none)') !== state.category) return false;
      if (state.chain && r.chains.indexOf(state.chain) === -1) return false;
      if (state.q && (r.name + ' ' + r.slug + ' ' + (r.category || '')).toLowerCase().indexOf(state.q) === -1) return false;
      return true;
    });
  }

  function sortRows(rows) {
    var key = state.sort;
    var dir = state.dir;
    function val(r) {
      switch (key) {
        case 'rank': return r.rank;
        case 'name': return r.name.toLowerCase();
        case 'category': return (r.category || '').toLowerCase();
        case 'chains': return (r.chains[0] || '').toLowerCase();
        case 'tvl_usd': return r.tvl_usd;
        case 'change_7d': return r.change_7d === null ? -Infinity : r.change_7d;
        case 'age_days': return r.age_days === null ? -Infinity : r.age_days;
        case 'implied_usd': return r.value_model.implied_usd;
        default: return r.rank;
      }
    }
    return rows.slice().sort(function (a, b) {
      var va = val(a), vb = val(b);
      if (va < vb) return -dir;
      if (va > vb) return dir;
      return a.rank - b.rank;
    });
  }

  function rowHtml(r) {
    var change = r.change_7d === null ? '<span>—</span>' : '<span class="' + (r.change_7d < 0 ? 'neg' : 'pos') + '">' + pct(r.change_7d) + '</span>';
    return '<tr>' +
      '<td class="num">' + r.rank + '</td>' +
      '<td><span class="name-cell">' + esc(r.name) + '<span class="slug">' + esc(r.slug) + '</span></span>' +
      (r.is_watchlist ? '<span class="badge">WATCHLIST</span>' : '') + '</td>' +
      '<td>' + esc(r.category || '—') + '</td>' +
      '<td>' + esc(r.chains.slice(0, 3).join(', ')) + (r.chains.length > 3 ? ' +' + (r.chains.length - 3) : '') + '</td>' +
      '<td class="num">' + money(r.tvl_usd) + '</td>' +
      '<td class="num">' + change + '</td>' +
      '<td class="num">' + age(r.age_days) + '</td>' +
      '<td class="num">' + money(r.value_model.implied_usd) + '</td>' +
      '<td><button class="rowlink" data-slug="' + esc(r.slug) + '">Detail</button></td>' +
      '</tr>';
  }

  function liveHtml(r, i) {
    var change = r.change_7d === null ? '<span>—</span>' : '<span class="' + (r.change_7d < 0 ? 'neg' : 'pos') + '">' + pct(r.change_7d) + '</span>';
    return '<tr>' +
      '<td class="num">' + (i + 1) + '</td>' +
      '<td><span class="name-cell">' + esc(r.name) + '<span class="slug">' + esc(r.slug) + '</span></span></td>' +
      '<td>' + esc(r.category || '—') + '</td>' +
      '<td>' + esc(r.chains.slice(0, 3).join(', ')) + (r.chains.length > 3 ? ' +' + (r.chains.length - 3) : '') + '</td>' +
      '<td class="num">' + money(r.tvl_usd) + '</td>' +
      '<td class="num">' + change + '</td>' +
      '<td class="num">live</td>' +
      '<td class="num">' + money(r.mcap_usd) + '</td>' +
      '<td></td>' +
      '</tr>';
  }

  function render() {
    $('tab-early').setAttribute('aria-selected', state.tab === 'early' ? 'true' : 'false');
    $('tab-live').setAttribute('aria-selected', state.tab === 'live' ? 'true' : 'false');
    document.querySelectorAll('.sort').forEach(function (btn) {
      btn.removeAttribute('aria-sort');
      if (btn.getAttribute('data-sort') === state.sort) {
        btn.setAttribute('aria-sort', state.dir === 1 ? 'ascending' : 'descending');
      }
    });
    var thead = document.querySelector('#board thead tr');
    if (state.tab === 'live') {
      thead.querySelector('[data-sort="age_days"]').textContent = 'Status';
      thead.querySelector('[data-sort="implied_usd"]').textContent = 'Market cap';
      $('rows').innerHTML = DATA.live.map(liveHtml).join('');
      $('count').textContent = DATA.live.length + ' live-token protocols, by market cap — the market\u2019s own values, not a model. They are set aside from the pre-token ranking.';
      $('empty').hidden = true;
    } else {
      thead.querySelector('[data-sort="age_days"]').textContent = 'Age';
      thead.querySelector('[data-sort="implied_usd"]').textContent = 'Implied value';
      var rows = sortRows(filtered());
      $('rows').innerHTML = rows.map(rowHtml).join('');
      $('count').textContent = rows.length + ' of ' + DATA.rows.length + ' pre-token protocols shown' +
        (state.watchlist ? ' · watchlist only' : '') +
        (state.category ? ' · ' + state.category : '') +
        (state.chain ? ' · ' + state.chain : '');
      $('empty').hidden = rows.length > 0;
    }
  }

  $('rows').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-slug]');
    if (btn) openDetail(btn.getAttribute('data-slug'));
  });

  // ---- Detail dialog ---------------------------------------------------------
  var dialog = $('detail');
  function openDetail(slug) {
    var r = DATA.rows.find(function (x) { return x.slug === slug; });
    if (!r) return;
    var m = r.value_model;
    $('detail-title').textContent = r.name + (r.is_watchlist ? ' · Watchlist' : '');
    var eq = moneyFull(r.tvl_usd) + ' × ' + m.multiple.toFixed(3) + ' × ' + m.growth.toFixed(3) + ' × ' + m.maturity.toFixed(3) +
      ' = ' + moneyFull(m.implied_usd);
    var breakdown = 'multiple ' + m.multiple.toFixed(3) + ' = category ' + m.cat_multiple.toFixed(3) +
      ' (' + m.cat_basis + ') × chain factor ' + m.chain_factor.toFixed(2);
    $('detail-body').innerHTML =
      '<p>' + esc(r.name) + ' records no token yet. ' + esc(r.category || 'Uncategorised') + ' · ' +
      esc(r.chains.join(', ')) + ' · TVL ' + moneyFull(r.tvl_usd) + ' · seven-day change ' + pct(r.change_7d) +
      ' · running ' + age(r.age_days) + ' with no token' + (r.age_days === null ? ' (listing date unknown, counted as one year)' : '') + '.' +
      (r.is_watchlist ? ' On the snapshot\u2019s watchlist.' : ' Below the watchlist floor or outside it, ranked on the same model.') + '</p>' +
      '<h3>The working</h3>' +
      '<div class="equation">' + esc(eq) + '</div>' +
      '<p>' + esc(breakdown) + '. Growth ' + m.growth.toFixed(3) + ' from a ' + pct(r.change_7d) + ' week; ' +
      'maturity ' + m.maturity.toFixed(3) + ' from ' + age(r.age_days) + ' with no token.</p>' +
      '<h3>Farm plan — eight steps</h3>' +
      '<ol class="steps">' + r.farm_detail.map(function (s) {
        return '<li><span>' + esc(s.text) + '</span><span class="cost"><b>' + esc(s.cost) + '</b>' + esc(s.time) + '</span></li>';
      }).join('') + '</ol>' +
      '<h3>What would change the rank</h3>' +
      '<p>A token listing takes the protocol off this board entirely. A sharp TVL move, a new chain, or a ' +
      'category multiple that shifts when its live comparables reprice would move the implied value — ' +
      're-run the program on a later snapshot and the same model re-ranks it.</p>';
    if (history.replaceState) history.replaceState(null, '', '#/' + r.slug);
    dialog.showModal();
  }
  $('detail-close').addEventListener('click', function () { dialog.close(); });
  dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', function () {
    if (history.replaceState) history.replaceState(null, '', '#');
  });

  render();
  if (location.hash.length > 2 && location.hash.slice(0, 2) === '#/') {
    openDetail(decodeURIComponent(location.hash.slice(2)));
  }

  $('foot-note').textContent =
    'Source: the sealed DefiLlama snapshot (' + esc(DATA.source_note) + '), as of ' + esc(DATA.as_of) + '. ' +
    'The board is a ranking of a frozen record, not investment advice; a protocol that records no token may still have one. ' +
    'No network, no tracking, no live data — re-run the program on a later snapshot to re-rank.';
})();
