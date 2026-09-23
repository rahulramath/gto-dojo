export type Grade = "perfect" | "good" | "inaccuracy" | "mistake" | "blunder";

export interface GradeMeta {
  label: string;
  color: string;
  xp: number;
  correct: boolean;
}

export const GRADES: Record<Grade, GradeMeta> = {
  perfect: { label: "Perfect", color: "#22c55e", xp: 10, correct: true },
  good: { label: "Good", color: "#84cc16", xp: 7, correct: true },
  inaccuracy: { label: "Slightly off", color: "#eab308", xp: 3, correct: false },
  mistake: { label: "Mistake", color: "#f97316", xp: 1, correct: false },
  blunder: { label: "Big mistake", color: "#ef4444", xp: 0, correct: false },
};

export const GRADE_ORDER: Grade[] = ["perfect", "good", "inaccuracy", "mistake", "blunder"];

/** Grade a choice by how often the baseline strategy takes it. */
export function gradeFreq(chosen: number, best: number, blunderRisk = false): Grade {
  if (chosen >= best - 0.08 || chosen >= 0.6) return "perfect";
  if (chosen >= 0.25) return "good";
  if (chosen >= 0.08) return "inaccuracy";
  return blunderRisk ? "blunder" : "mistake";
}
