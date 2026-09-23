import type { Rng } from "./rng";

/** Card = rank * 4 + suit. rank 0..12 = 2..A, suit 0..3 = s h d c. */
export type Card = number;

export const RANK_CHARS = "23456789TJQKA";
export const SUIT_CHARS = "shdc";
export const SUIT_SYMBOLS = ["♠", "♥", "♦", "♣"];
export const SUIT_NAMES = ["spades", "hearts", "diamonds", "clubs"];
export const RANK_NAMES = ["Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Jack", "Queen", "King", "Ace"];
export const RANK_PLURAL = ["Deuces", "Threes", "Fours", "Fives", "Sixes", "Sevens", "Eights", "Nines", "Tens", "Jacks", "Queens", "Kings", "Aces"];

export const rankOf = (c: Card): number => c >> 2;
export const suitOf = (c: Card): number => c & 3;
export const makeCard = (rank: number, suit: number): Card => rank * 4 + suit;

export const cardToString = (c: Card): string => RANK_CHARS[rankOf(c)] + SUIT_CHARS[suitOf(c)];
export const cardPretty = (c: Card): string => RANK_CHARS[rankOf(c)] + SUIT_SYMBOLS[suitOf(c)];
export const cardsPretty = (cs: readonly Card[]): string => cs.map(cardPretty).join(" ");

export function parseCard(s: string): Card {
  const r = RANK_CHARS.indexOf(s[0].toUpperCase());
  const su = SUIT_CHARS.indexOf(s[1].toLowerCase());
  if (r < 0 || su < 0) throw new Error(`"${s}" isn't a card. Try something like Ah or Td.`);
  return makeCard(r, su);
}

export function parseCards(s: string): Card[] {
  const clean = s.replace(/[\s,]+/g, "");
  const out: Card[] = [];
  for (let i = 0; i < clean.length; i += 2) out.push(parseCard(clean.slice(i, i + 2)));
  return out;
}

export function newDeck(): Card[] {
  return Array.from({ length: 52 }, (_, i) => i);
}

/* ------------------------------------------------------------------ */
/* Hand classes: the 169 preflop hand types (AA, AKs, AKo, ...)         */
/* ------------------------------------------------------------------ */

export type HandClass = string;

/** Grid order used by every range chart: row/col 0 = Ace ... 12 = Deuce. */
export const GRID_CHARS = "AKQJT98765432";

export function gridHand(row: number, col: number): HandClass {
  const r1 = GRID_CHARS[row];
  const r2 = GRID_CHARS[col];
  if (row === col) return r1 + r2;
  if (col > row) return r1 + r2 + "s";
  return r2 + r1 + "o";
}

export const ALL_HANDS: HandClass[] = (() => {
  const out: HandClass[] = [];
  for (let r = 0; r < 13; r++) for (let c = 0; c < 13; c++) out.push(gridHand(r, c));
  return out;
})();

export function handRanks(h: HandClass): [number, number] {
  return [RANK_CHARS.indexOf(h[0]), RANK_CHARS.indexOf(h[1])];
}

export const isPair = (h: HandClass) => h.length === 2;
export const isSuited = (h: HandClass) => h[2] === "s";
export const isOffsuit = (h: HandClass) => h[2] === "o";

export function handGridPos(h: HandClass): [number, number] {
  const [hi, lo] = handRanks(h);
  const a = 12 - hi;
  const b = 12 - lo;
  if (isPair(h)) return [a, a];
  if (isSuited(h)) return [a, b];
  return [b, a];
}

export function comboCount(h: HandClass): number {
  return isPair(h) ? 6 : isSuited(h) ? 4 : 12;
}

export const TOTAL_COMBOS = 1326;

export function combosFor(h: HandClass): [Card, Card][] {
  const [r1, r2] = handRanks(h);
  const out: [Card, Card][] = [];
  if (isPair(h)) {
    for (let s1 = 0; s1 < 4; s1++) for (let s2 = s1 + 1; s2 < 4; s2++) out.push([makeCard(r1, s1), makeCard(r1, s2)]);
  } else if (isSuited(h)) {
    for (let s = 0; s < 4; s++) out.push([makeCard(r1, s), makeCard(r2, s)]);
  } else {
    for (let s1 = 0; s1 < 4; s1++) for (let s2 = 0; s2 < 4; s2++) if (s1 !== s2) out.push([makeCard(r1, s1), makeCard(r2, s2)]);
  }
  return out;
}

export function classOf(a: Card, b: Card): HandClass {
  const ra = rankOf(a);
  const rb = rankOf(b);
  if (ra === rb) return RANK_CHARS[ra] + RANK_CHARS[rb];
  const hi = Math.max(ra, rb);
  const lo = Math.min(ra, rb);
  return RANK_CHARS[hi] + RANK_CHARS[lo] + (suitOf(a) === suitOf(b) ? "s" : "o");
}

/** Order two hole cards high-first for display. */
export function sortHole([a, b]: [Card, Card]): [Card, Card] {
  return rankOf(a) >= rankOf(b) ? [a, b] : [b, a];
}

export function randomCombo(h: HandClass, rng: Rng, dead: readonly Card[] = []): [Card, Card] {
  const live = combosFor(h).filter(([a, b]) => !dead.includes(a) && !dead.includes(b));
  const list = live.length ? live : combosFor(h);
  return sortHole(list[Math.floor(rng() * list.length)]);
}

export function handName(h: HandClass): string {
  const [r1, r2] = handRanks(h);
  if (isPair(h)) return `Pocket ${RANK_PLURAL[r1].toLowerCase()}`;
  return `${RANK_NAMES[r1]}-${RANK_NAMES[r2]} ${isSuited(h) ? "suited" : "offsuit"}`;
}
