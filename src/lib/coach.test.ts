import { describe, expect, it } from "vitest";
import { ARCHETYPES, getArchetype } from "../data/archetypes";
import { STAKES } from "../data/stakes";
import { postflopCoach, postflopHint, preflopCoach, preflopHint } from "./coachText";
import { gradeFreq } from "./grading";
import { heroAct, LINES, startHand } from "./postflop";
import { generateSpot, gradePreflop, preflopExploit, type SpotKind } from "./preflop";
import { mulberry32 } from "./rng";

const clean = (s: string) => {
  expect(s).not.toMatch(/undefined|NaN|null/);
  expect(s.length).toBeLessThan(200);
};

describe("coach copy", () => {
  it("writes short, complete preflop feedback for every option", () => {
    const kinds: SpotKind[] = ["rfi", "vsOpen", "vs3bet", "vs4bet", "vsLimp"];
    const rng = mulberry32(42);
    for (let i = 0; i < 240; i++) {
      const stake = [STAKES["1-2"], STAKES["2-5"], STAKES.online][i % 3];
      const spot = generateSpot({ table: i % 2 ? 6 : 9, kinds: [kinds[i % kinds.length]], heroPositions: [], stake, sizing: i % 2 ? "live" : "solver", units: "$", rng });
      const arch = getArchetype("pool", stake.id);
      clean(preflopHint(spot));
      for (const o of spot.options) {
        const res = gradePreflop(spot, o.key);
        const coach = preflopCoach(spot, o.key, res.grade, res.best, preflopExploit(spot, arch), arch);
        clean(coach.headline);
        expect(coach.lines.length).toBeGreaterThan(0);
        coach.lines.forEach((l) => clean(l.text));
        coach.others.forEach((x) => clean(x.text));
      }
    }
  });

  it("writes short, complete postflop feedback", () => {
    for (let i = 0; i < 40; i++) {
      let s = startHand({ lineId: LINES[i % LINES.length].id, heroRole: i % 2 ? "pfr" : "caller", archetype: ARCHETYPES.station, seed: 700 + i });
      let guard = 0;
      while (!s.done && s.pending && guard++ < 6) {
        const a = s.pending;
        clean(postflopHint(a));
        for (const l of a.legal) {
          const g = gradeFreq(a.gto[l.action] ?? 0, a.gto[a.gtoBest] ?? 0);
          const coach = postflopCoach(a, l.action, g, ARCHETYPES.station);
          clean(coach.headline);
          coach.lines.forEach((x) => clean(x.text));
          coach.others.forEach((x) => clean(x.text));
        }
        s = heroAct(s, a.gtoBest);
      }
    }
  }, 60_000);
});
