import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ACHIEVEMENTS, EMPTY_COUNTERS, isUnlocked, type Achievement, type AchState, type Counters } from "../data/achievements";
import type { ArchetypeId } from "../data/archetypes";
import type { PosId, TableSize } from "../data/positions";
import { STAKES, type SizingStyle, type StakeId } from "../data/stakes";
import { daysBetween, todayKey, type Units } from "../lib/format";
import { GRADES, type Grade } from "../lib/grading";
import { beltFor, levelInfo, SRS_INTERVALS_MIN, type Belt, type PosStat } from "../lib/progression";

export type Confidence = "sure" | "think" | "guess";
export type Lens = "gto" | "exploit";

export interface Settings {
  stake: StakeId;
  table: TableSize;
  sizing: SizingStyle;
  units: Units;
  villain: ArchetypeId;
  lens: Lens;
  sound: boolean;
  autoNext: boolean;
  fourColor: boolean;
  askWhy: boolean;
  onboarded: boolean;
  experience: "new" | "some" | "reg";
}

export interface DecisionLog {
  t: number;
  mode: "pre" | "post";
  kind: string;
  pos: PosId;
  vs?: PosId;
  hand: string;
  action: string;
  best: string;
  grade: Grade;
  exploitGrade?: Grade;
  freq: number;
  conf?: Confidence;
  stake: StakeId;
  arch?: ArchetypeId;
  /** Baseline frequencies of each action in this spot (for leak analysis). */
  base: Record<string, number>;
}

export interface SrsCard {
  key: string;
  mode: "pre" | "post";
  label: string;
  box: number;
  due: number;
  added: number;
  lapses: number;
  stake: StakeId;
  seed?: number;
  lineId?: string;
  role?: "pfr" | "caller";
  arch?: ArchetypeId;
}

export interface Reward {
  xp: number;
  correct: boolean;
  levelUp: number | null;
  achievements: Achievement[];
  beltUp: { pos: PosId; belt: Belt } | null;
}

export interface DecisionInput {
  mode: "pre" | "post";
  kind: string;
  pos: PosId;
  vs?: PosId;
  hand: string;
  action: string;
  best: string;
  grade: Grade;
  exploitGrade?: Grade;
  freq: number;
  conf?: Confidence;
  arch?: ArchetypeId;
  base: Record<string, number>;
  srs?: Omit<SrsCard, "box" | "due" | "added" | "lapses" | "stake">;
  flags?: { rfi?: boolean; iso?: boolean; vsOpen?: boolean; flop?: boolean; river?: boolean; riverCall?: boolean; riverValue?: boolean };
}

interface DayStat {
  decisions: number;
  correct: number;
  xp: number;
}

interface State {
  settings: Settings;
  xp: number;
  counters: Counters;
  pos: Partial<Record<PosId, PosStat>>;
  kinds: Record<string, { n: number; correct: number }>;
  log: DecisionLog[];
  days: Record<string, DayStat>;
  streak: { current: number; best: number; last: string | null };
  achievements: Record<string, number>;
  lessons: Record<number, { done: number; quiz: number }>;
  drills: Record<string, { n: number; correct: number }>;
  srs: SrsCard[];
  mathBest: Record<string, number>;
  paintBest: Record<string, number>;
  legendsSeen: string[];

  setSettings: (p: Partial<Settings>) => void;
  recordDecision: (d: DecisionInput) => Reward;
  bump: (key: keyof Counters, n?: number) => Reward;
  completeLesson: (day: number, quiz: number) => Reward;
  recordDrill: (id: string, correct: boolean) => void;
  resetDrill: (id: string) => void;
  reviewSrs: (key: string, correct: boolean) => void;
  removeSrs: (key: string) => void;
  recordMath: (drill: string, score: number, total: number) => Reward;
  recordPaint: (chartId: string, score: number) => Reward;
  finishHand: () => Reward;
  resetAll: () => void;
  importState: (json: string) => boolean;
}

const DEFAULT_SETTINGS: Settings = {
  stake: "1-2",
  table: 9,
  sizing: "live",
  units: "$",
  villain: "pool",
  lens: "gto",
  sound: true,
  autoNext: false,
  fourColor: true,
  askWhy: true,
  onboarded: false,
  experience: "new",
};

type Data = ReturnType<typeof initialData>;

const initialData = () => ({
  settings: { ...DEFAULT_SETTINGS },
  xp: 0,
  counters: { ...EMPTY_COUNTERS, byArch: {}, rfiSeats: [], stakeDecisions: {} },
  pos: {},
  kinds: {},
  log: [] as DecisionLog[],
  days: {} as Record<string, DayStat>,
  streak: { current: 0, best: 0, last: null as string | null },
  achievements: {} as Record<string, number>,
  lessons: {} as Record<number, { done: number; quiz: number }>,
  drills: {} as Record<string, { n: number; correct: number }>,
  srs: [] as SrsCard[],
  mathBest: {} as Record<string, number>,
  paintBest: {} as Record<string, number>,
  legendsSeen: [] as string[],
});

const DATA_KEYS = Object.keys(initialData()) as (keyof Data)[];

function touchDay(s: State, xp: number, decision: boolean, correct: boolean): Pick<State, "days" | "streak"> {
  const today = todayKey();
  const days = { ...s.days };
  const d = days[today] ?? { decisions: 0, correct: 0, xp: 0 };
  days[today] = { decisions: d.decisions + (decision ? 1 : 0), correct: d.correct + (correct ? 1 : 0), xp: d.xp + xp };
  let { current, best, last } = s.streak;
  if (last !== today) {
    current = last && daysBetween(last, today) === 1 ? current + 1 : 1;
    last = today;
    best = Math.max(best, current);
  }
  return { days, streak: { current, best, last } };
}

function achState(s: Pick<State, "counters" | "pos" | "streak" | "lessons">): AchState {
  return {
    counters: s.counters,
    pos: s.pos,
    bestStreakDays: s.streak.best,
    lessonsDone: Object.keys(s.lessons).map(Number),
  };
}

function newAchievements(s: Pick<State, "counters" | "pos" | "streak" | "lessons" | "achievements">): Achievement[] {
  const st = achState(s);
  return ACHIEVEMENTS.filter((a) => !s.achievements[a.id] && isUnlocked(a, st));
}

export const useStore = create<State>()(
  persist(
    (set, get) => {
      /** Apply XP + achievements after a state change, returning the reward. */
      const finalize = (base: number, correct: boolean, decision: boolean, beltUp: Reward["beltUp"] = null): Reward => {
        const s = get();
        const before = levelInfo(s.xp).level;
        const unlocked = newAchievements(s);
        const achXp = unlocked.reduce((n, a) => n + a.xp, 0);
        const total = base + achXp;
        const achievements = { ...s.achievements };
        for (const a of unlocked) achievements[a.id] = Date.now();
        const xp = s.xp + total;
        const dayPatch = touchDay(s, total, decision, correct);
        set({ xp, achievements, ...dayPatch });
        const after = levelInfo(xp).level;
        const extra = newAchievements(get());
        if (extra.length) {
          const ach2 = { ...get().achievements };
          for (const a of extra) ach2[a.id] = Date.now();
          set({ achievements: ach2, xp: get().xp + extra.reduce((n, a) => n + a.xp, 0) });
          unlocked.push(...extra);
        }
        return { xp: total, correct, levelUp: after > before ? after : null, achievements: unlocked, beltUp };
      };

      return {
        ...initialData(),

        setSettings: (p) => set({ settings: { ...get().settings, ...p } }),

        recordDecision: (d) => {
          const s = get();
          const lens = s.settings.lens;
          const g = lens === "exploit" && d.exploitGrade ? d.exploitGrade : d.grade;
          const meta = GRADES[g];
          const correct = meta.correct;
          const c: Counters = { ...s.counters, byArch: { ...s.counters.byArch }, stakeDecisions: { ...s.counters.stakeDecisions }, rfiSeats: [...s.counters.rfiSeats] };
          c.decisions++;
          if (correct) c.correct++;
          if (g === "perfect") c.perfect++;
          c.streak = correct ? c.streak + 1 : 0;
          c.bestStreak = Math.max(c.bestStreak, c.streak);
          if (d.conf === "sure") {
            c.sureStreak = correct ? c.sureStreak + 1 : 0;
            c.bestSureStreak = Math.max(c.bestSureStreak, c.sureStreak);
          }
          const stake = s.settings.stake;
          c.stakeDecisions[stake] = (c.stakeDecisions[stake] ?? 0) + 1;
          const hour = new Date().getHours();
          if (hour < 4) c.nightOwl++;
          if (d.exploitGrade && GRADES[d.exploitGrade].correct) {
            c.exploitCorrect++;
            if (d.arch) c.byArch[d.arch] = (c.byArch[d.arch] ?? 0) + 1;
          }
          const f = d.flags ?? {};
          if (correct && f.rfi && !c.rfiSeats.includes(d.pos)) c.rfiSeats.push(d.pos);
          if (correct && f.iso) c.isoCorrect++;
          if (correct && f.vsOpen) c.threeBetCorrect++;
          if (correct && f.flop) c.flopCorrect++;
          if (f.river) c.riverDecisions++;
          if (correct && f.riverCall) c.riverCallsCorrect++;
          if (correct && f.riverValue) c.riverValueCorrect++;

          const prevPos = s.pos[d.pos];
          const prevBelt = beltFor(prevPos).belt;
          const ps: PosStat = prevPos ? { n: prevPos.n, correct: prevPos.correct, recent: prevPos.recent.slice(-99) } : { n: 0, correct: 0, recent: [] };
          ps.n++;
          if (correct) ps.correct++;
          ps.recent.push(correct ? 1 : 0);
          const pos = { ...s.pos, [d.pos]: ps };
          const newBelt = beltFor(ps).belt;
          const beltUp = newBelt.id !== prevBelt.id && newBelt.min > prevBelt.min ? { pos: d.pos, belt: newBelt } : null;

          const kk = `${d.mode}:${d.kind}`;
          const kinds = { ...s.kinds, [kk]: { n: (s.kinds[kk]?.n ?? 0) + 1, correct: (s.kinds[kk]?.correct ?? 0) + (correct ? 1 : 0) } };
          const log = [...s.log, { t: Date.now(), mode: d.mode, kind: d.kind, pos: d.pos, vs: d.vs, hand: d.hand, action: d.action, best: d.best, grade: d.grade, exploitGrade: d.exploitGrade, freq: d.freq, conf: d.conf, stake, arch: d.arch, base: d.base }].slice(-1500);

          let srs = s.srs;
          if (!correct && d.srs) {
            const now = Date.now();
            const existing = srs.find((x) => x.key === d.srs!.key);
            if (existing) srs = srs.map((x) => (x.key === d.srs!.key ? { ...x, box: 0, due: now + SRS_INTERVALS_MIN[0] * 60000, lapses: x.lapses + 1 } : x));
            else srs = [...srs, { ...d.srs, stake, box: 0, due: now + SRS_INTERVALS_MIN[0] * 60000, added: now, lapses: 0 }].slice(-400);
          }

          let xp = meta.xp + Math.min(5, Math.floor(c.streak / 5));
          if (d.conf === "sure" && correct) xp += 2;
          set({ counters: c, pos, kinds, log, srs });
          return finalize(xp, correct, true, beltUp);
        },

        bump: (key, n = 1) => {
          const s = get();
          const c = { ...s.counters, [key]: (s.counters[key] as number) + n };
          set({ counters: c });
          const xp = key === "ladderOpens" ? 1 : key === "reasonRight" ? 3 : key === "fullLadders" ? 5 : 0;
          return finalize(xp, true, false);
        },

        completeLesson: (day, quiz) => {
          const s = get();
          const first = !s.lessons[day];
          set({ lessons: { ...s.lessons, [day]: { done: s.lessons[day]?.done ?? Date.now(), quiz: Math.max(quiz, s.lessons[day]?.quiz ?? 0) } } });
          return finalize(first ? ([7, 14, 20, 27, 34, 40].includes(day) ? 250 : 60) : 5, true, false);
        },

        recordDrill: (id, correct) => {
          const s = get();
          const d = s.drills[id] ?? { n: 0, correct: 0 };
          set({ drills: { ...s.drills, [id]: { n: d.n + 1, correct: d.correct + (correct ? 1 : 0) } } });
        },

        resetDrill: (id) => set({ drills: { ...get().drills, [id]: { n: 0, correct: 0 } } }),

        reviewSrs: (key, correct) => {
          const s = get();
          const card = s.srs.find((x) => x.key === key);
          if (!card) return;
          const now = Date.now();
          if (correct) {
            const box = card.box + 1;
            const counters = { ...s.counters, srsCleared: s.counters.srsCleared + 1 };
            if (box >= SRS_INTERVALS_MIN.length) set({ srs: s.srs.filter((x) => x.key !== key), counters });
            else set({ srs: s.srs.map((x) => (x.key === key ? { ...x, box, due: now + SRS_INTERVALS_MIN[box] * 60000 } : x)), counters });
          } else {
            set({ srs: s.srs.map((x) => (x.key === key ? { ...x, box: 0, due: now + SRS_INTERVALS_MIN[0] * 60000, lapses: x.lapses + 1 } : x)) });
          }
        },

        removeSrs: (key) => set({ srs: get().srs.filter((x) => x.key !== key) }),

        recordMath: (drill, score, total) => {
          const s = get();
          const best = Math.max(s.mathBest[drill] ?? 0, score);
          const c = { ...s.counters, mathRuns: s.counters.mathRuns + 1, mathPerfect: s.counters.mathPerfect + (score === total ? 1 : 0) };
          set({ mathBest: { ...s.mathBest, [drill]: best }, counters: c });
          return finalize(score * 3, true, false);
        },

        recordPaint: (chartId, score) => {
          const s = get();
          const c = { ...s.counters, paintRuns: s.counters.paintRuns + 1, paintBest: Math.max(s.counters.paintBest, score) };
          set({ paintBest: { ...s.paintBest, [chartId]: Math.max(s.paintBest[chartId] ?? 0, score) }, counters: c });
          return finalize(Math.round(score / 4), true, false);
        },

        finishHand: () => {
          const s = get();
          set({ counters: { ...s.counters, handsPlayed: s.counters.handsPlayed + 1 } });
          return finalize(5, true, false);
        },

        resetAll: () => set({ ...initialData(), settings: { ...get().settings, onboarded: false } }),

        importState: (json) => {
          try {
            const data = JSON.parse(json);
            const st = data.state ?? data;
            if (typeof st !== "object" || typeof st.xp !== "number") return false;
            set({ ...initialData(), ...st, settings: { ...DEFAULT_SETTINGS, ...(st.settings ?? {}) } });
            return true;
          } catch {
            return false;
          }
        },
      };
    },
    {
      name: "gto-dojo-v1",
      version: 1,
      partialize: (s) => Object.fromEntries(DATA_KEYS.map((k) => [k, s[k]])) as Partial<State>,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        return {
          ...current,
          ...p,
          settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) },
          counters: { ...EMPTY_COUNTERS, ...(p.counters ?? {}) },
        };
      },
    },
  ),
);

export const stakeOf = (id: StakeId) => STAKES[id];

const ARCH_IDS: ArchetypeId[] = ["pool", "gto", "station", "nit", "tag", "lag", "maniac"];

/** Drill links from lessons can carry settings (table, sizing, villain, lens). */
export function applyUrlSettings(params: URLSearchParams): void {
  const p: Partial<Settings> = {};
  const t = params.get("table");
  if (t === "6" || t === "9") p.table = Number(t) as TableSize;
  const sz = params.get("sizing");
  if (sz === "live" || sz === "solver") p.sizing = sz;
  const v = params.get("villain") as ArchetypeId | null;
  if (v && ARCH_IDS.includes(v)) p.villain = v;
  const l = params.get("lens");
  if (l === "gto" || l === "exploit") p.lens = l;
  if (Object.keys(p).length) useStore.getState().setSettings(p);
}

export function missionFrom(params: URLSearchParams): { day: number; target: number; acc: number } | null {
  const day = Number(params.get("day"));
  if (!day) return null;
  return { day, target: Number(params.get("target") ?? 20), acc: Number(params.get("acc") ?? 80) / 100 };
}

export function dueCards(srs: SrsCard[], now = Date.now()): SrsCard[] {
  return srs.filter((c) => c.due <= now).sort((a, b) => a.due - b.due);
}
