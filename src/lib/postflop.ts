import { CHARTS } from "../data/charts";
import type { Archetype, Counter, Tendencies } from "../data/archetypes";
import type { PosId } from "../data/positions";
import { analyzeBoard, type Texture } from "./board";
import type { Card } from "./cards";
import { actionWeights, type Chart } from "./chart";
import { combosFromWeights, equityVsRange, rangeVsRange, totalWeight, type WCombo } from "./equity";
import { evaluate } from "./evaluator";
import { gradeFreq, type Grade } from "./grading";
import { classify, type Bucket, type HandInfo } from "./handStrength";
import type { Weights } from "./ranges";
import { mulberry32, weightedIndex, type Rng } from "./rng";

export type Street = "flop" | "turn" | "river";
export type PostAction = "X" | "B33" | "B75" | "B125" | "AI" | "F" | "C" | "R";
export type PFreqs = Partial<Record<PostAction, number>>;
export type Who = "hero" | "villain";

export type Family =
  | "RANGE_SMALL"
  | "POLAR_BIG"
  | "MIXED"
  | "CHECK_HEAVY"
  | "CALLER_LEAD"
  | "STAB"
  | "BARREL_HIGH"
  | "BARREL_MID"
  | "BARREL_LOW"
  | "PROBE"
  | "RIVER_POLAR"
  | "RIVER_LEAD";

/* ------------------------------------------------------------------ */
/* Preflop lines that lead to heads-up postflop spots                   */
/* ------------------------------------------------------------------ */

export interface LineDef {
  id: string;
  label: string;
  potType: "SRP" | "3BP";
  pfr: PosId;
  caller: PosId;
  pfrIP: boolean;
  potBB: number;
  stackBB: number;
  preflop: string;
  pfrRange: () => Weights;
  callerRange: () => Weights;
}

const raiseW = (c: Chart) => actionWeights(c, "raise");
const callW = (c: Chart) => actionWeights(c, "call");

export const LINES: LineDef[] = [
  {
    id: "BTN_BB",
    label: "BTN vs BB · single-raised pot",
    potType: "SRP",
    pfr: "BTN",
    caller: "BB",
    pfrIP: true,
    potBB: 5.5,
    stackBB: 97.5,
    preflop: "BTN raises to 2.5bb, SB folds, BB calls.",
    pfrRange: () => raiseW(CHARTS.rfi_BTN),
    callerRange: () => callW(CHARTS.vo_BB_BTN),
  },
  {
    id: "CO_BB",
    label: "CO vs BB · single-raised pot",
    potType: "SRP",
    pfr: "CO",
    caller: "BB",
    pfrIP: true,
    potBB: 5.5,
    stackBB: 97.5,
    preflop: "CO raises to 2.5bb, folds to BB, BB calls.",
    pfrRange: () => raiseW(CHARTS.rfi_CO),
    callerRange: () => callW(CHARTS.vo_BB_CO),
  },
  {
    id: "LJ_BB",
    label: "UTG vs BB · single-raised pot",
    potType: "SRP",
    pfr: "LJ",
    caller: "BB",
    pfrIP: true,
    potBB: 5.5,
    stackBB: 97.5,
    preflop: "UTG raises to 2.5bb, folds to BB, BB calls.",
    pfrRange: () => raiseW(CHARTS.rfi_LJ),
    callerRange: () => callW(CHARTS.vo_BB_LJ),
  },
  {
    id: "CO_BTN",
    label: "CO vs BTN · single-raised pot",
    potType: "SRP",
    pfr: "CO",
    caller: "BTN",
    pfrIP: false,
    potBB: 6.5,
    stackBB: 97.5,
    preflop: "CO raises to 2.5bb, BTN calls, blinds fold.",
    pfrRange: () => raiseW(CHARTS.rfi_CO),
    callerRange: () => callW(CHARTS.vo_BTN_CO),
  },
  {
    id: "SB_BB",
    label: "SB vs BB · blind battle",
    potType: "SRP",
    pfr: "SB",
    caller: "BB",
    pfrIP: false,
    potBB: 6,
    stackBB: 97,
    preflop: "Folds to SB, SB raises to 3bb, BB calls.",
    pfrRange: () => raiseW(CHARTS.rfi_SB),
    callerRange: () => callW(CHARTS.vo_BB_SB),
  },
  {
    id: "BTN_BB_3B",
    label: "BB 3-bets BTN · 3-bet pot",
    potType: "3BP",
    pfr: "BB",
    caller: "BTN",
    pfrIP: false,
    potBB: 22.5,
    stackBB: 89,
    preflop: "BTN raises to 2.5bb, BB 3-bets to 11bb, BTN calls.",
    pfrRange: () => raiseW(CHARTS.vo_BB_BTN),
    callerRange: () => callW(CHARTS.v3_BTN_IP),
  },
  {
    id: "CO_BTN_3B",
    label: "BTN 3-bets CO · 3-bet pot",
    potType: "3BP",
    pfr: "BTN",
    caller: "CO",
    pfrIP: true,
    potBB: 16.5,
    stackBB: 92.5,
    preflop: "CO raises to 2.5bb, BTN 3-bets to 7.5bb, blinds fold, CO calls.",
    pfrRange: () => raiseW(CHARTS.vo_BTN_CO),
    callerRange: () => callW(CHARTS.v3_CO_OOP),
  },
];

export const LINE_BY_ID: Record<string, LineDef> = Object.fromEntries(LINES.map((l) => [l.id, l]));

/* ------------------------------------------------------------------ */
/* Strategy tables                                                      */
/* ------------------------------------------------------------------ */

type Table = Record<Bucket, PFreqs>;

const T = (t: Partial<Table>, fallback: PFreqs): Table => ({
  nutted: t.nutted ?? fallback,
  strong: t.strong ?? fallback,
  medium: t.medium ?? fallback,
  weak: t.weak ?? fallback,
  drawStrong: t.drawStrong ?? fallback,
  drawWeak: t.drawWeak ?? fallback,
  air: t.air ?? fallback,
});

export const FAMILY_TABLES: Record<Family, Table> = {
  RANGE_SMALL: T(
    {
      nutted: { B33: 0.75, X: 0.25 },
      strong: { B33: 0.9, X: 0.1 },
      medium: { B33: 0.6, X: 0.4 },
      weak: { B33: 0.5, X: 0.5 },
      drawStrong: { B33: 0.85, X: 0.15 },
      drawWeak: { B33: 0.75, X: 0.25 },
      air: { B33: 0.55, X: 0.45 },
    },
    { X: 1 },
  ),
  POLAR_BIG: T(
    {
      nutted: { B75: 0.85, X: 0.15 },
      strong: { B75: 0.7, B33: 0.1, X: 0.2 },
      medium: { B75: 0.1, B33: 0.15, X: 0.75 },
      weak: { B33: 0.1, X: 0.9 },
      drawStrong: { B75: 0.75, X: 0.25 },
      drawWeak: { B75: 0.35, X: 0.65 },
      air: { B75: 0.15, X: 0.85 },
    },
    { X: 1 },
  ),
  MIXED: T(
    {
      nutted: { B75: 0.6, B33: 0.25, X: 0.15 },
      strong: { B33: 0.45, B75: 0.3, X: 0.25 },
      medium: { B33: 0.45, X: 0.55 },
      weak: { B33: 0.3, X: 0.7 },
      drawStrong: { B75: 0.45, B33: 0.35, X: 0.2 },
      drawWeak: { B33: 0.35, B75: 0.12, X: 0.53 },
      air: { B33: 0.24, B75: 0.1, X: 0.66 },
    },
    { X: 1 },
  ),
  CHECK_HEAVY: T(
    {
      nutted: { B75: 0.5, X: 0.5 },
      strong: { B75: 0.3, B33: 0.15, X: 0.55 },
      medium: { B33: 0.1, X: 0.9 },
      weak: { B33: 0.05, X: 0.95 },
      drawStrong: { B75: 0.45, X: 0.55 },
      drawWeak: { B33: 0.15, B75: 0.1, X: 0.75 },
      air: { B33: 0.07, B75: 0.07, X: 0.86 },
    },
    { X: 1 },
  ),
  CALLER_LEAD: T(
    {
      nutted: { B33: 0.15, X: 0.85 },
      strong: { B33: 0.1, X: 0.9 },
      drawStrong: { B33: 0.12, X: 0.88 },
      drawWeak: { B33: 0.05, X: 0.95 },
      air: { B33: 0.03, X: 0.97 },
    },
    { X: 1 },
  ),
  STAB: T(
    {
      nutted: { B75: 0.6, B33: 0.2, X: 0.2 },
      strong: { B33: 0.5, B75: 0.3, X: 0.2 },
      medium: { B33: 0.45, X: 0.55 },
      weak: { B33: 0.3, X: 0.7 },
      drawStrong: { B75: 0.5, B33: 0.3, X: 0.2 },
      drawWeak: { B33: 0.43, B75: 0.12, X: 0.45 },
      air: { B33: 0.35, B75: 0.1, X: 0.55 },
    },
    { X: 1 },
  ),
  BARREL_HIGH: T(
    {
      nutted: { B75: 0.8, X: 0.2 },
      strong: { B75: 0.55, B33: 0.15, X: 0.3 },
      medium: { B33: 0.2, X: 0.8 },
      weak: { B33: 0.05, X: 0.95 },
      drawStrong: { B75: 0.8, X: 0.2 },
      drawWeak: { B75: 0.35, B33: 0.05, X: 0.6 },
      air: { B75: 0.26, B33: 0.04, X: 0.7 },
    },
    { X: 1 },
  ),
  BARREL_MID: T(
    {
      nutted: { B75: 0.75, X: 0.25 },
      strong: { B75: 0.4, B33: 0.2, X: 0.4 },
      medium: { B33: 0.15, X: 0.85 },
      weak: { X: 1 },
      drawStrong: { B75: 0.65, X: 0.35 },
      drawWeak: { B75: 0.22, B33: 0.04, X: 0.74 },
      air: { B75: 0.13, B33: 0.03, X: 0.84 },
    },
    { X: 1 },
  ),
  BARREL_LOW: T(
    {
      nutted: { B75: 0.6, X: 0.4 },
      strong: { B75: 0.25, X: 0.75 },
      medium: { X: 1 },
      weak: { X: 1 },
      drawStrong: { B75: 0.5, X: 0.5 },
      drawWeak: { B75: 0.15, X: 0.85 },
      air: { B75: 0.08, X: 0.92 },
    },
    { X: 1 },
  ),
  PROBE: T(
    {
      nutted: { B75: 0.6, X: 0.4 },
      strong: { B33: 0.45, B75: 0.2, X: 0.35 },
      medium: { B33: 0.3, X: 0.7 },
      weak: { B33: 0.15, X: 0.85 },
      drawStrong: { B75: 0.5, B33: 0.2, X: 0.3 },
      drawWeak: { B33: 0.32, B75: 0.1, X: 0.58 },
      air: { B33: 0.24, B75: 0.08, X: 0.68 },
    },
    { X: 1 },
  ),
  RIVER_POLAR: T(
    {
      nutted: { B75: 0.55, B125: 0.3, X: 0.15 },
      strong: { B75: 0.35, B33: 0.35, X: 0.3 },
      medium: { B33: 0.15, X: 0.85 },
      weak: { X: 1 },
    },
    { X: 1 },
  ),
  RIVER_LEAD: T(
    {
      nutted: { B75: 0.4, X: 0.6 },
      strong: { B33: 0.25, X: 0.75 },
      medium: { B33: 0.05, X: 0.95 },
      air: { B75: 0.08, X: 0.92 },
    },
    { X: 1 },
  ),
};

export const FAMILY_INFO: Record<Family, { name: string; summary: string }> = {
  RANGE_SMALL: {
    name: "Range-bet small",
    summary: "Your range dominates this static board, so a small bet with almost everything wins: it's cheap, denies equity, and gets value from many worse hands.",
  },
  POLAR_BIG: {
    name: "Polarized big bets",
    summary: "You have the nut advantage on a dynamic board. Bet big with strong hands and good draws; check your medium hands to protect your checking range.",
  },
  MIXED: {
    name: "Mixed sizes",
    summary: "A moderate edge. Bet small with thin value and backdoor draws, big with strong hands and big draws, and check a lot of medium hands.",
  },
  CHECK_HEAVY: {
    name: "Check-heavy",
    summary: "This board favors the other player's range. Check most of your range and bet only strong hands and strong draws.",
  },
  CALLER_LEAD: {
    name: "Check to the raiser",
    summary: "As the preflop caller out of position, you normally check to the aggressor and let them bet their range.",
  },
  STAB: {
    name: "Stab when checked to",
    summary: "They checked, capping their range. Bet often — many of their checks give up to a single bet.",
  },
  BARREL_HIGH: {
    name: "Barrel often",
    summary: "The turn card is good for your range. Keep betting big with value and your best draws/bluffs.",
  },
  BARREL_MID: {
    name: "Selective barrels",
    summary: "The turn is neutral. Keep betting strong hands and good draws; give up on most air.",
  },
  BARREL_LOW: {
    name: "Slow down",
    summary: "The turn improved their range. Check most hands and barrel only the nuts and big draws.",
  },
  PROBE: {
    name: "Probe bet",
    summary: "They checked back the last street, so their range is weakened. Lead out with value and some bluffs.",
  },
  RIVER_POLAR: {
    name: "River: polarize",
    summary: "On the river, bet your strong value hands and a balanced number of bluffs; check medium hands that have showdown value.",
  },
  RIVER_LEAD: {
    name: "River: mostly check",
    summary: "Out of position without the initiative, you mostly check to the aggressor, leading only with some strong hands.",
  },
};

/* ------------------------------------------------------------------ */
/* Helpers                                                               */
/* ------------------------------------------------------------------ */

const BET_ACTIONS: PostAction[] = ["B33", "B75", "B125", "AI"];
const isBet = (a: PostAction) => BET_ACTIONS.includes(a);
export const isAggressive = (a: PostAction) => isBet(a) || a === "R";

function normalize(f: PFreqs, legal: PostAction[]): PFreqs {
  const out: PFreqs = {};
  let s = 0;
  for (const a of legal) s += Math.max(0, f[a] ?? 0);
  if (s <= 1e-9) {
    const pass = legal.includes("X") ? "X" : legal.includes("F") ? "F" : legal[0];
    out[pass] = 1;
    return out;
  }
  for (const a of legal) if ((f[a] ?? 0) > 0) out[a] = (f[a] ?? 0) / s;
  return out;
}

export function argmaxAction(f: PFreqs, legal: PostAction[]): PostAction {
  let best = legal[0];
  let bv = -1;
  for (const a of legal) {
    const v = f[a] ?? 0;
    if (v > bv + 1e-9) {
      bv = v;
      best = a;
    }
  }
  return best;
}

function flopFamily(eqAdv: number, nutAdv: number, tex: Texture): Family {
  if (tex.monotone) return eqAdv >= 0.52 ? "MIXED" : "CHECK_HEAVY";
  if (tex.paired) return eqAdv >= 0.5 ? "RANGE_SMALL" : "MIXED";
  if (eqAdv >= 0.56 && tex.wetness < 0.45) return "RANGE_SMALL";
  if (nutAdv <= -0.02 && eqAdv < 0.54) return "CHECK_HEAVY";
  if (eqAdv >= 0.53 && (nutAdv >= 0.015 || tex.wetness >= 0.45)) return "POLAR_BIG";
  if (eqAdv >= 0.5) return "MIXED";
  return "CHECK_HEAVY";
}

/* ------------------------------------------------------------------ */
/* Hand state                                                            */
/* ------------------------------------------------------------------ */

export interface LegalAction {
  action: PostAction;
  label: string;
  /** Chips added to the pot by this action. */
  cost: number;
  /** Player's street total after the action. */
  to: number;
}

export interface PostEvent {
  street: Street;
  who: Who;
  action: PostAction;
  cost: number;
  to: number;
  text: string;
}

export interface Facing {
  bet: number;
  potBefore: number;
  frac: number;
  toCall: number;
  isRaise: boolean;
  allIn: boolean;
}

export interface Analysis {
  street: Street;
  board: Card[];
  potBB: number;
  heroStackBB: number;
  villStackBB: number;
  spr: number;
  role: "pfr" | "caller";
  ip: boolean;
  legal: LegalAction[];
  facing: Facing | null;
  family: Family | null;
  tex: Texture;
  info: HandInfo;
  /** Strategic bucket after equity adjustment (may differ from info.bucket). */
  bucket: Bucket;
  gto: PFreqs;
  exploit: PFreqs;
  gtoBest: PostAction;
  exploitBest: PostAction;
  eqHero: number;
  eqHeroExp: number;
  /** River only: equity vs the hands that would call a 75% pot bet. */
  eqVsCalls: number | null;
  eqAdv: number;
  nutHero: number;
  nutVill: number;
  heroMix: Record<Bucket, number>;
  villMix: Record<Bucket, number>;
  villCombos: number;
  reqEq: number | null;
  riverBluffFreq: number | null;
  valueCombos: number | null;
  airCombos: number | null;
  blocker: number | null;
}

export interface Decision extends Analysis {
  chosen: PostAction;
  grade: Grade;
  exploitGrade: Grade;
  chosenFreq: number;
}

export interface HandState {
  seed: number;
  line: LineDef;
  archetype: Archetype;
  heroIsPfr: boolean;
  heroPos: PosId;
  villPos: PosId;
  heroIP: boolean;
  heroCards: [Card, Card];
  villCards: [Card, Card];
  runout: Card[];
  street: Street;
  board: Card[];
  pot: number;
  stacks: Record<Who, number>;
  streetBet: Record<Who, number>;
  acted: Record<Who, boolean>;
  toAct: Who;
  raises: number;
  lastAggressor: Who | null;
  initiative: Who | null;
  checkedThrough: Partial<Record<Street, boolean>>;
  heroRange: WCombo[];
  villRangeGTO: WCombo[];
  villRangeExp: WCombo[];
  events: PostEvent[];
  decisions: Decision[];
  pending: Analysis | null;
  done: boolean;
  result: null | {
    winner: Who | "split";
    showdown: boolean;
    heroNet: number;
    heroHand: string;
    villHand: string;
    foldedBy?: Who;
  };
  invested: Record<Who, number>;
}

/* ------------------------------------------------------------------ */
/* Strategy model                                                        */
/* ------------------------------------------------------------------ */

interface Ctx {
  street: Street;
  board: Card[];
  tex: Texture;
  role: "pfr" | "caller";
  ip: boolean;
  family: Family | null;
  facing: Facing | null;
  legal: PostAction[];
  riverBluffFreq: number;
}

function facingTable(bucket: Bucket, f: Facing, street: Street): PFreqs {
  if (f.allIn) {
    const call: Record<Bucket, number> = { nutted: 1, strong: 0.8, medium: 0.35, weak: 0.1, drawStrong: street === "river" ? 0 : 0.45, drawWeak: 0.1, air: 0.02 };
    return { C: call[bucket], F: 1 - call[bucket] };
  }
  if (f.isRaise) {
    const river = street === "river";
    const t: Record<Bucket, PFreqs> = {
      nutted: { AI: 0.45, R: 0.15, C: 0.4 },
      strong: river ? { C: 0.5, F: 0.5 } : { C: 0.7, F: 0.3 },
      medium: river ? { C: 0.15, F: 0.85 } : { C: 0.25, F: 0.75 },
      weak: { C: 0.05, F: 0.95 },
      drawStrong: river ? { F: 1 } : { C: 0.6, AI: 0.2, F: 0.2 },
      drawWeak: river ? { F: 1 } : { C: 0.15, F: 0.85 },
      air: { F: 1 },
    };
    return t[bucket];
  }
  const size = f.frac <= 0.45 ? 0 : f.frac <= 0.9 ? 1 : 2;
  if (street === "river") {
    const t: Record<Bucket, PFreqs[]> = {
      nutted: [{ R: 0.5, C: 0.5 }, { R: 0.45, C: 0.55 }, { R: 0.35, C: 0.65 }],
      strong: [{ C: 0.85, R: 0.15 }, { C: 0.85, F: 0.15 }, { C: 0.65, F: 0.35 }],
      medium: [{ C: 0.8, F: 0.2 }, { C: 0.55, F: 0.45 }, { C: 0.4, F: 0.6 }],
      weak: [{ C: 0.35, F: 0.65 }, { C: 0.1, F: 0.9 }, { C: 0.05, F: 0.95 }],
      drawStrong: [{ F: 0.9, R: 0.1 }, { F: 0.97, R: 0.03 }, { F: 1 }],
      drawWeak: [{ F: 0.9, R: 0.1 }, { F: 0.97, R: 0.03 }, { F: 1 }],
      air: [{ F: 0.9, R: 0.1 }, { F: 0.97, R: 0.03 }, { F: 1 }],
    };
    return t[bucket][size];
  }
  const turn = street === "turn";
  const t: Record<Bucket, PFreqs[]> = {
    nutted: [{ R: 0.35, C: 0.65 }, { R: 0.45, C: 0.55 }, { R: 0.5, C: 0.5 }],
    strong: [{ C: 0.9, R: 0.1 }, { C: 0.9, R: 0.05, F: 0.05 }, { C: 0.8, F: 0.2 }],
    medium: [{ C: 0.85, F: 0.15 }, { C: 0.6, F: 0.4 }, { C: 0.35, F: 0.65 }],
    weak: [{ C: 0.55, F: 0.45 }, { C: 0.25, F: 0.75 }, { C: 0.1, F: 0.9 }],
    drawStrong: turn
      ? [{ C: 0.7, R: 0.2, F: 0.1 }, { C: 0.5, R: 0.15, F: 0.35 }, { C: 0.35, R: 0.1, F: 0.55 }]
      : [{ C: 0.65, R: 0.3, F: 0.05 }, { C: 0.7, R: 0.25, F: 0.05 }, { C: 0.65, R: 0.15, F: 0.2 }],
    drawWeak: turn
      ? [{ C: 0.4, R: 0.05, F: 0.55 }, { C: 0.15, F: 0.85 }, { C: 0.05, F: 0.95 }]
      : [{ C: 0.6, R: 0.05, F: 0.35 }, { C: 0.35, F: 0.65 }, { C: 0.15, F: 0.85 }],
    air: [{ F: 0.8, C: 0.1, R: 0.1 }, { F: 0.92, R: 0.08 }, { F: 0.97, R: 0.03 }],
  };
  return t[bucket][size];
}

/** Bucket-level baseline frequencies (no equity refinement). Used for range narrowing too. */
function baseFreqs(bucket: Bucket, ctx: Ctx): PFreqs {
  let f: PFreqs;
  if (ctx.facing) f = { ...facingTable(bucket, ctx.facing, ctx.street) };
  else {
    const fam = ctx.family ?? "CHECK_HEAVY";
    const b: Bucket = ctx.street === "river" && (bucket === "drawStrong" || bucket === "drawWeak") ? "air" : bucket;
    f = { ...FAMILY_TABLES[fam][b] };
    if (fam === "RIVER_POLAR" && b === "air") {
      const rb = ctx.riverBluffFreq;
      f = { B75: rb * 0.65, B125: rb * 0.2, B33: rb * 0.15, X: 1 - rb };
    }
    if (!ctx.ip && ctx.role === "pfr" && ctx.street === "flop" && fam !== "CHECK_HEAVY") {
      for (const a of BET_ACTIONS) if (f[a]) f[a] = f[a]! * 0.8;
      f.X = 1 - BET_ACTIONS.reduce((s, a) => s + (f[a] ?? 0), 0);
    }
  }
  return mapToLegal(f, ctx.legal);
}

/** Move frequency from sizes that aren't legal (e.g. overbets on the flop, or sizes that are all-ins) onto legal ones. */
function mapToLegal(f: PFreqs, legal: PostAction[]): PFreqs {
  const out: PFreqs = { ...f };
  const move = (from: PostAction, to: PostAction[]) => {
    const v = out[from] ?? 0;
    if (!v || legal.includes(from)) return;
    const target = to.find((t) => legal.includes(t));
    delete out[from];
    if (target) out[target] = (out[target] ?? 0) + v;
  };
  move("B125", ["AI", "B75", "B33"]);
  move("B75", ["AI", "B125", "B33"]);
  move("B33", ["B75", "AI"]);
  move("R", ["AI", "C"]);
  move("AI", ["R", "C"]);
  return normalize(out, legal);
}

function applyMults(f: PFreqs, bucket: Bucket, facing: boolean, bet: Record<Bucket, number>, call: Record<Bucket, number>, raise: Record<Bucket, number>, riverBluff: number, street: Street, legal: PostAction[]): PFreqs {
  const out: PFreqs = { ...f };
  if (!facing) {
    let mult = bet[bucket];
    if (street === "river" && (bucket === "air" || bucket === "drawWeak" || bucket === "drawStrong")) mult *= riverBluff;
    let s = 0;
    for (const a of BET_ACTIONS) {
      if (out[a]) {
        out[a] = out[a]! * mult;
        s += out[a]!;
      }
    }
    if (s > 0.97) {
      for (const a of BET_ACTIONS) if (out[a]) out[a] = (out[a]! / s) * 0.97;
      s = 0.97;
    }
    if (legal.includes("X")) out.X = 1 - s;
  } else {
    if (out.C) out.C = out.C * call[bucket];
    if (out.R) out.R = out.R * raise[bucket];
    if (out.AI) out.AI = out.AI * raise[bucket];
    const cont = (out.C ?? 0) + (out.R ?? 0) + (out.AI ?? 0);
    if (cont > 1) {
      for (const a of ["C", "R", "AI"] as PostAction[]) if (out[a]) out[a] = out[a]! / cont;
      out.F = 0;
    } else out.F = 1 - cont;
  }
  return normalize(out, legal);
}

function shiftSizes(f: PFreqs, amount: number, legal: PostAction[]): PFreqs {
  if (amount <= 0) return f;
  const out: PFreqs = { ...f };
  const small = out.B33 ?? 0;
  if (small && legal.includes("B75")) {
    out.B33 = small * (1 - amount);
    out.B75 = (out.B75 ?? 0) + small * amount;
  }
  const big = out.B75 ?? 0;
  if (big && legal.includes("B125")) {
    out.B75 = big * (1 - amount * 0.5);
    out.B125 = (out.B125 ?? 0) + big * amount * 0.5;
  }
  return normalize(out, legal);
}

function tendencyFreqs(base: PFreqs, bucket: Bucket, ctx: Ctx, t: Tendencies): PFreqs {
  const f = applyMults(base, bucket, !!ctx.facing, t.bet, t.call, t.raise, t.riverBluff, ctx.street, ctx.legal);
  return ctx.facing ? f : shiftSizes(f, t.bigSizing, ctx.legal);
}

function counterFreqs(base: PFreqs, bucket: Bucket, ctx: Ctx, c: Counter): PFreqs {
  let f = applyMults(base, bucket, !!ctx.facing, c.bet, c.call, c.raise, 1, ctx.street, ctx.legal);
  if (!ctx.facing && c.sizeUp && (bucket === "nutted" || bucket === "strong")) f = shiftSizes(f, 0.6, ctx.legal);
  return f;
}

/** Nudge call/fold toward what the equity math says. */
function refine(f: PFreqs, eq: number, req: number, bucket: Bucket, street: Street, legal: PostAction[]): PFreqs {
  const out: PFreqs = { ...f };
  const isDraw = bucket === "drawStrong" || bucket === "drawWeak";
  // Flop draws have two cards to come; turn draws get a modest implied-odds allowance.
  const drawy = street === "flop" && isDraw;
  const margin = eq + (street === "turn" && isDraw ? 0.07 : 0) - req;
  const F = out.F ?? 0;
  const C = out.C ?? 0;
  if (margin > 0.12 && F > 0) {
    out.C = C + F;
    out.F = 0;
  } else if (margin > 0.05 && F > 0) {
    out.C = C + F * 0.5;
    out.F = F * 0.5;
  } else if (margin < -0.08 && C > 0 && !drawy) {
    out.F = F + C * 0.75;
    out.C = C * 0.25;
  } else if (margin < -0.03 && C > 0 && !drawy) {
    out.F = F + C * 0.45;
    out.C = C * 0.55;
  }
  return normalize(out, legal);
}

/**
 * Hand-type buckets are a proxy for strength; when the equity math clearly disagrees
 * (e.g. bottom two pair that beats everything that calls), trust the equity.
 */
function effectiveBucket(b: Bucket, eq: number, street: Street, facing: boolean, vsCalls: boolean): Bucket {
  if (street === "river") {
    if (vsCalls) {
      if (eq >= 0.9 && b === "strong") return "nutted";
      if (eq >= 0.65 && (b === "medium" || b === "weak")) return "strong";
      if (eq >= 0.55 && b === "weak") return "medium";
      if (eq < 0.45 && b === "strong") return "medium";
      return b;
    }
    if (facing) {
      if (eq >= 0.85 && (b === "medium" || b === "weak")) return "strong";
      if (eq <= 0.2 && (b === "strong" || b === "medium")) return "weak";
      if (eq <= 0.35 && b === "strong") return "medium";
    }
    return b;
  }
  if (facing) {
    if (eq <= 0.22 && b === "strong") return "medium";
    if (eq <= 0.15 && b === "medium") return "weak";
  } else if (eq >= 0.85 && b === "medium") return "strong";
  return b;
}

/* ------------------------------------------------------------------ */
/* Range bookkeeping                                                     */
/* ------------------------------------------------------------------ */

const ZERO_MIX = (): Record<Bucket, number> => ({ nutted: 0, strong: 0, medium: 0, weak: 0, drawStrong: 0, drawWeak: 0, air: 0 });

interface Bucketed {
  combos: WCombo[];
  buckets: Bucket[];
  mix: Record<Bucket, number>;
  total: number;
}

function bucketize(range: WCombo[], board: Card[], tex: Texture): Bucketed {
  const dead = new Set(board);
  const combos = range.filter((c) => !dead.has(c.a) && !dead.has(c.b) && c.w > 0);
  const buckets: Bucket[] = [];
  const mix = ZERO_MIX();
  let total = 0;
  for (const c of combos) {
    const b = classify([c.a, c.b], board, tex).bucket;
    buckets.push(b);
    mix[b] += c.w;
    total += c.w;
  }
  if (total > 0) for (const k in mix) mix[k as Bucket] /= total;
  return { combos, buckets, mix, total };
}

/** Share of a range in each strength bucket on a board (for lesson visuals). */
export function rangeMix(w: Weights, board: Card[]): Record<Bucket, number> {
  return bucketize(combosFromWeights(w, board), board, analyzeBoard(board)).mix;
}

function narrow(range: WCombo[], board: Card[], tex: Texture, ctx: Ctx, action: PostAction, t: Tendencies | null): WCombo[] {
  const bz = bucketize(range, board, tex);
  const out: WCombo[] = [];
  let total = 0;
  bz.combos.forEach((c, i) => {
    const bucket = bz.buckets[i];
    let f = baseFreqs(bucket, ctx);
    if (t) f = tendencyFreqs(f, bucket, ctx, t);
    const w = c.w * (f[action] ?? 0);
    if (w > 1e-5) {
      out.push({ a: c.a, b: c.b, w });
      total += w;
    }
  });
  if (total < bz.total * 0.02) return bz.combos.map((c) => ({ ...c, w: c.w * 0.5 }));
  return out;
}

/** Balanced river bluff frequency for a polarized betting range. */
function riverBluffFrequency(bz: Bucketed, frac = 0.75): { freq: number; value: number; air: number } {
  let value = 0;
  let air = 0;
  bz.combos.forEach((c, i) => {
    const b = bz.buckets[i];
    const vt = FAMILY_TABLES.RIVER_POLAR[b];
    if (b === "nutted" || b === "strong") value += c.w * ((vt.B75 ?? 0) + (vt.B125 ?? 0) + (vt.B33 ?? 0));
    if (b === "air" || b === "drawStrong" || b === "drawWeak") air += c.w;
  });
  const bluffShare = frac / (1 + 2 * frac);
  const needed = (value * bluffShare) / (1 - bluffShare);
  const freq = air > 0 ? Math.min(0.9, needed / air) : 0;
  return { freq, value, air };
}

/** Positive = your cards block their calling hands more than their folding hands (good for bluffs). */
function blockerScore(hole: [Card, Card], vill: Bucketed): number {
  let callT = 0;
  let foldT = 0;
  let callB = 0;
  let foldB = 0;
  vill.combos.forEach((c, i) => {
    const b = vill.buckets[i];
    const calls = b === "nutted" || b === "strong" || b === "medium";
    const blocked = c.a === hole[0] || c.a === hole[1] || c.b === hole[0] || c.b === hole[1];
    if (calls) {
      callT += c.w;
      if (blocked) callB += c.w;
    } else {
      foldT += c.w;
      if (blocked) foldB += c.w;
    }
  });
  const cr = callT ? callB / callT : 0;
  const fr = foldT ? foldB / foldT : 0;
  return cr - fr;
}

/* ------------------------------------------------------------------ */
/* Game flow                                                             */
/* ------------------------------------------------------------------ */

const other = (w: Who): Who => (w === "hero" ? "villain" : "hero");
const round1 = (x: number) => Math.round(x * 10) / 10;

function streetOf(n: number): Street {
  return n === 3 ? "flop" : n === 4 ? "turn" : "river";
}

function facingFor(s: HandState, who: Who): Facing | null {
  const toCall = s.streetBet[other(who)] - s.streetBet[who];
  if (toCall <= 1e-9) return null;
  const potBefore = s.pot - toCall;
  const stackLeft = s.stacks[who];
  return {
    bet: toCall,
    potBefore,
    frac: toCall / Math.max(0.1, potBefore),
    toCall: Math.min(toCall, stackLeft),
    isRaise: s.raises >= 2,
    allIn: s.stacks[other(who)] <= 1e-9 || toCall >= stackLeft,
  };
}

export function legalActions(s: HandState, who: Who): LegalAction[] {
  const stack = s.stacks[who];
  const facing = facingFor(s, who);
  const mine = s.streetBet[who];
  const out: LegalAction[] = [];
  const oppStack = s.stacks[other(who)];
  if (!facing) {
    out.push({ action: "X", label: "Check", cost: 0, to: mine });
    if (stack <= 0 || oppStack <= 0) return out;
    const sizes: [PostAction, number, string][] = [
      ["B33", 0.33, "Bet 33%"],
      ["B75", 0.75, "Bet 75%"],
    ];
    if (s.street !== "flop") sizes.push(["B125", 1.25, "Overbet 125%"]);
    let addedAllIn = false;
    for (const [a, frac, label] of sizes) {
      const amt = round1(s.pot * frac);
      if (amt >= stack * 0.7) {
        if (!addedAllIn) {
          out.push({ action: "AI", label: "All-in", cost: stack, to: mine + stack });
          addedAllIn = true;
        }
      } else out.push({ action: a, label, cost: amt, to: mine + amt });
    }
    if (!addedAllIn && stack <= s.pot * 1.6) out.push({ action: "AI", label: "All-in", cost: stack, to: mine + stack });
    return out;
  }
  out.push({ action: "F", label: "Fold", cost: 0, to: mine });
  out.push({ action: "C", label: facing.toCall >= stack ? "Call all-in" : "Call", cost: facing.toCall, to: mine + facing.toCall });
  if (!facing.allIn && s.raises < 3 && stack > facing.toCall) {
    const oppTotal = s.streetBet[other(who)];
    const raiseTo = round1(s.raises >= 2 ? oppTotal * 2.5 : oppTotal * 3);
    const cost = raiseTo - mine;
    if (cost >= stack * 0.6) out.push({ action: "AI", label: "All-in", cost: stack, to: mine + stack });
    else out.push({ action: "R", label: `Raise`, cost, to: raiseTo });
  }
  return out;
}

function ctxFor(s: HandState, who: Who, family: Family | null, riverBluffFreq: number): Ctx {
  const board = s.board;
  return {
    street: s.street,
    board,
    tex: analyzeBoard(board),
    role: (who === "hero") === s.heroIsPfr ? "pfr" : "caller",
    ip: who === "hero" ? s.heroIP : !s.heroIP,
    family,
    facing: facingFor(s, who),
    legal: legalActions(s, who).map((l) => l.action),
    riverBluffFreq,
  };
}

function chooseFamily(s: HandState, who: Who, eqAdv: number, nutAdv: number, tex: Texture): Family {
  const role = (who === "hero") === s.heroIsPfr ? "pfr" : "caller";
  const ip = who === "hero" ? s.heroIP : !s.heroIP;
  const street = s.street;
  if (street === "flop") {
    if (role === "pfr") {
      if (s.line.potType === "3BP" && eqAdv >= 0.5 && !tex.monotone) return "RANGE_SMALL";
      let fam = flopFamily(eqAdv, nutAdv, tex);
      if (!ip && fam === "RANGE_SMALL" && tex.wetness >= 0.2) fam = "MIXED";
      return fam;
    }
    return ip ? "STAB" : "CALLER_LEAD";
  }
  const prev: Street = street === "turn" ? "flop" : "turn";
  const hasInitiative = s.initiative === who;
  if (street === "turn") {
    if (hasInitiative) return eqAdv >= 0.55 ? "BARREL_HIGH" : eqAdv >= 0.47 ? "BARREL_MID" : "BARREL_LOW";
    if (!ip) return s.checkedThrough[prev] ? "PROBE" : "CALLER_LEAD";
    return "STAB";
  }
  if (hasInitiative || ip) return "RIVER_POLAR";
  return s.checkedThrough[prev] ? "PROBE" : "RIVER_LEAD";
}

function rangeOf(s: HandState, who: Who, exploit = false): WCombo[] {
  if (who === "hero") return s.heroRange;
  return exploit ? s.villRangeExp : s.villRangeGTO;
}

/** Full analysis of a decision point for whoever is to act. */
function analyze(s: HandState, who: Who, rng: Rng, cards: [Card, Card]): Analysis {
  const tex = analyzeBoard(s.board);
  const board = s.board;
  const mine = bucketize(rangeOf(s, who), board, tex);
  const theirs = bucketize(rangeOf(s, other(who)), board, tex);
  const theirsExp = who === "hero" ? bucketize(s.villRangeExp, board, tex) : theirs;
  const facing = facingFor(s, who);
  const eqAdv = rangeVsRange(mine.combos, theirs.combos, board, 1200, rng);
  const nutAdv = mine.mix.nutted - theirs.mix.nutted;
  const family = facing ? null : chooseFamily(s, who, eqAdv, nutAdv, tex);
  let riverBluffFreq = 0.25;
  let valueCombos: number | null = null;
  let airCombos: number | null = null;
  if (s.street === "river" && family === "RIVER_POLAR") {
    const rb = riverBluffFrequency(mine);
    riverBluffFreq = rb.freq;
    valueCombos = rb.value;
    airCombos = rb.air;
  }
  const ctx = ctxFor(s, who, family, riverBluffFreq);
  const info = classify(cards, board, tex);
  const eqHero = equityVsRange(cards, board, theirs.combos, 1800, rng).equity;
  const eqHeroExp = who === "hero" ? equityVsRange(cards, board, theirsExp.combos, 1200, rng).equity : eqHero;

  let eqVsCalls: number | null = null;
  if (!facing && s.street === "river") {
    const hypo: Facing = { bet: s.pot * 0.75, potBefore: s.pot, frac: 0.75, toCall: s.pot * 0.75, isRaise: false, allIn: false };
    const calls: WCombo[] = [];
    theirs.combos.forEach((c, i) => {
      const f = facingTable(theirs.buckets[i], hypo, "river");
      const w = c.w * ((f.C ?? 0) + (f.R ?? 0));
      if (w > 1e-4) calls.push({ a: c.a, b: c.b, w });
    });
    if (calls.length) eqVsCalls = equityVsRange(cards, board, calls, 1500, rng).equity;
  }
  const bucket = effectiveBucket(info.bucket, facing ? eqHero : (eqVsCalls ?? eqHero), s.street, !!facing, eqVsCalls !== null);

  let blocker: number | null = null;
  let base = baseFreqs(bucket, ctx);
  if (s.street === "river" && !facing && (bucket === "air" || bucket === "weak")) {
    blocker = blockerScore(cards, theirs);
    const b = base.B75 ?? 0;
    if (b > 0 && legalActions(s, who).some((l) => l.action === "B75")) {
      const adj = Math.max(0, Math.min(0.95, b * (1 + blocker * 6)));
      base = normalize({ ...base, B75: adj, X: Math.max(0, (base.X ?? 0) - (adj - b)) }, ctx.legal);
    }
  }
  const reqEq = facing ? facing.toCall / (s.pot + facing.toCall) : null;
  let gto = base;
  if (reqEq !== null) gto = refine(gto, eqHero, reqEq, bucket, s.street, ctx.legal);

  let exploit: PFreqs = gto;
  if (who === "hero") {
    exploit = counterFreqs(base, bucket, ctx, s.archetype.counter);
    if (reqEq !== null) exploit = refine(exploit, eqHeroExp, reqEq, bucket, s.street, ctx.legal);
  }

  const legal = legalActions(s, who);
  return {
    street: s.street,
    board: board.slice(),
    potBB: s.pot,
    heroStackBB: s.stacks[who],
    villStackBB: s.stacks[other(who)],
    spr: Math.min(s.stacks.hero, s.stacks.villain) / Math.max(0.1, s.pot),
    role: ctx.role,
    ip: ctx.ip,
    legal,
    facing,
    family,
    tex,
    info,
    bucket,
    gto,
    exploit,
    gtoBest: argmaxAction(gto, ctx.legal),
    exploitBest: argmaxAction(exploit, ctx.legal),
    eqHero,
    eqHeroExp,
    eqVsCalls,
    eqAdv,
    nutHero: mine.mix.nutted,
    nutVill: theirs.mix.nutted,
    heroMix: mine.mix,
    villMix: theirs.mix,
    villCombos: theirs.total,
    reqEq,
    riverBluffFreq: s.street === "river" && family === "RIVER_POLAR" ? riverBluffFreq : null,
    valueCombos,
    airCombos,
    blocker,
  };
}

function describe(who: Who, a: PostAction, cost: number, to: number, villLabel: string): string {
  const name = who === "hero" ? "You" : villLabel;
  const amt = `${round1(to)}bb`;
  switch (a) {
    case "X":
      return `${name} check${who === "hero" ? "" : "s"}`;
    case "F":
      return `${name} fold${who === "hero" ? "" : "s"}`;
    case "C":
      return `${name} call${who === "hero" ? "" : "s"} ${round1(cost)}bb`;
    case "R":
      return `${name} raise${who === "hero" ? "" : "s"} to ${amt}`;
    case "AI":
      return `${name} ${who === "hero" ? "go" : "goes"} all-in`;
    default:
      return `${name} bet${who === "hero" ? "" : "s"} ${round1(cost)}bb`;
  }
}

function applyAction(s: HandState, who: Who, action: PostAction, villLabel: string): void {
  const legal = legalActions(s, who).find((l) => l.action === action) ?? legalActions(s, who)[0];
  const cost = Math.min(legal.cost, s.stacks[who]);
  s.stacks[who] -= cost;
  s.streetBet[who] += cost;
  s.invested[who] += cost;
  s.pot += cost;
  s.acted[who] = true;
  if (isAggressive(action) || (action === "AI" && cost > 0)) {
    s.raises += 1;
    s.lastAggressor = who;
    s.acted[other(who)] = false;
  }
  s.events.push({ street: s.street, who, action, cost, to: s.streetBet[who], text: describe(who, action, cost, s.streetBet[who], villLabel) });
}

function bettingClosed(s: HandState): boolean {
  if (s.streetBet.hero !== s.streetBet.villain) {
    const short = s.streetBet.hero < s.streetBet.villain ? "hero" : "villain";
    return s.stacks[short] <= 1e-9 && s.acted[short];
  }
  return s.acted.hero && s.acted.villain;
}

function finishShowdown(s: HandState): void {
  while (s.board.length < 5) s.board.push(s.runout[s.board.length]);
  s.street = "river";
  const h = evaluate([...s.heroCards, ...s.board]);
  const v = evaluate([...s.villCards, ...s.board]);
  const winner: Who | "split" = h > v ? "hero" : h < v ? "villain" : "split";
  const heroWon = winner === "hero" ? s.pot : winner === "split" ? s.pot / 2 : 0;
  s.done = true;
  s.pending = null;
  s.result = {
    winner,
    showdown: true,
    heroNet: round1(heroWon - s.invested.hero),
    heroHand: classify(s.heroCards, s.board).made,
    villHand: classify(s.villCards, s.board).made,
  };
}

function nextStreet(s: HandState): void {
  const prev = s.street;
  s.checkedThrough[prev] = s.lastAggressor === null;
  s.initiative = s.lastAggressor;
  if (s.stacks.hero <= 1e-9 || s.stacks.villain <= 1e-9 || prev === "river") {
    finishShowdown(s);
    return;
  }
  s.board.push(s.runout[s.board.length]);
  s.street = streetOf(s.board.length);
  s.streetBet = { hero: 0, villain: 0 };
  s.acted = { hero: false, villain: false };
  s.raises = 0;
  s.lastAggressor = null;
  s.toAct = s.heroIP ? "villain" : "hero";
}

export interface HandOptions {
  lineId: string;
  heroRole: "pfr" | "caller";
  archetype: Archetype;
  seed: number;
}

const villLabelOf = (s: HandState) => s.villPos;

function sampleCombo(range: WCombo[], rng: Rng, dead: Card[]): [Card, Card] {
  const live = range.filter((c) => !dead.includes(c.a) && !dead.includes(c.b));
  const i = weightedIndex(
    live.map((c) => c.w),
    rng,
  );
  const c = live[i];
  return [c.a, c.b];
}

export function startHand(opts: HandOptions): HandState {
  const rng = mulberry32(opts.seed);
  const line = LINE_BY_ID[opts.lineId] ?? LINES[0];
  const heroIsPfr = opts.heroRole === "pfr";
  const heroRange0 = combosFromWeights(heroIsPfr ? line.pfrRange() : line.callerRange());
  const villRange0 = combosFromWeights(heroIsPfr ? line.callerRange() : line.pfrRange());

  let heroCards: [Card, Card] = [0, 1];
  let villCards: [Card, Card] = [2, 3];
  let runout: Card[] = [];
  for (let tries = 0; tries < 6; tries++) {
    heroCards = sampleCombo(heroRange0, rng, []);
    villCards = sampleCombo(villRange0, rng, heroCards);
    const deck: Card[] = [];
    for (let c = 0; c < 52; c++) if (!heroCards.includes(c) && !villCards.includes(c)) deck.push(c);
    runout = [];
    while (runout.length < 5) {
      const i = Math.floor(rng() * deck.length);
      runout.push(deck.splice(i, 1)[0]);
    }
    const flopInfo = classify(heroCards, runout.slice(0, 3));
    if (flopInfo.bucket !== "air" || rng() < 0.55) break;
  }

  const heroPos = heroIsPfr ? line.pfr : line.caller;
  const villPos = heroIsPfr ? line.caller : line.pfr;
  const heroIP = heroIsPfr ? line.pfrIP : !line.pfrIP;
  const invested = 100 - line.stackBB;
  const s: HandState = {
    seed: opts.seed,
    line,
    archetype: opts.archetype,
    heroIsPfr,
    heroPos,
    villPos,
    heroIP,
    heroCards,
    villCards,
    runout,
    street: "flop",
    board: runout.slice(0, 3),
    pot: line.potBB,
    stacks: { hero: line.stackBB, villain: line.stackBB },
    streetBet: { hero: 0, villain: 0 },
    acted: { hero: false, villain: false },
    toAct: heroIP ? "villain" : "hero",
    raises: 0,
    lastAggressor: null,
    initiative: heroIsPfr ? "hero" : "villain",
    checkedThrough: {},
    heroRange: heroRange0,
    villRangeGTO: villRange0,
    villRangeExp: villRange0,
    events: [],
    decisions: [],
    pending: null,
    done: false,
    result: null,
    invested: { hero: invested, villain: invested },
  };
  advance(s, rng);
  (s as HandState & { _rng: Rng })._rng = rng;
  return s;
}

function villainAct(s: HandState, rng: Rng): void {
  const a = analyze(s, "villain", rng, s.villCards);
  const ctx = ctxFor(s, "villain", a.family, a.riverBluffFreq ?? 0.25);
  let f = tendencyFreqs(baseFreqs(a.bucket, ctx), a.bucket, ctx, s.archetype.tendencies);
  if (a.reqEq !== null) f = refine(f, a.eqHero, a.reqEq, a.bucket, s.street, ctx.legal);
  const legal = ctx.legal;
  const probs = legal.map((l) => f[l] ?? 0);
  const action = legal[weightedIndex(probs, rng)];
  const tex = analyzeBoard(s.board);
  s.villRangeGTO = narrow(s.villRangeGTO, s.board, tex, ctx, action, null);
  s.villRangeExp = narrow(s.villRangeExp, s.board, tex, ctx, action, s.archetype.tendencies);
  applyAction(s, "villain", action, villLabelOf(s));
  if (action === "F") endByFold(s, "villain");
}

function endByFold(s: HandState, folder: Who): void {
  s.done = true;
  s.pending = null;
  const heroWon = folder === "villain" ? s.pot : 0;
  s.result = {
    winner: other(folder),
    showdown: false,
    heroNet: round1(heroWon - s.invested.hero),
    heroHand: classify(s.heroCards, s.board).made,
    villHand: classify(s.villCards, s.board).made,
    foldedBy: folder,
  };
}

/** Run villain actions and street transitions until the hero must act or the hand ends. */
function advance(s: HandState, rng: Rng): void {
  let guard = 0;
  while (!s.done && guard++ < 30) {
    if (bettingClosed(s)) {
      nextStreet(s);
      continue;
    }
    if (s.toAct === "villain") {
      villainAct(s, rng);
      s.toAct = "hero";
      continue;
    }
    s.pending = analyze(s, "hero", rng, s.heroCards);
    return;
  }
}

export function heroAct(prev: HandState, action: PostAction): HandState {
  const rng = (prev as HandState & { _rng?: Rng })._rng ?? mulberry32(prev.seed ^ prev.events.length);
  const s: HandState = {
    ...prev,
    board: prev.board.slice(),
    stacks: { ...prev.stacks },
    streetBet: { ...prev.streetBet },
    acted: { ...prev.acted },
    checkedThrough: { ...prev.checkedThrough },
    events: prev.events.slice(),
    decisions: prev.decisions.slice(),
    invested: { ...prev.invested },
  };
  (s as HandState & { _rng: Rng })._rng = rng;
  const a = prev.pending;
  if (!a || s.done) return s;
  const legalKeys = a.legal.map((l) => l.action);
  const act = legalKeys.includes(action) ? action : legalKeys[0];
  const bestF = a.gto[a.gtoBest] ?? 0;
  const chosenF = a.gto[act] ?? 0;
  const bucket = a.bucket;
  const blunderRisk =
    (act === "F" && (bucket === "nutted" || (a.reqEq !== null && a.eqHero > a.reqEq + 0.25))) ||
    ((act === "C" || act === "R" || act === "AI") && a.reqEq !== null && a.eqHero < a.reqEq - 0.2 && bestF >= 0.85);
  const grade = gradeFreq(chosenF, bestF, blunderRisk);
  const exploitGrade = gradeFreq(a.exploit[act] ?? 0, a.exploit[a.exploitBest] ?? 0, blunderRisk);
  s.decisions.push({ ...a, chosen: act, grade, exploitGrade, chosenFreq: chosenF });

  const tex = analyzeBoard(s.board);
  const ctx = ctxFor(prev, "hero", a.family, a.riverBluffFreq ?? 0.25);
  s.heroRange = narrow(s.heroRange, s.board, tex, ctx, act, null);
  applyAction(s, "hero", act, villLabelOf(s));
  s.pending = null;
  if (act === "F") {
    endByFold(s, "hero");
    return s;
  }
  s.toAct = "villain";
  advance(s, rng);
  return s;
}

export const ACTION_NAMES: Record<PostAction, string> = {
  X: "Check",
  B33: "Bet 33%",
  B75: "Bet 75%",
  B125: "Overbet",
  AI: "All-in",
  F: "Fold",
  C: "Call",
  R: "Raise",
};

export const POST_ACTION_COLOR: Record<PostAction, string> = {
  X: "#14b8a6",
  B33: "#f97316",
  B75: "#ef4444",
  B125: "#be123c",
  AI: "#a855f7",
  F: "#3b4a5c",
  C: "#22c55e",
  R: "#ef4444",
};

export { totalWeight };
