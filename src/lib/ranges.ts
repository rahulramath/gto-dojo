import { ALL_HANDS, RANK_CHARS, comboCount, type HandClass, TOTAL_COMBOS } from "./cards";

/** Weight (0..1) per hand class. Missing = 0. */
export type Weights = Record<HandClass, number>;

const idx = (ch: string) => {
  const i = RANK_CHARS.indexOf(ch);
  if (i < 0) throw new Error(`Bad rank "${ch}"`);
  return i;
};

function expandDash(a: string, b: string): HandClass[] {
  const a1 = idx(a[0]);
  const a2 = idx(a[1]);
  const b1 = idx(b[0]);
  const b2 = idx(b[1]);
  const out: HandClass[] = [];
  if (a1 === a2 && b1 === b2) {
    const hi = Math.max(a1, b1);
    const lo = Math.min(a1, b1);
    for (let r = lo; r <= hi; r++) out.push(RANK_CHARS[r] + RANK_CHARS[r]);
    return out;
  }
  if (a1 !== b1) throw new Error(`Dash ranges need the same top card: ${a}-${b}`);
  const kind = a[2] ?? "";
  const from = Math.min(a2, b2);
  const to = Math.max(a2, b2);
  for (let r = from; r <= to; r++) {
    if (kind) out.push(RANK_CHARS[a1] + RANK_CHARS[r] + kind);
    else out.push(RANK_CHARS[a1] + RANK_CHARS[r] + "s", RANK_CHARS[a1] + RANK_CHARS[r] + "o");
  }
  return out;
}

/**
 * Expand one token of standard range notation:
 * "AA", "AKs", "AKo", "AK", "22+", "A2s+", "KTo+", "TT-77", "A5s-A2s".
 */
export function expandToken(raw: string): HandClass[] {
  const token = raw.trim();
  if (!token) return [];
  if (token.includes("-")) {
    const [a, b] = token.split("-");
    return expandDash(a.trim(), b.trim());
  }
  const plus = token.endsWith("+");
  const body = plus ? token.slice(0, -1) : token;
  const r1 = idx(body[0]);
  const r2 = idx(body[1]);
  const kind = body[2];
  if (kind && kind !== "s" && kind !== "o") throw new Error(`Bad hand "${token}"`);
  if (r1 === r2) {
    if (!plus) return [body.slice(0, 2)];
    const out: HandClass[] = [];
    for (let r = r1; r <= 12; r++) out.push(RANK_CHARS[r] + RANK_CHARS[r]);
    return out;
  }
  const hi = Math.max(r1, r2);
  const lo = Math.min(r1, r2);
  const kinds = kind ? [kind] : ["s", "o"];
  if (!plus) return kinds.map((k) => RANK_CHARS[hi] + RANK_CHARS[lo] + k);
  const out: HandClass[] = [];
  for (let r = lo; r < hi; r++) for (const k of kinds) out.push(RANK_CHARS[hi] + RANK_CHARS[r] + k);
  return out;
}

/** Parse "QQ+, AKs, A5s:0.5, KQo" into weights. Later tokens override earlier ones. */
export function parseWeights(str: string): Weights {
  const w: Weights = {};
  for (const part of str.split(",")) {
    const t = part.trim();
    if (!t) continue;
    const [body, f] = t.split(":");
    const freq = f === undefined ? 1 : Number(f);
    if (!Number.isFinite(freq) || freq < 0 || freq > 1) throw new Error(`Bad frequency in "${t}"`);
    for (const h of expandToken(body)) w[h] = freq;
  }
  return w;
}

export function weightsCombos(w: Weights): number {
  let n = 0;
  for (const h of ALL_HANDS) n += (w[h] ?? 0) * comboCount(h);
  return n;
}

export function weightsPercent(w: Weights): number {
  return (weightsCombos(w) / TOTAL_COMBOS) * 100;
}

export function scaleWeights(w: Weights, f: number): Weights {
  const out: Weights = {};
  for (const h in w) out[h] = Math.min(1, w[h] * f);
  return out;
}
