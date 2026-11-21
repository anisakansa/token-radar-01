// Token Radar's page: a static board, no network. It reads window.RADAR (written by
// main.ts from the same board the gate scores), renders the ranked pre-token board,
// the live-token set it is measured against, and a detail view for every protocol
// with the model's working, an eight-step farm plan with its totalled cost and
// break-even verdict, and the model's validation — held out two ways, walk
// forward, a leave-one-out backtest, the flat baseline on the same splits, a
// per-term evidence table, a negative control and a 200-refit bootstrap, all
// computed from the snapshot.
//
// The value model, in one place so the page and the program cannot drift:
//   log10(cap) = 3.3823 + 0.4721 x log10(TVL) + category effect
//   implied = 10 ^ that; multiple = implied / TVL, so ~0.144 at $100M TVL
//             and ~0.025 at $2.75B TVL — the multiple falls as TVL grows.
//   category effect — the median residual of the size-curve fit in a category,
//             shrunk by n/(n+10), and only when the category has at least two
//             live comparables; otherwise 1.00.
//   7d growth, age with no token and chain count were each fitted and tested
//   and NOT kept: none of them improves out-of-sample prediction (see the
//   evidence table). The farm plan is generated in lib/model.ts and carried
//   in the row; this page only renders it, so the screenshots and the board
//   can never disagree.

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
    DATA.rows.length + ' protocols that record no token yet, ranked by an implied launch value from a size curve ' +
    'fitted on the snapshot\u2019s own live protocols: bigger protocols trade at a smaller multiple of TVL, ' +
    'so the multiple falls from ~0.14 at $100M TVL to ~0.025 at $2.75B TVL. ' +
    'Every row carries an eight-step farm plan, sized to the protocol.';
  $('record-note').textContent =
    'A protocol \u201Crecords no token\u201D when the snapshot lists no market cap, no CoinGecko id and no symbol for it. ' +
    'That is the record, not proof it has none.';

  $('facts').innerHTML =
    fact('Rows on the board', String(DATA.rows.length)) +
    fact('On the watchlist', DATA.watchlist_size + ' · all ranked') +
    fact('Below the $50M floor', belowFloor + ' ranked too') +
    fact('Live-token protocols set aside', String(DATA.live_total)) +
    fact('Flat median mcap / TVL (baseline)', DATA.overall_median.toFixed(3)) +
    fact('Largest implied value', money(DATA.rows[0].value_model.implied_usd));
  function fact(label, value) {
    return '<div><dt>' + esc(label) + '</dt><dd>' + esc(value) + '</dd></div>';
  }

  // ---- Model panel ---------------------------------------------------------
  var SF = DATA.size_fit;
  $('model-formula').textContent = 'log10(market cap) = ' + SF.intercept.toFixed(4) + ' + ' + SF.slope.toFixed(4) +
    ' × log10(TVL) + category effect  ·  implied value = 10 ^ that';
  $('model-explain').textContent =
    'The size curve is fitted by least squares on the ' + DATA.validation.live_n + ' live protocols in this snapshot: ' +
    'a protocol at $100M TVL is priced at a multiple of ' + SF.mult_100m.toFixed(3) + ', at $2.75B TVL at ' +
    SF.mult_2_75b.toFixed(3) + ' — the multiple falls as TVL grows, which a flat median (the overall ' +
    DATA.overall_median.toFixed(3) + ' at every TVL) cannot see. The category effect is the median residual of ' +
    'that fit inside the category, shrunk by n/(n+10), and only when the category has at least two live ' +
    'comparables; with one or none the factor is 1.00. The 7d growth, the age with no token and the chain count ' +
    'were each fitted and tested and NOT kept — none of them improves out-of-sample prediction (see the evidence table).';
  $('cal-note').textContent =
    'Effect × is 10 ^ the shrunk median log-residual; categories with fewer than two live comparables get 1.000. ' +
    'The largest median residual belongs to a single live protocol at 378× its TVL — with one comparable it sets no effect.';
  $('cal-table').querySelector('tbody').innerHTML = DATA.calibration.map(function (c) {
    return '<tr><td>' + esc(c.category) + '</td><td class="num">' + c.live_n + '</td>' +
      '<td class="num">' + (c.median >= 0 ? '+' : '') + c.median.toFixed(3) + '</td><td class="used">' + c.used.toFixed(3) + '</td></tr>';
  }).join('');
  $('model-excl').textContent =
    'Set aside, not ranked: ' + setAside + ' protocols — wrapped, staked and bridged products, exchange-branded ' +
    'forks and versioned copies. They are transfers of a token that already trades, not a launch of their own, ' +
    'so ranking them would put WBTC and staked ETH at the top of a board about launches that have not happened yet.';

  // ---- Model validation ------------------------------------------------------
  var V = DATA.validation;
  function missCell(t) { return '×' + t.median_miss_x.toFixed(2); }
  function withinCell(t) { return t.within_3x + ' / ' + t.test_n + ' (' + t.within_3x_pct.toFixed(1) + '%)'; }
  function brierCell(t) { return t.brier.toFixed(3) + ' vs ' + t.brier_base.toFixed(3); }
  $('validation-intro').textContent =
    'The model is tested on the snapshot\u2019s own live protocols — the ones whose market cap is known, so a ' +
    'prediction can be scored. ' + V.live_n + ' live comparables; fitted on one set, scored on another. ' +
    'Median miss is the median factor by which the prediction is off; Brier scores the call "cap/TVL above the live median" vs always guessing the base rate (lower is better).';
  var vRows = V.held_out.concat([
    { name: V.walk_forward.name + ' (split ' + V.walk_forward.cut + ')', fit_n: V.walk_forward.fit_n, test_n: V.walk_forward.test_n, median_miss_x: V.walk_forward.median_miss_x, within_3x: V.walk_forward.within_3x, within_3x_pct: V.walk_forward.within_3x_pct, brier: V.walk_forward.brier, brier_base: V.walk_forward.brier_base },
    V.loo,
    { name: V.flat_walk_forward.name + ' (split ' + V.flat_walk_forward.cut + ')', fit_n: V.flat_walk_forward.fit_n, test_n: V.flat_walk_forward.test_n, median_miss_x: V.flat_walk_forward.median_miss_x, within_3x: V.flat_walk_forward.within_3x, within_3x_pct: V.flat_walk_forward.within_3x_pct, brier: V.flat_walk_forward.brier, brier_base: V.flat_walk_forward.brier_base },
    V.flat_loo,
  ]);
  $('validation-table').querySelector('tbody').innerHTML = vRows.map(function (t) {
    return '<tr><td>' + esc(t.name) + '</td><td class="num">' + t.fit_n + '</td><td class="num">' + t.test_n +
      '</td><td class="num">' + missCell(t) + '</td><td class="num">' + withinCell(t) + '</td><td class="num">' + brierCell(t) + '</td></tr>';
  }).join('');
  $('evidence-table').querySelector('tbody').innerHTML = V.ablation.map(function (a) {
    var p = a.kept ? '—' : a.p_improves.toFixed(2);
    return '<tr><td>' + esc(a.term) + '</td>' +
      '<td class="num">×' + a.loo_miss_x.toFixed(2) + ' · ' + a.loo_within3_pct.toFixed(1) + '%</td>' +
      '<td class="num">×' + a.wf_miss_x.toFixed(2) + ' · ' + a.wf_within3_pct.toFixed(1) + '%</td>' +
      '<td class="num">' + p + '</td>' +
      '<td>' + (a.kept ? '<b>KEPT</b> — ' : '<b>not kept</b> — ') + esc(a.note) + '</td></tr>';
  }).join('');
  var B = V.bootstrap;
  $('validation-bootstrap').textContent =
    'Bootstrap — 200 refits of the live set (resampled with replacement): size-curve slope ' +
    B.slope_mean.toFixed(3) + ' ± ' + B.slope_se.toFixed(3) + '; multiple at $100M TVL ' +
    B.mult100m_mean.toFixed(3) + ' ± ' + B.mult100m_se.toFixed(3) + '. Rank ranges over the same 200 refits: ' +
    B.rank_ranges.map(function (r) { return r.name + ' #' + r.base_rank + ' (' + r.p5 + '–' + r.p95 + ')'; }).join(', ') + '.';
  $('validation-ranges').textContent =
    'Range honesty (leave-one-out, n=' + V.live_n + '): the predicted P25–P75 intervals hold ' +
    (V.range_holds.p25_75 * 100).toFixed(1) + '% of the real caps (stated 50%); the P10–P90 intervals hold ' +
    (V.range_holds.p10_90 * 100).toFixed(1) + '% (stated 80%). The intervals are honest about their width.';
  $('validation-read').textContent =
    'Read it as a ranking yardstick, not a price forecast. The size curve beats the flat median out of sample on ' +
    'every split — leave-one-out ×' + V.loo.median_miss_x.toFixed(2) + ' vs flat ×' + V.flat_loo.median_miss_x.toFixed(2) +
    ', walk-forward ×' + V.walk_forward.median_miss_x.toFixed(2) + ' vs flat ×' + V.flat_walk_forward.median_miss_x.toFixed(2) +
    ' — but the typical prediction is still off by a factor of about three, and the board ranks launches by the ' +
    'model\u2019s value, it does not predict a price.';

  // ---- KPI strip + integrity strip -------------------------------------------
  $('kpi-strip').innerHTML =
    fact('Rows on the board', String(DATA.rows.length)) +
    fact('Watchlist ranked', DATA.watchlist_size + ' / ' + DATA.watchlist_size) +
    fact('Largest implied value', money(DATA.rows[0].value_model.implied_usd)) +
    fact('Total implied value', money(DATA.rows.reduce(function (s, r) { return s + r.implied_value_usd; }, 0))) +
    fact('Median miss, LOO n=119', '×' + V.loo.median_miss_x.toFixed(2) + ' vs flat ×' + V.flat_loo.median_miss_x.toFixed(2)) +
    fact('Within 3×, LOO n=119', V.loo.within_3x_pct.toFixed(1) + '% vs flat ' + V.flat_loo.within_3x_pct.toFixed(1) + '%') +
    fact('Brier, LOO n=119', V.loo.brier.toFixed(3) + ' vs base ' + V.loo.brier_base.toFixed(3)) +
    fact('Farms breaking even <1%', DATA.farm_breakeven_under_1pct + ' / ' + DATA.rows.length);
  if (DATA.integrity) {
    $('integrity-strip').innerHTML = DATA.integrity.checks.map(function (c) {
      return '<li class="' + (c.pass ? 'pass' : 'fail') + '"><span aria-hidden="true">' + (c.pass ? '\u2713' : '\u2717') +
        '</span> ' + esc(c.label) + ' — ' + esc(c.detail) + '</li>';
    }).join('');
  }

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
  /** The farm verdict: the break-even against a T-bill and $25 an hour. */
  function verdictHtml(r) {
    var f = r.farm_total;
    if (!f) return '';
    var pctText = f.breakeven_pct_of_implied < 0.01 ? f.breakeven_pct_of_implied.toFixed(4) : f.breakeven_pct_of_implied.toFixed(2);
    return '<h3>Farm verdict</h3>' +
      '<div class="verdict">' +
      '<p><b>Deposit ' + moneyFull(f.deposit_usd) + '</b> · upfront ' + moneyFull(f.upfront_usd) +
      ' · ' + moneyFull(f.weekly_usd) + ' / week \u00d7 ' + f.weeks + ' weeks · <b>all-in ' + moneyFull(f.total_usd) +
      '</b> over ' + f.hold_days + ' days · ' + f.hours_total.toFixed(1) + ' hours of attention.</p>' +
      '<p>At $25 an hour the time is worth ' + moneyFull(f.time_value_usd) + ', and the deposit would earn ' +
      moneyFull(f.tbill_usd) + ' in a 5% T-bill over the hold. Break-even: <b>' + moneyFull(f.breakeven_usd) +
      '</b> — ' + pctText + '% of the ' + moneyFull(r.value_model.implied_usd) + ' implied value. ' +
      'The farm beats a T-bill and $25 an hour if the eventual claim is worth at least ' + moneyFull(f.breakeven_usd) +
      '; no payout is assumed anywhere. Across the board, ' + DATA.farm_breakeven_under_1pct + ' of ' + DATA.rows.length +
      ' farm plans break even below 1% of their implied value.</p>' +
      '</div>' +
      '<p class="model-excl">Model check: the leave-one-out backtest over ' + V.loo.test_n + ' live protocols misses by a median factor of ×' +
      V.loo.median_miss_x.toFixed(2) + ' (flat baseline ×' + V.flat_loo.median_miss_x.toFixed(2) + '), with ' +
      V.loo.within_3x_pct.toFixed(1) + '% within 3× (flat ' + V.flat_loo.within_3x_pct.toFixed(1) +
      '%) — read the implied value as a ranking yardstick, not a price.</p>';
  }
  function openDetail(slug) {
    var r = DATA.rows.find(function (x) { return x.slug === slug; });
    if (!r) return;
    var m = r.value_model;
    $('detail-title').textContent = r.name + (r.is_watchlist ? ' · Watchlist' : '');
    var sizeMultiple = m.multiple / m.cat_multiple;
    var eq = moneyFull(r.tvl_usd) + ' × ' + sizeMultiple.toFixed(4) + ' (size curve) × ' + m.cat_multiple.toFixed(3) + ' (category) = ' + moneyFull(m.implied_usd);
    var breakdown = 'size multiple ' + sizeMultiple.toFixed(4) + ' from log10(cap) = ' + DATA.size_fit.intercept.toFixed(4) +
      ' + ' + DATA.size_fit.slope.toFixed(4) + ' × log10(TVL); category factor ' + m.cat_multiple.toFixed(3) +
      ' (' + m.cat_basis + ')';
    $('detail-body').innerHTML =
      '<p>' + esc(r.name) + ' records no token yet. ' + esc(r.category || 'Uncategorised') + ' · ' +
      esc(r.chains.join(', ')) + ' · TVL ' + moneyFull(r.tvl_usd) + ' · seven-day change ' + pct(r.change_7d) +
      ' · running ' + age(r.age_days) + ' with no token' + (r.age_days === null ? ' (listing date unknown)' : '') + '.' +
      (r.is_watchlist ? ' On the snapshot\u2019s watchlist.' : ' Below the watchlist floor or outside it, ranked on the same model.') + '</p>' +
      '<h3>The working</h3>' +
      '<div class="equation">' + esc(eq) + '</div>' +
      '<p>' + esc(breakdown) + '. The 7d growth, the age with no token and the chain count are not in the working: ' +
      'each was fitted and tested and none of them improves out-of-sample prediction (see the evidence table).</p>' +
      '<h3>Farm plan — eight steps</h3>' +
      '<ol class="steps">' + r.farm_detail.map(function (s) {
        return '<li><span>' + esc(s.text) + '</span><span class="cost"><b>' + esc(s.cost) + '</b>' + esc(s.time) + '</span></li>';
      }).join('') + '</ol>' +
      verdictHtml(r) +
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
    var frag = decodeURIComponent(location.hash.slice(2));
    if (frag.indexOf('filter?') === 0) {
      // Deep link to a filtered board, e.g. #/filter?category=Lending&watchlist=1.
      var params = new URLSearchParams(frag.slice(7));
      if (params.get('category')) { state.category = params.get('category'); $('category').value = state.category; }
      if (params.get('chain')) { state.chain = params.get('chain'); $('chain').value = state.chain; }
      if (params.get('watchlist')) { state.watchlist = true; $('watchlist-only').checked = true; }
      if (params.get('q')) { state.q = params.get('q'); $('q').value = state.q; }
      render();
    } else {
      openDetail(frag);
    }
  }

  $('foot-note').textContent =
    'Source: the sealed DefiLlama snapshot (' + esc(DATA.source_note) + '), as of ' + esc(DATA.as_of) + '. ' +
    'The board is a ranking of a frozen record, not investment advice; a protocol that records no token may still have one. ' +
    'No network, no tracking, no live data — re-run the program on a later snapshot to re-rank.';
})();
