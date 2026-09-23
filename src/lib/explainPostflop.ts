import type { Archetype } from "../data/archetypes";
import type { ReasonId } from "../data/reasons";
import type { Stake } from "../data/stakes";
import { fmtMoney, pct, type Units } from "./format";
import type { Bucket } from "./handStrength";
import { ACTION_NAMES, FAMILY_INFO, isAggressive, type Analysis, type PostAction } from "./postflop";

export interface PostMathRow {
  label: string;
  value: string;
  highlight?: boolean;
}

export interface PostflopLearn {
  ranges: string;
  rows: PostMathRow[];
  note: string | null;
  exploit: { text: string; tips: string[] };
  strategy: { title: string; body: string };
  board: { title: string; note: string | null };
  legendId: string;
}

const VALUE: Bucket[] = ["nutted", "strong"];
const DRAWS: Bucket[] = ["drawStrong", "drawWeak"];

export function reasonFor(a: Analysis, best: PostAction): ReasonId {
  const b = a.bucket;
  if (!a.facing) {
    if (best === "X") {
      if (b === "nutted") return "induce";
      if (b === "strong") return "pot-control";
      if (b === "medium" || b === "weak") return a.street === "river" ? "showdown" : "pot-control";
      return "give-up";
    }
    if (VALUE.includes(b)) return "value";
    if (b === "medium") return a.family === "RANGE_SMALL" ? "range-bet" : a.street === "river" ? "thin-value" : "protection";
    if (DRAWS.includes(b)) return a.street === "river" ? "bluff" : "semi-bluff";
    if (a.family === "RANGE_SMALL" || a.family === "STAB") return "range-bet";
    return (a.blocker ?? 0) > 0.02 ? "blockers" : "bluff";
  }
  if (best === "F") return "pot-odds";
  if (best === "C") {
    if (b === "nutted") return "induce";
    if (a.street === "river" && (b === "medium" || b === "weak" || b === "strong")) return "bluff-catch";
    return "pot-odds";
  }
  if (VALUE.includes(b)) return "value";
  if (DRAWS.includes(b)) return "semi-bluff";
  return "bluff";
}

function legendFor(a: Analysis, best: PostAction): string {
  if (a.facing && a.street === "river") return "duke";
  if (a.facing) return "janda";
  if (a.street === "river" && isAggressive(best) && !VALUE.includes(a.bucket)) return "chen";
  if (a.street === "river" && VALUE.includes(a.bucket)) return "miller";
  if (best === "X" && a.bucket === "medium") return "negreanu";
  if (best === "B125") return "tipton";
  if (a.street === "flop") return "galfond";
  return "sklansky";
}

export function postflopLearn(a: Analysis, arch: Archetype, stake: Stake, units: Units): PostflopLearn {
  const m = (bb: number) => fmtMoney(bb, stake, units);
  const req = a.reqEq ?? 0;

  const ranges =
    a.eqAdv >= 0.55
      ? `Your range has ${pct(a.eqAdv)} of the equity on this board, so you can bet more often.`
      : a.eqAdv <= 0.47
        ? `Their range has ${pct(1 - a.eqAdv)} of the equity on this board, so tread carefully.`
        : `The ranges are close here (${pct(a.eqAdv)} for you), so picking the right hands and sizes matters more than how often you bet.`;

  const rows: PostMathRow[] = [
    { label: "Pot", value: m(a.potBB) },
    { label: "Stack-to-pot ratio", value: a.spr.toFixed(1) },
  ];
  let note: string | null = null;
  if (a.facing) {
    rows.push({ label: "Equity you need to call", value: pct(req, 1), highlight: true });
    rows.push({ label: "Your equity against their bets", value: pct(a.eqHero, 1), highlight: true });
    note =
      a.eqHero >= req
        ? `You have ${pct(a.eqHero)} and need ${pct(req)}, so calling makes money on pot odds alone.`
        : `You have ${pct(a.eqHero)} and need ${pct(req)}. Calling loses unless they bluff too much or you win more later.`;
  } else {
    rows.push({ label: "Your equity against their range", value: pct(a.eqHero, 1), highlight: true });
    if (a.eqVsCalls !== null) {
      rows.push({ label: "Your equity against hands that call a big bet", value: pct(a.eqVsCalls, 1), highlight: true });
      note =
        a.eqVsCalls >= 0.5
          ? `You beat ${pct(a.eqVsCalls)} of the hands that would call a bet, so it's a value bet.`
          : `You only beat ${pct(a.eqVsCalls)} of the hands that would call. A bet mostly gets called by better, so check, or bluff only with hands that can't win at showdown.`;
    }
  }
  if (a.info.draws.outs > 0 && a.street !== "river") {
    const outs = a.info.draws.outs;
    const unseen = a.street === "flop" ? 47 : 46;
    const hit = a.street === "flop" ? 1 - ((unseen - outs) / unseen) * ((unseen - 1 - outs) / (unseen - 1)) : outs / unseen;
    rows.push({ label: `Outs (${a.info.draws.labels.join(", ")})`, value: `${outs}` });
    rows.push({ label: a.street === "flop" ? "Chance to hit by the river" : "Chance to hit on the river", value: pct(hit, 1), highlight: true });
  }
  if (a.riverBluffFreq !== null) {
    rows.push({ label: "Bluffs in a balanced 75% pot bet", value: pct(a.riverBluffFreq), highlight: true });
    note ??= "At a 75% pot bet the caller needs 30%, so about 30% of your bets can be bluffs.";
  }

  const counter = arch.counter;
  const b = a.bucket;
  const text = a.facing ? (a.facing.isRaise ? counter.facingRaise : counter.facingBet) : VALUE.includes(b) || b === "medium" ? counter.valueBet : counter.bluff;
  const tips = a.legal
    .map((l) => l.action)
    .filter((k) => Math.abs((a.exploit[k] ?? 0) - (a.gto[k] ?? 0)) >= 0.08)
    .slice(0, 2)
    .map((k) => `Against ${arch.who}, ${ACTION_NAMES[k].toLowerCase()} goes from ${pct(a.gto[k] ?? 0)} to ${pct(a.exploit[k] ?? 0)} of the time.`);
  if (a.facing && Math.abs(a.eqHeroExp - a.eqHero) >= 0.03)
    tips.push(`Against how this player really bets, you have ${pct(a.eqHeroExp)} instead of ${pct(a.eqHero)}.`);

  let strategy: { title: string; body: string };
  if (a.facing) {
    const mdf = a.facing.potBefore / (a.facing.potBefore + a.facing.bet);
    strategy = {
      title: a.facing.allIn ? "Facing an all-in" : a.facing.isRaise ? "Facing a raise" : `Facing a ${Math.round(a.facing.frac * 100)}% pot bet`,
      body: a.facing.isRaise
        ? "Raises are much stronger than bets. Keep going with strong hands and your best draws, and let most one pair hands go, especially against live players who rarely bluff-raise."
        : `You need ${pct(req)} equity to call. To keep them from bluffing with any two cards, keep playing about ${pct(mdf)} of your hands and fold the rest.`,
    };
  } else {
    const fam = a.family ?? "CHECK_HEAVY";
    strategy = { title: FAMILY_INFO[fam].name, body: FAMILY_INFO[fam].summary };
  }

  return {
    ranges,
    rows,
    note,
    exploit: { text, tips: tips.slice(0, 2) },
    strategy,
    board: { title: a.tex.label, note: a.tex.notes[0] ?? null },
    legendId: legendFor(a, a.gtoBest),
  };
}
