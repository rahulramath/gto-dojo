/**
 * Generates src/data/preflopEquity.json: each hand class's all-in equity vs a random hand.
 * Run with `npm run gen:equity`.
 */
import { writeFileSync } from "node:fs";
import { ALL_HANDS, combosFor } from "../src/lib/cards";
import { equityVsRandom } from "../src/lib/equity";
import { mulberry32 } from "../src/lib/rng";

const ITERS = 60000;
const rng = mulberry32(20260922);
const out: Record<string, number> = {};
for (const h of ALL_HANDS) {
  const [a, b] = combosFor(h)[0];
  out[h] = Math.round(equityVsRandom([a, b], [], ITERS, rng) * 1000) / 10;
}
writeFileSync(new URL("../src/data/preflopEquity.json", import.meta.url), JSON.stringify(out, null, 0) + "\n");
const sorted = Object.entries(out).sort((x, y) => y[1] - x[1]);
console.log("top:", sorted.slice(0, 8).map(([h, e]) => `${h} ${e}`).join(", "));
console.log("bottom:", sorted.slice(-5).map(([h, e]) => `${h} ${e}`).join(", "));
