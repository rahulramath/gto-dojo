import { describe, expect, it } from "vitest";
import { ALL_HANDS, combosFor, parseCards, type Card } from "./cards";
import { categoryOf, evaluate } from "./evaluator";
import { expandToken, parseWeights, weightsCombos, weightsPercent } from "./ranges";
import { chartList, CHARTS } from "../data/charts";
import { actionWeights } from "./chart";
import { classify } from "./handStrength";
import { analyzeBoard } from "./board";
import { handVsHand, equityVsRange, combosFromWeights } from "./equity";
import { mulberry32 } from "./rng";

const ev = (s: string) => evaluate(parseCards(s));
const hole = (s: string) => parseCards(s) as [Card, Card];

describe("evaluator", () => {
  it("ranks categories correctly", () => {
    expect(categoryOf(ev("AsKsQsJsTs2c3d"))).toBe(8);
    expect(categoryOf(ev("9c9d9h9s2c3d4h"))).toBe(7);
    expect(categoryOf(ev("9c9d9hKsKc3d4h"))).toBe(6);
    expect(categoryOf(ev("2h7h9hJhKh3d4c"))).toBe(5);
    expect(categoryOf(ev("5c6d7h8s9c2d2h"))).toBe(4);
    expect(categoryOf(ev("Ac2d3h4s5cKdQh"))).toBe(4);
    expect(categoryOf(ev("7c7d7hAsKc3d2h"))).toBe(3);
    expect(categoryOf(ev("7c7dKhKsAc3d2h"))).toBe(2);
    expect(categoryOf(ev("7c7dKhQsAc3d2h"))).toBe(1);
    expect(categoryOf(ev("7c8dKhQsAc3d2h"))).toBe(0);
  });
  it("breaks ties by kicker and straight height", () => {
    expect(ev("AcKd7h7s2c3d4h")).toBeGreaterThan(ev("AcQd7h7s2c3d9h"));
    expect(ev("6c2d3h4s5cKdQh")).toBeGreaterThan(ev("Ac2d3h4s5cKdQh"));
    expect(ev("AhKhQh2h3hJdTd")).toBeGreaterThan(ev("KhQhJhTh2d9d8d"));
    expect(ev("9c9d9hKsKc3d4h")).toBeGreaterThan(ev("9c9d9hQsQc3d4h"));
  });
});

describe("range notation", () => {
  it("expands tokens", () => {
    expect(expandToken("22+")).toHaveLength(13);
    expect(expandToken("A2s+")).toHaveLength(12);
    expect(expandToken("KTo+")).toEqual(["KTo", "KJo", "KQo"]);
    expect(expandToken("TT-77")).toEqual(["77", "88", "99", "TT"]);
    expect(expandToken("A5s-A2s")).toEqual(["A2s", "A3s", "A4s", "A5s"]);
    expect(expandToken("AK")).toEqual(["AKs", "AKo"]);
  });
  it("counts combos", () => {
    expect(weightsCombos(parseWeights("22+"))).toBe(78);
    expect(weightsCombos(parseWeights("AKs, AKo"))).toBe(16);
    expect(weightsCombos(parseWeights("A5s:0.5"))).toBe(2);
    expect(ALL_HANDS).toHaveLength(169);
    expect(ALL_HANDS.reduce((n, h) => n + combosFor(h).length, 0)).toBe(1326);
  });
});

describe("chart data", () => {
  it("never assigns more than 100% to a hand", () => {
    const bad = chartList().filter((c) => c.overfull.length).map((c) => `${c.id}: ${c.overfull.join(" ")}`);
    expect(bad).toEqual([]);
  });
  it("has plausible opening widths", () => {
    const pct = (id: string) => weightsPercent(actionWeights(CHARTS[id], "raise"));
    const widths = ["rfi_EP1", "rfi_EP2", "rfi_EP3", "rfi_LJ", "rfi_HJ", "rfi_CO", "rfi_BTN", "rfi_SB"].map(pct);
    for (let i = 1; i < 7; i++) expect(widths[i]).toBeGreaterThan(widths[i - 1]);
    expect(widths[0]).toBeGreaterThan(9);
    expect(widths[6]).toBeLessThan(50);
  });
});

describe("hand classifier", () => {
  const cls = (h: string, b: string) => classify(hole(h), parseCards(b));
  it("labels made hands", () => {
    expect(cls("AhKd", "Kc7s2d").made).toBe("Top pair, top kicker");
    expect(cls("QhQd", "Jc7s2d").made).toContain("Overpair");
    expect(cls("7h7d", "Kc7s2d").bucket).toBe("nutted");
    expect(cls("8h8d", "Kc7s2d").made).toContain("Second pair");
    expect(cls("5h5d", "Kc7s6d").bucket).toBe("weak");
    expect(cls("Kh7h", "Kc7s2d").made).toBe("Top two pair");
  });
  it("finds draws", () => {
    const fd = cls("AhQh", "Kh7h2d");
    expect(fd.draws.nutFlushDraw).toBe(true);
    expect(fd.bucket).toBe("drawStrong");
    const oe = cls("9c8d", "Th7s2d");
    expect(oe.draws.oesd).toBe(true);
    const gut = cls("9c8d", "Jh7s2d");
    expect(gut.draws.gutshot).toBe(true);
    expect(cls("AsQs", "Kh7s2d").draws.bdfd).toBe(true);
  });
  it("reads textures", () => {
    expect(analyzeBoard(parseCards("Kc7s2d")).label.startsWith("Dry")).toBe(true);
    expect(analyzeBoard(parseCards("9h8h7d")).wetness).toBeGreaterThan(0.6);
    expect(analyzeBoard(parseCards("QhQd4c")).paired).toBe(true);
  });
});

describe("equity", () => {
  it("matches known preflop matchups", () => {
    const rng = mulberry32(7);
    const aa = handVsHand(hole("AsAh"), hole("KsKh"), [], 20000, rng).equity;
    expect(aa).toBeGreaterThan(0.79);
    expect(aa).toBeLessThan(0.85);
    const coin = handVsHand(hole("AsKs"), hole("QhQd"), [], 20000, rng).equity;
    expect(coin).toBeGreaterThan(0.43);
    expect(coin).toBeLessThan(0.5);
  });
  it("computes exact turn equity for a flush draw", () => {
    // 9 hearts left, but 2h/3h pair the board and fill up the set: 7 clean outs of 44.
    const r = handVsHand(hole("AhQh"), hole("KsKd"), parseCards("Kh7h2d3c"));
    expect(r.equity).toBeCloseTo(7 / 44, 6);
  });
  it("computes equity vs a range", () => {
    const range = combosFromWeights(parseWeights("QQ+, AKs, AKo"));
    const r = equityVsRange(hole("7c7d"), [], range, 6000, mulberry32(3));
    expect(r.equity).toBeGreaterThan(0.25);
    expect(r.equity).toBeLessThan(0.45);
  });
});
