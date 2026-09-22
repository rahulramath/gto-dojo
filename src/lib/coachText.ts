import { posLabel, positionsFor } from "../data/positions";
import type { Archetype } from "../data/archetypes";
import { RANK_NAMES } from "./cards";
import { actionPercents, type PfAction } from "./chart";
import { combosFromWeights, equityVsRange } from "./equity";
import { heroIsIP, realization, reasonFor as preReason } from "./explainPreflop";
import { reasonFor as postReason } from "./explainPostflop";
import { pct } from "./format";
import { GRADES, type Grade } from "./grading";
import { BUCKET_LABEL, type Bucket } from "./handStrength";
import { features } from "./handStats";
import { ACTION_NAMES, type Analysis, type PostAction } from "./postflop";
import type { ExploitVerdict, PreflopSpot } from "./preflop";
import { weightsPercent } from "./ranges";
import { mulberry32 } from "./rng";

export type CoachVisual =
  | { kind: "range" }
  | { kind: "price"; need: number; have: number }
  | { kind: "strength"; eq: number; bucket: Bucket };

export interface CoachLine {
  tone: "good" | "bad";
  label: string;
  text: string;
}

export interface Coach {
  correct: boolean;
  headline: string;
  lines: CoachLine[];
  others: { key: string; label: string; text: string }[];
  visual: CoachVisual;
  exploit?: string;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/* ------------------------------------------------------------------ */
/* Preflop                                                              */
/* ------------------------------------------------------------------ */

interface PreCtx {
  spot: PreflopSpot;
  hand: string;
  seat: string;
  vName: string;
  behind: number;
  ip: boolean;
  openPct: number;
  villainPct: number;
  req: number;
  eq: number | null;
  realized: number | null;
  label: (a: PfAction) => string;
  freq: (a: PfAction) => number;
}

function preCtx(spot: PreflopSpot): PreCtx {
  const order = positionsFor(spot.table);
  const f = features(spot.hand);
  const ip = heroIsIP(spot);
  const eq = spot.villainRange && spot.kind !== "rfi" ? equityVsRange(spot.cards, [], combosFromWeights(spot.villainRange), 2000, mulberry32(11)).equity : null;
  return {
    spot,
    hand: spot.hand,
    seat: posLabel(spot.hero, spot.table),
    vName: spot.villain ? posLabel(spot.villain, spot.table) : spot.limpers.length ? "the limpers" : "",
    behind: order.length - order.indexOf(spot.hero) - 1,
    ip,
    openPct: Math.round(actionPercents(spot.chart).raise),
    villainPct: spot.villainRange ? Math.round(weightsPercent(spot.villainRange)) : 0,
    req: spot.toCallBB > 0 ? spot.toCallBB / (spot.potBB + spot.toCallBB) : 0,
    eq,
    realized: eq !== null ? eq * realization(f, ip) : null,
    label: (a) => spot.options.find((o) => o.key === a)?.label ?? spot.chart.labels[a] ?? a,
    freq: (a) => spot.chart.freqs[spot.hand][a] ?? 0,
  };
}

function preWhy(c: PreCtx, a: PfAction): string {
  const { spot, hand } = c;
  const f = features(hand);
  const verb = c.label(a).toLowerCase();
  const reason = preReason(spot, a, f);
  switch (reason) {
    case "value":
      return `${hand} is ahead of the hands that continue — ${verb} for value.`;
    case "merge":
      return `${hand} beats most of ${c.vName}'s range — ${verb} for value.`;
    case "steal":
      return spot.hero === "SB" ? "Only the big blind is left — a raise wins the pot often." : `Only ${c.behind} players are left — a raise wins the blinds often.`;
    case "playability":
      return `${hand} is ${f.pair ? "a pair" : f.suited ? (f.gap <= 1 ? "suited and connected" : "suited") : "connected"} — it plays well after the flop.`;
    case "initiative":
      return `${hand} is inside the ${c.seat} opening range (the top ${c.openPct}%) — open it.`;
    case "blockers":
      return `Your ${f.ace ? "ace" : RANK_NAMES[f.hi].toLowerCase()} blocks their best hands, so this ${verb} gets extra folds.`;
    case "fold-equity":
      return `${cap(c.vName)} folds often enough that a ${verb} profits right away.`;
    case "price": {
      const have = c.realized ?? c.eq;
      return have !== null && have >= c.req ? `You need ${pct(c.req)} equity and have about ${pct(have)} — a good price to call.` : "You're getting a good enough price, and it wins big when it hits.";
    }
    case "set-mine":
      return "Small pairs want a cheap flop: you hit a set 1 in 8.5 times and win big.";
    case "position":
      return `You'll act last after the flop — calling keeps ${c.vName}'s weaker hands in.`;
    case "implied":
      return `It's cheap, and ${hand} can win a big pot when it hits.`;
    case "dominated":
      return `${hand} is often dominated — better ${RANK_NAMES[f.hi].toLowerCase()}s have you outkicked.`;
    case "too-weak":
      if (spot.kind === "rfi") return `${c.seat} opens only the top ${c.openPct}% of hands — ${hand} isn't one of them.`;
      if (spot.kind === "vs4bet") return `A 4-bet range is mostly KK+ and AK — ${hand} is crushed.`;
      if (spot.kind === "vs3bet") return `${cap(c.vName)}'s 3-bet range is strong — ${hand} can't continue profitably.`;
      return `${hand} isn't strong enough against ${c.vName}'s ${c.villainPct}% range.`;
    case "oop":
      return `You'd play out of position every street — ${hand} can't handle that.`;
    case "multiway":
      return "With limpers in, offsuit hands make second-best pairs — let it go.";
    default:
      return `${hand} plays best as a ${verb} here.`;
  }
}

function preWhyNot(c: PreCtx, a: PfAction, best: PfAction): string {
  const { spot, hand } = c;
  const f = features(hand);
  const bestLabel = c.label(best).toLowerCase();
  if (a === "fold") {
    if (best === "call") {
      const have = c.realized ?? c.eq;
      return have !== null && have >= c.req ? `Too good to fold — you need ${pct(c.req)} and have about ${pct(have)}.` : "Too good to fold — it wins enough when it hits to justify the call.";
    }
    const plays = 1 - c.freq("fold");
    return plays >= 0.95 ? `Too strong to fold — ${hand} is always a ${bestLabel} here.` : `Too strong to fold — the baseline plays ${hand} ${pct(plays)} of the time.`;
  }
  if (a === "call") {
    if (spot.kind === "rfi") return "Limping gives up fold equity and invites a raise behind you.";
    if (best === "fold") {
      if (c.realized !== null && c.realized < c.req) return `Even at this price it doesn't pay: about ${pct(c.realized)} usable equity vs ${pct(c.req)} needed.`;
      return `${hand} loses money calling here — it's dominated too often${c.ip ? "" : " out of position"}.`;
    }
    if (spot.kind === "vsLimp") return spot.hero === "SB" ? "Completing wastes a strong hand — raise instead." : "Over-limping wastes a strong hand — raise to isolate.";
    if (spot.hero === "SB" && spot.kind === "vsOpen") return "Calling in the small blind invites a squeeze and plays out of position.";
    if (f.category === "premium" || f.category === "strong") return "Calling keeps the pot small with a hand that wants it big.";
    return `This hand plays poorly as a call — ${bestLabel} or fold.`;
  }
  if (a === "raise" || a === "allin") {
    if (best === "fold") return spot.kind === "rfi" ? `Opening ${hand} here gets called or 3-bet by better hands too often.` : "A raise gets called or re-raised by better hands too often.";
    if (best === "check") return `Raising ${hand} builds a pot you're not strong enough to play.`;
    if (best === "call") {
      if (spot.kind === "vsLimp") return "This hand wants a cheap multiway flop, not a bloated pot.";
      if (f.smallPair || f.suitedConnector) return `${hand} plays best as a call — a re-raise turns it into a bluff against a strong range.`;
      if (spot.hero === "BB") return `A 3-bet bloats the pot out of position — ${hand} plays better as a call.`;
      return "Raising folds out the worse hands you want to keep in.";
    }
    return `A ${c.label(best).toLowerCase()} is the better way to play ${hand} here.`;
  }
  if (a === "check") return "Checking misses value — limpers call raises with worse hands.";
  return `${cap(bestLabel)} is better here.`;
}

export function preflopCoach(spot: PreflopSpot, chosen: PfAction, grade: Grade, best: PfAction, exploit: ExploitVerdict, arch: Archetype): Coach {
  const c = preCtx(spot);
  const correct = GRADES[grade].correct;
  const lines: CoachLine[] = [];
  let headline: string;
  if (chosen === best) {
    headline = `${c.label(best)} is right`;
    lines.push({ tone: "good", label: `Why ${c.label(best).toLowerCase()}`, text: preWhy(c, best) });
  } else if (correct) {
    headline = `${c.label(chosen)} works`;
    lines.push({
      tone: "good",
      label: "Why it's close",
      text: `The baseline mixes ${c.label(best).toLowerCase()} ${pct(c.freq(best))} and ${c.label(chosen).toLowerCase()} ${pct(c.freq(chosen))}. ${preWhy(c, best)}`,
    });
  } else {
    headline = `${c.label(best)} was better`;
    lines.push({ tone: "bad", label: `Why not ${c.label(chosen).toLowerCase()}`, text: preWhyNot(c, chosen, best) });
    lines.push({ tone: "good", label: `Why ${c.label(best).toLowerCase()}`, text: preWhy(c, best) });
  }
  const shown = new Set([chosen, best]);
  const others = spot.options
    .filter((o) => !shown.has(o.key))
    .map((o) => {
      const f = c.freq(o.key);
      const text = f >= 0.25 ? `It's also fine — the baseline does it ${pct(f)} of the time. ${preWhy(c, o.key)}` : preWhyNot(c, o.key, best);
      return { key: o.key, label: `Why not ${o.label.toLowerCase()}?`, text };
    });

  const continues = best !== "fold" && best !== "check";
  let visual: CoachVisual = { kind: "range" };
  if (spot.kind !== "rfi" && c.realized !== null && (best === "call" || chosen === "call")) {
    const meterSaysCall = c.realized >= c.req;
    if (meterSaysCall === continues) visual = { kind: "price", need: c.req, have: c.realized };
  }
  const exploitText = exploit.changed ? `Vs ${arch.name}: ${c.label(exploit.best).toLowerCase()}. ${exploit.note}` : undefined;
  return { correct, headline, lines, others, visual, exploit: exploitText };
}

export function preflopHint(spot: PreflopSpot): string {
  const c = preCtx(spot);
  switch (spot.kind) {
    case "rfi":
      return `${c.seat} opens about ${c.openPct}% of hands. ${c.behind} ${c.behind === 1 ? "player is" : "players are"} left to act.`;
    case "vsOpen":
      return `${cap(c.vName)} opens about ${c.villainPct}% of hands. Calling needs ${pct(c.req)} equity.`;
    case "vs3bet":
      return `${cap(c.vName)}'s 3-bet range is about ${c.villainPct}% of hands. You'll be ${c.ip ? "in" : "out of"} position.`;
    case "vs4bet":
      return `4-bet ranges are narrow and strong — about ${c.villainPct}% of hands.`;
    default:
      return "Limpers usually hold weak hands. Raise strong hands to play them heads-up.";
  }
}

export function preflopContext(spot: PreflopSpot, amount: (bb: number) => string): string {
  const v = spot.villain ? posLabel(spot.villain, spot.table) : "";
  const top = Math.max(...spot.seats.map((s) => s.betBB));
  switch (spot.kind) {
    case "rfi":
      return "Folded to you";
    case "vsOpen":
      return `${v} raises to ${amount(top)}`;
    case "vs3bet":
      return `${v} 3-bets to ${amount(top)}`;
    case "vs4bet":
      return `${v} 4-bets to ${amount(top)}`;
    default:
      return spot.limpers.length === 1 ? "One player limps" : `${spot.limpers.length} players limp`;
  }
}

/* ------------------------------------------------------------------ */
/* Postflop                                                             */
/* ------------------------------------------------------------------ */

const VALUE: Bucket[] = ["nutted", "strong"];
const BETS: PostAction[] = ["B33", "B75", "B125", "AI"];
const SIZE: Partial<Record<PostAction, number>> = { B33: 1, B75: 2, B125: 3, AI: 4 };

function postWhy(a: Analysis, x: PostAction): string {
  const eq = a.eqHero;
  const req = a.reqEq ?? 0;
  if (x === "X" && !a.facing && (a.family === "CALLER_LEAD" || a.family === "RIVER_LEAD") && a.bucket !== "air")
    return "You called preflop, so check to the raiser — they'll bet most of their range for you.";
  switch (postReason(a, x)) {
    case "value":
      if (a.facing) return "Raise to build the pot while they still have a hand.";
      return a.eqVsCalls !== null ? `You beat ${pct(a.eqVsCalls)} of the hands that call — bet for value.` : "You're ahead of most hands that continue — bet for value.";
    case "thin-value":
      return "Worse hands still call — a small value bet earns more than checking.";
    case "protection":
      return "Bet to charge draws and overcards instead of giving free cards.";
    case "range-bet":
      return "This board favors your range — a small bet works with almost everything.";
    case "semi-bluff":
      return `${a.info.draws.outs} outs plus fold equity — betting wins now or later.`;
    case "bluff":
      return "No showdown value, but they fold often enough to a bet.";
    case "blockers":
      return "No showdown value, and your cards block their calls — a good bluff.";
    case "induce":
      return "You're way ahead — checking lets them bluff or catch up.";
    case "pot-control":
      return a.bucket === "strong" ? "Strong but vulnerable — checking controls the pot and keeps their weaker hands in." : "Medium strength — checking keeps the pot small and gets to showdown.";
    case "showdown":
      return "It can win at showdown — don't turn it into a bluff.";
    case "give-up":
      if (a.bucket === "drawWeak") return `A weak draw (${a.info.draws.labels[0] ?? "a few outs"}) — take the free card instead of bluffing.`;
      if (a.bucket === "drawStrong") return "Take the free card — your draw doesn't need to bet here.";
      return a.street === "river" ? "No pair and they won't fold enough — checking loses the least." : "No pair and no real draw — checking loses the least.";
    case "pot-odds":
      return x === "C" ? `You need ${pct(req)} and have ${pct(eq)} — the price is right.` : `You need ${pct(req)} but have only ${pct(eq)} — let it go.`;
    case "bluff-catch":
      return "You beat their bluffs, and they bluff often enough here to call.";
    default:
      return `${ACTION_NAMES[x]} is the strongest play here.`;
  }
}

function postWhyNot(a: Analysis, x: PostAction, best: PostAction): string {
  const b = a.bucket;
  const eq = a.eqHero;
  const req = a.reqEq ?? 0;
  if (x === "X") {
    if (VALUE.includes(b)) return "Checking gives free cards and misses value.";
    return "Checking gives up a pot they'd often fold.";
  }
  if (BETS.includes(x) && best === "X") {
    if (b === "nutted") return "Betting can scare off the hands you want to trap.";
    if (b === "strong") return "Checking keeps your range protected and the pot under control here.";
    if (b === "medium" || b === "weak") return x === "B33" ? "A bet folds out worse hands and gets called by better ones." : "A big bet only gets called by better hands.";
    return "They won't fold often enough — this bluff loses money.";
  }
  if (BETS.includes(x) && BETS.includes(best)) {
    return (SIZE[x] ?? 0) > (SIZE[best] ?? 0) ? "A smaller bet gets called by more worse hands." : "A bigger bet builds the pot and charges draws more.";
  }
  if (x === "F") {
    if (best === "C") return `You have ${pct(eq)} and need ${pct(req)} — folding is too tight.`;
    return "You're too strong to fold — raise for value.";
  }
  if (x === "C") {
    if (best === "F") return `You need ${pct(req)} but have only ${pct(eq)}.`;
    return b === "drawStrong" ? "Raising adds fold equity to a big draw." : "Raising builds the pot while you're ahead.";
  }
  if (x === "R" || x === "AI") {
    if (best === "C") return b === "medium" ? "Raising a medium hand only gets called by better." : "Raising folds out the bluffs you beat.";
    if (best === "F") return "You'd put more money in with the worst hand.";
  }
  return `${ACTION_NAMES[best]} is better here.`;
}

export function postflopCoach(a: Analysis, chosen: PostAction, grade: Grade, arch: Archetype): Coach {
  const best = a.gtoBest;
  const correct = GRADES[grade].correct;
  const name = (x: PostAction) => ACTION_NAMES[x];
  const lines: CoachLine[] = [];
  let headline: string;
  if (chosen === best) {
    headline = `${name(best)} is right`;
    lines.push({ tone: "good", label: `Why ${name(best).toLowerCase()}`, text: postWhy(a, best) });
  } else if (correct) {
    headline = `${name(chosen)} works`;
    lines.push({
      tone: "good",
      label: "Why it's close",
      text: `The baseline mixes ${name(best).toLowerCase()} ${pct(a.gto[best] ?? 0)} and ${name(chosen).toLowerCase()} ${pct(a.gto[chosen] ?? 0)}. ${postWhy(a, best)}`,
    });
  } else {
    headline = `${name(best)} was better`;
    lines.push({ tone: "bad", label: `Why not ${name(chosen).toLowerCase()}`, text: postWhyNot(a, chosen, best) });
    lines.push({ tone: "good", label: `Why ${name(best).toLowerCase()}`, text: postWhy(a, best) });
  }
  const shown = new Set([chosen, best]);
  const others = a.legal
    .filter((l) => !shown.has(l.action))
    .map((l) => {
      const f = a.gto[l.action] ?? 0;
      const text = f >= 0.25 ? `It's also fine — the baseline does it ${pct(f)} of the time. ${postWhy(a, l.action)}` : postWhyNot(a, l.action, best);
      return { key: l.action, label: `Why not ${name(l.action).toLowerCase()}?`, text };
    });
  const visual: CoachVisual = a.facing ? { kind: "price", need: a.reqEq ?? 0, have: a.eqHero } : { kind: "strength", eq: a.eqVsCalls ?? a.eqHero, bucket: a.bucket };
  const exploit = a.exploitBest !== best ? `Vs ${arch.name}: ${name(a.exploitBest).toLowerCase()}. ${a.facing ? arch.counter.facingBet : VALUE.includes(a.bucket) || a.bucket === "medium" ? arch.counter.valueBet : arch.counter.bluff}` : undefined;
  return { correct, headline, lines, others, visual, exploit };
}

export function postflopHint(a: Analysis): string {
  const hand = `${a.info.made}${a.info.draws.labels.length ? ` + ${a.info.draws.labels[0]}` : ""}`;
  if (a.facing) return `You have ${hand.toLowerCase()}. Calling needs ${pct(a.reqEq ?? 0)} equity.`;
  return `${a.tex.label}. You have ${hand.toLowerCase()} (${BUCKET_LABEL[a.bucket].toLowerCase()}).`;
}
