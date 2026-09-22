import type { Card } from "./cards";

export const CATEGORY_NAMES = [
  "High card",
  "Pair",
  "Two pair",
  "Three of a kind",
  "Straight",
  "Flush",
  "Full house",
  "Four of a kind",
  "Straight flush",
];

const B = 16; // base for packing five tiebreak ranks
const CAT = B ** 5;

const rc = new Int8Array(13);
const suitCount = new Int8Array(4);
const suitMask = new Int32Array(4);

/** Highest straight in a 13-bit rank mask (bit r = rank r). Returns top rank or -1. */
export function straightHigh(mask: number): number {
  for (let hi = 12; hi >= 4; hi--) {
    const m = 0x1f << (hi - 4);
    if ((mask & m) === m) return hi;
  }
  // Wheel: A-2-3-4-5
  if ((mask & 0x100f) === 0x100f) return 3;
  return -1;
}

function pack(cat: number, r0 = 0, r1 = 0, r2 = 0, r3 = 0, r4 = 0): number {
  return cat * CAT + r0 * B ** 4 + r1 * B ** 3 + r2 * B ** 2 + r3 * B + r4;
}

function topBits(mask: number, n: number, out: number[]): void {
  out.length = 0;
  for (let r = 12; r >= 0 && out.length < n; r--) if (mask & (1 << r)) out.push(r);
}

const tmp: number[] = [];

/** Evaluate the best 5-card hand from 5-7 cards. Higher score = better hand. */
export function evaluate(cards: readonly Card[], n = cards.length): number {
  rc.fill(0);
  suitCount.fill(0);
  suitMask.fill(0);
  let rankMask = 0;
  for (let i = 0; i < n; i++) {
    const c = cards[i];
    const r = c >> 2;
    const s = c & 3;
    rc[r]++;
    suitCount[s]++;
    suitMask[s] |= 1 << r;
    rankMask |= 1 << r;
  }

  let flushSuit = -1;
  for (let s = 0; s < 4; s++) if (suitCount[s] >= 5) flushSuit = s;
  if (flushSuit >= 0) {
    const sf = straightHigh(suitMask[flushSuit]);
    if (sf >= 0) return pack(8, sf);
  }

  let quad = -1;
  let trip1 = -1;
  let trip2 = -1;
  let pair1 = -1;
  let pair2 = -1;
  for (let r = 12; r >= 0; r--) {
    const k = rc[r];
    if (k === 4) quad = r;
    else if (k === 3) {
      if (trip1 < 0) trip1 = r;
      else if (trip2 < 0) trip2 = r;
    } else if (k === 2) {
      if (pair1 < 0) pair1 = r;
      else if (pair2 < 0) pair2 = r;
    }
  }

  if (quad >= 0) {
    topBits(rankMask & ~(1 << quad), 1, tmp);
    return pack(7, quad, tmp[0] ?? 0);
  }
  if (trip1 >= 0 && (trip2 >= 0 || pair1 >= 0)) {
    const p = Math.max(trip2, pair1);
    return pack(6, trip1, p);
  }
  if (flushSuit >= 0) {
    topBits(suitMask[flushSuit], 5, tmp);
    return pack(5, tmp[0], tmp[1], tmp[2], tmp[3], tmp[4]);
  }
  const st = straightHigh(rankMask);
  if (st >= 0) return pack(4, st);
  if (trip1 >= 0) {
    topBits(rankMask & ~(1 << trip1), 2, tmp);
    return pack(3, trip1, tmp[0], tmp[1]);
  }
  if (pair1 >= 0 && pair2 >= 0) {
    topBits(rankMask & ~(1 << pair1) & ~(1 << pair2), 1, tmp);
    return pack(2, pair1, pair2, tmp[0] ?? 0);
  }
  if (pair1 >= 0) {
    topBits(rankMask & ~(1 << pair1), 3, tmp);
    return pack(1, pair1, tmp[0], tmp[1], tmp[2]);
  }
  topBits(rankMask, 5, tmp);
  return pack(0, tmp[0], tmp[1], tmp[2], tmp[3], tmp[4]);
}

export const categoryOf = (score: number): number => Math.floor(score / CAT);
export const categoryName = (score: number): string => CATEGORY_NAMES[categoryOf(score)];
