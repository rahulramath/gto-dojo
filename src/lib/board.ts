import { RANK_NAMES, rankOf, suitOf, type Card } from "./cards";

/** The ten 5-rank straight windows. Window 0 is the wheel (A-2-3-4-5). */
export const STRAIGHT_WINDOWS: number[][] = [
  [12, 0, 1, 2, 3],
  ...Array.from({ length: 9 }, (_, s) => [s, s + 1, s + 2, s + 3, s + 4]),
];

/** Top rank of each window (5-high for the wheel). */
export const WINDOW_HIGH = STRAIGHT_WINDOWS.map((w, i) => (i === 0 ? 3 : w[4]));

export interface Texture {
  street: "flop" | "turn" | "river";
  distinct: number[];
  high: number;
  suitCounts: number[];
  maxSuit: number;
  flushSuit: number;
  monotone: boolean;
  twoTone: boolean;
  rainbow: boolean;
  flushPossible: boolean;
  fourFlush: boolean;
  paired: boolean;
  trips: boolean;
  straightPossible: boolean;
  fourStraight: boolean;
  connectedness: number;
  wetness: number;
  broadways: number;
  label: string;
  highLabel: string;
  notes: string[];
}

export function analyzeBoard(board: readonly Card[]): Texture {
  const street = board.length === 3 ? "flop" : board.length === 4 ? "turn" : "river";
  const rankCount = new Array(13).fill(0);
  const suitCounts = [0, 0, 0, 0];
  for (const c of board) {
    rankCount[rankOf(c)]++;
    suitCounts[suitOf(c)]++;
  }
  const distinct: number[] = [];
  for (let r = 12; r >= 0; r--) if (rankCount[r] > 0) distinct.push(r);
  const high = distinct[0];
  let maxSuit = 0;
  let flushSuit = 0;
  suitCounts.forEach((n, s) => {
    if (n > maxSuit) {
      maxSuit = n;
      flushSuit = s;
    }
  });
  const paired = rankCount.some((n) => n >= 2);
  const trips = rankCount.some((n) => n >= 3);

  let maxIn = 0;
  let windows2 = 0;
  for (const w of STRAIGHT_WINDOWS) {
    const k = w.filter((r) => rankCount[r] > 0).length;
    if (k > maxIn) maxIn = k;
    if (k >= 2) windows2++;
  }
  const straightPossible = maxIn >= 3;
  const fourStraight = maxIn >= 4;
  const connectedness = Math.min(1, windows2 / 8 + (straightPossible ? 0.35 : 0));

  const monotone = street === "flop" ? maxSuit === 3 : maxSuit >= 3;
  const twoTone = maxSuit === 2;
  const rainbow = maxSuit === 1;
  const flushPossible = maxSuit >= 3;
  const fourFlush = maxSuit >= 4;
  const flushAdd = fourFlush ? 0.55 : flushPossible ? 0.45 : twoTone && street !== "river" ? 0.28 : 0;
  const wetness = Math.max(0, Math.min(1, 0.6 * connectedness + flushAdd - (paired ? 0.15 : 0)));
  const broadways = distinct.filter((r) => r >= 8).length;

  const highLabel =
    high === 12
      ? "Ace-high"
      : high === 11
        ? "King-high"
        : high === 10
          ? "Queen-high"
          : broadways >= 2
            ? "Big cards"
            : high >= 7
              ? "Middle cards"
              : "Low cards";

  let label: string;
  if (trips) label = "Trips on the board";
  else if (paired) label = `Paired board, ${highLabel.toLowerCase()}`;
  else if (monotone && street === "flop") label = `One suit, ${highLabel.toLowerCase()}`;
  else if (wetness >= 0.62) label = `Wet and connected, ${highLabel.toLowerCase()}`;
  else if (wetness >= 0.35) label = `A bit wet, ${highLabel.toLowerCase()}`;
  else label = `Dry, ${highLabel.toLowerCase()}`;

  const notes: string[] = [];
  if (fourFlush) notes.push("There are four of one suit out there, so any card of that suit makes a flush.");
  else if (flushPossible) notes.push(street === "flop" ? "It's all one suit, so flushes are already possible and draws are everywhere." : "Three cards share a suit, so flushes are possible.");
  else if (twoTone && street !== "river") notes.push("Two cards share a suit, so flush draws are possible.");
  else if (rainbow) notes.push("Three different suits, so nobody has a flush draw.");
  if (fourStraight) notes.push("Four cards line up, so one card makes a straight.");
  else if (straightPossible) notes.push("Straights are possible.");
  else if (connectedness >= 0.3) notes.push("Some straight draws are possible.");
  if (paired) notes.push("On a paired board, strong hands like sets are rarer for both players.");
  if (high >= 11 && !paired && connectedness < 0.4)
    notes.push(`${RANK_NAMES[high]}-high and dry. The preflop raiser has more big cards and overpairs here.`);
  if (high <= 8 && connectedness >= 0.5) notes.push("Low and connected. The caller's suited connectors and small pairs hit this hard.");

  return {
    street,
    distinct,
    high,
    suitCounts,
    maxSuit,
    flushSuit,
    monotone,
    twoTone,
    rainbow,
    flushPossible,
    fourFlush,
    paired,
    trips,
    straightPossible,
    fourStraight,
    connectedness,
    wetness,
    broadways,
    label,
    highLabel,
    notes,
  };
}

/** Highest straight any two cards could make on this board, or -1. */
export function nutStraightHigh(board: readonly Card[]): number {
  const present = new Set(board.map(rankOf));
  for (let i = STRAIGHT_WINDOWS.length - 1; i >= 0; i--) {
    const k = STRAIGHT_WINDOWS[i].filter((r) => present.has(r)).length;
    if (k >= 3) return WINDOW_HIGH[i];
  }
  return -1;
}
