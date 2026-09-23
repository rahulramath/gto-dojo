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
  /** Short, practical notes shown in the exploit tip. */
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
  /** How the coach refers to this player mid-sentence, e.g. "a calling station". */
  who: string;
  blurb: string;
  tendencies: Tendencies;
  counter: Counter;
  preflop: PreflopExploit;
}

const GTO_T: Tendencies = { bet: ones, call: ones, raise: ones, riverBluff: 1, bigSizing: 0 };

export const ARCHETYPES: Record<Exclude<ArchetypeId, "pool">, Archetype> = {
  gto: {
    id: "gto",
    name: "Solver bot",
    who: "a solver bot",
    emoji: "🤖",
    color: "#94a3b8",
    blurb: "Plays a balanced strategy. You can't exploit it, you can only avoid losing to it.",
    tendencies: GTO_T,
    counter: {
      bet: ones,
      call: ones,
      raise: ones,
      sizeUp: false,
      valueBet: "Play your normal strategy. Nothing wins more against a balanced player.",
      bluff: "Bluff at your normal rate, with hands that block their calls.",
      facingBet: "Defend about as often as the math says, and don't over-fold.",
      facingRaise: "Keep going with your strongest hands and best draws.",
      preflop: "Stick to the chart.",
    },
    preflop: { bluff3bets: "same", value3betWider: false, stealMore: false, respectAggression: false, defendWiderVs3bet: false },
  },
  station: {
    id: "station",
    name: "Calling station",
    who: "a calling station",
    emoji: "🐟",
    color: "#38bdf8",
    blurb: "Calls way too much and rarely raises. Hates folding any pair or any draw.",
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
      valueBet: "Bet bigger and thinner. They call with second pair, so top pair can bet all three streets.",
      bluff: "Don't bluff. They call too much for a bluff to work.",
      facingBet: "When they finally bet, they usually have it. Fold more of your close calls.",
      facingRaise: "Their raise is the nuts or close to it. Fold one pair.",
      preflop: "Raise their limps with good hands and size up. Skip light 3-bets, and 3-bet more of your strong hands for value.",
    },
    preflop: { bluff3bets: "less", value3betWider: true, stealMore: false, respectAggression: true, defendWiderVs3bet: false },
  },
  nit: {
    id: "nit",
    name: "Nit",
    who: "a nit",
    emoji: "🪨",
    color: "#a3a3a3",
    blurb: "Plays very few hands and folds to pressure. When they put money in, they have it.",
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
      valueBet: "Only value bet your strong hands. They won't pay off thin bets.",
      bluff: "Bluff more, especially with small c-bets and turn bets. They fold anything that isn't strong.",
      facingBet: "Respect their bets. Fold medium hands you'd call against anyone else.",
      facingRaise: "Their raise is almost always two pair or better. Let one pair go.",
      preflop: "Steal their blinds all the time, but respect their early opens and their 3-bets.",
    },
    preflop: { bluff3bets: "less", value3betWider: false, stealMore: true, respectAggression: true, defendWiderVs3bet: false },
  },
  tag: {
    id: "tag",
    name: "Solid regular",
    who: "a solid regular",
    emoji: "🎯",
    color: "#22c55e",
    blurb: "Tight and aggressive. Plays close to the chart, but doesn't bluff big pots enough, like most live players.",
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
      valueBet: "Play it straight. Size up a little with the nuts, since regulars pay off with strong one pair hands.",
      bluff: "Keep betting the turn. Regulars often fold medium hands to a second bet.",
      facingBet: "Fold a bit more to big river bets. Most players don't bluff big pots enough.",
      facingRaise: "Respect turn and river raises. They're rarely bluffs in live games.",
      preflop: "Play the chart, and steal a bit more if they defend their blinds too tightly.",
    },
    preflop: { bluff3bets: "same", value3betWider: false, stealMore: false, respectAggression: false, defendWiderVs3bet: false },
  },
  lag: {
    id: "lag",
    name: "Loose-aggressive",
    who: "a loose-aggressive player",
    emoji: "🔥",
    color: "#f97316",
    blurb: "Plays lots of hands and keeps the pressure on. Bluffs more than they should.",
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
      valueBet: "Check some strong hands and let them bluff. Their aggression builds the pot for you.",
      bluff: "Bluff less. They fight back and call wider.",
      facingBet: "Call down wider with medium hands. They're bluffing more often than they should.",
      facingRaise: "Keep going a bit wider against their raises, especially with big draws and top pair.",
      preflop: "3-bet them with more value hands like AJ, KQ and TT, and call their 3-bets a bit wider in position.",
    },
    preflop: { bluff3bets: "less", value3betWider: true, stealMore: false, respectAggression: false, defendWiderVs3bet: true },
  },
  maniac: {
    id: "maniac",
    name: "Maniac",
    who: "a maniac",
    emoji: "🌪️",
    color: "#ef4444",
    blurb: "Bets and raises almost everything, often with huge sizes. Scary, and very profitable.",
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
      valueBet: "Check your big hands and let them bet for you.",
      bluff: "Almost never bluff. They don't fold and they re-raise.",
      facingBet: "Call down much wider. Second pair and even ace-high can be good calls here.",
      facingRaise: "Their raises are wide. Keep going with top pair and good draws.",
      preflop: "Open a bit tighter since you'll get 3-bet a lot, then 4-bet and get it in lighter with strong hands.",
    },
    preflop: { bluff3bets: "less", value3betWider: true, stealMore: false, respectAggression: false, defendWiderVs3bet: true },
  },
};

/** "Pool" = the average opponent at the chosen stake. */
export function poolArchetype(stake: StakeId): Archetype {
  if (stake === "online") return { ...ARCHETYPES.gto, id: "pool", name: "Online regulars", who: "online regulars", emoji: "💻" };
  if (stake === "2-5") {
    return {
      id: "pool",
      name: "$2/$5 table",
      who: "a typical $2/$5 table",
      emoji: "🎰",
      color: "#eab308",
      blurb: "A mix of solid regulars and deep-stacked recreational players.",
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
        valueBet: "Bet a bit thinner and bigger. Recreational players call too much.",
        bluff: "Bluff a little less on the river. Turn bets still work against regulars.",
        facingBet: "Big river bets are usually value, so fold your weakest calls.",
        facingRaise: "Turn and river raises are strong. Don't pay them off with one pair.",
        preflop: "Steal from tight regulars, raise the recreational players out of position and respect 4-bets.",
      },
      preflop: { bluff3bets: "same", value3betWider: true, stealMore: true, respectAggression: true, defendWiderVs3bet: false },
    };
  }
  return {
    id: "pool",
    name: "$1/$2 table",
    who: "a typical $1/$2 table",
    emoji: "🎲",
    color: "#eab308",
    blurb: "Loose and passive. Lots of limping and calling, very few bluffs. The classic low-stakes live game.",
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
      valueBet: "Bet thinner and bigger. Players at $1/$2 call too much with worse.",
      bluff: "Cut your bluffs, especially in multiway pots and on the river. Only semi-bluff with real draws.",
      facingBet: "Passive players bet when they have it. Fold more close hands to turn and river bets.",
      facingRaise: "A turn or river raise at $1/$2 is almost never a bluff.",
      preflop: "Raise limpers big with good hands, 3-bet for value instead of as a bluff and fold weak offsuit hands from early seats.",
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
