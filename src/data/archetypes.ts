import type { Bucket } from "../lib/handStrength";
import type { StakeId } from "./stakes";

export type ArchetypeId = "pool" | "gto" | "station" | "nit" | "tag" | "lag" | "maniac";

type BMap = Record<Bucket, number>;

const ones: BMap = { nutted: 1, strong: 1, medium: 1, weak: 1, drawStrong: 1, drawWeak: 1, air: 1 };
const m = (p: Partial<BMap>): BMap => ({ ...ones, ...p });

export interface Tendencies {
  /** Multiplier on betting frequency when not facing a bet. */
  bet: BMap;
  /** Multiplier on calling frequency when facing a bet. */
  call: BMap;
  /** Multiplier on raising frequency when facing a bet. */
  raise: BMap;
  /** Extra multiplier on river bluffs. */
  riverBluff: number;
  /** 0..1 preference for bigger bet sizes. */
  bigSizing: number;
}

export interface Counter {
  bet: BMap;
  call: BMap;
  raise: BMap;
  /** Shift value bets toward bigger sizes. */
  sizeUp: boolean;
  /** Short, practical notes for the Exploit rung. */
  valueBet: string;
  bluff: string;
  facingBet: string;
  facingRaise: string;
  preflop: string;
}

export interface PreflopExploit {
  bluff3bets: "more" | "less" | "same";
  value3betWider: boolean;
  stealMore: boolean;
  respectAggression: boolean;
  defendWiderVs3bet: boolean;
}

export interface Archetype {
  id: ArchetypeId;
  name: string;
  emoji: string;
  color: string;
  blurb: string;
  stats: { vpip: string; pfr: string; threeBet: string; af: string };
  tells: string[];
  tendencies: Tendencies;
  counter: Counter;
  preflop: PreflopExploit;
}

const GTO_T: Tendencies = { bet: ones, call: ones, raise: ones, riverBluff: 1, bigSizing: 0 };

export const ARCHETYPES: Record<Exclude<ArchetypeId, "pool">, Archetype> = {
  gto: {
    id: "gto",
    name: "Solver Bot",
    emoji: "🤖",
    color: "#94a3b8",
    blurb: "Plays the baseline strategy. You can't exploit it; you can only avoid losing to it.",
    stats: { vpip: "24%", pfr: "20%", threeBet: "8%", af: "Balanced" },
    tells: ["No tells: frequencies are balanced by design."],
    tendencies: GTO_T,
    counter: {
      bet: ones,
      call: ones,
      raise: ones,
      sizeUp: false,
      valueBet: "Play the baseline — no adjustment wins more against a balanced opponent.",
      bluff: "Bluff at baseline frequency, choosing hands with the best blockers.",
      facingBet: "Defend close to minimum defense frequency; don't over-fold.",
      facingRaise: "Continue with your strongest hands and best draws at baseline frequency.",
      preflop: "Stick to the chart.",
    },
    preflop: { bluff3bets: "same", value3betWider: false, stealMore: false, respectAggression: false, defendWiderVs3bet: false },
  },
  station: {
    id: "station",
    name: "Calling Station",
    emoji: "🐟",
    color: "#38bdf8",
    blurb: "Calls far too much and rarely raises. Hates folding any pair or any draw.",
    stats: { vpip: "45%+", pfr: "6%", threeBet: "2%", af: "< 1" },
    tells: ["Limps and calls preflop a lot", "Calls flop bets with any piece", "Only bets when strong", "Rarely folds to a single bet"],
    tendencies: {
      bet: m({ nutted: 0.7, strong: 0.6, medium: 0.5, weak: 0.3, drawStrong: 0.4, drawWeak: 0.25, air: 0.2 }),
      call: m({ nutted: 0.8, strong: 1.1, medium: 1.6, weak: 2.5, drawStrong: 1.4, drawWeak: 2.2, air: 3 }),
      raise: m({ nutted: 0.4, strong: 0.3, medium: 0.2, weak: 0.1, drawStrong: 0.2, drawWeak: 0.1, air: 0.05 }),
      riverBluff: 0.3,
      bigSizing: 0,
    },
    counter: {
      bet: m({ nutted: 1.25, strong: 1.25, medium: 1.45, weak: 0.8, drawStrong: 0.6, drawWeak: 0.3, air: 0.2 }),
      call: m({ medium: 0.8, weak: 0.5, drawWeak: 0.9, air: 0.3 }),
      raise: m({ nutted: 1.3, strong: 1.2, medium: 0.6, weak: 0.3, drawStrong: 0.5, drawWeak: 0.3, air: 0.2 }),
      sizeUp: true,
      valueBet: "Bet bigger and thinner. A station calls with second pair, so top pair is a three-street value hand.",
      bluff: "Don't bluff. A station's calling range is too wide for bluffs to get enough folds.",
      facingBet: "When a station finally bets, it's usually a real hand. Fold more of your marginal bluff-catchers.",
      facingRaise: "A station's raise is the nuts or close to it. Fold one-pair hands.",
      preflop: "Iso-raise their limps with value hands and size up. Skip light 3-bet bluffs; 3-bet strong hands wider for value.",
    },
    preflop: { bluff3bets: "less", value3betWider: true, stealMore: false, respectAggression: true, defendWiderVs3bet: false },
  },
  nit: {
    id: "nit",
    name: "Nit",
    emoji: "🪨",
    color: "#a3a3a3",
    blurb: "Plays very few hands and folds to pressure. When a nit puts money in, they have it.",
    stats: { vpip: "12%", pfr: "9%", threeBet: "3%", af: "Low" },
    tells: ["Folds most hands preflop", "Gives up on the flop when missing", "Big bets are always value", "Rarely bluffs the river"],
    tendencies: {
      bet: m({ nutted: 1, strong: 0.9, medium: 0.5, weak: 0.3, drawStrong: 0.6, drawWeak: 0.3, air: 0.25 }),
      call: m({ strong: 0.9, medium: 0.6, weak: 0.35, drawStrong: 0.7, drawWeak: 0.4, air: 0.2 }),
      raise: m({ strong: 0.5, medium: 0.2, weak: 0.1, drawStrong: 0.3, drawWeak: 0.1, air: 0.05 }),
      riverBluff: 0.3,
      bigSizing: 0,
    },
    counter: {
      bet: m({ strong: 0.9, medium: 0.6, weak: 0.9, drawStrong: 1.2, drawWeak: 1.5, air: 1.8 }),
      call: m({ strong: 0.85, medium: 0.55, weak: 0.4, drawStrong: 0.8, drawWeak: 0.6, air: 0.3 }),
      raise: m({ strong: 0.6, medium: 0.4, weak: 0.5, drawStrong: 1.2, drawWeak: 1.3, air: 1.4 }),
      sizeUp: false,
      valueBet: "Value-bet only your strong hands. A nit won't pay off thin value with worse.",
      bluff: "Bluff more — especially small c-bets and turn barrels. Nits fold everything that isn't strong.",
      facingBet: "Respect their bets. Fold medium hands that would be calls against a balanced player.",
      facingRaise: "A nit's raise is almost always two pair or better. Let one-pair hands go.",
      preflop: "Steal their blinds relentlessly, but give their early-position opens and 3-bets a lot of respect.",
    },
    preflop: { bluff3bets: "less", value3betWider: false, stealMore: true, respectAggression: true, defendWiderVs3bet: false },
  },
  tag: {
    id: "tag",
    name: "Solid Reg (TAG)",
    emoji: "🎯",
    color: "#22c55e",
    blurb: "Tight-aggressive regular. Close to baseline, but under-bluffs big pots like most live players.",
    stats: { vpip: "22%", pfr: "18%", threeBet: "7%", af: "Medium-high" },
    tells: ["Standard open sizes", "C-bets often", "Big river bets lean to value", "Folds to 4-bets without premiums"],
    tendencies: {
      bet: m({ air: 0.9 }),
      call: m({ medium: 0.95, weak: 0.9 }),
      raise: m({ air: 0.8, drawWeak: 0.8 }),
      riverBluff: 0.75,
      bigSizing: 0.1,
    },
    counter: {
      bet: m({ drawWeak: 1.1, air: 1.1 }),
      call: m({ medium: 0.9, weak: 0.9 }),
      raise: ones,
      sizeUp: false,
      valueBet: "Close to baseline. Size up slightly with the nuts — regs pay off big hands when they have strong one-pair hands.",
      bluff: "Turn barrels work well: regs often fold medium hands to the second bet.",
      facingBet: "Slightly over-fold to big river bets — population under-bluffs large pots.",
      facingRaise: "Respect turn and river raises; they're rarely bluffs in live games.",
      preflop: "Play the chart. Steal a bit more if they defend blinds too tightly.",
    },
    preflop: { bluff3bets: "same", value3betWider: false, stealMore: false, respectAggression: false, defendWiderVs3bet: false },
  },
  lag: {
    id: "lag",
    name: "Loose-Aggressive (LAG)",
    emoji: "🔥",
    color: "#f97316",
    blurb: "Plays lots of hands and applies pressure. Bluffs more than baseline.",
    stats: { vpip: "30%", pfr: "25%", threeBet: "11%", af: "High" },
    tells: ["Opens and 3-bets wide", "Barrels scare cards", "Raises draws often", "Takes stabs when checked to"],
    tendencies: {
      bet: m({ nutted: 1.05, strong: 1.15, medium: 1.3, weak: 1.4, drawStrong: 1.3, drawWeak: 1.5, air: 1.6 }),
      call: m({ medium: 1.15, weak: 1.3, drawWeak: 1.2, air: 1.2 }),
      raise: m({ nutted: 1.2, strong: 1.3, drawStrong: 1.5, drawWeak: 1.8, air: 2 }),
      riverBluff: 1.5,
      bigSizing: 0.3,
    },
    counter: {
      bet: m({ nutted: 0.75, strong: 0.9, medium: 0.7, weak: 0.8, drawWeak: 0.8, air: 0.7 }),
      call: m({ strong: 1.1, medium: 1.35, weak: 1.6, drawStrong: 1.1, drawWeak: 1.2, air: 1.2 }),
      raise: m({ medium: 0.8, weak: 0.6, drawStrong: 0.9, drawWeak: 0.6, air: 0.5 }),
      sizeUp: false,
      valueBet: "Check some strong hands to let them bluff. Their aggression builds the pot for you.",
      bluff: "Bluff less — aggressive players fight back and call wider.",
      facingBet: "Call down wider with medium hands. Their betting range has more air than baseline.",
      facingRaise: "Continue a bit wider versus their raises, especially with strong draws and top pair.",
      preflop: "3-bet them for value more linearly (AJ, KQ, TT) and call their 3-bets a bit wider in position.",
    },
    preflop: { bluff3bets: "less", value3betWider: true, stealMore: false, respectAggression: false, defendWiderVs3bet: true },
  },
  maniac: {
    id: "maniac",
    name: "Maniac",
    emoji: "🌪️",
    color: "#ef4444",
    blurb: "Bets and raises almost everything, often with huge sizes. Terrifying and very profitable.",
    stats: { vpip: "55%", pfr: "40%", threeBet: "18%", af: "Very high" },
    tells: ["Raises most hands preflop", "Overbets and jams light", "Rarely checks when checked to", "Tilts after losing pots"],
    tendencies: {
      bet: m({ nutted: 1.1, strong: 1.3, medium: 1.7, weak: 2, drawStrong: 1.6, drawWeak: 2.2, air: 2.6 }),
      call: m({ medium: 1.4, weak: 1.8, drawWeak: 1.6, air: 1.8 }),
      raise: m({ nutted: 1.4, strong: 1.6, medium: 1.5, weak: 1.5, drawStrong: 2, drawWeak: 2.5, air: 3 }),
      riverBluff: 2.2,
      bigSizing: 0.6,
    },
    counter: {
      bet: m({ nutted: 0.6, strong: 0.8, medium: 0.6, weak: 0.6, drawStrong: 0.8, drawWeak: 0.5, air: 0.35 }),
      call: m({ strong: 1.2, medium: 1.6, weak: 2, drawStrong: 1.2, drawWeak: 1.3, air: 1.2 }),
      raise: m({ nutted: 1.1, medium: 0.6, weak: 0.4, drawStrong: 0.8, drawWeak: 0.4, air: 0.3 }),
      sizeUp: false,
      valueBet: "Check your big hands and let them bet for you. Don't scare them off.",
      bluff: "Almost never bluff. They don't fold and they re-raise.",
      facingBet: "Call down much wider — second pair and even ace-high can be bluff-catchers here.",
      facingRaise: "Their raises are wide. Continue with top pair and good draws.",
      preflop: "Tighten your opens (you'll get 3-bet), then 4-bet and call off lighter with strong hands.",
    },
    preflop: { bluff3bets: "less", value3betWider: true, stealMore: false, respectAggression: false, defendWiderVs3bet: true },
  },
};

/** "Pool" = the average opponent at the chosen stake. */
export function poolArchetype(stake: StakeId): Archetype {
  if (stake === "online") return { ...ARCHETYPES.gto, id: "pool", name: "Online Reg Pool", emoji: "💻" };
  if (stake === "2-5") {
    return {
      id: "pool",
      name: "$2/$5 Pool",
      emoji: "🎰",
      color: "#eab308",
      blurb: "A mix of solid regulars and deep-stacked recreational players.",
      stats: { vpip: "~30%", pfr: "~15%", threeBet: "~5%", af: "Medium" },
      tells: ["Regs 3-bet more than at $1/$2", "Deep stacks", "River raises are strong"],
      tendencies: {
        bet: m({ medium: 0.85, weak: 0.7, drawStrong: 0.9, drawWeak: 0.75, air: 0.7 }),
        call: m({ medium: 1.1, weak: 1.3, drawWeak: 1.2, air: 1.3 }),
        raise: m({ nutted: 0.85, strong: 0.7, medium: 0.5, weak: 0.4, drawStrong: 0.7, drawWeak: 0.5, air: 0.5 }),
        riverBluff: 0.6,
        bigSizing: 0.1,
      },
      counter: {
        bet: m({ medium: 1.15, drawWeak: 0.9, air: 0.85 }),
        call: m({ medium: 0.9, weak: 0.8 }),
        raise: m({ air: 0.7 }),
        sizeUp: true,
        valueBet: "Value-bet a little thinner and bigger than baseline; recreational players overcall.",
        bluff: "Bluff slightly less on the river; turn stabs still work against regs.",
        facingBet: "Big river bets are value-heavy — fold your weakest bluff-catchers.",
        facingRaise: "Turn and river raises are strong. Don't pay them off with one pair.",
        preflop: "Steal from tight regs, isolate recreational players, and respect 4-bets.",
      },
      preflop: { bluff3bets: "same", value3betWider: true, stealMore: true, respectAggression: true, defendWiderVs3bet: false },
    };
  }
  return {
    id: "pool",
    name: "$1/$2 Pool",
    emoji: "🎲",
    color: "#eab308",
    blurb: "Loose-passive: lots of limping and calling, few bluffs. The classic low-stakes live table.",
    stats: { vpip: "~40%", pfr: "~10%", threeBet: "~3%", af: "Low" },
    tells: ["Open-limps", "Calls flop bets light", "Passive until they hit", "Big bets = big hands"],
    tendencies: {
      bet: m({ nutted: 0.9, strong: 0.9, medium: 0.7, weak: 0.5, drawStrong: 0.7, drawWeak: 0.5, air: 0.45 }),
      call: m({ strong: 1.05, medium: 1.3, weak: 1.8, drawStrong: 1.2, drawWeak: 1.6, air: 2 }),
      raise: m({ nutted: 0.6, strong: 0.5, medium: 0.4, weak: 0.3, drawStrong: 0.5, drawWeak: 0.3, air: 0.25 }),
      riverBluff: 0.5,
      bigSizing: 0,
    },
    counter: {
      bet: m({ nutted: 1.1, strong: 1.15, medium: 1.25, weak: 0.85, drawStrong: 0.8, drawWeak: 0.6, air: 0.5 }),
      call: m({ medium: 0.85, weak: 0.7, drawWeak: 0.9, air: 0.5 }),
      raise: m({ nutted: 1.2, medium: 0.7, weak: 0.5, drawWeak: 0.6, air: 0.4 }),
      sizeUp: true,
      valueBet: "Value-bet thinner and bigger. The $1/$2 pool calls too much with worse.",
      bluff: "Cut your bluffs, especially multiway and on the river. Semi-bluff only with real equity.",
      facingBet: "Passive players bet when they have it. Fold more marginal hands to turn and river bets.",
      facingRaise: "A $1/$2 raise on the turn or river is almost never a bluff.",
      preflop: "Iso-raise limpers big with value hands, 3-bet for value (not as a bluff), and fold weak offsuit hands early.",
    },
    preflop: { bluff3bets: "less", value3betWider: true, stealMore: false, respectAggression: true, defendWiderVs3bet: false },
  };
}

const POOL_CACHE: Partial<Record<StakeId, Archetype>> = {};

export function getArchetype(id: ArchetypeId, stake: StakeId): Archetype {
  if (id !== "pool") return ARCHETYPES[id];
  return (POOL_CACHE[stake] ??= poolArchetype(stake));
}

export const ARCHETYPE_IDS: ArchetypeId[] = ["pool", "gto", "station", "nit", "tag", "lag", "maniac"];
