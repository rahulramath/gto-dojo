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
import type { Analysis, PostAction } from "./postflop";
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
const article = (noun: string) => (/^[aeiou]/.test(noun) ? "an" : "a");
const plural = (rank: string) => (rank === "six" ? "sixes" : `${rank}s`);

/** How we talk about each play: "Nice fold", "What about calling?", "then raise". */
interface Words {
  noun: string;
  gerund: string;
  verb: string;
}

const PRE_WORDS: Record<string, Words> = {
  fold: { noun: "fold", gerund: "folding", verb: "fold" },
  call: { noun: "call", gerund: "calling", verb: "call" },
  limp: { noun: "limp", gerund: "limping", verb: "limp" },
  "over-limp": { noun: "over-limp", gerund: "limping behind", verb: "limp behind" },
  complete: { noun: "limp", gerund: "completing", verb: "complete" },
  check: { noun: "check", gerund: "checking", verb: "check" },
  raise: { noun: "raise", gerund: "raising", verb: "raise" },
  "iso-raise": { noun: "iso-raise", gerund: "iso-raising", verb: "raise" },
  "3-bet": { noun: "3-bet", gerund: "3-betting", verb: "3-bet" },
  "4-bet": { noun: "4-bet", gerund: "4-betting", verb: "4-bet" },
  "all-in": { noun: "shove", gerund: "going all-in", verb: "get it all in" },
};

const POST_WORDS: Record<PostAction, Words> = {
  X: { noun: "check", gerund: "checking", verb: "check" },
  C: { noun: "call", gerund: "calling", verb: "call" },
  F: { noun: "fold", gerund: "folding", verb: "fold" },
  B33: { noun: "small bet", gerund: "betting small", verb: "bet small" },
  B75: { noun: "big bet", gerund: "betting big", verb: "bet big" },
  B125: { noun: "overbet", gerund: "overbetting", verb: "overbet" },
  R: { noun: "raise", gerund: "raising", verb: "raise" },
  AI: { noun: "shove", gerund: "going all-in", verb: "go all-in" },
};

function headlineFor(chosen: Words, best: Words, isBest: boolean, correct: boolean): string {
  if (isBest) return `Nice ${chosen.noun}`;
  if (correct) return `${cap(chosen.gerund)} works too`;
  return `This one's ${article(best.noun)} ${best.noun}`;
}

/* ------------------------------------------------------------------ */
/* Preflop                                                              */
/* ------------------------------------------------------------------ */

interface PreCtx {
  spot: PreflopSpot;
  hand: string;
  seat: string;
  v: string;
  behind: number;
  ip: boolean;
  openPct: number;
  villainPct: number;
  req: number;
  eq: number | null;
  realized: number | null;
  words: (a: PfAction) => Words;
  freq: (a: PfAction) => number;
}

function preCtx(spot: PreflopSpot): PreCtx {
  const order = positionsFor(spot.table);
  const f = features(spot.hand);
  const ip = heroIsIP(spot);
  const eq = spot.villainRange && spot.kind !== "rfi" ? equityVsRange(spot.cards, [], combosFromWeights(spot.villainRange), 2000, mulberry32(11)).equity : null;
  const label = (a: PfAction) => (spot.options.find((o) => o.key === a)?.label ?? a).toLowerCase();
  return {
    spot,
    hand: spot.hand,
    seat: posLabel(spot.hero, spot.table),
    v: spot.villain ? posLabel(spot.villain, spot.table) : "the limpers",
    behind: order.length - order.indexOf(spot.hero) - 1,
    ip,
    openPct: Math.round(actionPercents(spot.chart).raise),
    villainPct: spot.villainRange ? Math.round(weightsPercent(spot.villainRange)) : 0,
    req: spot.toCallBB > 0 ? spot.toCallBB / (spot.potBB + spot.toCallBB) : 0,
    eq,
    realized: eq !== null ? eq * realization(f, ip) : null,
    words: (a) => PRE_WORDS[label(a)] ?? { noun: label(a), gerund: label(a), verb: label(a) },
    freq: (a) => spot.chart.freqs[spot.hand][a] ?? 0,
  };
}

function preWhy(c: PreCtx, a: PfAction): string {
  const { spot, hand } = c;
  const f = features(hand);
  const w = c.words(a);
  const have = c.realized ?? c.eq;
  switch (preReason(spot, a, f)) {
    case "value":
      return `${hand} is ahead of most hands that keep playing, so ${w.verb} and get paid.`;
    case "merge":
      return `${hand} beats most of ${c.v}'s range, so ${w.verb} for value.`;
    case "steal":
      return spot.hero === "SB" ? "Only the big blind is left, so a raise takes the pot a lot of the time." : `Only ${c.behind} players are left behind you, so a raise picks up the blinds a lot of the time.`;
    case "playability":
      return `${hand} is ${f.pair ? "a pair" : f.suited ? (f.gap <= 1 ? "suited and connected" : "suited") : "connected"}, so it plays well after the flop.`;
    case "initiative":
      return `${hand} is in the top ${c.openPct}% of hands that ${c.seat} opens, so raise it.`;
    case "blockers":
      return `Your ${f.ace ? "ace" : RANK_NAMES[f.hi].toLowerCase()} makes their best hands less likely, so this ${w.noun} gets more folds.`;
    case "fold-equity":
      return `${cap(c.v)} folds often enough that this ${w.noun} wins money right away.`;
    case "price":
      return have !== null && have >= c.req ? `You need ${pct(c.req)} and you have about ${pct(have)}, so the price is right.` : "The price is good enough, and this hand wins big when it hits.";
    case "set-mine":
      return "Small pairs want a cheap flop. You hit a set about 1 in 8 times and can win a big pot.";
    case "position":
      return `You'll act last after the flop, and calling keeps ${c.v}'s weaker hands in.`;
    case "implied":
      return `It's cheap to see a flop, and ${hand} can win a big pot when it hits.`;
    case "dominated":
      if (f.hi < 8) return `${hand} is too weak to play here. It makes small pairs and weak draws that lose big pots.`;
      return `${hand} gets dominated a lot here. Better ${plural(RANK_NAMES[f.hi].toLowerCase())} have you outkicked.`;
    case "too-weak":
      if (spot.kind === "rfi") return `${c.seat} only opens the top ${c.openPct}% of hands, and ${hand} isn't one of them.`;
      if (spot.kind === "vs4bet") return `A 4-bet is almost always KK+ or AK, and ${hand} is crushed.`;
      if (spot.kind === "vs3bet") return `${cap(c.v)}'s 3-bet range is strong, and ${hand} can't keep up.`;
      return `${hand} isn't strong enough against the ${c.villainPct}% of hands ${c.v} opens.`;
    case "oop":
      return `You'd be out of position the whole hand, and ${hand} can't handle that.`;
    case "multiway":
      return "With limpers in, offsuit hands make a lot of second-best pairs. Let it go.";
    default:
      return `${hand} plays best as ${article(w.noun)} ${w.noun} here.`;
  }
}

function preWhyNot(c: PreCtx, a: PfAction, best: PfAction): string {
  const { spot, hand } = c;
  const f = features(hand);
  const b = c.words(best);
  const have = c.realized ?? c.eq;
  if (a === "fold") {
    if (best === "call") return have !== null && have >= c.req ? `Too good to fold. You need ${pct(c.req)} and you have about ${pct(have)}.` : "Too good to fold. It wins enough when it hits to pay for the call.";
    const plays = 1 - c.freq("fold");
    return plays >= 0.95 ? `Too strong to fold. You always ${b.verb} with ${hand} here.` : `Too strong to fold. You play ${hand} ${pct(plays)} of the time here.`;
  }
  if (a === "call") {
    if (spot.kind === "rfi") return "Limping gives up your chance to win the pot right away, and someone behind can raise.";
    if (best === "fold") {
      if (c.realized !== null && c.realized < c.req) return `Even at this price it doesn't pay. You'd have about ${pct(c.realized)} to work with and you need ${pct(c.req)}.`;
      return `${hand} loses money ${c.words(a).gerund} here. It's dominated too often${c.ip ? "" : ", and you're out of position"}.`;
    }
    if (spot.kind === "vsLimp") return spot.hero === "SB" ? "Completing wastes a strong hand. Raise instead." : "Limping behind wastes a strong hand. Raise and play the limper heads-up.";
    if (spot.hero === "SB" && spot.kind === "vsOpen") return "Calling from the small blind invites a squeeze, and you're out of position.";
    if (f.category === "premium" || f.category === "strong") return "Calling keeps the pot small with a hand that wants a big one.";
    return `This hand doesn't play well as a call. ${cap(b.verb)} or fold.`;
  }
  if (a === "raise" || a === "allin") {
    if (best === "fold") return spot.kind === "rfi" ? `Opening ${hand} here runs into better hands too often.` : "Raising here gets called or re-raised by better hands too often.";
    if (best === "check") return `Raising ${hand} builds a pot you're not strong enough to play.`;
    if (best === "call") {
      if (spot.kind === "vs4bet") return "Going all-in folds out their bluffs and only gets called by better hands.";
      if (spot.kind === "vsLimp") return "This hand wants a cheap flop with lots of players, not a big pot.";
      if (f.smallPair || f.suitedConnector) return `${hand} plays best as a call. Raising turns it into a bluff against a strong range.`;
      if (spot.hero === "BB") return `3-betting builds a big pot out of position. ${hand} does better as a call.`;
      return "Raising folds out the worse hands you want to keep in.";
    }
    return `${cap(b.gerund)} is the better way to play ${hand} here.`;
  }
  if (a === "check") return "Checking misses value. Limpers will call a raise with worse hands.";
  return `${cap(b.gerund)} is better here.`;
}

export function preflopCoach(spot: PreflopSpot, chosen: PfAction, grade: Grade, best: PfAction, exploit: ExploitVerdict, arch: Archetype): Coach {
  const c = preCtx(spot);
  const correct = GRADES[grade].correct;
  const cw = c.words(chosen);
  const bw = c.words(best);
  const lines: CoachLine[] = [];
  if (chosen === best) {
    lines.push({ tone: "good", label: "Why it works", text: preWhy(c, best) });
  } else if (correct) {
    lines.push({ tone: "good", label: "Why it's close", text: `${spot.hand} is right on the edge here, so you ${bw.verb} ${pct(c.freq(best))} of the time and ${cw.verb} ${pct(c.freq(chosen))}. Both are fine.` });
  } else {
    lines.push({ tone: "bad", label: `The problem with ${cw.gerund}`, text: preWhyNot(c, chosen, best) });
    lines.push({ tone: "good", label: `Why ${bw.gerund} is better`, text: preWhy(c, best) });
  }
  const shown = new Set([chosen, best]);
  const others = spot.options
    .filter((o) => !shown.has(o.key))
    .map((o) => {
      const f = c.freq(o.key);
      const text = f >= 0.25 ? `That's fine too. It's the play ${pct(f)} of the time here. ${preWhy(c, o.key)}` : preWhyNot(c, o.key, best);
      return { key: o.key, label: `What about ${c.words(o.key).gerund}?`, text };
    });

  const continues = best !== "fold" && best !== "check";
  let visual: CoachVisual = { kind: "range" };
  if (spot.kind !== "rfi" && c.realized !== null && (best === "call" || chosen === "call")) {
    const meterSaysCall = c.realized >= c.req;
    if (meterSaysCall === continues) visual = { kind: "price", need: c.req, have: c.realized };
  }
  const exploitText = exploit.changed ? `Against ${arch.who}, ${c.words(exploit.best).gerund} is better. ${exploit.note}` : undefined;
  return { correct, headline: headlineFor(cw, bw, chosen === best, correct), lines, others, visual, exploit: exploitText };
}

export function preflopHint(spot: PreflopSpot): string {
  const c = preCtx(spot);
  switch (spot.kind) {
    case "rfi":
      return `${c.seat} opens about ${c.openPct}% of hands, and ${c.behind} ${c.behind === 1 ? "player is" : "players are"} still to act.`;
    case "vsOpen":
      return `${cap(c.v)} opens about ${c.villainPct}% of hands. You need ${pct(c.req)} equity to call.`;
    case "vs3bet":
      return `${cap(c.v)} 3-bets about ${c.villainPct}% of hands, and you'll be ${c.ip ? "in" : "out of"} position.`;
    case "vs4bet":
      return `4-bets are narrow and strong, only about ${c.villainPct}% of hands.`;
    default:
      return "Limpers usually have weak hands. Raise your strong ones and play them heads-up.";
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
      return `${v} 3-bets you to ${amount(top)}`;
    case "vs4bet":
      return `${v} 4-bets you to ${amount(top)}`;
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
    return "You called preflop, so check to the raiser. They'll bet most of their range for you.";
  switch (postReason(a, x)) {
    case "value":
      if (a.facing) return "Raise and build the pot while they still have a hand.";
      return a.eqVsCalls !== null ? `You beat ${pct(a.eqVsCalls)} of the hands that call, so bet and get paid.` : "You're ahead of most hands that keep playing, so bet and get paid.";
    case "thin-value":
      return "Worse hands will still call, so a small value bet earns more than checking.";
    case "protection":
      return "Bet now so draws and overcards have to pay to see another card.";
    case "range-bet":
      return "This board is great for your range. A small bet works with almost everything.";
    case "semi-bluff":
      return `You have ${a.info.draws.outs} outs and they might fold. Betting wins now or later.`;
    case "bluff":
      return "You won't win at showdown, but they fold often enough to a bet.";
    case "blockers":
      return "You won't win at showdown, and your cards block the hands they'd call with. Good spot to bluff.";
    case "induce":
      return "You're way ahead. Checking lets them bluff or catch up a little.";
    case "pot-control":
      return a.bucket === "strong" ? "Strong, but easy to outdraw. Checking keeps the pot small and their weaker hands in." : "It's a medium hand. Checking keeps the pot small and gets you to showdown.";
    case "showdown":
      return "It can win at showdown, so don't turn it into a bluff.";
    case "give-up":
      if (a.bucket === "drawWeak") return `It's only a small draw${a.info.draws.labels[0] ? ` (${a.info.draws.labels[0]})` : ""}. Take the free card instead of bluffing.`;
      if (a.bucket === "drawStrong") return "Take the free card. Your draw doesn't need to bet here.";
      return a.street === "river" ? "No pair, and they won't fold enough. Checking loses the least." : "No pair and no real draw. Checking loses the least.";
    case "pot-odds":
      return x === "C" ? `You need ${pct(req)} and you have ${pct(eq)}, so the price is right.` : `You need ${pct(req)} but only have ${pct(eq)}. Let it go.`;
    case "bluff-catch":
      return "You beat their bluffs, and they bluff often enough here to make calling worth it.";
    default:
      return `${cap(POST_WORDS[x].gerund)} is the strongest play here.`;
  }
}

function postWhyNot(a: Analysis, x: PostAction, best: PostAction): string {
  const b = a.bucket;
  const eq = a.eqHero;
  const req = a.reqEq ?? 0;
  if (x === "X") return VALUE.includes(b) ? "Checking gives them a free card and misses value." : "Checking gives up a pot they'd fold a lot of the time.";
  if (BETS.includes(x) && best === "X") {
    if (a.family === "CALLER_LEAD" || a.family === "RIVER_LEAD") return "Betting into the preflop raiser is rarely right. Check and let them bet.";
    if (b === "nutted") return "Betting can scare off the hands you want to trap.";
    if (b === "strong") return "Checking keeps the pot manageable and keeps your checks strong.";
    if (b === "medium" || b === "weak") return x === "B33" ? "A bet folds out worse hands and gets called by better ones." : "A big bet only gets called by better hands.";
    return "They won't fold often enough, so this bluff loses money.";
  }
  if (BETS.includes(x) && BETS.includes(best)) {
    return (SIZE[x] ?? 0) > (SIZE[best] ?? 0) ? "A smaller bet gets called by more worse hands." : "A bigger bet builds the pot and makes draws pay more.";
  }
  if (x === "F") return best === "C" ? `You have ${pct(eq)} and need ${pct(req)}. Folding is too tight.` : "You're too strong to fold. Raise for value.";
  if (x === "C") {
    if (best === "F") return `You need ${pct(req)} but only have ${pct(eq)}.`;
    return b === "drawStrong" ? "Raising puts pressure on them, and you still have your draw if they call." : "Raising builds the pot while you're ahead.";
  }
  if (x === "R" || x === "AI") {
    if (best === "C") return b === "medium" ? "Raising a medium hand only gets called by better ones." : "Raising folds out the bluffs you beat.";
    if (best === "F") return "You'd be putting more money in with the worst hand.";
  }
  return `${cap(POST_WORDS[best].gerund)} is better here.`;
}

export function postflopCoach(a: Analysis, chosen: PostAction, grade: Grade, arch: Archetype): Coach {
  const best = a.gtoBest;
  const correct = GRADES[grade].correct;
  const cw = POST_WORDS[chosen];
  const bw = POST_WORDS[best];
  const lines: CoachLine[] = [];
  if (chosen === best) {
    lines.push({ tone: "good", label: "Why it works", text: postWhy(a, best) });
  } else if (correct) {
    lines.push({ tone: "good", label: "Why it's close", text: `This spot is a mix. With hands like this you ${bw.verb} ${pct(a.gto[best] ?? 0)} of the time and ${cw.verb} ${pct(a.gto[chosen] ?? 0)}. Both are fine.` });
  } else {
    lines.push({ tone: "bad", label: `The problem with ${cw.gerund}`, text: postWhyNot(a, chosen, best) });
    lines.push({ tone: "good", label: `Why ${bw.gerund} is better`, text: postWhy(a, best) });
  }
  const shown = new Set([chosen, best]);
  const others = a.legal
    .filter((l) => !shown.has(l.action))
    .map((l) => {
      const f = a.gto[l.action] ?? 0;
      const text = f >= 0.25 ? `That's fine too. It's the play ${pct(f)} of the time here. ${postWhy(a, l.action)}` : postWhyNot(a, l.action, best);
      return { key: l.action, label: `What about ${POST_WORDS[l.action].gerund}?`, text };
    });
  const visual: CoachVisual = a.facing ? { kind: "price", need: a.reqEq ?? 0, have: a.eqHero } : { kind: "strength", eq: a.eqVsCalls ?? a.eqHero, bucket: a.bucket };
  const note = a.facing ? arch.counter.facingBet : VALUE.includes(a.bucket) || a.bucket === "medium" ? arch.counter.valueBet : arch.counter.bluff;
  const exploit = a.exploitBest !== best ? `Against ${arch.who}, ${POST_WORDS[a.exploitBest].gerund} is better. ${note}` : undefined;
  return { correct, headline: headlineFor(cw, bw, chosen === best, correct), lines, others, visual, exploit };
}

export function postflopHint(a: Analysis): string {
  const made = a.info.made.toLowerCase();
  const draw = a.info.draws.labels[0];
  const hand = `${/^(overpair|underpair|set|straight|flush|nut |second-nut|low flush|full house)/.test(made) ? `${article(made)} ` : ""}${made}${draw ? ` plus ${article(draw)} ${draw}` : ""}`;
  if (a.facing) return `You have ${hand}. You need ${pct(a.reqEq ?? 0)} equity to call.`;
  const b = BUCKET_LABEL[a.bucket].toLowerCase();
  return `${a.tex.label}. You have ${hand}, ${a.bucket === "air" ? "with no pair and no real draw" : `which is ${article(b)} ${b}`}.`;
}
