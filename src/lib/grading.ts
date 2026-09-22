export type Grade = "perfect" | "good" | "inaccuracy" | "mistake" | "blunder";

export interface GradeMeta {
  label: string;
  color: string;
  xp: number;
  correct: boolean;
  line: string;
}

export const GRADES: Record<Grade, GradeMeta> = {
  perfect: { label: "Perfect", color: "#22c55e", xp: 10, correct: true, line: "That's the baseline play." },
  good: { label: "Good — mixed spot", color: "#84cc16", xp: 7, correct: true, line: "Baseline mixes this action in. Fine choice." },
  inaccuracy: { label: "Inaccuracy", color: "#eab308", xp: 3, correct: false, line: "A rare choice here. Small leak." },
  mistake: { label: "Mistake", color: "#f97316", xp: 1, correct: false, line: "Baseline almost never does this." },
  blunder: { label: "Blunder", color: "#ef4444", xp: 0, correct: false, line: "A costly error in a clear spot." },
};

export const GRADE_ORDER: Grade[] = ["perfect", "good", "inaccuracy", "mistake", "blunder"];

/** Grade a choice by how often the baseline strategy takes it. */
export function gradeFreq(chosen: number, best: number, blunderRisk = false): Grade {
  if (chosen >= best - 0.08 || chosen >= 0.6) return "perfect";
  if (chosen >= 0.25) return "good";
  if (chosen >= 0.08) return "inaccuracy";
  return blunderRisk ? "blunder" : "mistake";
}
