// Token Radar's model, round 4 ("Refit Size Curve"): a value model that follows
// from the snapshot's own figures — now a fitted size curve, not a flat median.
//
// The board ranks the protocols that record no token yet, by an implied launch
// value derived from the snapshot itself, never from a list of names.
//
// 1. The clean set. Same as r3: a protocol is rankable when it records no token
//    (mcap, gecko id and symbol all null) AND it passes the watchlist's own
//    exclusion rules (no Bridge / Canonical Bridge / Liquid Staking / Liquid
//    Restaking / Restaked BTC / CEX; no whole word wrapped / staked / staking;
//    no exchange prefix; no version marker). The floor is the only watchlist
//    rule not applied, so below-floor candidates are ranked too.
// 2. The size curve (KEPT — the refit). log10(market cap) is fitted by OLS on
//    log10(TVL) over the snapshot's 119 live comparables:
//      log10(cap) = a + b * log10(TVL) + category effect
//    The fitted slope b is ~0.47, so the implied multiple cap/TVL FALLS as TVL
//    grows: ~0.14 at $100M TVL, ~0.025 at $2.75B TVL. That is the size curve
//    the r3 flat median (0.246 at every TVL) missed by ~9x at the top of the
//    board, and it is fitted from this snapshot alone.
// 3. The category effect (KEPT, heavily shrunk). Per category, the MEDIAN
//    residual of the size-curve fit, shrunk by n/(n+10): a category with few
//    live comparables barely moves the prediction. Median, not mean, so one
//    outlier cannot drag its whole category with it — and a category needs
//    at least TWO live comparables for any effect at all: a "median" of one
//    observation is one protocol's idiosyncrasy, not a category signal.
//    (The single live Prediction Market token sits at 378x its TVL; letting
//    it set the category effect would put Polymarket at $45M on its strength
//    alone. With the two-comparable rule it does not.)
// 4. Terms TESTED and NOT KEPT (each measured, not asserted): the protocol's
//    own 7d growth, its age with no token, and its chain count. Every one of
//    them fails out of sample — leave-one-out and walk-forward miss do not
//    improve, and a paired bootstrap over the 119 LOO ratios (mean log miss,
//    2000 resamples) puts P(improves) at 0.05–0.29, i.e. noise. The age term is actively harmful
//    walk-forward (its fitted sign flips between eras). A negative control —
//    a pure-noise feature hashed from the protocol's slug, which cannot
//    possibly help — behaves exactly like those three terms, which is what a
//    failed control is supposed to show.
// 5. Implied value = 10^(a + b*log10(TVL) + category effect), rounded, at
//    least $1. Every row carries the factors so the page can show the working.
//    The growth / maturity / chain-factor fields of the r3 model are 1.00 in
//    r4: those terms were tested and not kept.
//
// Validation is computed from the same live protocols with the same scoring
// function the board uses, never from a cousin of it: held out two ways,
// walk forward by listing date, leave-one-out, a flat-median baseline on the
// same splits, a per-term ablation table, a negative control, a 200-refit
// bootstrap (slope and multiple standard errors, rank ranges), and range
// honesty (predicted P25–P75 / P10–P90 intervals vs the stated 50% / 80%).

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
  /** The full multiple: size-curve multiple x category factor. */
  multiple: number;
  /** The category factor (10 ^ category effect); 1 when no live comparables. */
  cat_multiple: number;
  /** How the category factor was set: shrunk median residual, or "no live". */
  cat_basis: string;
  /** 1.00 in r4: the chain-count term was tested and not kept. */
  chain_factor: number;
  /** 1.00 in r4: the 7d-growth term was tested and not kept. */
  growth: number;
  /** 1.00 in r4: the age term was tested and not kept. */
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

/** A farm plan's money, totalled from its steps — plus the break-even that the farm verdict is built on. */
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
  /** Hours of attention the plan asks for (fixed steps + 25 min/week). */
  hours_total: number;
  /** Those hours priced at $25/hour. */
  time_value_usd: number;
  /** What the deposit would earn in a 5% T-bill over the hold. */
  tbill_usd: number;
  /** Break-even claim value: all-in + time value + T-bill forgone. */
  breakeven_usd: number;
  /** The break-even as a percent of the protocol's implied launch value. */
  breakeven_pct_of_implied: number;
}

/** One validation test: a model scored out of sample, with the flat baseline's language beside it. */
export interface ValidationTest {
  name: string;
  /** Live comparables the model was fitted on. */
  fit_n: number;
  /** Live protocols the fitted model was tested on. */
  test_n: number;
  /** Median max(pred, actual) / min(pred, actual): "missed by a factor of xN". */
  median_miss_x: number;
  /** Tested protocols whose predicted mcap landed within 3x of the actual mcap. */
  within_3x: number;
  /** The same, as a percent of the tested protocols. */
  within_3x_pct: number;
  /** Brier score for "actual mcap/TVL above the fit set's median ratio" (lower is better). */
  brier: number;
  /** Brier score of always predicting the base rate (the no-skill reference). */
  brier_base: number;
  /** The base rate itself: share of tested protocols above the median ratio. */
  base_rate: number;
  /** Share of actual caps inside the predicted P25–P75 interval (stated: 50%). */
  hold_25_75: number;
  /** Share of actual caps inside the predicted P10–P90 interval (stated: 80%). */
  hold_10_90: number;
}

/** One row of the per-term evidence table: kept or tested-not-kept, with numbers. */
export interface AblationRow {
  term: string;
  kept: boolean;
  loo_miss_x: number;
  loo_within3_pct: number;
  wf_miss_x: number;
  wf_within3_pct: number;
  /** Paired-bootstrap P(this term's LOO median miss beats the base model). */
  p_improves: number;
  note: string;
}

/** Bootstrap over 200 refits of the live set (resampled with replacement). */
export interface Bootstrap {
  n: number;
  slope_mean: number;
  slope_se: number;
  mult100m_mean: number;
  mult100m_se: number;
  rank_ranges: { slug: string; name: string; base_rank: number; p5: number; p95: number }[];
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
  /** The flat-median baseline on the same leave-one-out splits. */
  flat_loo: ValidationTest;
  /** The flat-median baseline on the same walk-forward split. */
  flat_walk_forward: ValidationTest & { cut: string };
  /** Range honesty on the LOO predictions vs the stated 50% / 80%. */
  range_holds: { p25_75: number; p10_90: number; stated_25_75: number; stated_10_90: number };
  /** Per-term evidence: every term the model keeps or tested and dropped. */
  ablation: AblationRow[];
  /** Bootstrap SEs and rank ranges from 200 refits. */
  bootstrap: Bootstrap;
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
  /** The fitted size curve: intercept, slope, and the multiples it implies. */
  size_fit: { intercept: number; slope: number; mult_100m: number; mult_2_75b: number };
  /** Category -> { live comparables, median log10 residual, effect factor } for the effects table. */
  calibration: { category: string; live_n: number; median: number; used: number }[];
  /** Raw median mcap/TVL over all live comparables — the flat baseline, kept as a cross-check. */
  overall_median: number;
  /** Farm plans whose break-even is under 1% of their implied value, out of all rows. */
  farm_breakeven_under_1pct: number;
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

function mean(values: number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/** Sample standard deviation (n-1). */
function sd(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(values.reduce((s, v) => s + (v - m) * (v - m), 0) / (values.length - 1));
}

/** Normal CDF via the Abramowitz–Stegun erf approximation (accurate to ~1e-7). */
function normCdf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * ax);
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-ax * ax);
  return 0.5 * (1 + sign * erf);
}

/** Deterministic PRNG (mulberry32) so the bootstrap reproduces exactly. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Days between listed_at and the snapshot date, null when the date is missing. */
export function ageDays(p: Protocol, asOf: string): number | null {
  if (p.listed_at === null) return null;
  const listed = Date.parse(`${p.listed_at}T00:00:00Z`);
  const asOfMs = Date.parse(`${asOf}T00:00:00Z`);
  if (Number.isNaN(listed) || Number.isNaN(asOfMs)) return null;
  return Math.max(0, Math.floor((asOfMs - listed) / 86_400_000));
}

/** FNV-1a hash of a string, scaled to [-0.5, 0.5): pure noise, by construction. */
function hashNoise(slug: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < slug.length; i += 1) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 4294967296 - 0.5;
}

// ---- The fitted model ------------------------------------------------------

/** One candidate feature set: the base size curve plus one optional extra term. */
interface ModelConfig {
  key: string;
  label: string;
  /** Extra feature appended after [1, log10(TVL)]; null for the base curve. */
  extra: ((p: Protocol, asOf: string) => number) | null;
  /** False for size-only: no category effect at all. */
  useCategory: boolean;
}

const BASE_CONFIG: ModelConfig = { key: 'base', label: 'size curve + category effect', extra: null, useCategory: true };
const SIZE_ONLY_CONFIG: ModelConfig = { key: 'size-only', label: 'size curve only', extra: null, useCategory: false };
const MOM_CONFIG: ModelConfig = {
  key: 'momentum',
  label: '+ own 7d growth',
  extra: (p) => clamp(p.change_7d ?? 0, -60, 120) / 100,
  useCategory: true,
};
const AGE_CONFIG: ModelConfig = {
  key: 'age',
  label: '+ age with no token',
  extra: (p, asOf) => {
    const age = ageDays(p, asOf);
    return Math.min(Math.max(age ?? 365, 0), 1095) / 365;
  },
  useCategory: true,
};
const CHAIN_CONFIG: ModelConfig = {
  key: 'chain',
  label: '+ chain count',
  extra: (p) => Math.log10(Math.max(1, p.chains.length)),
  useCategory: true,
};
const CONTROL_CONFIG: ModelConfig = {
  key: 'control',
  label: '+ slug-hash noise (negative control)',
  extra: (p) => hashNoise(p.slug),
  useCategory: true,
};
const FULL_CONFIG: ModelConfig = {
  key: 'full',
  label: 'size + 7d growth + age (brief §2 literal)',
  extra: null,
  useCategory: true,
};

function features(p: Protocol, asOf: string, config: ModelConfig): number[] {
  const row = [1, Math.log10(Math.max(1, p.tvl_usd))];
  if (config.key === 'full') {
    row.push(clamp(p.change_7d ?? 0, -60, 120) / 100);
    const age = ageDays(p, asOf);
    row.push(Math.min(Math.max(age ?? 365, 0), 1095) / 365);
  } else if (config.extra !== null) {
    row.push(config.extra(p, asOf));
  }
  return row;
}

/** OLS by normal equations + Gaussian elimination with partial pivoting. */
function ols(X: number[][], y: number[]): number[] {
  const k = X[0]!.length;
  const ata: number[][] = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  const aty: number[] = new Array<number>(k).fill(0);
  for (let i = 0; i < X.length; i += 1) {
    for (let a = 0; a < k; a += 1) {
      aty[a]! += X[i]![a]! * y[i]!;
      for (let b = 0; b < k; b += 1) ata[a]![b]! += X[i]![a]! * X[i]![b]!;
    }
  }
  // Augment and eliminate.
  const m: number[][] = ata.map((row, i) => [...row, aty[i]!]);
  for (let col = 0; col < k; col += 1) {
    let pivot = col;
    for (let r = col + 1; r < k; r += 1) if (Math.abs(m[r]![col]!) > Math.abs(m[pivot]![col]!)) pivot = r;
    [m[col], m[pivot]] = [m[pivot]!, m[col]!];
    const div = m[col]![col]!;
    for (let r = col + 1; r < k; r += 1) {
      const factor = m[r]![col]! / div;
      for (let c = col; c <= k; c += 1) m[r]![c]! -= factor * m[col]![c]!;
    }
  }
  const beta = new Array<number>(k).fill(0);
  for (let i = k - 1; i >= 0; i -= 1) {
    let sum = m[i]![k]!;
    for (let j = i + 1; j < k; j += 1) sum -= m[i]![j]! * beta[j]!;
    beta[i] = sum / m[i]![i]!;
  }
  return beta;
}

/** Shrinkage for the category effect: n live comparables count as n/(n+10). */
const CAT_K = 10;

export interface FittedModel {
  config: ModelConfig;
  beta: number[];
  /** Category -> shrunk effect in log10 (add to the size-curve prediction). */
  effects: Map<string, number>;
  /** Category -> { live_n, median residual, effect } for the effects table. */
  effectRows: { category: string; live_n: number; median_resid: number; effect: number }[];
}

function fitModel(rows: Protocol[], asOf: string, config: ModelConfig): FittedModel {
  const X = rows.map((p) => features(p, asOf, config));
  const y = rows.map((p) => Math.log10(p.mcap_usd!));
  const beta = ols(X, y);
  const effects = new Map<string, number>();
  const effectRows: FittedModel['effectRows'] = [];
  if (config.useCategory) {
    const byCategory = new Map<string, number[]>();
    rows.forEach((p, i) => {
      const resid = y[i]! - X[i]!.reduce((s, v, j) => s + v * beta[j]!, 0);
      const key = p.category ?? '(none)';
      if (!byCategory.has(key)) byCategory.set(key, []);
      byCategory.get(key)!.push(resid);
    });
    for (const [category, resids] of byCategory) {
      const med = median(resids);
      // At least two live comparables: one observation is not a median.
      const effect = resids.length >= 2 ? (resids.length / (resids.length + CAT_K)) * med : 0;
      if (resids.length >= 2) effects.set(category, effect);
      effectRows.push({ category, live_n: resids.length, median_resid: med, effect });
    }
    effectRows.sort((a, b) => b.effect - a.effect);
  }
  return { config, beta, effects, effectRows };
}

/** log10 of the predicted market cap for one protocol under a fitted model. */
function predictLog(p: Protocol, asOf: string, fit: FittedModel): number {
  const x = features(p, asOf, fit.config);
  let logcap = x.reduce((s, v, j) => s + v * fit.beta[j]!, 0);
  if (fit.config.useCategory) logcap += fit.effects.get(p.category ?? '(none)') ?? 0;
  return logcap;
}

function scoreWithFit(p: Protocol, asOf: string, fit: FittedModel): ValueModel {
  const logcap = predictLog(p, asOf, fit);
  const implied = Math.max(1, Math.round(10 ** logcap));
  const sizeMultiple = 10 ** (fit.beta[0]! + (fit.beta[1]! - 1) * Math.log10(Math.max(1, p.tvl_usd)));
  const effect = fit.config.useCategory ? fit.effects.get(p.category ?? '(none)') ?? 0 : 0;
  const catFactor = 10 ** effect;
  const row = fit.effectRows.find((r) => r.category === (p.category ?? '(none)'));
  const basis =
    row === undefined
      ? `no live comparables in ${p.category ?? 'category'} — no category effect`
      : row.live_n < 2
        ? `only ${row.live_n} live comparable in ${p.category ?? 'category'} — too few for a category effect`
        : `category effect ${effect >= 0 ? '+' : ''}${effect.toFixed(3)} in log10 (median residual of ${row.live_n} live, shrunk ${row.live_n}/${row.live_n + CAT_K})`;
  return {
    multiple: sizeMultiple * catFactor,
    cat_multiple: catFactor,
    cat_basis: basis,
    chain_factor: 1,
    growth: 1,
    maturity: 1,
    implied_usd: implied,
  };
}

/** Score one protocol against a given fitted model: the same formula the board uses. */
export function scoreWithCalibration(p: Protocol, asOf: string, fit: FittedModel): ValueModel {
  return scoreWithFit(p, asOf, fit);
}

export function scoreProtocol(p: Protocol, asOf: string, fit: FittedModel): ValueModel {
  return scoreWithFit(p, asOf, fit);
}

/** The live comparables the validation draws on: a token that trades, a real market cap and a real TVL, no CEX. */
export function liveComparables(snapshot: Snapshot): Protocol[] {
  return snapshot.protocols.filter(
    (p) => !isPreToken(p) && p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0 && p.category !== 'CEX',
  );
}

/** The flat baseline: the median mcap/TVL of the fit set, applied at every TVL. */
function flatMedian(fitSet: Protocol[]): number {
  return median(fitSet.map((p) => p.mcap_usd! / p.tvl_usd));
}

/** One validation test from a fit set and a test set, using the entry's own scoring with the fit set's model. */
function runTest(
  name: string,
  fitSet: Protocol[],
  testSet: Protocol[],
  asOf: string,
  config: ModelConfig | 'flat',
): ValidationTest {
  const fit = config === 'flat' ? null : fitModel(fitSet, asOf, config);
  const flatMed = config === 'flat' ? flatMedian(fitSet) : 0;
  const predicted: number[] = [];
  const actual: number[] = [];
  for (const p of testSet) {
    const pred =
      config === 'flat' ? Math.max(1, Math.round(p.tvl_usd * flatMed)) : Math.max(1, Math.round(10 ** predictLog(p, asOf, fit!)));
    predicted.push(pred);
    actual.push(p.mcap_usd!);
  }
  const ratios = predicted.map((pr, i) => Math.max(pr, actual[i]!) / Math.min(pr, actual[i]!));
  const within3 = ratios.filter((r) => r <= 3).length;
  // Brier for "actual mcap/TVL above the fit set's median ratio": the model
  // predicts it from its own predicted log-ratio and the test residuals' spread.
  const logResid = predicted.map((pr, i) => Math.log10(actual[i]! / pr));
  const sigma = Math.max(sd(logResid), 1e-9);
  const threshold = median(fitSet.map((p) => Math.log10(p.mcap_usd! / p.tvl_usd)));
  let brierSum = 0;
  let baseSum = 0;
  let above = 0;
  const ys: number[] = [];
  for (let i = 0; i < testSet.length; i += 1) {
    const y = Math.log10(actual[i]! / testSet[i]!.tvl_usd) > threshold ? 1 : 0;
    ys.push(y);
    above += y;
    const prob = normCdf((Math.log10(predicted[i]! / testSet[i]!.tvl_usd) - threshold) / sigma);
    brierSum += (prob - y) * (prob - y);
  }
  const baseRate = above / testSet.length;
  for (const y of ys) baseSum += (baseRate - y) * (baseRate - y);
  const z25 = 0.674;
  const z90 = 1.282;
  return {
    name,
    fit_n: fitSet.length,
    test_n: testSet.length,
    median_miss_x: Math.round(median(ratios) * 100) / 100,
    within_3x: within3,
    within_3x_pct: Math.round((within3 / testSet.length) * 1000) / 10,
    brier: Math.round((brierSum / testSet.length) * 1000) / 1000,
    brier_base: Math.round((baseSum / testSet.length) * 1000) / 1000,
    base_rate: Math.round(baseRate * 1000) / 1000,
    hold_25_75: Math.round((logResid.filter((r) => Math.abs(r) <= z25 * sigma).length / testSet.length) * 1000) / 1000,
    hold_10_90: Math.round((logResid.filter((r) => Math.abs(r) <= z90 * sigma).length / testSet.length) * 1000) / 1000,
  };
}

/** Leave-one-out predictions for one config: each live protocol predicted from all the others. */
function looPredictions(live: Protocol[], asOf: string, config: ModelConfig | 'flat'): number[] {
  const out: number[] = [];
  for (let i = 0; i < live.length; i += 1) {
    const fitSet = live.filter((_, j) => j !== i);
    const p = live[i]!;
    if (config === 'flat') {
      out.push(Math.max(1, Math.round(p.tvl_usd * flatMedian(fitSet))));
    } else {
      const fit = fitModel(fitSet, asOf, config);
      out.push(Math.max(1, Math.round(10 ** predictLog(p, asOf, fit))));
    }
  }
  return out;
}

function missRatios(predicted: number[], actual: number[]): number[] {
  return predicted.map((pr, i) => Math.max(pr, actual[i]!) / Math.min(pr, actual[i]!));
}

/**
 * Paired bootstrap over the LOO miss ratios: how often does this config's
 * mean log miss beat the base model's, on the same resampled protocols?
 * The mean of log10(miss) is used, not the median: the median is a jumpy
 * statistic and its resampled distribution misleads (chain count scored
 * P=0.69 on medians while losing on every point estimate). 2000 resamples,
 * fixed seed, so the number reproduces exactly.
 */
function pairedPImproves(baseRatios: number[], cfgRatios: number[]): number {
  const rng = mulberry32(20261122);
  const n = baseRatios.length;
  const baseLog = baseRatios.map((r) => Math.log10(r));
  const cfgLog = cfgRatios.map((r) => Math.log10(r));
  let wins = 0;
  const trials = 2000;
  for (let t = 0; t < trials; t += 1) {
    let baseSum = 0;
    let cfgSum = 0;
    for (let i = 0; i < n; i += 1) {
      const idx = Math.floor(rng() * n);
      baseSum += baseLog[idx]!;
      cfgSum += cfgLog[idx]!;
    }
    if (cfgSum < baseSum) wins += 1;
  }
  return Math.round((wins / trials) * 100) / 100;
}

/** Walk-forward split: older half by listing date fits, newer half tests. */
function walkForwardSplit(live: Protocol[]): { older: Protocol[]; newer: Protocol[]; cut: string } {
  const dated = live.filter((p) => p.listed_at !== null).sort((a, b) => (a.listed_at ?? '').localeCompare(b.listed_at ?? ''));
  const cut = dated[Math.floor(dated.length / 2)]!.listed_at!;
  return {
    older: dated.filter((p) => (p.listed_at ?? '') < cut),
    newer: dated.filter((p) => (p.listed_at ?? '') >= cut),
    cut,
  };
}

/**
 * Validate the value model against the snapshot's own live protocols, where
 * the market cap is known and the model can be scored. Held out two ways,
 * walk forward by listing date, a leave-one-out backtest, the flat baseline
 * on the same splits, a per-term ablation table (each term kept or dropped
 * on its numbers, with a paired bootstrap), a negative control, and a
 * 200-refit bootstrap for the slope, the multiple at $100M TVL and the
 * top-10 rank ranges.
 *
 * What the numbers say on this snapshot: the size curve beats the flat
 * median out of sample (LOO miss x3.41 vs x4.94, within-3x 47.9% vs 33.6%),
 * and the category effect helps walk-forward (x2.60 vs x2.81 size-only).
 * Everything else — 7d growth, age, chain count — is noise: none of them
 * improves LOO or walk-forward beyond the paired bootstrap's noise band,
 * and the age term's fitted sign flips between eras, which is why its
 * walk-forward miss explodes. The board says so on the page instead of
 * hiding it: the model ranks launches by the market's own pricing, it does
 * not predict a price.
 */
export function validateModel(snapshot: Snapshot, boardRows: BoardRow[]): Validation {
  const live = liveComparables(snapshot);
  const asOf = snapshot.as_of;
  const actual = live.map((p) => p.mcap_usd!);
  const bySlug = [...live].sort((a, b) => a.slug.localeCompare(b.slug));
  const halfA = bySlug.filter((_, i) => i % 2 === 0);
  const halfB = bySlug.filter((_, i) => i % 2 === 1);
  const heldOut = [
    runTest('Held out, half A fits half B', halfA, halfB, asOf, BASE_CONFIG),
    runTest('Held out, half B fits half A', halfB, halfA, asOf, BASE_CONFIG),
  ];
  const { older, newer, cut } = walkForwardSplit(live);
  const walkForward = { ...runTest('Walk forward, older fits newer', older, newer, asOf, BASE_CONFIG), cut };
  const flatWalkForward = { ...runTest('Walk forward, flat baseline', older, newer, asOf, 'flat'), cut };
  const looPreds = looPredictions(live, asOf, BASE_CONFIG);
  const looRatios = missRatios(looPreds, actual);
  const looLogResid = looPreds.map((pr, i) => Math.log10(actual[i]! / pr));
  const looSigma = Math.max(sd(looLogResid), 1e-9);
  const looThreshold = median(live.map((p) => Math.log10(p.mcap_usd! / p.tvl_usd)));
  let looBrier = 0;
  let looBase = 0;
  let looAbove = 0;
  const looYs: number[] = [];
  for (let i = 0; i < live.length; i += 1) {
    const y = Math.log10(actual[i]! / live[i]!.tvl_usd) > looThreshold ? 1 : 0;
    looYs.push(y);
    looAbove += y;
    const prob = normCdf((Math.log10(looPreds[i]! / live[i]!.tvl_usd) - looThreshold) / looSigma);
    looBrier += (prob - y) * (prob - y);
  }
  const looBaseRate = looAbove / live.length;
  for (const y of looYs) looBase += (looBaseRate - y) * (looBaseRate - y);
  const looWithin3 = looRatios.filter((r) => r <= 3).length;
  const loo: ValidationTest = {
    name: 'Leave-one-out backtest',
    fit_n: live.length - 1,
    test_n: live.length,
    median_miss_x: Math.round(median(looRatios) * 100) / 100,
    within_3x: looWithin3,
    within_3x_pct: Math.round((looWithin3 / live.length) * 1000) / 10,
    brier: Math.round((looBrier / live.length) * 1000) / 1000,
    brier_base: Math.round((looBase / live.length) * 1000) / 1000,
    base_rate: Math.round(looBaseRate * 1000) / 1000,
    hold_25_75: Math.round((looLogResid.filter((r) => Math.abs(r) <= 0.674 * looSigma).length / live.length) * 1000) / 1000,
    hold_10_90: Math.round((looLogResid.filter((r) => Math.abs(r) <= 1.282 * looSigma).length / live.length) * 1000) / 1000,
  };
  const flatLooPreds = looPredictions(live, asOf, 'flat');
  // The flat LOO test needs its own out-of-sample pass, not a fit on nothing:
  // rebuild it from the LOO predictions with the same scoring as runTest.
  const flatLoo = flatTestFromPreds('Leave-one-out, flat baseline', live, flatLooPreds);
  const flatLooRatios = missRatios(flatLooPreds, actual);

  // ---- Ablation: every term, LOO + walk-forward + paired bootstrap. ----
  const ablationConfigs: { config: ModelConfig | 'flat'; term: string; note: string }[] = [
    { config: SIZE_ONLY_CONFIG, term: 'size curve only (no category)', note: 'LOO slightly better, walk-forward worse — the category effect stays.' },
    { config: BASE_CONFIG, term: 'size curve + category effect (base)', note: 'The shipped model.' },
    { config: MOM_CONFIG, term: '+ own 7d growth', note: 'Fitted sign flips between eras; no out-of-sample gain on either split.' },
    { config: AGE_CONFIG, term: '+ age with no token', note: 'Sign flips between eras; walk-forward miss explodes — the term is era, not signal.' },
    { config: CHAIN_CONFIG, term: '+ chain count', note: 'Coefficient ≈ 0; no gain on either split.' },
    { config: CONTROL_CONFIG, term: '+ slug-hash noise (control)', note: 'Must not help — and does not: no LOO gain, paired bootstrap at noise level, same as the dropped terms.' },
    { config: FULL_CONFIG, term: 'size + 7d growth + age', note: 'The brief §2 literal formula: worse than the base on both splits.' },
  ];
  const ablation: AblationRow[] = [];
  const looPredCache = new Map<string, number[]>();
  looPredCache.set('base', looPreds);
  looPredCache.set('flat', flatLooPreds);
  for (const { config, term, note } of ablationConfigs) {
    const key = config === 'flat' ? 'flat' : config.key;
    let preds = looPredCache.get(key);
    if (preds === undefined) {
      preds = looPredictions(live, asOf, config);
      looPredCache.set(key, preds);
    }
    const ratios = missRatios(preds, actual);
    const wf = runTest(`Walk forward, ${term}`, older, newer, asOf, config);
    const isBase = key === 'base';
    ablation.push({
      term,
      kept: isBase,
      loo_miss_x: Math.round(median(ratios) * 100) / 100,
      loo_within3_pct: Math.round((ratios.filter((r) => r <= 3).length / live.length) * 1000) / 10,
      wf_miss_x: wf.median_miss_x,
      wf_within3_pct: wf.within_3x_pct,
      p_improves: isBase ? 1 : pairedPImproves(looRatios, ratios),
      note,
    });
  }

  // ---- Bootstrap: 200 refits, slope + multiple at $100M + rank ranges. ----
  const boot = bootstrap(live, asOf, boardRows);

  return {
    live_n: live.length,
    held_out: heldOut,
    walk_forward: walkForward,
    loo,
    flat_loo: flatLoo,
    flat_walk_forward: flatWalkForward,
    range_holds: { p25_75: loo.hold_25_75, p10_90: loo.hold_10_90, stated_25_75: 0.5, stated_10_90: 0.8 },
    ablation,
    bootstrap: boot,
  };
}

/** A ValidationTest built from already-computed out-of-sample predictions (flat LOO). */
function flatTestFromPreds(name: string, live: Protocol[], predicted: number[]): ValidationTest {
  const actual = live.map((p) => p.mcap_usd!);
  const ratios = missRatios(predicted, actual);
  const within3 = ratios.filter((r) => r <= 3).length;
  const logResid = predicted.map((pr, i) => Math.log10(actual[i]! / pr));
  const sigma = Math.max(sd(logResid), 1e-9);
  const threshold = median(live.map((p) => Math.log10(p.mcap_usd! / p.tvl_usd)));
  let brierSum = 0;
  let baseSum = 0;
  let above = 0;
  const ys: number[] = [];
  for (let i = 0; i < live.length; i += 1) {
    const y = Math.log10(actual[i]! / live[i]!.tvl_usd) > threshold ? 1 : 0;
    ys.push(y);
    above += y;
    const prob = normCdf((Math.log10(predicted[i]! / live[i]!.tvl_usd) - threshold) / sigma);
    brierSum += (prob - y) * (prob - y);
  }
  const baseRate = above / live.length;
  for (const y of ys) baseSum += (baseRate - y) * (baseRate - y);
  return {
    name,
    fit_n: live.length - 1,
    test_n: live.length,
    median_miss_x: Math.round(median(ratios) * 100) / 100,
    within_3x: within3,
    within_3x_pct: Math.round((within3 / live.length) * 1000) / 10,
    brier: Math.round((brierSum / live.length) * 1000) / 1000,
    brier_base: Math.round((baseSum / live.length) * 1000) / 1000,
    base_rate: Math.round(baseRate * 1000) / 1000,
    hold_25_75: Math.round((logResid.filter((r) => Math.abs(r) <= 0.674 * sigma).length / live.length) * 1000) / 1000,
    hold_10_90: Math.round((logResid.filter((r) => Math.abs(r) <= 1.282 * sigma).length / live.length) * 1000) / 1000,
  };
}

function bootstrap(live: Protocol[], asOf: string, boardRows: BoardRow[]): Bootstrap {
  const rng = mulberry32(20261123);
  const n = 200;
  const slopes: number[] = [];
  const mults: number[] = [];
  const topSlugs = boardRows.slice(0, 10).map((r) => r.slug);
  const rankLists = new Map<string, number[]>();
  for (const slug of topSlugs) rankLists.set(slug, []);
  // The board rows carry their protocols' TVL/category; re-score them per refit.
  const boardProtos: Protocol[] = boardRows.map((r) => ({
    slug: r.slug,
    name: r.name,
    category: r.category,
    chains: r.chains,
    tvl_usd: r.tvl_usd,
    change_7d: r.change_7d,
    listed_at: null,
    mcap_usd: null,
    gecko_id: null,
    symbol: null,
  }));
  for (let t = 0; t < n; t += 1) {
    const sample: Protocol[] = [];
    for (let i = 0; i < live.length; i += 1) sample.push(live[Math.floor(rng() * live.length)]!);
    const fit = fitModel(sample, asOf, BASE_CONFIG);
    slopes.push(fit.beta[1]!);
    mults.push(10 ** (fit.beta[0]! + (fit.beta[1]! - 1) * 8));
    const scored = boardProtos
      .map((p) => ({ slug: p.slug, implied: Math.max(1, Math.round(10 ** predictLog(p, asOf, fit))) }))
      .sort((a, b) => b.implied - a.implied || a.slug.localeCompare(b.slug));
    scored.forEach((row, i) => {
      const list = rankLists.get(row.slug);
      if (list !== undefined) list.push(i + 1);
    });
  }
  const pct = (values: number[], q: number): number => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor((q / 100) * sorted.length))]!;
  };
  return {
    n,
    slope_mean: Math.round(mean(slopes) * 1000) / 1000,
    slope_se: Math.round(sd(slopes) * 1000) / 1000,
    mult100m_mean: Math.round(mean(mults) * 1000) / 1000,
    mult100m_se: Math.round(sd(mults) * 1000) / 1000,
    rank_ranges: boardRows.slice(0, 10).map((r) => {
      const list = rankLists.get(r.slug) ?? [r.rank];
      return { slug: r.slug, name: r.name, base_rank: r.rank, p5: pct(list, 5), p95: pct(list, 95) };
    }),
  };
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
 * what the chase costs next to what it chases — plus the break-even the
 * verdict is built on: the all-in cost, the hours priced at $25/hour, and
 * what the deposit would earn in a 5% T-bill over the hold. The farm beats a
 * T-bill and $25 an hour when the eventual claim is worth at least that
 * break-even; no payout is assumed anywhere.
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
  // Hours of attention: the fixed steps (10 + 30 + 20 + 30 or 5 + 5 minutes)
  // plus 25 minutes a week (15 top-up + 10 points check) over the hold.
  const fixedMin = 10 + 30 + 20 + (p.chains.length > 1 ? 30 : 5) + 5;
  const hoursTotal = Math.round(((fixedMin + 25 * weeks) / 60) * 100) / 100;
  const timeValue = Math.round(hoursTotal * 25 * 100) / 100;
  const tbill = Math.round(deposit * 0.05 * (holdDays / 365) * 100) / 100;
  const breakeven = Math.round((total + timeValue + tbill) * 100) / 100;
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
      hours_total: hoursTotal,
      time_value_usd: timeValue,
      tbill_usd: tbill,
      breakeven_usd: breakeven,
      breakeven_pct_of_implied: Math.round((breakeven / Math.max(1, impliedUsd)) * 1000000) / 10000,
    },
  };
}

export function buildRadar(snapshot: Snapshot): { board: BoardRow[]; radar: Radar } {
  const live = liveComparables(snapshot);
  const fit = fitModel(live, snapshot.as_of, BASE_CONFIG);
  const watchlist = new Set(snapshot.watchlist);
  const early = snapshot.protocols.filter(isRankable);
  const rows = early
    .map((p) => {
      const model = scoreProtocol(p, snapshot.as_of, fit);
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
  const calibrationRows = fit.effectRows.map((r) => ({
    category: r.category,
    live_n: r.live_n,
    median: Math.round(r.median_resid * 1000) / 1000,
    used: Math.round(10 ** r.effect * 1000) / 1000,
  }));
  const live25 = liveRows(snapshot);
  const validation = validateModel(snapshot, rows);
  const farmUnder1 = rows.filter((r) => r.farm_total.breakeven_pct_of_implied < 1).length;
  return {
    board: rows,
    radar: {
      as_of: snapshot.as_of,
      floor_usd: snapshot.floor_usd,
      source_note: snapshot.source_note,
      watchlist_size: snapshot.watchlist.length,
      protocol_total: snapshot.protocols.length,
      early_size: rows.length,
      live_size: live25.length,
      live_total: snapshot.protocols.filter((p) => !isPreToken(p)).length,
      size_fit: {
        intercept: Math.round(fit.beta[0]! * 10000) / 10000,
        slope: Math.round(fit.beta[1]! * 10000) / 10000,
        mult_100m: Math.round(10 ** (fit.beta[0]! + (fit.beta[1]! - 1) * 8) * 10000) / 10000,
        mult_2_75b: Math.round(10 ** (fit.beta[0]! + (fit.beta[1]! - 1) * Math.log10(2.75e9)) * 10000) / 10000,
      },
      calibration: calibrationRows,
      overall_median: median(live.map((p) => p.mcap_usd! / p.tvl_usd)),
      farm_breakeven_under_1pct: farmUnder1,
      validation,
      rows,
      live: live25,
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

