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
  rake: string;
  rakeImpact: string;
  pool: {
    headline: string;
    stats: { label: string; value: string }[];
    tendencies: string[];
    exploits: string[];
  };
}

const SOLVER: Sizing = { open: 2.5, sbOpen: 3, iso: 3.5, isoPer: 1, threeBetIP: 3, threeBetOOP: 4.4, fourBet: 2.3 };

export const STAKES: Record<StakeId, Stake> = {
  "1-2": {
    id: "1-2",
    label: "$1/$2 Live Cash",
    short: "$1/$2",
    sb: 1,
    bb: 2,
    table: 9,
    stackBB: 100,
    buyIn: "$100–$300 (100bb = $200)",
    sizing: {
      solver: SOLVER,
      live: { open: 5, sbOpen: 5, iso: 7.5, isoPer: 2.5, threeBetIP: 3, threeBetOOP: 4, fourBet: 2.3 },
    },
    rake: "Casinos typically take 10% up to a $5 cap plus a $1 jackpot/promo drop (no flop, no drop). Texas social clubs usually charge seat time per half hour instead.",
    rakeImpact:
      "Rake takes a much bigger bite out of small pots at $1/$2 than online. That punishes limping and calling small pots, and rewards raising first and taking pots down preflop.",
    pool: {
      headline: "Loose, passive, and sticky. Most money comes from value-betting weak players, not bluffing them.",
      stats: [
        { label: "Players seeing flops", value: "Often 3+ per hand" },
        { label: "Open-limping", value: "Very common" },
        { label: "3-bet frequency", value: "Low — and value-heavy" },
        { label: "River bluffs", value: "Rare" },
        { label: "Typical open", value: "$10–$15 (5–7bb)" },
      ],
      tendencies: [
        "Many players limp and call raises with any suited hand, any ace, and small pairs.",
        "A 3-bet from an unknown $1/$2 player is usually QQ+ or AK.",
        "Flop c-bets get called too often; turn and river bets are value-heavy.",
        "Big river bets and raises are very rarely bluffs.",
        "Straddles and deeper stacks show up often, which increases implied odds.",
      ],
      exploits: [
        "Value-bet thinner and bigger — they call with worse.",
        "Bluff less, especially multiway and on the river.",
        "Iso-raise limpers with strong hands; size up ($15 + $5 per limper).",
        "Fold more against big turn/river raises from passive players.",
        "Tighten up offsuit hands in early position — multiway pots punish weak kickers.",
      ],
    },
  },
  "2-5": {
    id: "2-5",
    label: "$2/$5 Live Cash",
    short: "$2/$5",
    sb: 2,
    bb: 5,
    table: 9,
    stackBB: 100,
    buyIn: "$300–$1,000+ (100bb = $500, often deeper)",
    sizing: {
      solver: SOLVER,
      live: { open: 4, sbOpen: 4, iso: 5, isoPer: 1, threeBetIP: 3, threeBetOOP: 4, fourBet: 2.3 },
    },
    rake: "Usually 10% up to a $5–$6 cap plus a jackpot/promo drop. The cap is hit more often, so rake is a smaller share of each pot than at $1/$2.",
    rakeImpact: "Rake matters less than at $1/$2, so ranges can play a bit closer to solver baselines — especially blind defense.",
    pool: {
      headline: "A mix of solid regulars and deep-stacked recreational players. More 3-betting, more thinking, bigger stacks.",
      stats: [
        { label: "Regulars at the table", value: "Usually 3–5" },
        { label: "3-bet frequency", value: "Moderate (still value-leaning)" },
        { label: "Effective stacks", value: "Often 150–300bb" },
        { label: "River raises", value: "Almost always strong" },
        { label: "Typical open", value: "$15–$25 (3–5bb)" },
      ],
      tendencies: [
        "Regulars open wider from late position and defend blinds more.",
        "3-bets are more frequent and include some bluffs from good regs.",
        "Deep stacks raise implied odds for suited connectors and small pairs.",
        "Turn check-raises and river raises are heavily weighted to strong hands.",
        "Recreational players still overcall preflop and on the flop.",
      ],
      exploits: [
        "Steal more against tight regulars in the blinds.",
        "Use 3-bets to isolate recreational players who open-call too wide.",
        "Respect big river aggression — population under-bluffs large pots.",
        "Play deeper stacks carefully with one-pair hands; set-mine and draw to the nuts.",
      ],
    },
  },
  online: {
    id: "online",
    label: "Solver Lab (Online 100bb)",
    short: "Solver lab",
    sb: 0.5,
    bb: 1,
    table: 6,
    stackBB: 100,
    buyIn: "100bb",
    sizing: { solver: SOLVER, live: SOLVER },
    rake: "Online rake is typically ~5% with a low cap; baselines here assume a modest rake.",
    rakeImpact: "Closest to the pure solver baseline. Use this to learn equilibrium ranges before layering on live exploits.",
    pool: {
      headline: "Tough, reg-heavy games where balanced, solver-like play is the standard.",
      stats: [
        { label: "3-bet frequency", value: "Solver-like" },
        { label: "Blind defense", value: "Wide" },
        { label: "Aggression", value: "Balanced" },
      ],
      tendencies: ["Opponents defend and 3-bet close to equilibrium.", "Mistakes are smaller, so small edges matter more."],
      exploits: ["Stick close to baseline ranges.", "Look for specific population leaks, like over-folding to turn barrels."],
    },
  },
};

export const STAKE_LIST: Stake[] = [STAKES["1-2"], STAKES["2-5"], STAKES.online];
