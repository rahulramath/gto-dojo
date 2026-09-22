export type Rng = () => number;

/** Small, fast, seedable PRNG so hands can be replayed exactly (Leak Deck). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const randomSeed = (): number => (Math.random() * 2 ** 32) >>> 0;

export function pick<T>(arr: readonly T[], rng: Rng = Math.random): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function weightedIndex(weights: readonly number[], rng: Rng = Math.random): number {
  let total = 0;
  for (const w of weights) total += Math.max(0, w);
  if (total <= 0) return Math.floor(rng() * weights.length);
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= Math.max(0, weights[i]);
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

export function weightedPick<T>(items: readonly T[], weights: readonly number[], rng: Rng = Math.random): T {
  return items[weightedIndex(weights, rng)];
}

export function shuffle<T>(arr: T[], rng: Rng = Math.random): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
