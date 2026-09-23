export const xpForLevel = (n: number): number => 50 * n * (n - 1);

export function levelInfo(xp: number): { level: number; into: number; need: number; pct: number } {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, into: xp - base, need: next - base, pct: (xp - base) / (next - base) };
}

const RANKS: { min: number; title: string }[] = [
  { min: 1, title: "Newcomer" },
  { min: 3, title: "Rookie" },
  { min: 5, title: "Student" },
  { min: 8, title: "Grinder" },
  { min: 11, title: "Regular" },
  { min: 15, title: "Shark" },
  { min: 20, title: "Crusher" },
  { min: 25, title: "High roller" },
  { min: 30, title: "Legend" },
];

export function rankTitle(level: number): string {
  let t = RANKS[0].title;
  for (const r of RANKS) if (level >= r.min) t = r.title;
  return t;
}

export interface Belt {
  id: string;
  name: string;
  color: string;
  ink: string;
  min: number;
  acc: number;
}

export const BELTS: Belt[] = [
  { id: "white", name: "White", color: "#e5e7eb", ink: "#111827", min: 0, acc: 0 },
  { id: "yellow", name: "Yellow", color: "#facc15", ink: "#111827", min: 25, acc: 0.7 },
  { id: "orange", name: "Orange", color: "#fb923c", ink: "#111827", min: 60, acc: 0.75 },
  { id: "green", name: "Green", color: "#22c55e", ink: "#052e16", min: 120, acc: 0.8 },
  { id: "blue", name: "Blue", color: "#3b82f6", ink: "#eff6ff", min: 200, acc: 0.85 },
  { id: "brown", name: "Brown", color: "#92400e", ink: "#fef3c7", min: 320, acc: 0.88 },
  { id: "black", name: "Black", color: "#0a0a0a", ink: "#f2c14e", min: 500, acc: 0.9 },
];

export interface PosStat {
  n: number;
  correct: number;
  recent: number[];
}

export const recentAccuracy = (s: PosStat | undefined): number => {
  if (!s || !s.recent.length) return 0;
  return s.recent.reduce((a, b) => a + b, 0) / s.recent.length;
};

export function beltFor(s: PosStat | undefined): { belt: Belt; next: Belt | null; progress: number } {
  let idx = 0;
  const acc = recentAccuracy(s);
  const n = s?.n ?? 0;
  BELTS.forEach((b, i) => {
    if (n >= b.min && acc >= b.acc) idx = i;
  });
  const belt = BELTS[idx];
  const next = BELTS[idx + 1] ?? null;
  let progress = 1;
  if (next) {
    const volume = Math.min(1, (n - belt.min) / Math.max(1, next.min - belt.min));
    const accPart = next.acc > 0 ? Math.min(1, acc / next.acc) : 1;
    progress = Math.max(0, Math.min(1, volume * 0.6 + accPart * 0.4));
  }
  return { belt, next, progress };
}

/** Curriculum belts are earned by passing the boss days. */
export const BOSS_BELTS: { day: number; belt: string }[] = [
  { day: 7, belt: "yellow" },
  { day: 14, belt: "orange" },
  { day: 20, belt: "green" },
  { day: 27, belt: "blue" },
  { day: 34, belt: "brown" },
  { day: 40, belt: "black" },
];

export function dojoBelt(lessonsDone: Record<number, unknown>): Belt {
  let id = "white";
  for (const b of BOSS_BELTS) if (lessonsDone[b.day]) id = b.belt;
  return BELTS.find((b) => b.id === id)!;
}

export const SRS_INTERVALS_MIN = [5, 60 * 24, 60 * 24 * 3, 60 * 24 * 7, 60 * 24 * 16, 60 * 24 * 35];
