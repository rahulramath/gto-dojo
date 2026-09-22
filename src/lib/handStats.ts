import EQ from "../data/preflopEquity.json";
import { ALL_HANDS, comboCount, handRanks, isPair, isSuited, type HandClass } from "./cards";

const EQUITY = EQ as Record<string, number>;

/** All-in equity (%) vs a random hand. */
export const equityOf = (h: HandClass): number => EQUITY[h] ?? 50;

const TOP_PCT: Record<HandClass, number> = (() => {
  const sorted = ALL_HANDS.slice().sort((a, b) => equityOf(b) - equityOf(a));
  const out: Record<HandClass, number> = {};
  let cum = 0;
  for (const h of sorted) {
    cum += comboCount(h);
    out[h] = (cum / 1326) * 100;
  }
  return out;
})();

/** Where this hand sits among all starting hands (top X%). */
export const topPercent = (h: HandClass): number => TOP_PCT[h];

export const PREMIUMS = ["AA", "KK", "QQ", "AKs", "AKo"];
export const STRONG = ["JJ", "TT", "AQs", "AQo", "AJs", "KQs", "ATs", "KJs"];

export type HandCategory = "premium" | "strong" | "speculative" | "other";

export interface HandFeatures {
  hand: HandClass;
  hi: number;
  lo: number;
  pair: boolean;
  suited: boolean;
  gap: number;
  connected: boolean;
  broadway: boolean;
  ace: boolean;
  wheelAce: boolean;
  suitedConnector: boolean;
  smallPair: boolean;
  dominated: boolean;
  category: HandCategory;
  equity: number;
  top: number;
}

export function features(h: HandClass): HandFeatures {
  const [hi, lo] = handRanks(h);
  const pair = isPair(h);
  const suited = isSuited(h);
  const gap = pair ? -1 : hi - lo - 1;
  const connected = gap === 0;
  const broadway = lo >= 8;
  const ace = hi === 12;
  const wheelAce = ace && !pair && lo <= 3;
  const suitedConnector = suited && gap >= 0 && gap <= 1 && hi <= 10;
  const smallPair = pair && hi <= 7;
  const dominated = !pair && !suited && hi >= 10 && lo <= 7 && !connected;
  let category: HandCategory = "other";
  if (PREMIUMS.includes(h)) category = "premium";
  else if (STRONG.includes(h)) category = "strong";
  else if ((pair && hi <= 8) || suitedConnector || (suited && ace) || (suited && hi === 11 && lo >= 5)) category = "speculative";
  return {
    hand: h,
    hi,
    lo,
    pair,
    suited,
    gap,
    connected,
    broadway,
    ace,
    wheelAce,
    suitedConnector,
    smallPair,
    dominated,
    category,
    equity: equityOf(h),
    top: topPercent(h),
  };
}
