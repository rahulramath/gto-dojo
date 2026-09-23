import type { TableSize } from "./positions";

export type StakeId = "1-2" | "2-5" | "online";
export type SizingStyle = "solver" | "live";

export interface Sizing {
  /** Open size in bb (non-SB). */
  open: number;
  /** SB open size in bb. */
  sbOpen: number;
  /** Iso-raise base size vs one limper, in bb. */
  iso: number;
  /** Extra bb per additional limper. */
  isoPer: number;
  /** 3-bet multiplier of the open when in position. */
  threeBetIP: number;
  /** 3-bet multiplier of the open from the blinds. */
  threeBetOOP: number;
  /** 4-bet multiplier of the 3-bet. */
  fourBet: number;
}

export interface Stake {
  id: StakeId;
  label: string;
  short: string;
  sb: number;
  bb: number;
  table: TableSize;
  stackBB: number;
  buyIn: string;
  sizing: Record<SizingStyle, Sizing>;
  pool: {
    headline: string;
    exploits: string[];
  };
}

const SOLVER: Sizing = { open: 2.5, sbOpen: 3, iso: 3.5, isoPer: 1, threeBetIP: 3, threeBetOOP: 4.4, fourBet: 2.3 };

export const STAKES: Record<StakeId, Stake> = {
  "1-2": {
    id: "1-2",
    label: "$1/$2 live",
    short: "$1/$2",
    sb: 1,
    bb: 2,
    table: 9,
    stackBB: 100,
    buyIn: "Usually a $100 to $300 buy-in",
    sizing: {
      solver: SOLVER,
      live: { open: 5, sbOpen: 5, iso: 7.5, isoPer: 2.5, threeBetIP: 3, threeBetOOP: 4, fourBet: 2.3 },
    },
    pool: {
      headline: "Loose and passive. You make most of your money value betting, so bluff less.",
      exploits: [
        "Bet thinner and bigger for value. They call with worse.",
        "Bluff less, especially in multiway pots and on the river.",
        "Raise limpers with strong hands, and size up to $15 plus $5 per limper.",
        "Fold more to big turn and river raises from passive players.",
        "Play fewer offsuit hands from early seats. Multiway pots punish weak kickers.",
      ],
    },
  },
  "2-5": {
    id: "2-5",
    label: "$2/$5 live",
    short: "$2/$5",
    sb: 2,
    bb: 5,
    table: 9,
    stackBB: 100,
    buyIn: "Usually a $300 to $1,000 buy-in, often deeper",
    sizing: {
      solver: SOLVER,
      live: { open: 4, sbOpen: 4, iso: 5, isoPer: 1, threeBetIP: 3, threeBetOOP: 4, fourBet: 2.3 },
    },
    pool: {
      headline: "Solid regulars mixed with deep-stacked recreational players. Expect more 3-bets and bigger stacks.",
      exploits: [
        "Steal more when tight regulars are in the blinds.",
        "3-bet the recreational players who call too many opens.",
        "Respect big river bets. Most players don't bluff big pots enough.",
        "With deep stacks, go easy with one pair. Set mine and draw to the nuts.",
      ],
    },
  },
  online: {
    id: "online",
    label: "Online, 100bb",
    short: "Online",
    sb: 0.5,
    bb: 1,
    table: 6,
    stackBB: 100,
    buyIn: "100 big blind stacks",
    sizing: { solver: SOLVER, live: SOLVER },
    pool: {
      headline: "Tough games full of regulars, where solid, balanced play is the standard.",
      exploits: ["Stick close to the charts.", "Look for specific leaks, like players folding too much to turn bets."],
    },
  },
};

export const STAKE_LIST: Stake[] = [STAKES["1-2"], STAKES["2-5"], STAKES.online];
