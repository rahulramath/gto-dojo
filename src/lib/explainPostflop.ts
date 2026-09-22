import type { Archetype } from "../data/archetypes";
import type { ReasonId } from "../data/reasons";
import type { Stake } from "../data/stakes";
import { cardsPretty } from "./cards";
import { fmtMoney, pct, type Units } from "./format";
import { BUCKET_BLURB, BUCKET_LABEL, type Bucket } from "./handStrength";
import { ACTION_NAMES, FAMILY_INFO, isAggressive, type Analysis, type PostAction } from "./postflop";

export interface PostActionAnalysis {
  key: PostAction;
  label: string;
  freq: number;
  tone: "best" | "ok" | "bad";
  pros: string[];
  cons: string[];
}

export interface PostMathRow {
  label: string;
  value: string;
  note?: string;
  highlight?: boolean;
}

export interface PostflopExplain {
  verdictLine: string;
  boardRead: { title: string; notes: string[] };
  rangeRead: string[];
  handRead: { label: string; bucket: Bucket; bucketLabel: string; blurb: string };
  strategy: { title: string; body: string };
  actions: PostActionAnalysis[];
  quiz: { prompt: string; correct: ReasonId; options: ReasonId[] };
  math: { rows: PostMathRow[]; notes: string[] };
  exploit: { title: string; best: PostAction; changed: boolean; notes: string[] };
  legendId: string;
  legendLine: string;
}

const VALUE: Bucket[] = ["nutted", "strong"];
const DRAWS: Bucket[] = ["drawStrong", "drawWeak"];

const betFrac: Partial<Record<PostAction, number>> = { B33: 0.33, B75: 0.75, B125: 1.25 };

function actionLabel(a: Analysis, k: PostAction, stake: Stake, units: Units): string {
  const l = a.legal.find((x) => x.action === k);
  if (!l) return ACTION_NAMES[k];
  if (k === "X" || k === "F") return l.label;
  return `${l.label} ${fmtMoney(k === "C" ? l.cost : l.to, stake, units)}`;
}

function reasonFor(a: Analysis, best: PostAction): ReasonId {
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

const AGGRO: ReasonId[] = ["value", "semi-bluff", "bluff", "protection", "range-bet", "blockers", "thin-value"];
const PASSIVE: ReasonId[] = ["pot-control", "showdown", "induce", "give-up", "bluff-catch", "pot-odds"];

function quizOptions(correct: ReasonId, seed: number): ReasonId[] {
  const pool = (AGGRO.includes(correct) ? PASSIVE : AGGRO).filter((r) => r !== correct);
  const sameSide = (AGGRO.includes(correct) ? AGGRO : PASSIVE).filter((r) => r !== correct);
  const a = pool[seed % pool.length];
  const b = sameSide[(seed * 5 + 1) % sameSide.length];
  const opts = [correct, a, b];
  const rot = seed % 3;
  return [...opts.slice(rot), ...opts.slice(0, rot)];
}

function prosCons(a: Analysis, k: PostAction): { pros: string[]; cons: string[] } {
  const b = a.bucket;
  const pros: string[] = [];
  const cons: string[] = [];
  const wet = a.tex.wetness >= 0.45;
  const river = a.street === "river";
  const eq = a.eqHero;
  if (!a.facing) {
    if (k === "X") {
      if (b === "nutted") {
        pros.push("Traps: lets bluffs and weaker hands keep putting money in.");
        pros.push("Protects your checking range so you're never 'capped' when you check.");
        cons.push(wet ? "Gives free cards to the many draws on this board." : "Misses value from hands that would call a bet.");
      } else if (b === "strong") {
        pros.push("Controls the pot and keeps their weaker hands in.");
        cons.push("Loses value against worse pairs and draws that would call.");
        if (wet) cons.push("Gives free equity to draws.");
      } else if (b === "medium") {
        pros.push("Pot control: medium hands prefer a cheap showdown.");
        pros.push("Betting mostly folds worse hands and gets called by better ones.");
        if (!river) cons.push("Lets overcards and draws realize their equity for free.");
      } else if (b === "weak") {
        pros.push("Keeps your showdown value — betting would turn this hand into a bluff.");
        cons.push("You may get bluffed off it on a later street.");
      } else if (DRAWS.includes(b)) {
        pros.push("Takes a free card to hit your outs.");
        cons.push("Gives up fold equity: a semi-bluff can win the pot right now.");
      } else {
        pros.push("Gives up cheaply with a hand that has no equity to protect.");
        if (a.family === "RANGE_SMALL" || a.family === "STAB") cons.push("Their range folds a lot to a small bet here — checking forfeits that.");
      }
    } else {
      const f = betFrac[k] ?? (k === "AI" ? a.villStackBB / a.potBB : 0.75);
      const alpha = f / (1 + f);
      const big = f >= 0.7;
      if (VALUE.includes(b)) {
        pros.push(big ? "Builds a big pot — sets up stacks by the river." : "Gets called by a wide range of worse hands.");
        if (big && wet) pros.push("Charges draws the maximum.");
        if (!big && wet) cons.push("Lets draws continue cheaply.");
        if (big && !wet && b === "strong") cons.push("Folds out worse hands that would call a smaller bet.");
      } else if (b === "medium") {
        if (!big) pros.push(a.family === "RANGE_SMALL" ? "Part of a cheap range bet: your whole range bets here." : "Thin value and protection against overcards.");
        if (big) cons.push("A big bet with a medium hand folds out worse and gets called by better — the opposite of value.");
        cons.push("If they raise, you're in a tough spot.");
      } else if (DRAWS.includes(b)) {
        pros.push(`Semi-bluff: wins now when they fold (needs ${pct(alpha)} folds for a pure bluff), and you have ${a.info.draws.outs} outs when called.`);
        cons.push("A raise can force you off your draw.");
      } else if (b === "weak") {
        cons.push("Turns a hand with some showdown value into a bluff.");
        pros.push("Denies equity to overcards.");
      } else {
        pros.push(`${big ? "Big bets get the most folds" : "Cheap bluff"}: breaks even if they fold ${pct(alpha)} of the time.`);
        if ((a.blocker ?? 0) > 0.02) pros.push("Your cards block some of their calling hands.");
        if ((a.blocker ?? 0) < -0.02) cons.push("Your cards block their folding hands (missed draws) — a worse bluff candidate.");
        cons.push(`If called, you're way behind (${pct(eq)} equity).`);
      }
    }
    return { pros, cons };
  }
  const req = a.reqEq ?? 0;
  if (k === "F") {
    pros.push("Stops losing chips when you're behind.");
    if (eq > req + 0.03) cons.push(`You have ${pct(eq)} equity vs their range and need only ${pct(req)} — folding gives up a profitable call.`);
    if (b === "nutted" || b === "strong") cons.push("Folding a strong hand lets them bluff you profitably.");
  } else if (k === "C") {
    if (eq >= req) pros.push(`Price is right: ${pct(eq)} equity vs the ${pct(req)} you need.`);
    else cons.push(`Not enough equity: ${pct(eq)} vs ${pct(req)} needed.`);
    if (DRAWS.includes(b) && !river) pros.push(`${a.info.draws.outs} outs plus implied odds when you hit.`);
    if (b === "nutted") pros.push("Keeps their bluffs in; you can raise later.");
    if (VALUE.includes(b) && wet && !river) cons.push("Lets draws see the next card at a fixed price — consider raising.");
    if (river && (b === "medium" || b === "weak")) pros.push("Bluff-catcher: you only beat bluffs, so compare their bluffing frequency to your pot odds.");
  } else {
    if (VALUE.includes(b)) {
      pros.push("Raise for value: build the pot while they still have a hand.");
      if (b === "strong") cons.push("Folds out their bluffs, which you beat if you just call.");
    } else if (DRAWS.includes(b)) {
      pros.push("Semi-bluff raise: fold equity plus outs when called.");
      cons.push("Gets re-raised by strong hands.");
    } else if (b === "medium") {
      cons.push("Raising a medium hand folds out worse and gets called by better.");
    } else {
      pros.push("Bluff-raise: represents a strong hand.");
      cons.push("Needs a lot of folds; you have little equity when called.");
    }
  }
  return { pros, cons };
}

function legendFor(a: Analysis, best: PostAction): { id: string; line: string } {
  if (a.facing && a.street === "river") return { id: "duke", line: "Bluff-catching is a bet under uncertainty. Judge the call by the math, not by what they showed." };
  if (a.facing) return { id: "janda", line: "Defend enough of your range that auto-bluffs don't print money for them." };
  if (a.street === "river" && isAggressive(best) && !VALUE.includes(a.bucket))
    return { id: "chen", line: "Bluff ratio follows bet size: at 75% pot, about 30% of your bets can be bluffs." };
  if (a.street === "river" && VALUE.includes(a.bucket)) return { id: "miller", line: "Against live pools, thin value and big value bets are where the money is." };
  if (best === "X" && a.bucket === "medium") return { id: "negreanu", line: "Small ball: keep the pot small with medium hands and get to showdown cheaply." };
  if (best === "B125") return { id: "tipton", line: "Polarized ranges earn the right to bet big." };
  if (a.street === "flop") return { id: "galfond", line: "Think about how both ranges hit this flop — not just your hand." };
  return { id: "sklansky", line: "Play it the way you would if you could see their cards." };
}

export function explainPostflop(a: Analysis, arch: Archetype, stake: Stake, units: Units, seed: number): PostflopExplain {
  const m = (bb: number) => fmtMoney(bb, stake, units);
  const keys = a.legal.map((l) => l.action);
  const bestF = a.gto[a.gtoBest] ?? 0;
  const actions: PostActionAnalysis[] = keys.map((k) => {
    const fr = a.gto[k] ?? 0;
    const tone: PostActionAnalysis["tone"] = fr >= bestF - 0.08 || fr >= 0.6 ? "best" : fr >= 0.25 ? "ok" : "bad";
    return { key: k, label: actionLabel(a, k, stake, units), freq: fr, tone, ...prosCons(a, k) };
  });
  const mix = keys
    .filter((k) => (a.gto[k] ?? 0) >= 0.05)
    .sort((x, y) => (a.gto[y] ?? 0) - (a.gto[x] ?? 0))
    .map((k) => `${ACTION_NAMES[k]} ${pct(a.gto[k] ?? 0)}`)
    .join(" · ");
  const verdictLine = `${a.info.label} on ${cardsPretty(a.board)}: ${mix}.`;

  const rangeRead = [
    `Range equity: you ${pct(a.eqAdv)} vs them ${pct(1 - a.eqAdv)}.`,
    `Nut share (sets, two pair, straights+): you ${pct(a.nutHero, 1)} vs them ${pct(a.nutVill, 1)}.`,
    a.eqAdv >= 0.55
      ? "You have the range advantage — you can bet more often."
      : a.eqAdv <= 0.47
        ? "They have the range advantage on this board — tread carefully."
        : "Ranges are close — sizing and hand selection matter more than frequency.",
  ];

  let strategy: { title: string; body: string };
  if (a.facing) {
    const mdf = a.facing.potBefore / (a.facing.potBefore + a.facing.bet);
    strategy = {
      title: a.facing.allIn ? "Facing an all-in" : a.facing.isRaise ? "Facing a raise" : `Facing a ${Math.round(a.facing.frac * 100)}% pot bet`,
      body: a.facing.isRaise
        ? "Raises are much stronger than bets. Continue with strong hands and your best draws; one-pair hands shrink in value fast — especially against live players who rarely raise-bluff."
        : `You need ${pct(a.reqEq ?? 0)} equity to call. To stop them from bluffing any two cards profitably you'd defend about ${pct(mdf)} of your range (minimum defense frequency) — continue with your best ${pct(mdf)} and fold the rest.`,
    };
  } else {
    const fam = a.family ?? "CHECK_HEAVY";
    strategy = { title: FAMILY_INFO[fam].name, body: FAMILY_INFO[fam].summary };
  }

  const correct = reasonFor(a, a.gtoBest);
  const quiz = { prompt: `Main reason to ${ACTION_NAMES[a.gtoBest].toLowerCase()} here?`, correct, options: quizOptions(correct, seed) };

  const rows: PostMathRow[] = [];
  const notes: string[] = [];
  rows.push({ label: "Pot", value: m(a.potBB) });
  rows.push({ label: "Effective stack", value: m(Math.min(a.heroStackBB, a.villStackBB)) });
  rows.push({ label: "Stack-to-pot ratio (SPR)", value: a.spr.toFixed(1), note: a.spr < 3 ? "low: one pair often commits" : a.spr > 8 ? "deep: big hands win big pots" : "medium" });
  if (a.facing) {
    const mdf = a.facing.potBefore / (a.facing.potBefore + a.facing.bet);
    rows.push({ label: "To call", value: m(a.facing.toCall) });
    rows.push({ label: "Pot odds → equity needed", value: pct(a.reqEq ?? 0, 1), note: "call ÷ (pot + call)", highlight: true });
    rows.push({ label: "Minimum defense frequency", value: pct(mdf), note: "pot ÷ (pot + bet)" });
    rows.push({ label: "Your equity vs their betting range", value: pct(a.eqHero, 1), highlight: true });
    notes.push(
      a.eqHero >= (a.reqEq ?? 0)
        ? `${pct(a.eqHero, 1)} ≥ ${pct(a.reqEq ?? 0, 1)}: calling is profitable on pure pot odds.`
        : `${pct(a.eqHero, 1)} < ${pct(a.reqEq ?? 0, 1)}: calling loses unless implied odds or their over-bluffing make up the gap.`,
    );
  } else {
    rows.push({ label: "Your equity vs their range", value: pct(a.eqHero, 1), highlight: true });
    if (a.eqVsCalls !== null) {
      rows.push({ label: "Equity vs hands that call a ¾-pot bet", value: pct(a.eqVsCalls, 1), note: "value-bet test", highlight: true });
      notes.push(
        a.eqVsCalls >= 0.5
          ? `You beat ${pct(a.eqVsCalls)} of the hands that would call a bet — that's a value bet.`
          : `Against the hands that would call, you win only ${pct(a.eqVsCalls)}. A bet mostly gets called by better, so check — or bluff only with hands that can't win at showdown.`,
      );
    }
    for (const l of a.legal) {
      if (l.action === "X") continue;
      const f = l.cost / a.potBB;
      rows.push({ label: `${l.label} (${m(l.cost)}) bluff breaks even at`, value: `${pct(f / (1 + f))} folds`, note: "bet ÷ (pot + bet)" });
    }
  }
  if (a.info.draws.outs > 0 && a.street !== "river") {
    const outs = a.info.draws.outs;
    const unseen = a.street === "flop" ? 47 : 46;
    const one = outs / unseen;
    const two = a.street === "flop" ? 1 - ((unseen - outs) / unseen) * ((unseen - 1 - outs) / (unseen - 1)) : one;
    rows.push({ label: `Outs (${a.info.draws.labels.join(", ")})`, value: `${outs}` });
    rows.push({ label: "Hit next card", value: pct(one, 1), note: `rule of 2: ~${outs * 2}%` });
    if (a.street === "flop") rows.push({ label: "Hit by the river", value: pct(two, 1), note: `rule of 4: ~${Math.min(100, outs * 4)}%` });
  }
  if (a.riverBluffFreq !== null && a.valueCombos !== null && a.airCombos !== null) {
    rows.push({ label: "Your value-betting combos", value: a.valueCombos.toFixed(1) });
    rows.push({ label: "Your air combos", value: a.airCombos.toFixed(1) });
    rows.push({ label: "Balanced bluff frequency (75% pot)", value: pct(a.riverBluffFreq), note: "bluffs ≈ 30% of bets", highlight: true });
    notes.push("At a 75% pot bet, the caller needs 30% equity, so a balanced betting range is ~30% bluffs and ~70% value. That fixes how many of your missed hands should bet.");
  }
  if (a.blocker !== null) {
    rows.push({ label: "Blocker score", value: `${a.blocker >= 0 ? "+" : ""}${(a.blocker * 100).toFixed(1)}`, note: "+ blocks calls, − blocks folds" });
  }
  rows.push({ label: "Range equity (you vs them)", value: `${pct(a.eqAdv)} / ${pct(1 - a.eqAdv)}` });

  const counter = arch.counter;
  const exNotes: string[] = [];
  const b = a.bucket;
  if (!a.facing) exNotes.push(VALUE.includes(b) || b === "medium" ? counter.valueBet : counter.bluff);
  else exNotes.push(a.facing.isRaise ? counter.facingRaise : counter.facingBet);
  const changed = a.exploitBest !== a.gtoBest;
  const shift = keys
    .filter((k) => Math.abs((a.exploit[k] ?? 0) - (a.gto[k] ?? 0)) >= 0.08)
    .map((k) => `${ACTION_NAMES[k]} ${pct(a.gto[k] ?? 0)} → ${pct(a.exploit[k] ?? 0)}`);
  if (shift.length) exNotes.push(`Adjustment vs ${arch.name}: ${shift.join(", ")}.`);
  if (a.facing && Math.abs(a.eqHeroExp - a.eqHero) >= 0.03)
    exNotes.push(`Against this player's actual betting range your equity is ${pct(a.eqHeroExp, 1)} (vs ${pct(a.eqHero, 1)} against a balanced range).`);

  const legend = legendFor(a, a.gtoBest);
  return {
    verdictLine,
    boardRead: { title: a.tex.label, notes: a.tex.notes },
    rangeRead,
    handRead: {
      label: a.info.label,
      bucket: b,
      bucketLabel: BUCKET_LABEL[b],
      blurb:
        b !== a.info.bucket
          ? `Usually a "${BUCKET_LABEL[a.info.bucket].toLowerCase()}" hand, but here it plays like ${BUCKET_LABEL[b].toLowerCase()}: your equity is ${pct(a.eqVsCalls ?? a.eqHero)} against the hands that matter. ${BUCKET_BLURB[b]}`
          : BUCKET_BLURB[b],
    },
    strategy,
    actions,
    quiz,
    math: { rows, notes },
    exploit: {
      title: changed ? `Exploit vs ${arch.name}: ${ACTION_NAMES[a.exploitBest]}` : `Exploit vs ${arch.name}: same as baseline`,
      best: a.exploitBest,
      changed,
      notes: exNotes,
    },
    legendId: legend.id,
    legendLine: legend.line,
  };
}
