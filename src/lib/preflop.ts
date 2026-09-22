import { rfiChart, vs3betChart, vs4betChart, vsLimpChart, vsOpenChart } from "../data/charts";
import { isInPositionOn, posLabel, positionsFor, POS_INFO, type PosId, type TableSize } from "../data/positions";
import type { SizingStyle, Stake } from "../data/stakes";
import type { Archetype } from "../data/archetypes";
import { ALL_HANDS, comboCount, gridHand, handGridPos, randomCombo, type Card, type HandClass } from "./cards";
import { actionWeights, isMixed, primaryAction, type Chart, type Freqs, type PfAction } from "./chart";
import { fmtMoney, type Units } from "./format";
import { gradeFreq, type Grade } from "./grading";
import { equityOf, features, PREMIUMS } from "./handStats";
import type { Weights } from "./ranges";
import { pick, weightedPick, type Rng } from "./rng";

export type SpotKind = "rfi" | "vsOpen" | "vs3bet" | "vs4bet" | "vsLimp";

export const SPOT_KINDS: { id: SpotKind; label: string; desc: string }[] = [
  { id: "rfi", label: "Open (RFI)", desc: "Folded to you — raise or fold?" },
  { id: "vsOpen", label: "Facing an open", desc: "Someone raised — 3-bet, call, or fold?" },
  { id: "vs3bet", label: "Facing a 3-bet", desc: "You opened and got re-raised." },
  { id: "vs4bet", label: "Facing a 4-bet", desc: "You 3-bet and they came back over the top." },
  { id: "vsLimp", label: "Limpers (live)", desc: "Iso-raise, over-limp, or fold?" },
];

export interface SeatView {
  pos: PosId;
  label: string;
  stackBB: number;
  betBB: number;
  status: "folded" | "acted" | "waiting" | "hero";
  action?: string;
  isButton: boolean;
  isVillain: boolean;
}

export interface ActionOption {
  key: PfAction;
  label: string;
  toBB: number;
  costBB: number;
}

export interface PreflopSpot {
  key: string;
  kind: SpotKind;
  table: TableSize;
  hero: PosId;
  villain?: PosId;
  limpers: PosId[];
  hand: HandClass;
  cards: [Card, Card];
  chart: Chart;
  /** Range hero arrived with (for 3-bet/4-bet spots) — null means any hand. */
  heroRange: Weights | null;
  /** Range the aggressor/limper represents. */
  villainRange: Weights | null;
  villainRangeLabel: string;
  options: ActionOption[];
  potBB: number;
  toCallBB: number;
  heroInBB: number;
  seats: SeatView[];
  log: string[];
  headline: string;
}

export interface SpotRequest {
  kind: SpotKind;
  hero: PosId;
  villain?: PosId;
  limpers?: PosId[];
  hand?: HandClass;
}

export interface GenOptions {
  table: TableSize;
  kinds: SpotKind[];
  heroPositions: PosId[];
  stake: Stake;
  sizing: SizingStyle;
  units: Units;
  rng: Rng;
  request?: SpotRequest;
}

/** A loose live limping range, used for equity math vs limpers. */
const LIMP_RANGE: Weights = (() => {
  const w: Weights = {};
  for (const h of ALL_HANDS) {
    const f = features(h);
    const playable =
      f.pair || (f.suited && (f.ace || f.hi >= 9 || f.gap <= 2)) || (!f.suited && f.lo >= 8) || (!f.suited && f.ace && f.lo >= 5);
    if (playable && !PREMIUMS.includes(h)) w[h] = f.category === "strong" ? 0.4 : 1;
  }
  return w;
})();

const r05 = (x: number) => Math.round(x * 2) / 2;

function neighbors(h: HandClass): HandClass[] {
  const [r, c] = handGridPos(h);
  const out: HandClass[] = [];
  for (const [dr, dc] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]) {
    const a = r + dr;
    const b = c + dc;
    if (a >= 0 && a < 13 && b >= 0 && b < 13) out.push(gridHand(a, b));
  }
  return out;
}

/** Sample a hand, biased toward decisions that are close (mixed or on a range boundary). */
function sampleHand(chart: Chart, base: Weights | null, rng: Rng): HandClass {
  const natural = rng() < 0.18;
  const items: HandClass[] = [];
  const ws: number[] = [];
  for (const h of ALL_HANDS) {
    const b = base ? (base[h] ?? 0) : 1;
    if (b <= 0) continue;
    let w = b * comboCount(h);
    if (!natural) {
      const prim = primaryAction(chart, h);
      if (isMixed(chart, h)) w *= 4;
      else if (neighbors(h).some((n) => primaryAction(chart, n) !== prim)) w *= 2.6;
      else if (prim === chart.rest && equityOf(h) < 47) w *= 0.2;
    }
    items.push(h);
    ws.push(w);
  }
  return weightedPick(items, ws, rng);
}

interface Candidate {
  kind: SpotKind;
  hero: PosId;
}

function candidates(order: PosId[], kinds: SpotKind[], heroes: PosId[]): Candidate[] {
  const out: Candidate[] = [];
  for (const kind of kinds) {
    for (const hero of order) {
      if (heroes.length && !heroes.includes(hero)) continue;
      const i = order.indexOf(hero);
      const before = order.slice(0, i).filter((p) => p !== "BB");
      const after = order.slice(i + 1);
      const nonBlindBefore = before.filter((p) => p !== "SB");
      if (kind === "rfi" && hero !== "BB") out.push({ kind, hero });
      if (kind === "vsOpen" && before.length) out.push({ kind, hero });
      if (kind === "vs3bet" && hero !== "BB" && after.length) out.push({ kind, hero });
      if (kind === "vs4bet" && before.length) out.push({ kind, hero });
      if (kind === "vsLimp" && nonBlindBefore.length) out.push({ kind, hero });
    }
  }
  return out;
}

export function generateSpot(opts: GenOptions): PreflopSpot {
  const { table, stake, sizing, rng } = opts;
  const order = positionsFor(table);
  const sz = stake.sizing[sizing];
  const stack = stake.stackBB;
  const round = sizing === "live" ? (x: number) => Math.round(x) : r05;
  const L = (p: PosId) => posLabel(p, table);

  for (let attempt = 0; attempt < 40; attempt++) {
    let kind: SpotKind;
    let hero: PosId;
    if (opts.request) {
      kind = opts.request.kind;
      hero = opts.request.hero;
    } else {
      const cands = candidates(order, opts.kinds, opts.heroPositions);
      const fallback = candidates(order, opts.kinds.length ? opts.kinds : ["rfi"], []);
      const c = pick(cands.length ? cands : fallback, rng);
      kind = c.kind;
      hero = c.hero;
    }
    const hi = order.indexOf(hero);
    const before = order.slice(0, hi).filter((p) => p !== "BB");
    const after = order.slice(hi + 1);
    const openSize = (p: PosId) => (p === "SB" ? sz.sbOpen : sz.open);
    const threeBetTo = (tb: PosId, op: PosId) => round(openSize(op) * (isInPositionOn(tb, op) ? sz.threeBetIP : sz.threeBetOOP));
    const fourBetTo = (fb: PosId, tb: PosId, three: number) => {
      const raw = three * (isInPositionOn(fb, tb) ? sz.fourBet : sz.fourBet * 1.25);
      return round(raw);
    };

    const contrib = new Map<PosId, number>();
    const actions = new Map<PosId, string>();
    const folded = new Set<PosId>();
    contrib.set("SB", 0.5);
    contrib.set("BB", 1);
    const log: string[] = [];
    let chart: Chart | undefined;
    let heroRange: Weights | null = null;
    let villainRange: Weights | null = null;
    let villainRangeLabel = "";
    let villain: PosId | undefined;
    let limpers: PosId[] = [];
    let headline = "";
    const options: ActionOption[] = [];
    const heroBlind = hero === "SB" ? 0.5 : hero === "BB" ? 1 : 0;

    const amt = (bb: number) => fmtMoney(bb, stake, opts.units);

    if (kind === "rfi") {
      if (hero === "BB") continue;
      chart = rfiChart(hero);
      if (!chart) continue;
      before.forEach((p) => folded.add(p));
      if (before.length) log.push(before.length === 1 ? `${L(before[0])} folds` : `${before.length} players fold`);
      const open = openSize(hero);
      options.push({ key: "fold", label: "Fold", toBB: heroBlind, costBB: 0 });
      if (hero !== "SB") options.push({ key: "call", label: "Limp", toBB: 1, costBB: 1 });
      options.push({ key: "raise", label: "Raise", toBB: open, costBB: open - heroBlind });
      const bbDefend = vsOpenChart("BB", hero);
      if (bbDefend) {
        const w: Weights = {};
        for (const h of ALL_HANDS) {
          const f = bbDefend.freqs[h];
          const v = (f.call ?? 0) + (f.raise ?? 0);
          if (v > 0) w[h] = v;
        }
        villainRange = w;
        villainRangeLabel = "BB's defending range";
      }
      headline = before.length ? `Folded to you in the ${POS_INFO[hero].name}` : `You're first to act (${POS_INFO[hero].name})`;
    } else if (kind === "vsOpen") {
      const openers = opts.request?.villain ? [opts.request.villain] : before;
      if (!openers.length) continue;
      villain = pick(openers, rng);
      chart = vsOpenChart(hero, villain);
      if (!chart) continue;
      const open = openSize(villain);
      before.forEach((p) => p !== villain && folded.add(p));
      order.slice(order.indexOf(villain) + 1, hi).forEach((p) => folded.add(p));
      contrib.set(villain, open);
      actions.set(villain, `Raise ${amt(open)}`);
      log.push(`${L(villain)} raises to ${amt(open)}`);
      const three = threeBetTo(hero, villain);
      options.push({ key: "fold", label: "Fold", toBB: heroBlind, costBB: 0 });
      options.push({ key: "call", label: "Call", toBB: open, costBB: open - heroBlind });
      options.push({ key: "raise", label: "3-Bet", toBB: three, costBB: three - heroBlind });
      villainRange = actionWeights(rfiChart(villain)!, "raise");
      villainRangeLabel = `${L(villain)}'s opening range`;
      headline = `${L(villain)} opens to ${amt(open)}. You're in the ${POS_INFO[hero].name}.`;
    } else if (kind === "vs3bet") {
      if (hero === "BB" || !after.length) continue;
      const tbs = opts.request?.villain ? [opts.request.villain] : after;
      villain = pick(tbs, rng);
      chart = vs3betChart(hero, villain);
      const rfi = rfiChart(hero);
      const vo = vsOpenChart(villain, hero);
      if (!chart || !rfi || !vo) continue;
      heroRange = actionWeights(rfi, "raise");
      const open = openSize(hero);
      const three = threeBetTo(villain, hero);
      const four = Math.min(stack, fourBetTo(hero, villain, three));
      before.forEach((p) => folded.add(p));
      order.forEach((p) => p !== hero && p !== villain && folded.add(p));
      contrib.set(hero, open);
      contrib.set(villain, three);
      actions.set(villain, `3-Bet ${amt(three)}`);
      log.push(`You raise to ${amt(open)}`, `${L(villain)} 3-bets to ${amt(three)}`);
      options.push({ key: "fold", label: "Fold", toBB: open, costBB: 0 });
      options.push({ key: "call", label: "Call", toBB: three, costBB: three - open });
      options.push({ key: "raise", label: "4-Bet", toBB: four, costBB: four - open });
      villainRange = actionWeights(vo, "raise");
      villainRangeLabel = `${L(villain)}'s 3-bet range`;
      headline = `You opened ${L(hero)} to ${amt(open)}. ${L(villain)} 3-bets to ${amt(three)}.`;
    } else if (kind === "vs4bet") {
      const openers = opts.request?.villain ? [opts.request.villain] : before;
      if (!openers.length) continue;
      villain = pick(openers, rng);
      const vo = vsOpenChart(hero, villain);
      const v3 = vs3betChart(villain, hero);
      if (!vo || !v3) continue;
      chart = vs4betChart(hero, villain);
      heroRange = actionWeights(vo, "raise");
      const open = openSize(villain);
      const three = threeBetTo(hero, villain);
      const four = Math.min(stack, fourBetTo(villain, hero, three));
      order.forEach((p) => p !== hero && p !== villain && folded.add(p));
      contrib.set(villain, four);
      contrib.set(hero, three);
      actions.set(villain, `4-Bet ${amt(four)}`);
      log.push(`${L(villain)} raises to ${amt(open)}`, `You 3-bet to ${amt(three)}`, `${L(villain)} 4-bets to ${amt(four)}`);
      options.push({ key: "fold", label: "Fold", toBB: three, costBB: 0 });
      options.push({ key: "call", label: "Call", toBB: four, costBB: four - three });
      options.push({ key: "allin", label: "5-Bet All-in", toBB: stack, costBB: stack - three });
      villainRange = actionWeights(v3, "raise");
      villainRangeLabel = `${L(villain)}'s 4-bet range`;
      headline = `${L(villain)} opened, you 3-bet to ${amt(three)}, and ${L(villain)} 4-bets to ${amt(four)}.`;
    } else {
      const pool = before.filter((p) => p !== "SB");
      if (!pool.length) continue;
      if (opts.request?.limpers?.length) limpers = opts.request.limpers;
      else {
        const n = pool.length >= 2 && rng() < 0.45 ? 2 : 1;
        const shuffled = pool.slice().sort(() => rng() - 0.5);
        limpers = shuffled.slice(0, n).sort((a, b) => order.indexOf(a) - order.indexOf(b));
      }
      chart = vsLimpChart(hero, limpers.length);
      before.forEach((p) => !limpers.includes(p) && folded.add(p));
      limpers.forEach((p) => {
        contrib.set(p, 1);
        actions.set(p, "Limp");
        log.push(`${L(p)} limps`);
      });
      const iso = round(sz.iso + sz.isoPer * (limpers.length - 1) + (hero === "SB" || hero === "BB" ? 1 : 0));
      if (hero === "BB") {
        options.push({ key: "check", label: "Check", toBB: 1, costBB: 0 });
        options.push({ key: "raise", label: "Raise", toBB: iso, costBB: iso - 1 });
      } else {
        options.push({ key: "fold", label: "Fold", toBB: heroBlind, costBB: 0 });
        options.push({ key: "call", label: hero === "SB" ? "Complete" : "Over-limp", toBB: 1, costBB: 1 - heroBlind });
        options.push({ key: "raise", label: "Iso-Raise", toBB: iso, costBB: iso - heroBlind });
      }
      villainRange = LIMP_RANGE;
      villainRangeLabel = "a typical live limping range";
      headline = `${limpers.length === 1 ? "One player limps" : `${limpers.length} players limp`}. You're in the ${POS_INFO[hero].name}.`;
    }
    if (!chart) continue;

    const hand = opts.request?.hand ?? sampleHand(chart, heroRange, rng);
    const dead: Card[] = [];
    const cards = randomCombo(hand, rng, dead);

    let pot = 0;
    for (const v of contrib.values()) pot += v;
    const heroIn = contrib.get(hero) ?? 0;
    const maxBet = Math.max(...contrib.values());
    const toCall = Math.max(0, maxBet - heroIn);

    const seats: SeatView[] = order.map((p) => {
      const bet = contrib.get(p) ?? 0;
      const status: SeatView["status"] = p === hero ? "hero" : folded.has(p) ? "folded" : actions.has(p) ? "acted" : "waiting";
      return {
        pos: p,
        label: L(p),
        stackBB: stack - bet,
        betBB: bet,
        status,
        action: folded.has(p) ? "Fold" : actions.get(p),
        isButton: p === "BTN",
        isVillain: p === villain || limpers.includes(p),
      };
    });

    const key = [kind, table, hero, villain ?? "", limpers.join("+"), hand].join("|");
    return {
      key,
      kind,
      table,
      hero,
      villain,
      limpers,
      hand,
      cards,
      chart,
      heroRange,
      villainRange,
      villainRangeLabel,
      options,
      potBB: pot,
      toCallBB: toCall,
      heroInBB: heroIn,
      seats,
      log,
      headline,
    };
  }
  throw new Error("Could not generate a preflop spot for these filters");
}

export function parseSpotKey(key: string): SpotRequest & { table: TableSize } {
  const [kind, table, hero, villain, limpers, hand] = key.split("|");
  return {
    kind: kind as SpotKind,
    table: Number(table) as TableSize,
    hero: hero as PosId,
    villain: (villain || undefined) as PosId | undefined,
    limpers: limpers ? (limpers.split("+") as PosId[]) : undefined,
    hand,
  };
}

export interface PreflopResult {
  grade: Grade;
  action: PfAction;
  chosenFreq: number;
  best: PfAction;
  bestFreq: number;
  freqs: Freqs;
}

export function gradePreflop(spot: PreflopSpot, action: PfAction): PreflopResult {
  const f = spot.chart.freqs[spot.hand];
  const best = primaryAction(spot.chart, spot.hand);
  const chosen = f[action] ?? 0;
  const bestF = f[best] ?? 0;
  const eq = equityOf(spot.hand);
  const blunderRisk =
    bestF >= 0.95 && ((action === "fold" && (PREMIUMS.includes(spot.hand) || eq >= 63)) || ((action === "raise" || action === "allin") && eq < 45));
  return { grade: gradeFreq(chosen, bestF, blunderRisk), action, chosenFreq: chosen, best, bestFreq: bestF, freqs: f };
}

export interface ExploitVerdict {
  freqs: Freqs;
  best: PfAction;
  changed: boolean;
  note: string;
}

function normalize(f: Freqs): Freqs {
  let s = 0;
  for (const k in f) s += f[k as PfAction] ?? 0;
  if (s <= 0) return f;
  const out: Freqs = {};
  for (const k in f) out[k as PfAction] = (f[k as PfAction] ?? 0) / s;
  return out;
}

function argmax(f: Freqs, order: PfAction[]): PfAction {
  let best = order[0];
  let bv = -1;
  for (const a of order) {
    const v = f[a] ?? 0;
    if (v > bv + 1e-9) {
      bv = v;
      best = a;
    }
  }
  return best;
}

/** Exploitative adjustment of the baseline for a specific opponent type. */
export function preflopExploit(spot: PreflopSpot, arch: Archetype): ExploitVerdict {
  const base = spot.chart.freqs[spot.hand];
  const f: Freqs = { ...base };
  const feat = features(spot.hand);
  const p = arch.preflop;
  const canCall = spot.chart.actions.includes("call");
  const raise = f.raise ?? 0;
  const call = f.call ?? 0;
  const fold = f.fold ?? 0;
  const late = spot.hero === "CO" || spot.hero === "BTN" || spot.hero === "SB";
  const early = ["EP1", "EP2", "EP3", "LJ"].includes(spot.hero);
  let note = "";

  if (spot.kind === "rfi") {
    if (p.stealMore && late && raise < 0.9 && feat.equity >= 47) {
      f.raise = 1;
      f.fold = 0;
      note = "The players behind fold their blinds too often. Steal wider — this hand becomes a clear open.";
    } else if (p.value3betWider && p.respectAggression && early && !feat.suited && !feat.pair && raise > 0 && raise < 0.9) {
      f.fold = (f.fold ?? 0) + raise;
      f.raise = 0;
      note = "Loose, sticky players behind turn weak offsuit opens into multiway pots out of position. Fold the bottom of your early range.";
    }
  } else if (spot.kind === "vsOpen") {
    const bluffy = raise > 0 && feat.category !== "premium" && feat.category !== "strong";
    if (p.bluff3bets === "less" && bluffy) {
      const moveToCall = canCall && (feat.category === "speculative" || call > 0) && (spot.hero === "BB" || spot.hero === "BTN" || spot.hero === "CO");
      if (moveToCall) f.call = call + raise;
      else f.fold = fold + raise;
      f.raise = 0;
      note = "Light 3-bets need folds, and this opponent doesn't fold enough. Flat or fold these bluffs instead.";
    }
    if (p.value3betWider && feat.category === "strong" && raise < 0.7) {
      f.raise = 0.9;
      if (canCall) f.call = 0.1;
      f.fold = 0;
      note = "3-bet for value: this opponent calls 3-bets with worse hands like AJ, KQ and small pairs.";
    }
  } else if (spot.kind === "vs3bet") {
    if (p.respectAggression && feat.category !== "premium") {
      if (raise > 0) {
        f.fold = (f.fold ?? 0) + raise;
        f.raise = 0;
      }
      if (call > 0 && feat.category === "other") {
        f.fold = (f.fold ?? 0) + call * 0.7;
        f.call = call * 0.3;
      }
      note = "This player's 3-bets are value-heavy (often QQ+ or AK). Skip 4-bet bluffs and let marginal hands go.";
    }
    if (p.defendWiderVs3bet && feat.category !== "other" && fold > 0.3) {
      f.call = call + fold * 0.7;
      f.fold = fold * 0.3;
      note = "They 3-bet too light. Defend wider — mostly by calling, especially in position.";
    }
  } else if (spot.kind === "vs4bet") {
    if (p.respectAggression && feat.category !== "premium") {
      f.fold = (f.fold ?? 0) + (f.call ?? 0) + (f.allin ?? 0);
      f.call = 0;
      f.allin = 0;
      note = "A 4-bet from this player is almost always KK+ or AK. Fold everything else.";
    } else if (p.defendWiderVs3bet && ["QQ", "JJ", "TT", "AQs", "AQo", "AKo", "AKs"].includes(spot.hand)) {
      f.allin = (f.allin ?? 0) + (f.fold ?? 0) + (f.call ?? 0) * 0.5;
      f.call = (f.call ?? 0) * 0.5;
      f.fold = 0;
      note = "They 4-bet far too wide. Get it in lighter with hands like JJ, TT and AQ.";
    }
  } else if (spot.kind === "vsLimp") {
    if (p.value3betWider && (feat.category === "premium" || feat.category === "strong") && raise < 0.9) {
      f.raise = 1;
      f.call = 0;
      f.fold = 0;
      f.check = 0;
      note = "Limpers call raises with dominated hands. Iso-raise big for value.";
    }
  }

  const nf = normalize(f);
  const best = argmax(nf, spot.chart.actions);
  const gtoBest = primaryAction(spot.chart, spot.hand);
  return { freqs: nf, best, changed: best !== gtoBest, note: note || arch.counter.preflop };
}
