// Token Radar's model: a value model that follows from the snapshot's own figures.
//
// The board ranks the protocols that record no token yet, and it ranks them by an
// implied launch value derived from the snapshot itself, never from a list of names.
//
// 1. The clean set. A protocol is rankable when it records no token (mcap, gecko id
//    and symbol all null) AND it passes the watchlist's own exclusion rules: its
//    category is not Bridge, Canonical Bridge, Liquid Staking, Liquid Restaking,
//    Restaked BTC or CEX; its name carries no whole word wrapped / staked / staking;
//    it does not begin with an exchange name; it carries no version marker. Wrapped,
//    staked and bridged products are set aside for the same reason the watchlist
//    sets them aside: they are transfers of a token that already trades, not a
//    launch of their own. The floor is the only watchlist rule not applied, so
//    below-floor candidates are ranked too.
// 2. The multiple. For each category, the median market-cap / TVL of the
//    protocols in that category whose token already trades in the snapshot
//    (three or more comparables required, otherwise the overall median). A
//    comparable needs a real market cap above zero and a real TVL, and
//    centralised exchanges are left out: their tokens are not priced on
//    their TVL at all. The median is clamped to [0.05, 1.00]: a bridge's
//    transient TVL, and a liquid-staking token is not worth 4% of the stake it
//    wraps. A protocol on more chains multiplies by 1 + 0.02 per extra chain,
//    capped at 1.10: distribution is worth something, but not much.
// 3. Growth and maturity. The seven-day change, clamped to [-60%, +120%], moves
//    the value by half its size; how long the protocol has run with no token
//    moves it from 0.60 (new) to 1.00 (three years). Both are the snapshot's
//    figures, not a judgement about the name.
// 4. Implied value = TVL x multiple x growth x maturity, rounded, at least $1.
//    Every row carries the four factors so the page can show the working.
//
// A protocol "records no token" is the snapshot's record, not proof it has none:
// DefiLlama may simply not list the token yet. The board says so on the page.

export interface Snapshot {
  as_of: string;
  floor_usd: number;
  source_note: string;
  watchlist: string[];
  protocols: Protocol[];
}

export interface Protocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  listed_at: string | null;
  mcap_usd: number | null;
  gecko_id: string | null;
  symbol: string | null;
}

export interface ValueModel {
  /** Category multiple (median live mcap/TVL) x chain factor, the full multiple. */
  multiple: number;
  /** The category multiple before the chain factor, for the detail view. */
  cat_multiple: number;
  /** How the category multiple was set: "median of N live" or "overall median". */
  cat_basis: string;
  /** 1 + 0.02 per extra chain, capped at 1.10. */
  chain_factor: number;
  growth: number;
  maturity: number;
  implied_usd: number;
}

export interface FarmStep {
  text: string;
  cost: string;
  time: string;
  /** One-off dollars this step spends (0 when the step costs nothing but time). */
  cost_usd: number;
  /** Dollars this step repeats every week (0 when it is a one-off or free). */
  weekly_usd: number;
}

/** A farm plan's money, totalled from its steps: deposit, upfront, weekly top-ups over the hold, and the all-in total. */
export interface FarmTotal {
  /** The deposit the plan sizes from (the main action's capital). */
  deposit_usd: number;
  /** One-off dollars: every cost_usd across the steps. */
  upfront_usd: number;
  /** Dollars repeated every week (the weekly top-up step). */
  weekly_usd: number;
  /** Days the position must stay open. */
  hold_days: number;
  /** Whole weeks inside the hold (rounded up: a 90-day hold is 13 weekly top-ups). */
  weeks: number;
  /** All-in cost: upfront + weekly x weeks. */
  total_usd: number;
  /** The all-in cost as a percent of the protocol's implied launch value. */
  cost_pct_of_implied: number;
}

/** One validation test, with the real numbers the snapshot gives. */
export interface ValidationTest {
  name: string;
  /** Live comparables the multiple was fitted on. */
  fit_n: number;
  /** Live protocols the fitted model was tested on. */
  test_n: number;
  /** Median |predicted mcap - actual mcap| / actual mcap, in percent. */
  median_abs_err_pct: number;
  /** Tested protocols whose predicted mcap landed within 2x of the actual mcap. */
  within_2x: number;
  /** The same, as a percent of the tested protocols. */
  within_2x_pct: number;
}

/** The model's validation, all computed from the snapshot's live protocols at build time. */
export interface Validation {
  /** Live comparables the tests draw on (token trades, mcap > 0, TVL > 0, not a CEX). */
  live_n: number;
  /** Held out two ways: fit on half the live comparables, test on the other half, both directions. */
  held_out: ValidationTest[];
  /** Walk forward: fit on the older half by listing date, test on the newer half. */
  walk_forward: ValidationTest & { cut: string };
  /** Leave-one-out backtest: each live protocol predicted from all the others. */
  loo: ValidationTest;
  /** Split test per term: the LOO backtest with one term dropped (growth, maturity, chain factor). */
  ablation: { term: string; median_abs_err_pct: number; within_2x_pct: number }[];
}

export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  age_days: number | null;
  is_watchlist: boolean;
  value_model: ValueModel;
  /** The implied launch value at the row's top level, so the gate can read it off each row. */
  implied_value_usd: number;
  farm_steps: string[];
}

export interface IntegrityCheck {
  label: string;
  pass: boolean;
  detail: string;
}

/** Checks main.ts runs over the written output (board, screenshots, dashboard bytes), for the page's integrity strip. */
export interface Integrity {
  checks: IntegrityCheck[];
  dashboard_bytes: number;
  screenshots: { name: string; bytes: number }[];
}
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

export interface Radar {
  as_of: string;
  floor_usd: number;
  source_note: string;
  watchlist_size: number;
  /** Every protocol in the sealed snapshot. */
  protocol_total: number;
  early_size: number;
  live_size: number;
  /** All protocols whose token already trades in the snapshot (the live tab shows the top 25). */
  live_total: number;
  /** Category -> { live comparables, median multiple } for the calibration table. */
  calibration: { category: string; live_n: number; median: number; used: number }[];
  overall_median: number;
  /** The model's validation, computed from the snapshot's live protocols (see validateModel). */
  validation: Validation;
  /** Integrity checks main.ts runs over the written output; attached after the copies land. */
  integrity?: Integrity;
  rows: (BoardRow & { farm_detail: FarmStep[]; farm_total: FarmTotal })[];
  /** The live-token protocols, by market cap, set aside from the pre-token ranking. */
  live: LiveRow[];
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, 25)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

export function parseSnapshot(text: string): Snapshot {
  const parsed = JSON.parse(text) as Snapshot;
  if (typeof parsed.as_of !== 'string' || !Array.isArray(parsed.protocols) || !Array.isArray(parsed.watchlist)) {
    throw new Error('snapshot: expected as_of, protocols and watchlist');
  }
  return parsed;
}

/** A protocol records no token when all three token fields are null. */
export function isPreToken(p: Protocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

const EXCLUDED_CATEGORY = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;
const EXCHANGE_PREFIX = /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/;

/**
 * The watchlist's own exclusion rules, minus the TVL floor: rankable means
 * pre-token and not a wrapped / staked / bridged product of a token that
 * already trades, and not a versioned or exchange-branded fork.
 */
export function isRankable(p: Protocol): boolean {
  return (
    isPreToken(p) &&
    !EXCLUDED_CATEGORY.has(p.category ?? '') &&
    !VERSIONED.test(p.name) &&
    !WRAPPED_WORD.test(p.name) &&
    !EXCHANGE_PREFIX.test(p.name)
  );
}

/** The standard median: the middle value, or the mean of the two middle values. */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  if (n % 2 === 1) return sorted[(n - 1) / 2]!;
  return (sorted[n / 2 - 1]! + sorted[n / 2]!) / 2;
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

/** Days between listed_at and the snapshot date, null when the date is missing. */
export function ageDays(p: Protocol, asOf: string): number | null {
  if (p.listed_at === null) return null;
  const listed = Date.parse(`${p.listed_at}T00:00:00Z`);
  const asOfMs = Date.parse(`${asOf}T00:00:00Z`);
  if (Number.isNaN(listed) || Number.isNaN(asOfMs)) return null;
  return Math.max(0, Math.floor((asOfMs - listed) / 86_400_000));
}

/** Category multiples, derived from the snapshot's live protocols at build time. */
export interface Calibration {
  byCategory: Map<string, { live_n: number; median: number }>;
  overall: number;
}

export function calibrate(snapshot: Snapshot): Calibration {
  const byCategory = new Map<string, number[]>();
  const all: number[] = [];
  for (const p of snapshot.protocols) {
    // A live comparable needs a real market cap and a real TVL. A recorded
    // mcap of 0 means the token trades but the cap is unlisted, not that it is
    // worthless, and a CEX token's cap is not priced on its TVL at all
    // (one exchange records 69x), so both are left out of the calibration.
    if (isPreToken(p) || p.mcap_usd === null || p.mcap_usd <= 0 || p.tvl_usd <= 0 || p.category === 'CEX') continue;
    const ratio = p.mcap_usd / p.tvl_usd;
    all.push(ratio);
    const key = p.category ?? '(none)';
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key)!.push(ratio);
  }
  const overall = median(all);
  const table = new Map<string, { live_n: number; median: number }>();
  for (const [category, ratios] of byCategory) {
    table.set(category, { live_n: ratios.length, median: median(ratios) });
  }
  return { byCategory: table, overall };
}

/** The category multiple for one protocol: the category median (3+ live comps) or the overall median, clamped. */
export function categoryMultiple(p: Protocol, calibration: Calibration): { multiple: number; basis: string } {
  const entry = calibration.byCategory.get(p.category ?? '(none)');
  if (entry !== undefined && entry.live_n >= 3) {
    return { multiple: clamp(entry.median, 0.05, 1.0), basis: `median of ${entry.live_n} live ${p.category ?? 'protocols'}` };
  }
  return { multiple: clamp(calibration.overall, 0.05, 1.0), basis: 'overall median (too few live comps in category)' };
}

/** Score one protocol against a given calibration: the same formula the board uses, so the validation tests the shipped model, not a cousin of it. */
export function scoreWithCalibration(p: Protocol, asOf: string, calibration: Calibration): ValueModel {
  const { multiple: catMultiple, basis } = categoryMultiple(p, calibration);
  const chainFactor = 1 + 0.02 * (Math.min(p.chains.length, 6) - 1);
  const multiple = catMultiple * chainFactor;
  const growth = 1 + (clamp(p.change_7d ?? 0, -60, 120) / 100) * 0.5;
  const age = ageDays(p, asOf);
  const maturity = 0.6 + (Math.min(Math.max(age ?? 365, 0), 1095) / 1095) * 0.4;
  const implied = Math.max(1, Math.round(p.tvl_usd * multiple * growth * maturity));
  return { multiple, cat_multiple: catMultiple, cat_basis: basis, chain_factor: chainFactor, growth, maturity, implied_usd: implied };
}

export function scoreProtocol(p: Protocol, asOf: string, calibration: Calibration): ValueModel {
  return scoreWithCalibration(p, asOf, calibration);
}

/** The live comparables the validation draws on: a token that trades, a real market cap and a real TVL, no CEX. */
export function liveComparables(snapshot: Snapshot): Protocol[] {
  return snapshot.protocols.filter(
    (p) => !isPreToken(p) && p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0 && p.category !== 'CEX',
  );
}

/** The absolute error of one prediction, as a share of the actual market cap. */
function absErr(predicted: number, actual: number): number {
  return Math.abs(predicted - actual) / actual;
}

/** One validation test from a fit set and a test set, using the entry's own scoring with the fit set's calibration. */
function runTest(name: string, fitSet: Protocol[], testSet: Protocol[], asOf: string, drop?: 'growth' | 'maturity' | 'chain'): ValidationTest {
  const fitSnapshot: Snapshot = { as_of: asOf, floor_usd: 0, source_note: '', watchlist: [], protocols: fitSet };
  const calibration = calibrate(fitSnapshot);
  let within2x = 0;
  const errs: number[] = [];
  for (const p of testSet) {
    const scored = scoreWithCalibration(p, asOf, calibration);
    let predicted = scored.implied_usd;
    if (drop === 'growth') predicted = Math.max(1, Math.round(predicted / scored.growth));
    if (drop === 'maturity') predicted = Math.max(1, Math.round(predicted / scored.maturity));
    if (drop === 'chain') predicted = Math.max(1, Math.round(predicted / scored.chain_factor));
    errs.push(absErr(predicted, p.mcap_usd!));
    if (predicted >= p.mcap_usd! / 2 && predicted <= p.mcap_usd! * 2) within2x += 1;
  }
  const med = median(errs);
  return {
    name,
    fit_n: fitSet.length,
    test_n: testSet.length,
    median_abs_err_pct: Math.round(med * 1000) / 10,
    within_2x: within2x,
    within_2x_pct: Math.round((within2x / testSet.length) * 1000) / 10,
  };
}

/**
 * Validate the value model against the snapshot's own live protocols, where the
 * market cap is known and the model can be scored. Four views, all real numbers:
 * held out two ways, walk forward by listing date, a leave-one-out backtest, and
 * a split test per term (each term dropped from the LOO backtest in turn).
 *
 * What the numbers say on this snapshot: the category median is a rough yardstick,
 * not a price forecast. The live comparables' mcap/TVL ratios spread widely inside
 * a category, so the median error is large (about nine-tenths of the market cap)
 * and only about one in five predictions lands within 2x. The terms move the
 * error by less than a point: they fine-tune a ranking inside a category, they do
 * not rescue the spread. The board says so on the page instead of hiding it: the
 * model ranks launches by the market's own pricing, it does not predict a price.
 */
export function validateModel(snapshot: Snapshot): Validation {
  const live = liveComparables(snapshot);
  const bySlug = [...live].sort((a, b) => a.slug.localeCompare(b.slug));
  const halfA = bySlug.filter((_, i) => i % 2 === 0);
  const halfB = bySlug.filter((_, i) => i % 2 === 1);
  const heldOut = [
    runTest('Held out, half A fits half B', halfA, halfB, snapshot.as_of),
    runTest('Held out, half B fits half A', halfB, halfA, snapshot.as_of),
  ];
  const dated = live.filter((p) => p.listed_at !== null).sort((a, b) => (a.listed_at ?? '').localeCompare(b.listed_at ?? ''));
  const cut = dated[Math.floor(dated.length / 2)]!.listed_at!;
  const older = dated.filter((p) => (p.listed_at ?? '') < cut);
  const newer = dated.filter((p) => (p.listed_at ?? '') >= cut);
  const walkForward = { ...runTest('Walk forward, older fits newer', older, newer, snapshot.as_of), cut };
  const looFit = (p: Protocol): Protocol[] => live.filter((q) => q.slug !== p.slug);
  /** One leave-one-out pass, optionally with a term dropped: each live protocol predicted from all the others. */
  function looPass(drop?: 'growth' | 'maturity' | 'chain'): { median_abs_err_pct: number; within_2x: number; within_2x_pct: number } {
    const errs: number[] = [];
    let within = 0;
    for (const p of live) {
      const fitSnapshot: Snapshot = { as_of: snapshot.as_of, floor_usd: 0, source_note: '', watchlist: [], protocols: looFit(p) };
      const scored = scoreWithCalibration(p, snapshot.as_of, calibrate(fitSnapshot));
      let predicted = scored.implied_usd;
      if (drop === 'growth') predicted = Math.max(1, Math.round(predicted / scored.growth));
      if (drop === 'maturity') predicted = Math.max(1, Math.round(predicted / scored.maturity));
      if (drop === 'chain') predicted = Math.max(1, Math.round(predicted / scored.chain_factor));
      errs.push(absErr(predicted, p.mcap_usd!));
      if (predicted >= p.mcap_usd! / 2 && predicted <= p.mcap_usd! * 2) within += 1;
    }
    return {
      median_abs_err_pct: Math.round(median(errs) * 1000) / 10,
      within_2x: within,
      within_2x_pct: Math.round((within / live.length) * 1000) / 10,
    };
  }
  const looFull = looPass();
  const loo: ValidationTest = {
    name: 'Leave-one-out backtest',
    fit_n: live.length - 1,
    test_n: live.length,
    median_abs_err_pct: looFull.median_abs_err_pct,
    within_2x: looFull.within_2x,
    within_2x_pct: looFull.within_2x_pct,
  };
  // Split test per term: the same LOO pass with one term dropped, so each term's
  // contribution is measured against the identical fit and test sets.
  const ablation = (['growth', 'maturity', 'chain'] as const).map((term) => {
    const t = looPass(term);
    return { term: `without ${term}`, median_abs_err_pct: t.median_abs_err_pct, within_2x_pct: t.within_2x_pct };
  });
  return { live_n: live.length, held_out: heldOut, walk_forward: walkForward, loo, ablation };
}

/** The deposit the farm plan sizes from, by TVL tier. */
export function capitalFor(p: Protocol): number {
  if (p.tvl_usd >= 1_000_000_000) return 1000;
  if (p.tvl_usd >= 250_000_000) return 500;
  if (p.tvl_usd >= 100_000_000) return 200;
  if (p.tvl_usd >= 50_000_000) return 100;
  return 50;
}

const money = (n: number): string => `$${n.toLocaleString('en-US')}`;

/** The main qualifying action for the protocol's category, sized to its TVL tier. */
function mainAction(p: Protocol, capital: number): string {
  const chain = p.chains[0] ?? 'its main chain';
  const c = p.category ?? '';
  switch (c) {
    case 'Risk Curators':
      return `Deposit ${money(capital)} of USDC into ${p.name}'s curator vault on ${chain} and hold the vault receipt in the farming wallet.`;
    case 'Onchain Capital Allocator':
      return `Allocate ${money(capital)} of USDC into ${p.name}'s allocator vault on ${chain} and keep the vault position open.`;
    case 'Basis Trading':
      return `Deposit ${money(capital)} of USDC into ${p.name}'s basis vault on ${chain} and hold the position through one funding cycle.`;
    case 'Dexs':
      return `Swap ${money(capital)} of USDC for the pool's base asset through ${p.name} on ${chain}, then add ${money(Math.round(capital / 2))} of liquidity to its largest pool.`;
    case 'Lending':
      return `Supply ${money(capital)} of USDC to ${p.name} on ${chain} and leave it supplied; the supply position is the qualifying action.`;
    case 'RWA':
      return `Mint or buy ${money(capital)} of ${p.name}'s yield-bearing asset on ${chain} and hold it in the farming wallet.`;
    case 'CDP':
      return `Lock ${money(capital)} of collateral in ${p.name} on ${chain} and mint its stablecoin against it; keep the position above the liquidation ratio.`;
    case 'CDP Manager':
      return `Open a collateralised debt position with ${money(capital)} of collateral in ${p.name} on ${chain} and mint against it.`;
    case 'Yield':
    case 'Yield Aggregator':
      return `Deposit ${money(capital)} of USDC into ${p.name}'s yield vault on ${chain} and leave it compounding.`;
    case 'Derivatives':
    case 'Perpetuals':
      return `Deposit ${money(capital)} of USDC as margin on ${p.name} (${chain}), open a small hedged position and keep it open a full day.`;
    case 'Prediction Market':
      return `Fund ${p.name} with ${money(capital)} of USDC on ${chain} and place a position on a market that settles after the snapshot date.`;
    case 'Insurance':
      return `Buy ${money(capital)} of cover from ${p.name} on ${chain} for a position you actually hold, and keep the cover active.`;
    case 'CeDeFi':
      return `Deposit ${money(capital)} of USDC into ${p.name}'s CeDeFi vault on ${chain} and hold the vault receipt.`;
    case 'Chain':
      return `Bridge ${money(capital)} of USDC to ${p.name} on ${chain} and use its flagship app with at least half of it.`;
    case 'Payments':
      return `Spend ${money(capital)} through ${p.name} on ${chain} with its payment rail and keep the receipt in the farming wallet.`;
    case 'Governance Incentives':
      return `Stake ${money(capital)} of the protocol's incentive asset in ${p.name} on ${chain} and vote on an open proposal.`;
    case 'Staking Pool':
      return `Stake ${money(capital)} of the pool asset in ${p.name} on ${chain} and keep it staked through the next reward epoch.`;
    case 'Stablecoin Wrapper':
      return `Wrap ${money(capital)} of the underlying stablecoin through ${p.name} on ${chain} and hold the wrapped token.`;
    case 'Collateral Markets':
      return `Supply ${money(capital)} of collateral to ${p.name} on ${chain} and borrow a small amount against it to register activity.`;
    case 'Indexes':
      return `Buy ${money(capital)} of ${p.name}'s index token on ${chain} and hold it in the farming wallet.`;
    case 'Liquidity Manager':
      return `Deposit ${money(capital)} of USDC into ${p.name}'s managed liquidity position on ${chain} and keep it in range.`;
    case 'Restaking':
      return `Restake ${money(capital)} of the restaking asset through ${p.name} on ${chain} and delegate it to an operator.`;
    case 'Leveraged Farming':
      return `Open a leveraged farm with ${money(capital)} of collateral in ${p.name} on ${chain} at the lowest leverage the vault offers.`;
    case 'OTC Marketplace':
      return `Place an OTC order for ${money(capital)} of the listed asset on ${p.name} (${chain}) and complete it from the farming wallet.`;
    case 'Interest Rate Derivatives':
      return `Open a rate position with ${money(capital)} of collateral in ${p.name} on ${chain} and hold it through one rate reset.`;
    case 'Dual-Token Stablecoin':
      return `Mint ${money(capital)} of ${p.name}'s stablecoin on ${chain} against collateral and hold the minted token.`;
    case 'Farm':
      return `Deposit ${money(capital)} of USDC into ${p.name}'s farm on ${chain} and leave it staked.`;
    case 'Uncollateralized Lending':
      return `Lend ${money(capital)} of USDC through ${p.name} on ${chain} and keep the loan open through the next interest period.`;
    case 'Anchor BTC':
    case 'Decentralized BTC':
      return `Mint ${money(capital)} of ${p.name}'s BTC-backed asset on ${chain} and hold it in the farming wallet.`;
    case 'Crypto Card Issuer':
      return `Spend ${money(capital)} with ${p.name}'s card on ${chain} and keep the spend receipt in the farming wallet.`;
    default:
      return `Use ${p.name}'s main product on ${chain} with ${money(capital)} of USDC and keep the position open in the farming wallet.`;
  }
}

/** A second, different qualifying action, so the plan is not one deposit and done. */
function secondAction(p: Protocol, capital: number): string {
  const chain = p.chains[0] ?? 'its main chain';
  const c = p.category ?? '';
  switch (c) {
    case 'Risk Curators':
    case 'Onchain Capital Allocator':
    case 'CeDeFi':
      return `Allocate a second ${money(Math.round(capital / 2))} to a different vault run by ${p.name} on ${chain}, so the wallet shows two distinct vault positions.`;
    case 'Basis Trading':
      return `After the first funding cycle, add ${money(Math.round(capital / 2))} to the basis position on ${chain} and hold it through a second cycle.`;
    case 'Dexs':
      return `Swap a second ${money(Math.round(capital / 2))} through a different pool on ${p.name} (${chain}) a week after the first swap.`;
    case 'Lending':
    case 'Collateral Markets':
      return `Borrow ${money(Math.round(capital / 4))} of a stablecoin against the supplied collateral on ${p.name} (${chain}) and repay it after a week.`;
    case 'RWA':
    case 'Stablecoin Wrapper':
    case 'Indexes':
      return `Use the ${p.name} asset on ${chain} as collateral in a second app, so the wallet shows the asset working, not just held.`;
    case 'CDP':
    case 'CDP Manager':
    case 'Dual-Token Stablecoin':
      return `Open a second collateral position with ${money(Math.round(capital / 2))} in ${p.name} on ${chain}, using a different collateral asset.`;
    case 'Yield':
    case 'Yield Aggregator':
      return `Claim the vault's rewards once, then redeposit them into the same vault on ${chain} instead of withdrawing.`;
    case 'Derivatives':
    case 'Perpetuals':
      return `Close the first position after a day, then open a second one on ${p.name} (${chain}) in the opposite direction with the same margin.`;
    case 'Prediction Market':
      return `Place a second position on a different ${p.name} market on ${chain} that settles on another date.`;
    case 'Insurance':
      return `Renew the cover from ${p.name} on ${chain} before it lapses, so the wallet shows continuous cover.`;
    case 'Chain':
      return `Use a second app on ${p.name} (${chain}) with ${money(Math.round(capital / 2))}, so the wallet shows two apps on the chain.`;
    case 'Payments':
    case 'Crypto Card Issuer':
      return `Make a second, smaller spend through ${p.name} on ${chain} a week after the first, from the same wallet.`;
    case 'Governance Incentives':
      return `Vote on a second ${p.name} proposal on ${chain} from the same staked wallet.`;
    case 'Staking Pool':
    case 'Restaking':
      return `Restake the first rewards earned in ${p.name} on ${chain} instead of withdrawing them.`;
    case 'Liquidity Manager':
      return `Add ${money(Math.round(capital / 2))} to a second managed range on ${p.name} (${chain}).`;
    case 'Leveraged Farming':
      return `After a week, reduce the leverage on the ${p.name} farm on ${chain} by repaying part of the borrowed leg.`;
    case 'OTC Marketplace':
      return `Complete a second OTC trade on ${p.name} (${chain}) for a different listed asset.`;
    case 'Interest Rate Derivatives':
      return `Hedge the rate position on ${p.name} (${chain}) with a second, smaller position in the opposite direction.`;
    case 'Farm':
      return `Harvest the farm rewards from ${p.name} on ${chain} once, then redeposit them into the same farm.`;
    case 'Uncollateralized Lending':
      return `Fund a second loan through ${p.name} on ${chain} for ${money(Math.round(capital / 2))} after the first loan is repaid.`;
    case 'Anchor BTC':
    case 'Decentralized BTC':
      return `Use the minted BTC-backed asset from ${p.name} on ${chain} as collateral in a lending app, then repay it.`;
    default:
      return `Repeat the main action a second time on ${p.name} (${chain}) a week later with ${money(Math.round(capital / 2))}, from the same wallet.`;
  }
}

/** Eight concrete steps per protocol, every one derived from its category, chains, TVL tier and age. */
export function farmSteps(p: Protocol, asOf: string): FarmStep[] {
  const capital = capitalFor(p);
  const chain = p.chains[0] ?? 'its main chain';
  const age = ageDays(p, asOf);
  const holdDays = age === null ? 45 : age >= 365 ? 90 : age >= 180 ? 60 : 30;
  const steps: FarmStep[] = [
    {
      text: 'Open a fresh wallet for this farm only, write the seed phrase on paper and store it offline. Never reuse a wallet that holds your main funds.',
      cost: '—',
      time: '10 min',
      cost_usd: 0,
      weekly_usd: 0,
    },
    { text: mainAction(p, capital), cost: money(capital), time: '30 min', cost_usd: capital, weekly_usd: 0 },
    { text: secondAction(p, capital), cost: money(Math.round(capital / 2)), time: '20 min', cost_usd: Math.round(capital / 2), weekly_usd: 0 },
    {
      text: `Once a week, repeat the main action with ${money(Math.round(capital / 4))} or top up the existing position, so the wallet shows steady use rather than one burst.`,
      cost: `${money(Math.round(capital / 4))} / week`,
      time: '15 min / week',
      cost_usd: 0,
      weekly_usd: Math.round(capital / 4),
    },
    {
      text: `Keep the position open for at least ${holdDays} days. Do not close it early: snapshots reward wallets that were present over time, not wallets that farmed and left.`,
      cost: '—',
      time: `${holdDays} days`,
      cost_usd: 0,
      weekly_usd: 0,
    },
  ];
  if (p.chains.length > 1) {
    const second = p.chains[1]!;
    steps.push({
      text: `Bridge ${money(Math.round(capital / 2))} to ${second} and repeat the main action there, so the position exists on two chains and the wallet is counted on both.`,
      cost: money(Math.round(capital / 2)),
      time: '30 min',
      cost_usd: Math.round(capital / 2),
      weekly_usd: 0,
    });
  } else {
    steps.push({
      text: `Keep ${money(20)} of ${chain}'s gas token in the farming wallet at all times, so a snapshot or a claim never strands the position for lack of gas.`,
      cost: money(20),
      time: '5 min',
      cost_usd: 20,
      weekly_usd: 0,
    });
  }
  steps.push(
    {
      text: `Once a week, open ${p.name}'s points or quest page and check the farming wallet shows the position and any points earned; if it does not, fix it before the next week.`,
      cost: '—',
      time: '10 min / week',
      cost_usd: 0,
      weekly_usd: 0,
    },
    {
      text: 'Log every transaction hash, the date and the amount in a note. If a claim opens, the log is the proof of what the wallet did and when.',
      cost: '—',
      time: '5 min',
      cost_usd: 0,
      weekly_usd: 0,
    },
  );
  return steps;
}

/**
 * The farm plan's money, totalled from its own steps: the deposit, the one-off
 * dollars, the weekly top-ups over the hold, and the all-in total, with the
 * total set against the protocol's implied launch value so the reader can see
 * what the chase costs next to what it chases.
 */
export function farmPlan(p: Protocol, asOf: string, impliedUsd: number): { steps: FarmStep[]; total: FarmTotal } {
  const steps = farmSteps(p, asOf);
  const deposit = capitalFor(p);
  const upfront = steps.reduce((sum, s) => sum + s.cost_usd, 0);
  const weekly = steps.reduce((sum, s) => sum + s.weekly_usd, 0);
  const age = ageDays(p, asOf);
  const holdDays = age === null ? 45 : age >= 365 ? 90 : age >= 180 ? 60 : 30;
  const weeks = Math.ceil(holdDays / 7);
  const total = upfront + weekly * weeks;
  return {
    steps,
    total: {
      deposit_usd: deposit,
      upfront_usd: upfront,
      weekly_usd: weekly,
      hold_days: holdDays,
      weeks,
      total_usd: total,
      cost_pct_of_implied: Math.round((total / Math.max(1, impliedUsd)) * 1000000) / 10000,
    },
  };
}

export function buildRadar(snapshot: Snapshot): { board: BoardRow[]; radar: Radar } {
  const calibration = calibrate(snapshot);
  const watchlist = new Set(snapshot.watchlist);
  const early = snapshot.protocols.filter(isRankable);
  const rows = early
    .map((p) => {
      const model = scoreProtocol(p, snapshot.as_of, calibration);
      const plan = farmPlan(p, snapshot.as_of, model.implied_usd);
      const row: BoardRow & { farm_detail: FarmStep[]; farm_total: FarmTotal } = {
        rank: 0,
        slug: p.slug,
        name: p.name,
        category: p.category,
        chains: p.chains,
        tvl_usd: p.tvl_usd,
        change_7d: p.change_7d,
        age_days: ageDays(p, snapshot.as_of),
        is_watchlist: watchlist.has(p.slug),
        value_model: model,
        implied_value_usd: model.implied_usd,
        farm_steps: plan.steps.map((s) => s.text),
        farm_detail: plan.steps,
        farm_total: plan.total,
      };
      return row;
    })
    .sort((a, b) => b.implied_value_usd - a.implied_value_usd || a.slug.localeCompare(b.slug));
  rows.forEach((row, index) => {
    row.rank = index + 1;
  });
  const calibrationRows = [...calibration.byCategory.entries()]
    .filter(([, v]) => v.live_n >= 1)
    .map(([category, v]) => ({
      category,
      live_n: v.live_n,
      median: v.median,
      used: v.live_n >= 3 ? Math.min(Math.max(v.median, 0.05), 1) : calibration.overall,
    }))
    .sort((a, b) => b.used - a.used);
  const live = liveRows(snapshot);
  return {
    board: rows,
    radar: {
      as_of: snapshot.as_of,
      floor_usd: snapshot.floor_usd,
      source_note: snapshot.source_note,
      watchlist_size: snapshot.watchlist.length,
      protocol_total: snapshot.protocols.length,
      early_size: rows.length,
      live_size: live.length,
      live_total: snapshot.protocols.filter((p) => !isPreToken(p)).length,
      calibration: calibrationRows,
      overall_median: calibration.overall,
      validation: validateModel(snapshot),
      rows,
      live,
    },
  };
}

/** The gate's own checks, run before anything is written. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  if (board.length < 100 || board.length > 4000) return `board holds ${board.length} rows: the gate wants 100 to 4000`;
  const missing = snapshot.watchlist.filter((slug) => !board.some((row) => row.slug === slug));
  if (missing.length > 0) return `the board drops ${missing.length} watchlist protocols: ${missing.slice(0, 5).join(', ')}`;
  for (const row of board) {
    // The gate reads the implied value off the row's top level, not out of
    // value_model: a row without it fails the gate even when the model is
    // right, so check the top-level field itself, and that it agrees with
    // the model's own figure.
    if (typeof row.implied_value_usd !== 'number' || !Number.isFinite(row.implied_value_usd) || row.implied_value_usd < 1) {
      return `${row.slug}: no top-level implied_value_usd: the gate reads the value off the row, not out of value_model`;
    }
    if (row.implied_value_usd !== row.value_model.implied_usd) {
      return `${row.slug}: top-level implied_value_usd $${row.implied_value_usd.toLocaleString('en-US')} disagrees with value_model $${row.value_model.implied_usd.toLocaleString('en-US')}`;
    }
    if (row.farm_steps.length < 3 || row.farm_steps.length > 12) {
      return `${row.slug}: ${row.farm_steps.length} farm steps: the gate wants 3 to 12`;
    }
    for (const step of row.farm_steps) {
      if (step.length < 20 || step.length > 600) return `${row.slug}: a farm step is ${step.length} characters: the gate wants 20 to 600`;
    }
    if (row.implied_value_usd > 100_000_000_000_000) return `${row.slug}: implied value $${row.implied_value_usd.toLocaleString('en-US')} exceeds the $100T cap`;
  }
  for (let i = 1; i < board.length; i += 1) {
    if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) {
      return `implied values are not sorted descending at row ${i + 1}`;
    }
  }
  for (let i = 0; i < board.length; i += 1) {
    if (board[i]!.rank !== i + 1) return `ranks are not sequential at row ${i + 1}`;
  }
  return null;
}

/** The dashboard's data, as a script the page reads: window.RADAR = {...}. */
export function dataScript(radar: Radar): string {
  return `window.RADAR = ${JSON.stringify(radar)};\n`;
}
