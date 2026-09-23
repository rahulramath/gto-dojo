import { vsOpenChart } from "../data/charts";
import { isInPositionOn, posLabel, positionsFor, type PosId } from "../data/positions";
import type { ReasonId } from "../data/reasons";
import type { Stake } from "../data/stakes";
import { handName, RANK_NAMES } from "./cards";
import type { PfAction } from "./chart";
import { clamp, fmtMoney, pct, type Units } from "./format";
import { features, type HandFeatures } from "./handStats";
import type { PreflopSpot } from "./preflop";
import { weightsPercent } from "./ranges";

export interface MathRow {
  label: string;
  value: string;
  highlight?: boolean;
}

export interface PreflopIdea {
  title: string;
  body: string;
  notes: string[];
  legendId: string;
}

const EARLY: PosId[] = ["EP1", "EP2", "EP3", "LJ"];

export function heroIsIP(spot: PreflopSpot): boolean {
  if (spot.kind === "rfi") return spot.hero === "BTN";
  if (spot.kind === "vsLimp") return spot.hero === "BTN" || spot.hero === "CO";
  if (!spot.villain) return false;
  return isInPositionOn(spot.hero, spot.villain);
}

/** Rough equity-realization factor: how much of raw equity a hand actually captures postflop. */
export function realization(f: HandFeatures, ip: boolean): number {
  let r = ip ? 1.0 : 0.78;
  if (f.suited) r += 0.06;
  if (f.connected || f.gap === 1) r += 0.03;
  if (f.pair) r += 0.02;
  if (!f.suited && !f.pair && f.lo < 7) r -= 0.08;
  return clamp(r, 0.55, 1.15);
}

function idea(spot: PreflopSpot): { title: string; body: string } {
  const hero = spot.hero;
  const order = positionsFor(spot.table);
  const behind = order.length - order.indexOf(hero) - 1;
  const v = spot.villain ? posLabel(spot.villain, spot.table) : "";
  switch (spot.kind) {
    case "rfi":
      if (EARLY.includes(hero))
        return {
          title: "Early seats open tight",
          body: `${behind} players are still to act, so someone often has a big hand. Open strong hands that hold up against a 3-bet and play well out of position.`,
        };
      if (hero === "HJ") return { title: "The hijack opens a bit wider", body: "Four players are left. Every pocket pair and every suited ace becomes an open, plus more suited connectors." };
      if (hero === "CO") return { title: "The cutoff starts stealing", body: "Only the button and the blinds are left. Opening about 30% of hands puts pressure on three players who all have to defend well." };
      if (hero === "BTN") return { title: "The button is the steal seat", body: "Only the blinds are left, and you act last after the flop. That edge makes about 45% of hands worth opening." };
      return { title: "Small blind: raise or fold", body: "Only the big blind is left, but they act after you for the whole hand. Raise about 45% of hands to 3bb and fold the rest." };
    case "vsOpen":
      if (hero === "BB")
        return spot.villain === "SB"
          ? { title: "Big blind vs the small blind", body: "You get a good price and you'll act last for the whole hand. That's why you defend so many hands here." }
          : { title: "Big blind defense", body: "You get the best price at the table, about 27% to call a 2.5bb open. You'll be out of position, so suited and connected hands defend more than offsuit ones." };
      if (hero === "SB") return { title: "Small blind vs a raise", body: "You're out of position, and the big blind can still squeeze behind you. So you mostly 3-bet to about 4x or fold." };
      return {
        title: "Facing a raise",
        body: `The earlier the raise, the stronger the range. ${v} opens about ${Math.round(weightsPercent(spot.villainRange ?? {}))}% of hands. 3-bet your best hands plus a few suited aces, and call with pairs and suited hands that play well in position.`,
      };
    case "vs3bet":
      return heroIsIP(spot)
        ? { title: "Facing a 3-bet in position", body: "The pot is about 20bb now, so one pair often plays for your whole stack. With position you can call wider with pairs, suited broadways and suited connectors." }
        : { title: "Facing a 3-bet out of position", body: "They act after you on every street, so calling gets a lot worse. 4-bet your best hands, call strong pairs and suited broadways, and fold most of the rest." };
    case "vs4bet":
      return { title: "Facing a 4-bet", body: "A 4-bet puts about a quarter of your stack in the middle. Get it in with KK+, AK and a few suited aces, and fold your 3-bet bluffs." };
    default:
      if (hero === "BB") return { title: "Big blind vs limpers", body: "Checking is free, so you never fold. Raise your strong hands big and check everything else." };
      if (hero === "SB") return { title: "Small blind vs limpers", body: "Completing is cheap and the price is good. Only raise strong hands, since you'll be out of position against several players." };
      return {
        title: "Punish the limpers",
        body: "Limpers usually have weak hands, since most players raise their good ones. Raise strong hands to play them heads-up, limp behind with small pairs and suited connectors, and fold weak offsuit hands.",
      };
  }
}

function handNotes(f: HandFeatures): string[] {
  const out: string[] = [`${handName(f.hand)} is in the top ${f.top < 1 ? f.top.toFixed(1) : Math.round(f.top)}% of starting hands.`];
  const rank = RANK_NAMES[f.hi].toLowerCase();
  if (f.category === "premium") out.push("It's one of the best starting hands, so it wants a big pot.");
  else if (f.pair && f.hi <= 7) out.push("Small pairs hit a set about 1 in 8 times. They need cheap flops and deep stacks.");
  else if (f.pair && f.hi <= 9) out.push("Middle pairs are often best preflop, but overcards come on most flops.");
  else if (f.pair) out.push("Big pairs are ahead of almost every range preflop.");
  else if (f.dominated) out.push(`Weak kickers get outkicked. When you pair your ${rank}, a better ${rank} often beats you.`);
  else if (f.wheelAce && f.suited) out.push("A suited wheel ace makes nut flushes and straights, and the ace blocks AA and AK.");
  else if (f.suited && (f.connected || f.gap === 1)) out.push("Suited and connected hands make straights, flushes and big draws.");
  else if (f.suited) out.push("Being suited adds about 3% equity and gives you flush draws.");
  else if (f.ace) out.push("Your ace makes their AA and AK less likely.");
  else if (f.broadway) out.push("Two big cards, but offsuit hands flop fewer strong draws.");
  return out;
}

function legendFor(spot: PreflopSpot): string {
  if (spot.kind === "rfi") return spot.hero === "BTN" || spot.hero === "CO" ? "brunson" : "harrington";
  if (spot.kind === "vsOpen") return spot.hero === "BB" ? "janda" : "tipton";
  if (spot.kind === "vs3bet") return "straus";
  if (spot.kind === "vs4bet") return "chen";
  return "miller";
}

export function preflopIdea(spot: PreflopSpot): PreflopIdea {
  return { ...idea(spot), notes: handNotes(features(spot.hand)), legendId: legendFor(spot) };
}

export function reasonFor(spot: PreflopSpot, best: PfAction, f: HandFeatures): ReasonId {
  const ip = heroIsIP(spot);
  const late = spot.hero === "CO" || spot.hero === "BTN" || spot.hero === "SB";
  switch (spot.kind) {
    case "rfi":
      if (best === "raise") {
        if (f.category === "premium" || f.category === "strong") return "value";
        if (late) return "steal";
        return f.category === "speculative" ? "playability" : "initiative";
      }
      return f.dominated ? "dominated" : "too-weak";
    case "vsOpen":
      if (best === "raise") {
        if (f.category === "premium") return "value";
        if (f.category === "strong") return "merge";
        return f.ace || f.hi === 11 ? "blockers" : "fold-equity";
      }
      if (best === "call") {
        if (spot.hero === "BB") return "price";
        if (f.pair && f.hi <= 7) return "set-mine";
        return ip ? "position" : "playability";
      }
      if (f.dominated) return "dominated";
      return spot.hero === "SB" || !ip ? "oop" : "too-weak";
    case "vs3bet":
      if (best === "raise") return f.category === "premium" ? "value" : "blockers";
      if (best === "call") return ip ? "position" : "price";
      return f.dominated ? "dominated" : !ip ? "oop" : "too-weak";
    case "vs4bet":
      if (best === "allin") return f.category === "premium" ? "value" : "blockers";
      if (best === "call") return ip ? "position" : "price";
      return "too-weak";
    default:
      if (best === "raise") return f.category === "premium" || f.category === "strong" ? "value" : "initiative";
      if (best === "call") return f.pair ? "set-mine" : "implied";
      if (best === "check") return "price";
      return f.suited ? "dominated" : "multiway";
  }
}

/** Chance everyone behind folds to an open, from their defending charts. */
function tableFoldProb(spot: PreflopSpot): number | null {
  if (spot.kind !== "rfi") return null;
  const order = positionsFor(spot.table);
  const behind = order.slice(order.indexOf(spot.hero) + 1);
  let p = 1;
  for (const b of behind) {
    const c = vsOpenChart(b, spot.hero);
    if (!c) continue;
    let cont = 0;
    for (const h in c.freqs) {
      const fr = c.freqs[h];
      cont += ((fr.call ?? 0) + (fr.raise ?? 0)) * (h.length === 2 ? 6 : h[2] === "s" ? 4 : 12);
    }
    p *= 1 - cont / 1326;
  }
  return p;
}

export function preflopMath(spot: PreflopSpot, stake: Stake, units: Units, eqVsRange: number | null): { rows: MathRow[]; note: string | null } {
  const f = features(spot.hand);
  const m = (bb: number) => fmtMoney(bb, stake, units);
  const rows: MathRow[] = [{ label: "Pot before you act", value: m(spot.potBB) }];
  let note: string | null = null;

  if (spot.kind === "rfi") {
    const raise = spot.options.find((o) => o.key === "raise");
    const risk = raise ? raise.costBB : 0;
    const be = risk / (risk + spot.potBB);
    const fold = tableFoldProb(spot);
    rows.push({ label: "Folds you need to break even", value: pct(be), highlight: true });
    if (fold !== null) {
      rows.push({ label: "How often everyone folds", value: pct(fold), highlight: true });
      note =
        fold >= be
          ? `Everyone folds ${pct(fold)} of the time, more than the ${pct(be)} you need. That's why late seats can open so many hands.`
          : `Everyone folds only ${pct(fold)} of the time, less than the ${pct(be)} you need. Your hand has to win often enough when it gets called.`;
    }
    return { rows, note };
  }

  const need = spot.toCallBB / (spot.potBB + spot.toCallBB);
  if (spot.toCallBB > 0) rows.push({ label: "Equity you need to call", value: pct(need, 1), highlight: true });
  if (eqVsRange !== null) {
    rows.push({ label: `Your equity against ${spot.villainRangeLabel}`, value: pct(eqVsRange, 1), highlight: true });
    if (spot.toCallBB > 0) {
      const realized = eqVsRange * realization(f, heroIsIP(spot));
      const chartCall = spot.chart.freqs[spot.hand].call ?? 0;
      rows.push({ label: "After you factor in position", value: pct(realized, 1), highlight: true });
      if (realized >= need)
        note =
          chartCall < 0.3 && spot.chart.actions.includes("call")
            ? `You have about ${pct(realized)} and need ${pct(need)}, so calling breaks even at worst. The chart still prefers raising or folding, because weaker versions of this hand lose the big pots.`
            : `You have about ${pct(realized)} and need ${pct(need)}, so calling is at least break-even.`;
      else
        note =
          chartCall >= 0.3
            ? `You have about ${pct(realized)} and need ${pct(need)}, but the chart still calls ${pct(chartCall)} of the time. This hand wins big pots when it hits, and the simple math doesn't count that.`
            : `You have about ${pct(realized)} and need ${pct(need)}, so calling loses money here. Raise or fold instead.`;
    }
  }
  if (f.pair && f.hi <= 8 && !note) note = "With small pairs, call when the stacks are at least 15 to 20 times the price.";
  return { rows, note };
}
