import type { Stake } from "../data/stakes";

export type Units = "bb" | "$";

const trimNum = (n: number, digits: number) => {
  const s = n.toFixed(digits);
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
};

export function fmtBB(bb: number): string {
  if (Math.abs(bb) >= 20) return `${Math.round(bb)}bb`;
  return `${trimNum(bb, 1)}bb`;
}

export function fmtMoney(bb: number, stake: Stake, units: Units): string {
  if (units === "bb" || stake.id === "online") return fmtBB(bb);
  const d = bb * stake.bb;
  if (Math.abs(d) >= 100) return `$${Math.round(d)}`;
  if (Number.isInteger(d)) return `$${d}`;
  return `$${d.toFixed(2)}`;
}

export const pct = (x: number, digits = 0): string => `${(x * 100).toFixed(digits)}%`;

export const clamp = (x: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function daysBetween(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00`);
  const db = new Date(`${b}T00:00:00`);
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}
