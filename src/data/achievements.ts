import type { ArchetypeId } from "./archetypes";
import type { PosId } from "./positions";
import type { StakeId } from "./stakes";
import type { PosStat } from "../lib/progression";

export interface Counters {
  decisions: number;
  correct: number;
  perfect: number;
  streak: number;
  bestStreak: number;
  ladderOpens: number;
  fullLadders: number;
  reasonRight: number;
  sureStreak: number;
  bestSureStreak: number;
  srsCleared: number;
  mathPerfect: number;
  mathRuns: number;
  paintBest: number;
  paintRuns: number;
  handsPlayed: number;
  flopCorrect: number;
  riverDecisions: number;
  riverCallsCorrect: number;
  riverValueCorrect: number;
  exploitCorrect: number;
  byArch: Partial<Record<ArchetypeId, number>>;
  isoCorrect: number;
  threeBetCorrect: number;
  rfiSeats: PosId[];
  stakeDecisions: Partial<Record<StakeId, number>>;
  nightOwl: number;
  sessions: number;
  perfectSessions: number;
  dailies: number;
}

export const EMPTY_COUNTERS: Counters = {
  decisions: 0,
  correct: 0,
  perfect: 0,
  streak: 0,
  bestStreak: 0,
  ladderOpens: 0,
  fullLadders: 0,
  reasonRight: 0,
  sureStreak: 0,
  bestSureStreak: 0,
  srsCleared: 0,
  mathPerfect: 0,
  mathRuns: 0,
  paintBest: 0,
  paintRuns: 0,
  handsPlayed: 0,
  flopCorrect: 0,
  riverDecisions: 0,
  riverCallsCorrect: 0,
  riverValueCorrect: 0,
  exploitCorrect: 0,
  byArch: {},
  isoCorrect: 0,
  threeBetCorrect: 0,
  rfiSeats: [],
  stakeDecisions: {},
  nightOwl: 0,
  sessions: 0,
  perfectSessions: 0,
  dailies: 0,
};

export interface AchState {
  counters: Counters;
  pos: Partial<Record<PosId, PosStat>>;
  bestStreakDays: number;
  lessonsDone: number[];
}

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  icon: string;
  xp: number;
  group: "Seats" | "Accuracy" | "Study" | "Postflop" | "Exploits" | "Habits";
  progress: (s: AchState) => [number, number];
}

const posCorrect = (s: AchState, ...ps: PosId[]) => ps.reduce((n, p) => n + (s.pos[p]?.correct ?? 0), 0);
const c = (s: AchState) => s.counters;

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-hand", name: "First hand", desc: "Make your first decision.", icon: "🃏", xp: 20, group: "Habits", progress: (s) => [c(s).decisions, 1] },
  { id: "first-session", name: "Warmed up", desc: "Finish your first session.", icon: "✅", xp: 30, group: "Habits", progress: (s) => [c(s).sessions, 1] },
  { id: "flawless", name: "Flawless", desc: "Get every hand right in a session.", icon: "💎", xp: 150, group: "Accuracy", progress: (s) => [c(s).perfectSessions, 1] },
  { id: "daily-3", name: "Daily regular", desc: "Play 3 Daily Challenges.", icon: "📆", xp: 90, group: "Habits", progress: (s) => [c(s).dailies, 3] },
  { id: "dealers-choice", name: "Dealer's choice", desc: "Get 25 decisions right on the button.", icon: "🎩", xp: 60, group: "Seats", progress: (s) => [posCorrect(s, "BTN"), 25] },
  { id: "button-bandit", name: "Button bandit", desc: "Get 150 decisions right on the button.", icon: "🦝", xp: 150, group: "Seats", progress: (s) => [posCorrect(s, "BTN"), 150] },
  { id: "sb-survivor", name: "Small blind survivor", desc: "Get 50 decisions right from the small blind.", icon: "🛡️", xp: 100, group: "Seats", progress: (s) => [posCorrect(s, "SB"), 50] },
  { id: "bb-defender", name: "Big blind defender", desc: "Get 100 decisions right from the big blind.", icon: "🧱", xp: 150, group: "Seats", progress: (s) => [posCorrect(s, "BB"), 100] },
  { id: "utg-discipline", name: "UTG discipline", desc: "Get 60 decisions right from early seats.", icon: "🧘", xp: 100, group: "Seats", progress: (s) => [posCorrect(s, "LJ", "EP1", "EP2", "EP3"), 60] },
  { id: "hijacker", name: "Hijacker", desc: "Get 50 decisions right from the hijack.", icon: "🏴‍☠️", xp: 80, group: "Seats", progress: (s) => [posCorrect(s, "HJ"), 50] },
  { id: "cutoff-king", name: "Cutoff king", desc: "Get 50 decisions right from the cutoff.", icon: "👑", xp: 80, group: "Seats", progress: (s) => [posCorrect(s, "CO"), 50] },
  {
    id: "every-seat",
    name: "Every seat",
    desc: "Get 15 decisions right in each 6-max seat.",
    icon: "🪑",
    xp: 150,
    group: "Seats",
    progress: (s) => [(["LJ", "HJ", "CO", "BTN", "SB", "BB"] as PosId[]).filter((p) => (s.pos[p]?.correct ?? 0) >= 15).length, 6],
  },
  { id: "full-ring", name: "Full-ring veteran", desc: "Open correctly from all 8 full-ring opening seats.", icon: "💺", xp: 150, group: "Seats", progress: (s) => [c(s).rfiSeats.length, 8] },
  { id: "hot-hand", name: "Hot hand", desc: "Get 10 decisions in a row right.", icon: "🔥", xp: 50, group: "Accuracy", progress: (s) => [c(s).bestStreak, 10] },
  { id: "on-fire", name: "On fire", desc: "Get 25 decisions in a row right.", icon: "☄️", xp: 120, group: "Accuracy", progress: (s) => [c(s).bestStreak, 25] },
  { id: "solver-brain", name: "Solver brain", desc: "Get 50 decisions in a row right.", icon: "🤖", xp: 300, group: "Accuracy", progress: (s) => [c(s).bestStreak, 50] },
  { id: "centurion", name: "Centurion", desc: "Make 100 perfect decisions.", icon: "💯", xp: 150, group: "Accuracy", progress: (s) => [c(s).perfect, 100] },
  { id: "grinder", name: "Grinder", desc: "Make 1,000 decisions.", icon: "⛏️", xp: 250, group: "Habits", progress: (s) => [c(s).decisions, 1000] },
  { id: "marathon", name: "Marathon", desc: "Make 5,000 decisions.", icon: "🏃", xp: 600, group: "Habits", progress: (s) => [c(s).decisions, 5000] },
  { id: "curious", name: "Curious mind", desc: "Open 50 follow-up questions after a hand.", icon: "🔍", xp: 60, group: "Study", progress: (s) => [c(s).ladderOpens, 50] },
  { id: "deep-diver", name: "Deep diver", desc: "Open Learn more on 10 hands.", icon: "🤿", xp: 100, group: "Study", progress: (s) => [c(s).fullLadders, 10] },
  { id: "thinks-pro", name: "Thinks like a pro", desc: "Answer 25 lesson questions right.", icon: "🧠", xp: 120, group: "Study", progress: (s) => [c(s).reasonRight, 25] },
  { id: "math-whiz", name: "Math whiz", desc: "Score 10 out of 10 in a math drill.", icon: "🧮", xp: 100, group: "Study", progress: (s) => [c(s).mathPerfect, 1] },
  { id: "painter", name: "Range painter", desc: "Paint a chart from memory at 90% or better.", icon: "🎨", xp: 120, group: "Study", progress: (s) => [c(s).paintBest, 90] },
  { id: "leak-plugger", name: "Leak plugger", desc: "Fix 25 hands from your mistakes review.", icon: "🩹", xp: 150, group: "Study", progress: (s) => [c(s).srsCleared, 25] },
  { id: "flop-student", name: "Flop student", desc: "Get 50 flop decisions right.", icon: "🌊", xp: 100, group: "Postflop", progress: (s) => [c(s).flopCorrect, 50] },
  { id: "river-rat", name: "River rat", desc: "Make 50 river decisions.", icon: "🐀", xp: 100, group: "Postflop", progress: (s) => [c(s).riverDecisions, 50] },
  { id: "hero-call", name: "Hero call", desc: "Make 10 good river calls against a bet.", icon: "🦸", xp: 120, group: "Postflop", progress: (s) => [c(s).riverCallsCorrect, 10] },
  { id: "value-town", name: "Mayor of value town", desc: "Make 25 good river value bets.", icon: "🏙️", xp: 120, group: "Postflop", progress: (s) => [c(s).riverValueCorrect, 25] },
  { id: "seen-it-through", name: "Seen it through", desc: "Play 25 postflop hands to the end.", icon: "🏁", xp: 80, group: "Postflop", progress: (s) => [c(s).handsPlayed, 25] },
  { id: "exploit-artist", name: "Exploit artist", desc: "Make 50 plays that also beat your opponent's style.", icon: "🎭", xp: 150, group: "Exploits", progress: (s) => [c(s).exploitCorrect, 50] },
  { id: "station-slayer", name: "Station slayer", desc: "Make 25 good plays against calling stations.", icon: "🎣", xp: 120, group: "Exploits", progress: (s) => [c(s).byArch.station ?? 0, 25] },
  { id: "nit-buster", name: "Nit buster", desc: "Make 25 good plays against nits.", icon: "🔨", xp: 120, group: "Exploits", progress: (s) => [c(s).byArch.nit ?? 0, 25] },
  { id: "maniac-tamer", name: "Maniac tamer", desc: "Make 25 good plays against maniacs.", icon: "🧯", xp: 120, group: "Exploits", progress: (s) => [c(s).byArch.maniac ?? 0, 25] },
  { id: "limp-punisher", name: "Limp punisher", desc: "Get 25 decisions right against limpers.", icon: "🍋", xp: 100, group: "Exploits", progress: (s) => [c(s).isoCorrect, 25] },
  { id: "three-bet-machine", name: "3-bet machine", desc: "Get 50 decisions right facing a raise.", icon: "💥", xp: 120, group: "Seats", progress: (s) => [c(s).threeBetCorrect, 50] },
  { id: "habit", name: "Habit forming", desc: "Train 3 days in a row.", icon: "📅", xp: 60, group: "Habits", progress: (s) => [s.bestStreakDays, 3] },
  { id: "week-warrior", name: "Week warrior", desc: "Train 7 days in a row.", icon: "🗓️", xp: 150, group: "Habits", progress: (s) => [s.bestStreakDays, 7] },
  { id: "monthly", name: "30-day grinder", desc: "Train 30 days in a row.", icon: "🏆", xp: 500, group: "Habits", progress: (s) => [s.bestStreakDays, 30] },
  { id: "yellow-belt", name: "Yellow belt", desc: "Pass the Day 7 exam.", icon: "🥋", xp: 150, group: "Study", progress: (s) => [s.lessonsDone.includes(7) ? 1 : 0, 1] },
  { id: "halfway", name: "Halfway there", desc: "Finish 20 lessons.", icon: "🧗", xp: 250, group: "Study", progress: (s) => [s.lessonsDone.length, 20] },
  { id: "black-belt", name: "Black belt", desc: "Pass the Day 40 exam.", icon: "🖤", xp: 1000, group: "Study", progress: (s) => [s.lessonsDone.includes(40) ? 1 : 0, 1] },
  { id: "one-two-reg", name: "$1/$2 regular", desc: "Make 300 decisions at $1/$2.", icon: "🎲", xp: 120, group: "Habits", progress: (s) => [c(s).stakeDecisions["1-2"] ?? 0, 300] },
  { id: "moved-up", name: "Moved up", desc: "Make 300 decisions at $2/$5.", icon: "📈", xp: 150, group: "Habits", progress: (s) => [c(s).stakeDecisions["2-5"] ?? 0, 300] },
  { id: "night-owl", name: "Night owl", desc: "Train between midnight and 4am.", icon: "🦉", xp: 30, group: "Habits", progress: (s) => [c(s).nightOwl, 1] },
];

export const isUnlocked = (a: Achievement, s: AchState) => {
  const [cur, target] = a.progress(s);
  return cur >= target;
};
