import { describe, expect, it } from "vitest";
import { ARCHETYPES } from "../data/archetypes";
import { heroAct, LINES, startHand, type Family, type HandState } from "./postflop";
import { mulberry32 } from "./rng";

function playRandom(seed: number, lineId: string, role: "pfr" | "caller", archetype = ARCHETYPES.gto): HandState {
  const rng = mulberry32(seed * 31 + 7);
  let s = startHand({ lineId, heroRole: role, archetype, seed });
  let guard = 0;
  while (!s.done && s.pending && guard++ < 20) {
    const legal = s.pending.legal;
    const pickGto = rng() < 0.7;
    const action = pickGto ? s.pending.gtoBest : legal[Math.floor(rng() * legal.length)].action;
    s = heroAct(s, action);
  }
  return s;
}

describe("postflop hand runner", () => {
  it("plays complete hands with conserved chips", () => {
    const archs = [ARCHETYPES.gto, ARCHETYPES.station, ARCHETYPES.maniac, ARCHETYPES.nit];
    let showdowns = 0;
    for (let i = 0; i < 160; i++) {
      const line = LINES[i % LINES.length];
      const s = playRandom(1000 + i, line.id, i % 2 ? "pfr" : "caller", archs[i % archs.length]);
      expect(s.done).toBe(true);
      expect(s.result).not.toBeNull();
      const start = line.stackBB;
      expect(s.stacks.hero).toBeGreaterThanOrEqual(-1e-6);
      expect(s.stacks.villain).toBeGreaterThanOrEqual(-1e-6);
      expect(s.pot + s.stacks.hero + s.stacks.villain).toBeCloseTo(line.potBB + 2 * start, 5);
      if (s.result!.showdown) {
        showdowns++;
        expect(s.board).toHaveLength(5);
      }
      for (const d of s.decisions) {
        const sum = Object.values(d.gto).reduce((a, b) => a + (b ?? 0), 0);
        expect(sum).toBeCloseTo(1, 5);
        expect(d.eqHero).toBeGreaterThanOrEqual(0);
        expect(d.eqHero).toBeLessThanOrEqual(1);
      }
    }
    expect(showdowns).toBeGreaterThan(10);
  });

  it("picks sensible flop strategies", () => {
    const fams: Record<string, number> = {};
    const eqs: number[] = [];
    for (let i = 0; i < 60; i++) {
      const s = startHand({ lineId: "BTN_BB", heroRole: "pfr", archetype: ARCHETYPES.gto, seed: 500 + i });
      const p = s.pending!;
      if (p.street !== "flop" || p.facing) continue;
      fams[p.family as Family] = (fams[p.family as Family] ?? 0) + 1;
      eqs.push(p.eqAdv);
    }
    const avg = eqs.reduce((a, b) => a + b, 0) / eqs.length;
    process.stdout.write(`\nBTN vs BB flop families: ${JSON.stringify(fams)} avg eqAdv=${avg.toFixed(3)}\n`);
    expect(avg).toBeGreaterThan(0.5);
  });
});
