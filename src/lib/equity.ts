import { ALL_HANDS, combosFor, type Card } from "./cards";
import { evaluate } from "./evaluator";
import type { Weights } from "./ranges";
import type { Rng } from "./rng";

/** A specific two-card combo carrying a weight (probability mass in a range). */
export interface WCombo {
  a: Card;
  b: Card;
  w: number;
}

export function combosFromWeights(w: Weights, dead: readonly Card[] = []): WCombo[] {
  const deadSet = new Set(dead);
  const out: WCombo[] = [];
  for (const h of ALL_HANDS) {
    const f = w[h] ?? 0;
    if (f <= 0) continue;
    for (const [a, b] of combosFor(h)) {
      if (deadSet.has(a) || deadSet.has(b)) continue;
      out.push({ a, b, w: f });
    }
  }
  return out;
}

export function filterDead(range: readonly WCombo[], dead: readonly Card[]): WCombo[] {
  if (!dead.length) return range.slice();
  const d = new Set(dead);
  return range.filter((c) => !d.has(c.a) && !d.has(c.b) && c.w > 0);
}

export function totalWeight(range: readonly WCombo[]): number {
  let t = 0;
  for (const c of range) t += c.w;
  return t;
}

class Sampler {
  private items: readonly WCombo[];
  private cum: Float64Array;
  private total: number;
  constructor(items: readonly WCombo[]) {
    this.items = items;
    this.cum = new Float64Array(items.length);
    let t = 0;
    for (let i = 0; i < items.length; i++) {
      t += Math.max(0, items[i].w);
      this.cum[i] = t;
    }
    this.total = t;
  }
  get empty() {
    return this.total <= 0;
  }
  sample(rng: Rng): WCombo {
    const r = rng() * this.total;
    let lo = 0;
    let hi = this.cum.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.cum[mid] < r) lo = mid + 1;
      else hi = mid;
    }
    return this.items[lo];
  }
}

export interface EquityResult {
  equity: number;
  win: number;
  tie: number;
  samples: number;
}

const hand7a: Card[] = new Array(7).fill(0);
const hand7b: Card[] = new Array(7).fill(0);
const used = new Uint8Array(52);

/** Monte Carlo equity of a fixed hand vs a weighted range, completing the board randomly. */
export function equityVsRange(
  hero: readonly [Card, Card],
  board: readonly Card[],
  range: readonly WCombo[],
  iters = 2000,
  rng: Rng = Math.random,
): EquityResult {
  const live = filterDead(range, [hero[0], hero[1], ...board]);
  const sampler = new Sampler(live);
  if (sampler.empty) return { equity: 0.5, win: 0, tie: 0, samples: 0 };
  const need = 5 - board.length;
  let win = 0;
  let tie = 0;
  for (let it = 0; it < iters; it++) {
    const v = sampler.sample(rng);
    used.fill(0);
    used[hero[0]] = 1;
    used[hero[1]] = 1;
    used[v.a] = 1;
    used[v.b] = 1;
    for (const c of board) used[c] = 1;
    hand7a[0] = hero[0];
    hand7a[1] = hero[1];
    hand7b[0] = v.a;
    hand7b[1] = v.b;
    let k = 2;
    for (const c of board) {
      hand7a[k] = c;
      hand7b[k] = c;
      k++;
    }
    for (let d = 0; d < need; d++) {
      let c: number;
      do c = Math.floor(rng() * 52);
      while (used[c]);
      used[c] = 1;
      hand7a[k] = c;
      hand7b[k] = c;
      k++;
    }
    const s1 = evaluate(hand7a, 7);
    const s2 = evaluate(hand7b, 7);
    if (s1 > s2) win++;
    else if (s1 === s2) tie++;
  }
  return { equity: (win + tie / 2) / iters, win: win / iters, tie: tie / iters, samples: iters };
}

/** Monte Carlo equity of range A vs range B on a (partial) board. */
export function rangeVsRange(
  ra: readonly WCombo[],
  rb: readonly WCombo[],
  board: readonly Card[],
  iters = 1500,
  rng: Rng = Math.random,
): number {
  const A = new Sampler(filterDead(ra, board));
  const Bs = new Sampler(filterDead(rb, board));
  if (A.empty || Bs.empty) return 0.5;
  const need = 5 - board.length;
  let score = 0;
  let n = 0;
  for (let it = 0; it < iters; it++) {
    const x = A.sample(rng);
    let y = Bs.sample(rng);
    let guard = 0;
    while ((y.a === x.a || y.a === x.b || y.b === x.a || y.b === x.b) && guard++ < 12) y = Bs.sample(rng);
    if (guard >= 12) continue;
    used.fill(0);
    used[x.a] = used[x.b] = used[y.a] = used[y.b] = 1;
    for (const c of board) used[c] = 1;
    hand7a[0] = x.a;
    hand7a[1] = x.b;
    hand7b[0] = y.a;
    hand7b[1] = y.b;
    let k = 2;
    for (const c of board) {
      hand7a[k] = c;
      hand7b[k] = c;
      k++;
    }
    for (let d = 0; d < need; d++) {
      let c: number;
      do c = Math.floor(rng() * 52);
      while (used[c]);
      used[c] = 1;
      hand7a[k] = c;
      hand7b[k] = c;
      k++;
    }
    const s1 = evaluate(hand7a, 7);
    const s2 = evaluate(hand7b, 7);
    score += s1 > s2 ? 1 : s1 === s2 ? 0.5 : 0;
    n++;
  }
  return n ? score / n : 0.5;
}

/** Hand vs hand. Exact enumeration when two or fewer cards are to come, Monte Carlo preflop. */
export function handVsHand(
  h1: readonly [Card, Card],
  h2: readonly [Card, Card],
  board: readonly Card[] = [],
  iters = 6000,
  rng: Rng = Math.random,
): EquityResult {
  const dead = new Set<Card>([h1[0], h1[1], h2[0], h2[1], ...board]);
  const deck: Card[] = [];
  for (let c = 0; c < 52; c++) if (!dead.has(c)) deck.push(c);
  const need = 5 - board.length;
  let win = 0;
  let tie = 0;
  let n = 0;
  const run = (extra: Card[]) => {
    const b = [...board, ...extra];
    const s1 = evaluate([h1[0], h1[1], ...b]);
    const s2 = evaluate([h2[0], h2[1], ...b]);
    if (s1 > s2) win++;
    else if (s1 === s2) tie++;
    n++;
  };
  if (need === 0) run([]);
  else if (need === 1) for (const c of deck) run([c]);
  else if (need === 2) {
    for (let i = 0; i < deck.length; i++) for (let j = i + 1; j < deck.length; j++) run([deck[i], deck[j]]);
  } else {
    for (let it = 0; it < iters; it++) {
      const pickd: Card[] = [];
      while (pickd.length < need) {
        const c = deck[Math.floor(rng() * deck.length)];
        if (!pickd.includes(c)) pickd.push(c);
      }
      run(pickd);
    }
  }
  return { equity: (win + tie / 2) / n, win: win / n, tie: tie / n, samples: n };
}

/** Equity vs a uniformly random hand. */
export function equityVsRandom(hero: readonly [Card, Card], board: readonly Card[] = [], iters = 3000, rng: Rng = Math.random): number {
  const all: WCombo[] = [];
  for (let a = 0; a < 52; a++) for (let b = a + 1; b < 52; b++) all.push({ a, b, w: 1 });
  return equityVsRange(hero, board, all, iters, rng).equity;
}
