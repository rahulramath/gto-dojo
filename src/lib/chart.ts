import { ALL_HANDS, comboCount, type HandClass, TOTAL_COMBOS } from "./cards";
import { parseWeights, type Weights } from "./ranges";

export type PfAction = "raise" | "call" | "fold" | "check" | "allin";
export type ChartKind = "rfi" | "vsOpen" | "vs3bet" | "vs4bet" | "vsLimp";

export interface ChartDef {
  id: string;
  title: string;
  short: string;
  kind: ChartKind;
  format: "6max" | "9max" | "both";
  source: "solver" | "live";
  hero: string;
  villain?: string;
  actions: PfAction[];
  labels: Partial<Record<PfAction, string>>;
  ranges: Partial<Record<PfAction, string>>;
  rest: PfAction;
  notes?: string[];
}

export type Freqs = Partial<Record<PfAction, number>>;

export interface Chart extends ChartDef {
  freqs: Record<HandClass, Freqs>;
  overfull: HandClass[];
}

export function buildChart(def: ChartDef): Chart {
  const freqs: Record<HandClass, Freqs> = {};
  for (const h of ALL_HANDS) freqs[h] = {};
  for (const a of def.actions) {
    const src = def.ranges[a];
    if (!src) continue;
    const w = parseWeights(src);
    for (const h in w) if (w[h] > 0) freqs[h][a] = w[h];
  }
  const overfull: HandClass[] = [];
  for (const h of ALL_HANDS) {
    const f = freqs[h];
    let sum = 0;
    for (const a of def.actions) sum += f[a] ?? 0;
    if (sum > 1.0001) {
      overfull.push(h);
      for (const a of def.actions) if (f[a]) f[a] = f[a]! / sum;
      sum = 1;
    }
    const rest = Math.max(0, 1 - sum);
    if (rest > 0.0001) f[def.rest] = (f[def.rest] ?? 0) + rest;
  }
  return { ...def, freqs, overfull };
}

export function primaryAction(chart: Chart, h: HandClass): PfAction {
  const f = chart.freqs[h];
  let best: PfAction = chart.rest;
  let bv = -1;
  for (const a of chart.actions) {
    const v = f[a] ?? 0;
    if (v > bv + 1e-9) {
      bv = v;
      best = a;
    }
  }
  return best;
}

/** Weights of the hands that take `action` in this chart (e.g. the 3-bet range). */
export function actionWeights(chart: Chart, action: PfAction): Weights {
  const w: Weights = {};
  for (const h of ALL_HANDS) {
    const v = chart.freqs[h][action] ?? 0;
    if (v > 0) w[h] = v;
  }
  return w;
}

/** Percent of all 1326 combos that take each action. */
export function actionPercents(chart: Chart): Record<PfAction, number> {
  const out = { raise: 0, call: 0, fold: 0, check: 0, allin: 0 } as Record<PfAction, number>;
  for (const h of ALL_HANDS) {
    const n = comboCount(h);
    for (const a of chart.actions) out[a] += ((chart.freqs[h][a] ?? 0) * n * 100) / TOTAL_COMBOS;
  }
  return out;
}

export function isMixed(chart: Chart, h: HandClass): boolean {
  const f = chart.freqs[h];
  let max = 0;
  for (const a of chart.actions) max = Math.max(max, f[a] ?? 0);
  return max < 0.85;
}
