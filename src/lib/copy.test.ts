import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS } from "../data/achievements";
import { ARCHETYPES, getArchetype } from "../data/archetypes";
import { CHARTS } from "../data/charts";
import { DAYS, GLOSSARY, PHASES } from "../data/curriculum";
import { LEGENDS } from "../data/legends";
import { STAKE_LIST, STAKES } from "../data/stakes";
import { preflopIdea, preflopMath } from "./explainPreflop";
import { postflopLearn } from "./explainPostflop";
import { GEN, type DrillId } from "./mathDrills";
import { FAMILY_INFO, heroAct, LINES, startHand } from "./postflop";
import { generateSpot, type SpotKind } from "./preflop";
import { mulberry32 } from "./rng";

/** Punctuation that makes copy read machine-written. */
const BANNED = /[—–→…;]/;

function check(texts: (string | undefined)[], where: string) {
  for (const t of texts) {
    if (!t) continue;
    expect(t, `${where}: "${t}"`).not.toMatch(BANNED);
  }
}

describe("product copy", () => {
  it("keeps lessons, charts and data free of dashes, arrows and semicolons", () => {
    for (const d of DAYS) {
      check([d.title, d.goal, d.drill?.label], `Day ${d.day}`);
      d.sections.forEach((s) => check([s.title, s.body, s.more], `Day ${d.day}`));
      d.quiz.forEach((q) => check([q.q, q.explain, ...q.options], `Day ${d.day} quiz`));
    }
    check(PHASES.map((p) => p.name), "phases");
    GLOSSARY.forEach((g) => check([g.term, g.def], "glossary"));
    Object.values(CHARTS).forEach((c) => check([c.title, c.short, ...(c.notes ?? []), ...Object.values(c.labels)], c.id));
    [...Object.values(ARCHETYPES), getArchetype("pool", "1-2"), getArchetype("pool", "2-5"), getArchetype("pool", "online")].forEach((a) =>
      check([a.name, a.who, a.blurb, a.counter.valueBet, a.counter.bluff, a.counter.facingBet, a.counter.facingRaise, a.counter.preflop], a.name),
    );
    STAKE_LIST.forEach((s) => check([s.label, s.short, s.buyIn, s.pool.headline, ...s.pool.exploits], s.id));
    ACHIEVEMENTS.forEach((a) => check([a.name, a.desc], a.id));
    LEGENDS.forEach((l) => check([l.name, l.quote, l.idea], l.id));
    Object.values(FAMILY_INFO).forEach((f) => check([f.name, f.summary], "strategy"));
    LINES.forEach((l) => check([l.label, l.preflop], l.id));
  });

  it("writes clean Learn more text for real spots", () => {
    const rng = mulberry32(7);
    const kinds: SpotKind[] = ["rfi", "vsOpen", "vs3bet", "vs4bet", "vsLimp"];
    for (let i = 0; i < 120; i++) {
      const spot = generateSpot({ table: i % 2 ? 6 : 9, kinds: [kinds[i % 5]], heroPositions: [], stake: STAKES["1-2"], sizing: "live", units: "$", rng });
      const idea = preflopIdea(spot);
      check([idea.title, idea.body, ...idea.notes], "preflop idea");
      const math = preflopMath(spot, STAKES["1-2"], "$", spot.villainRange ? 0.4 : null);
      check([...math.rows.map((r) => r.label), math.note ?? undefined], "preflop math");
    }
    for (let i = 0; i < 20; i++) {
      let s = startHand({ lineId: LINES[i % LINES.length].id, heroRole: i % 2 ? "pfr" : "caller", archetype: ARCHETYPES.nit, seed: 900 + i });
      let guard = 0;
      while (!s.done && s.pending && guard++ < 6) {
        const l = postflopLearn(s.pending, ARCHETYPES.nit, STAKES["1-2"], "$");
        check([l.ranges, l.note ?? undefined, l.exploit.text, ...l.exploit.tips, l.strategy.title, l.strategy.body, l.board.title, l.board.note ?? undefined, ...l.rows.map((r) => r.label)], "postflop learn");
        s = heroAct(s, s.pending.gtoBest);
      }
    }
  }, 60_000);

  it("writes clean math questions", () => {
    const rnd = mulberry32(3);
    for (const id of Object.keys(GEN) as DrillId[]) {
      for (let i = 0; i < 25; i++) {
        const q = GEN[id](rnd);
        check([q.prompt, q.explain, ...q.options], `math ${id}`);
      }
    }
  });

  it("keeps the app source free of em dashes, en dashes, arrows and ellipses", () => {
    const root = join(__dirname, "..");
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(f) && !f.endsWith(".test.ts")) files.push(p);
      }
    };
    walk(root);
    const offenders = files.filter((f) => /[—–→…]/.test(readFileSync(f, "utf8"))).map((f) => f.slice(root.length + 1));
    expect(offenders).toEqual([]);
  });
});
