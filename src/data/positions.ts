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
}

export const POS_INFO: Record<PosId, PosInfo> = {
  EP1: { name: "Under the gun" },
  EP2: { name: "UTG+1" },
  EP3: { name: "UTG+2" },
  LJ: { name: "Lojack" },
  HJ: { name: "Hijack" },
  CO: { name: "Cutoff" },
  BTN: { name: "Button" },
  SB: { name: "Small blind" },
  BB: { name: "Big blind" },
};
