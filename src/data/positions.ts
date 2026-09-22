export type PosId = "EP1" | "EP2" | "EP3" | "LJ" | "HJ" | "CO" | "BTN" | "SB" | "BB";
export type TableSize = 6 | 9;

export const POSITIONS_6: PosId[] = ["LJ", "HJ", "CO", "BTN", "SB", "BB"];
export const POSITIONS_9: PosId[] = ["EP1", "EP2", "EP3", "LJ", "HJ", "CO", "BTN", "SB", "BB"];
export const ALL_POSITIONS: PosId[] = POSITIONS_9;

export const positionsFor = (size: TableSize): PosId[] => (size === 6 ? POSITIONS_6 : POSITIONS_9);

/** Postflop action order: blinds act first, button last. */
const POSTFLOP_ORDER: PosId[] = ["SB", "BB", "EP1", "EP2", "EP3", "LJ", "HJ", "CO", "BTN"];
export const postflopIndex = (p: PosId) => POSTFLOP_ORDER.indexOf(p);
/** True if `a` acts after `b` postflop (i.e. `a` is in position on `b`). */
export const isInPositionOn = (a: PosId, b: PosId) => postflopIndex(a) > postflopIndex(b);

export function posLabel(p: PosId, size: TableSize = 6): string {
  if (size === 6 && p === "LJ") return "UTG";
  if (p === "EP1") return "UTG";
  if (p === "EP2") return "UTG+1";
  if (p === "EP3") return "UTG+2";
  return p;
}

export interface PosInfo {
  name: string;
  role: string;
  blurb: string;
}

export const POS_INFO: Record<PosId, PosInfo> = {
  EP1: {
    name: "Under the Gun",
    role: "First to act, 8 players behind",
    blurb: "The tightest seat at a full-ring table. Eight players can wake up with a big hand, and you'll usually be out of position postflop.",
  },
  EP2: {
    name: "UTG+1",
    role: "Early position, 7 players behind",
    blurb: "Still early. Open only hands that play well against strong ranges: pairs, big broadways, strong suited aces.",
  },
  EP3: {
    name: "UTG+2 (Middle)",
    role: "Early-middle position, 6 players behind",
    blurb: "A touch wider than UTG. The first seat where a few more suited connectors and suited kings come in.",
  },
  LJ: {
    name: "Lojack",
    role: "First to act 6-handed (UTG in 6-max)",
    blurb: "In 6-max this is UTG. About 1 in 6 hands opens here. Discipline beats creativity.",
  },
  HJ: {
    name: "Hijack",
    role: "Four players behind",
    blurb: "Two seats off the button. Ranges widen: every pair, every suited ace, more suited connectors.",
  },
  CO: {
    name: "Cutoff",
    role: "Three players behind",
    blurb: "Second-best seat. You're 'stealing' from the button and blinds. Open about 28-30%.",
  },
  BTN: {
    name: "Button (Dealer)",
    role: "Last to act postflop, every hand",
    blurb: "The most profitable seat in poker. Guaranteed position postflop, so you can open ~45% of hands.",
  },
  SB: {
    name: "Small Blind",
    role: "Posts half a blind, out of position vs everyone",
    blurb: "The hardest seat. You have money in the pot but act first every street. Raise-or-fold is the simple winning plan.",
  },
  BB: {
    name: "Big Blind",
    role: "Posts a full blind, closes preflop action",
    blurb: "You're getting a discount on every call and you close the action, so you defend wide — but you're out of position.",
  },
};
