import { vsOpenChart } from "../data/charts";
import { isInPositionOn, posLabel, positionsFor, POS_INFO, type PosId } from "../data/positions";
import type { ReasonId } from "../data/reasons";
import type { Stake } from "../data/stakes";
import { handName, RANK_NAMES } from "./cards";
import { primaryAction, type PfAction } from "./chart";
import { clamp, fmtMoney, pct, type Units } from "./format";
import { features, type HandFeatures } from "./handStats";
import type { PreflopSpot } from "./preflop";
import { weightsPercent } from "./ranges";

export interface ActionAnalysis {
  key: PfAction;
  label: string;
  freq: number;
  tone: "best" | "ok" | "bad";
  pros: string[];
  cons: string[];
}

export interface MathRow {
  label: string;
  value: string;
  note?: string;
  highlight?: boolean;
}

export interface PreflopExplain {
  verdictLine: string;
  concept: { title: string; body: string[] };
  handFactors: string[];
  actions: ActionAnalysis[];
  quiz: { prompt: string; correct: ReasonId; options: ReasonId[] };
  legendId: string;
  legendLine: string;
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

function conceptFor(spot: PreflopSpot): { title: string; body: string[] } {
  const hero = spot.hero;
  const behind = positionsFor(spot.table).length - positionsFor(spot.table).indexOf(hero) - 1;
  switch (spot.kind) {
    case "rfi":
      if (EARLY.includes(hero))
        return {
          title: "Early position: open tight and linear",
          body: [
            `With ${behind} players left to act, someone behind you often wakes up with a strong hand. Your range has to hold up against 3-bets and play well out of position.`,
            "Early ranges are linear: the best pairs, broadways and suited aces first, then suited connectors at mixed frequencies. Weak offsuit hands go first — they're dominated and hard to play out of position.",
          ],
        };
      if (hero === "HJ")
        return {
          title: "Hijack: widen a step",
          body: [
            "Four players are left. Every pocket pair and every suited ace becomes profitable, and more suited connectors join the range.",
            "You'll often have position on the blinds, but the cutoff and button can still 3-bet you.",
          ],
        };
      if (hero === "CO")
        return {
          title: "Cutoff: start stealing",
          body: [
            "Only the button and blinds remain. Opening ~30% puts pressure on three players who all have to defend correctly.",
            "Suited hands and offsuit broadways open; weak offsuit kings and queens are still folds.",
          ],
        };
      if (hero === "BTN")
        return {
          title: "Button: the steal seat",
          body: [
            "Only the blinds are left and you'll act last on every postflop street. That positional edge makes ~45% of hands profitable to open.",
            "A big share of your profit is fold equity: the blinds fold often, and when they call they play out of position.",
          ],
        };
      return {
        title: "Small blind: raise or fold",
        body: [
          "Only the big blind is left, but they'll have position on you for the whole hand.",
          "A strong, simple plan is raise-or-fold with ~45% of hands to 3bb. Solvers also mix in some limps; learn this version first.",
        ],
      };
    case "vsOpen":
      if (hero === "BB")
        return {
          title: "Big blind defense",
          body: [
            "You've already posted 1bb and you close the action, so you get the best price at the table — against a 2.5bb open you need only about 27% equity to call.",
            spot.villain === "SB"
              ? "Against the small blind you're in position for the whole hand, so you defend even wider than usual."
              : "You'll be out of position, so you won't realize all of that equity. Suited and connected hands realize more; offsuit trash realizes less. That's why BB defense is wide but tilted toward suited hands.",
          ],
        };
      if (hero === "SB")
        return {
          title: "Small blind vs an open: 3-bet or fold",
          body: [
            "You're out of position against the opener and the big blind still acts behind you. Flatting invites a squeeze and plays badly out of position.",
            "So the small blind mostly 3-bets (to about 4-4.5x) or folds. Only a few pairs flat to set-mine.",
          ],
        };
      return {
        title: "Facing an open with position",
        body: [
          `The earlier the opener, the stronger their range. ${spot.villain ? `${posLabel(spot.villain, spot.table)} opens about ${Math.round(weightsPercent(spot.villainRange ?? {}))}% of hands.` : ""}`,
          "3-bet a value range plus a few blocker bluffs (A5s-A4s, some suited kings/connectors). Flat hands that play well in position — pairs and suited broadways. The blinds behind you can squeeze, which keeps flats tighter.",
        ],
      };
    case "vs3bet":
      return heroIsIP(spot)
        ? {
            title: "Facing a 3-bet in position",
            body: [
              "The pot is now ~20bb+ and the stack-to-pot ratio (SPR) after a call is only about 4-5, so one-pair hands play for stacks more often.",
              "In position you can call wider: pairs, suited broadways and suited connectors realize equity well. 4-bet KK+/AK for value, with a few blocker bluffs like A5s.",
            ],
          }
        : {
            title: "Facing a 3-bet out of position",
            body: [
              "The 3-bettor will act after you on every street, so calling is much less attractive. Continue with a tighter range.",
              "4-bet premiums (plus a few A5s-type bluffs), call strong pairs and suited broadways, and fold most suited connectors and offsuit hands.",
            ],
          };
    case "vs4bet":
      return {
        title: "Facing a 4-bet: stack-off decisions",
        body: [
          "At 100bb a 4-bet commits about a quarter of the stack. Calling leaves an SPR near 1, so you're really deciding whether to play for stacks.",
          "Jam KK+ and AK (plus a few A5s-type bluffs that block AA/AK). QQ, JJ and AQs mix calls. Your 3-bet bluffs fold.",
        ],
      };
    default:
      if (hero === "BB")
        return {
          title: "Big blind vs limpers",
          body: [
            "Checking is free, so you never fold here.",
            "Raise strong value hands to punish weak limping ranges (size big: 5-6x plus 1x per limper). Check everything else and take a free flop.",
          ],
        };
      if (hero === "SB")
        return {
          title: "Small blind vs limpers",
          body: [
            "Completing costs only half a blind and you get a big multiway price.",
            "Raise only strong hands — you'll be out of position against several players.",
          ],
        };
      return {
        title: "Punishing limpers (live exploit)",
        body: [
          "Limpers usually have weak, capped ranges: most players would raise AA, KK and AK.",
          "Iso-raise strong hands to play heads-up with the initiative. Over-limp hands that want cheap multiway flops (small pairs, suited connectors). Fold offsuit trash — it loses money multiway.",
        ],
      };
  }
}

function handFactors(f: HandFeatures): string[] {
  const out: string[] = [];
  out.push(`${handName(f.hand)}: top ${f.top < 1 ? f.top.toFixed(1) : Math.round(f.top)}% of starting hands, ${f.equity.toFixed(1)}% equity vs a random hand.`);
  if (f.category === "premium") out.push("One of the five best starting hands — it wants to build a big pot.");
  if (f.pair && f.hi <= 7)
    out.push("Small pair: flops a set about 12% of the time (1 in 8.5). Wins big pots when it hits, gives up when it misses — it needs implied odds.");
  else if (f.pair && f.hi <= 9) out.push("Middle pair: often best preflop, but vulnerable to overcards on most flops.");
  else if (f.pair) out.push("Big pair: ahead of almost every range preflop.");
  if (f.suited && !f.pair) out.push("Suited: about 3% more equity than offsuit, plus flush draws that let you continue on more flops.");
  if (f.connected && !f.pair) out.push("Connected: makes straights and strong combination draws.");
  if (f.wheelAce && f.suited) out.push("Suited wheel ace: nut-flush potential, wheel straights, and the ace blocks AA and AK.");
  else if (f.ace && !f.pair) out.push("The ace is a blocker: it removes combos of AA and AK from opponents' ranges.");
  if (f.dominated) out.push(`Offsuit ${RANK_NAMES[f.hi].toLowerCase()} with a weak kicker: when you pair the ${RANK_NAMES[f.hi].toLowerCase()}, better kickers often have you beat.`);
  if (!f.suited && !f.pair && f.broadway) out.push("Two broadway cards: good high-card strength, but offsuit hands flop fewer strong draws.");
  return out;
}

function reasonFor(spot: PreflopSpot, best: PfAction, f: HandFeatures): ReasonId {
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

const AGGRO_REASONS: ReasonId[] = ["value", "steal", "blockers", "merge", "initiative", "fold-equity"];
const PASSIVE_REASONS: ReasonId[] = ["price", "set-mine", "position", "playability", "implied"];
const FOLD_REASONS: ReasonId[] = ["dominated", "too-weak", "oop", "multiway"];

function quizOptions(correct: ReasonId, best: PfAction, seed: number): ReasonId[] {
  const pool =
    best === "fold" ? [...AGGRO_REASONS, ...PASSIVE_REASONS] : best === "call" || best === "check" ? [...AGGRO_REASONS, ...FOLD_REASONS] : [...PASSIVE_REASONS, ...FOLD_REASONS];
  const distract = pool.filter((r) => r !== correct);
  const a = distract[seed % distract.length];
  const b = distract[(seed * 7 + 3) % distract.length] === a ? distract[(seed + 1) % distract.length] : distract[(seed * 7 + 3) % distract.length];
  const opts = [correct, a, b];
  const rot = seed % 3;
  return [...opts.slice(rot), ...opts.slice(0, rot)];
}

function actionText(spot: PreflopSpot, a: PfAction, f: HandFeatures, freq: number): { pros: string[]; cons: string[] } {
  const ip = heroIsIP(spot);
  const pros: string[] = [];
  const cons: string[] = [];
  const vName = spot.villain ? posLabel(spot.villain, spot.table) : "the opener";
  const behind = positionsFor(spot.table).length - positionsFor(spot.table).indexOf(spot.hero) - 1;
  const strong = f.category === "premium" || f.category === "strong";
  switch (spot.kind) {
    case "rfi":
      if (a === "raise") {
        pros.push("Wins the blinds immediately whenever everyone folds.");
        pros.push("Takes the initiative: the preflop raiser wins many pots with a single c-bet.");
        if (spot.hero === "BTN") pros.push("Guaranteed position on the blinds after the flop.");
        if (strong) pros.push("Builds a pot with a hand that's ahead of the ranges that continue.");
        if (behind >= 5) cons.push(`${behind} players can still wake up with a hand and 3-bet you.`);
        if (!strong && f.dominated) cons.push("When you're called or 3-bet, better versions of this hand dominate you.");
        if (spot.hero === "SB") cons.push("The big blind has position on you for the whole hand.");
        if (freq < 0.1 && !cons.length) cons.push("Too weak for this seat: it loses more when called than it wins in steals.");
      } else if (a === "fold") {
        pros.push("Costs nothing and avoids difficult spots with a weak hand.");
        if (f.dominated) pros.push("Avoids dominated situations out of position.");
        if (freq < 0.5) cons.push(`Gives up a profitable open — this hand raises ${pct(1 - freq)} of the time here.`);
      } else if (a === "call") {
        pros.push("Cheap way to see a flop.");
        cons.push("Open-limping gives up fold equity: you can't win the pot preflop.");
        cons.push("Invites an iso-raise from behind, and often a multiway pot out of position with a capped range.");
        cons.push("Raking small multiway pots is exactly where live rake hurts most.");
      }
      break;
    case "vsOpen":
      if (a === "raise") {
        if (strong) pros.push(`Builds a bigger pot with a hand that's ahead of ${vName}'s range.`);
        else pros.push("Wins the pot immediately when they fold — and still has equity when called.");
        if (f.ace && !strong) pros.push("Your ace blocks AA and AK, so they have fewer hands that can 4-bet or call happily.");
        pros.push("Takes the initiative and often isolates one opponent.");
        if (!ip) cons.push("Bloats the pot out of position if they call.");
        cons.push("Gets 4-bet by stronger hands; bluffs then have to fold.");
      } else if (a === "call") {
        if (spot.hero === "BB") pros.push(`Great price: you only need ~${pct(spot.toCallBB / (spot.potBB + spot.toCallBB))} equity to call.`);
        if (ip) pros.push("Position lets you realize your equity and control the pot.");
        if (f.pair && f.hi <= 7) pros.push("Set mining: small price, big payoff when you flop a set.");
        if (f.suited) pros.push("Suited hands make strong draws and play well postflop.");
        cons.push("Your range is capped — you rarely have AA/KK when you flat.");
        if (spot.hero !== "BB") cons.push("Players behind can squeeze you out of the pot.");
        if (!ip) cons.push("Out of position you'll realize less of your equity.");
      } else {
        pros.push("Avoids playing a marginal hand against a range that has you beat.");
        if (f.dominated) pros.push(`${vName}'s range is full of hands that dominate this one.`);
        if (freq < 0.5) cons.push(`Folds too much: baseline continues ${pct(1 - freq)} of the time here.`);
        if (spot.hero === "BB" && freq < 0.5) cons.push("Over-folding the big blind lets opponents steal with any two cards.");
      }
      break;
    case "vs3bet":
      if (a === "raise") {
        if (f.category === "premium") pros.push("Premium hands want to get stacks in — 4-bet for value.");
        else pros.push("Blocker 4-bet: your cards remove AA/AK combos, so they fold more often.");
        cons.push("You'll face 5-bet jams from their best hands.");
      } else if (a === "call") {
        pros.push("Keeps the 3-bettor's bluffs in and realizes your equity.");
        if (ip) pros.push("In position, you control the pot size postflop.");
        else cons.push("Out of position in a big pot with a low SPR — tough to play.");
        cons.push("Your range is capped after calling (few AA/KK).");
      } else {
        pros.push("Your hand plays poorly in a bloated pot against a strong range.");
        if (freq < 0.5) cons.push(`Over-folding: baseline continues ${pct(1 - freq)} here, and over-folding lets them 3-bet you with anything.`);
      }
      break;
    case "vs4bet":
      if (a === "allin") {
        pros.push(f.category === "premium" ? "Maximizes value — you're ahead of their 4-bet range." : "Blocks AA/AK and has live equity when called.");
        cons.push("Against KK+ you're a big underdog.");
      } else if (a === "call") {
        pros.push("Keeps their 4-bet bluffs in; you'll play a pot with SPR ~1.");
        cons.push("You'll be committed on most flops anyway.");
      } else {
        pros.push("Your 3-bet was a bluff or thin value — you're crushed by a 4-bet range.");
        if (freq < 0.5) cons.push("This hand is strong enough to continue against their 4-bet range.");
      }
      break;
    default:
      if (a === "raise") {
        pros.push("Isolates a weak limper: play heads-up with the initiative.");
        pros.push("Limpers call raises with dominated hands, so strong hands get paid.");
        cons.push("You may still get called by several players.");
        if (spot.hero === "SB" || spot.hero === "BB") cons.push("You'll be out of position for the whole hand.");
      } else if (a === "call") {
        pros.push(spot.hero === "SB" ? "Completing is cheap with a great multiway price." : "Cheap multiway flop with implied odds.");
        if (f.pair || f.suitedConnector) pros.push("This hand makes big hands (sets, straights, flushes) that get paid multiway.");
        cons.push("No initiative, and you can get raised behind.");
        if (f.dominated || (!f.suited && !f.pair)) cons.push("Offsuit hands make second-best one-pair hands multiway.");
      } else if (a === "check") {
        pros.push("Free flop with a hand that isn't worth raising.");
        if (freq < 0.5) cons.push("Misses value: limpers pay off raises with worse.");
      } else {
        pros.push("Saves money with a hand that plays badly multiway.");
        if (freq < 0.5) cons.push("This hand can profitably continue here.");
      }
  }
  return { pros, cons };
}

export function explainPreflop(spot: PreflopSpot, seed: number): PreflopExplain {
  const f = features(spot.hand);
  const freqs = spot.chart.freqs[spot.hand];
  const best = primaryAction(spot.chart, spot.hand);
  const bestF = freqs[best] ?? 0;
  const labelOf = (a: PfAction) => spot.options.find((o) => o.key === a)?.label ?? spot.chart.labels[a] ?? a;

  const actions: ActionAnalysis[] = spot.options.map((o) => {
    const fr = freqs[o.key] ?? 0;
    const tone: ActionAnalysis["tone"] = fr >= bestF - 0.08 || fr >= 0.6 ? "best" : fr >= 0.25 ? "ok" : "bad";
    return { key: o.key, label: o.label, freq: fr, tone, ...actionText(spot, o.key, f, fr) };
  });

  const mixText =
    bestF >= 0.95
      ? `${labelOf(best)} 100%`
      : spot.chart.actions
          .filter((a) => (freqs[a] ?? 0) >= 0.05)
          .sort((x, y) => (freqs[y] ?? 0) - (freqs[x] ?? 0))
          .map((a) => `${labelOf(a)} ${pct(freqs[a] ?? 0)}`)
          .join(" · ");
  const verdictLine = `${spot.hand} from the ${POS_INFO[spot.hero].name}: ${mixText}.`;

  const correct = reasonFor(spot, best, f);
  const quiz = { prompt: `Main reason to ${labelOf(best).toLowerCase()} here?`, correct, options: quizOptions(correct, best, seed) };

  let legendId = "sklansky";
  let legendLine = "Choose the play that does best against the hands they actually have.";
  if (spot.kind === "rfi") {
    if (spot.hero === "BTN" || spot.hero === "CO") {
      legendId = "brunson";
      legendLine = "Late position is where aggression pays: raise first, make the blinds guess.";
    } else {
      legendId = "harrington";
      legendLine = "Ranges widen seat by seat toward the button. Early seats demand discipline.";
    }
  } else if (spot.kind === "vsOpen") {
    if (spot.hero === "BB") {
      legendId = "janda";
      legendLine = "Defend often enough that opponents can't profitably raise any two cards.";
    } else {
      legendId = "tipton";
      legendLine = "3-bet ranges are built from value hands plus bluffs that have good blockers and playability.";
    }
  } else if (spot.kind === "vs3bet") {
    legendId = "straus";
    legendLine = "In no-limit the target shoots back — plan for their re-raise before you open.";
  } else if (spot.kind === "vs4bet") {
    legendId = "chen";
    legendLine = "At this point it's math: required equity vs their range decides the call.";
  } else {
    legendId = "miller";
    legendLine = "Limpers are the profit center of live poker — isolate them with value hands.";
  }

  return { verdictLine, concept: conceptFor(spot), handFactors: handFactors(f), actions, quiz, legendId, legendLine };
}

/** Everyone-behind fold probability for an open, from their defend charts. */
export function tableFoldProb(spot: PreflopSpot): number | null {
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

export function preflopMath(
  spot: PreflopSpot,
  stake: Stake,
  units: Units,
  eqVsRange: number | null,
): { rows: MathRow[]; notes: string[] } {
  const f = features(spot.hand);
  const m = (bb: number) => fmtMoney(bb, stake, units);
  const rows: MathRow[] = [];
  const notes: string[] = [];
  const ip = heroIsIP(spot);
  const raiseOpt = spot.options.find((o) => o.key === "raise" || o.key === "allin");
  rows.push({ label: "Pot before you act", value: m(spot.potBB) });

  if (spot.kind === "rfi") {
    const risk = raiseOpt ? raiseOpt.costBB : 0;
    const be = risk / (risk + spot.potBB);
    const fold = tableFoldProb(spot);
    rows.push({ label: "Your raise risks", value: m(risk) });
    rows.push({ label: "Pure steal breaks even if all fold", value: pct(be), note: "risk ÷ (risk + pot)", highlight: true });
    if (fold !== null) {
      rows.push({ label: "Everyone behind folds (their charts)", value: pct(fold), highlight: true });
      notes.push(
        fold >= be
          ? `Players behind fold ${pct(fold)} of the time — more than the ${pct(be)} a pure bluff needs. Any two cards would show a profit from folds alone; the chart trims the hands that lose too much when called.`
          : `Players behind fold ${pct(fold)} — less than the ${pct(be)} a pure bluff needs, so your hand must win enough when called.`,
      );
    }
  } else {
    const potOdds = spot.toCallBB / (spot.potBB + spot.toCallBB);
    if (spot.toCallBB > 0) {
      rows.push({ label: "To call", value: m(spot.toCallBB) });
      rows.push({ label: "Pot odds → equity needed", value: pct(potOdds, 1), note: "call ÷ (pot + call)", highlight: true });
    }
    if (raiseOpt) {
      const risk = raiseOpt.costBB;
      rows.push({ label: `${raiseOpt.label} risks`, value: m(risk) });
      rows.push({ label: "Pure bluff breaks even if they fold", value: pct(risk / (risk + spot.potBB)), note: "risk ÷ (risk + pot)" });
    }
  }
  if (spot.villainRange) rows.push({ label: `Width of ${spot.villainRangeLabel}`, value: `${weightsPercent(spot.villainRange).toFixed(1)}%` });
  if (eqVsRange !== null) {
    rows.push({ label: `Your equity vs ${spot.villainRangeLabel}`, value: pct(eqVsRange, 1), highlight: true });
    if (spot.kind !== "rfi" && spot.toCallBB > 0) {
      const r = realization(f, ip);
      const realized = eqVsRange * r;
      const need = spot.toCallBB / (spot.potBB + spot.toCallBB);
      rows.push({ label: `Equity realization (${ip ? "in position" : "out of position"})`, value: `×${r.toFixed(2)}`, note: "suited/connected hands realize more" });
      rows.push({ label: "Realized equity", value: pct(realized, 1), highlight: true });
      const chartCall = spot.chart.freqs[spot.hand].call ?? 0;
      const behind = stake.stackBB - (spot.options.find((o) => o.key === "call")?.toBB ?? 0);
      if (realized >= need) {
        notes.push(`Realized equity ${pct(realized, 1)} ≥ ${pct(need, 1)} needed, so calling is at least break-even on direct odds.`);
        if (chartCall < 0.3 && spot.chart.actions.includes("call"))
          notes.push("The chart still mostly raises or folds: raw equity ignores reverse implied odds (dominated hands lose the big pots) and the extra value of raising.");
      } else {
        notes.push(`Realized equity ${pct(realized, 1)} < ${pct(need, 1)} needed on direct odds alone.`);
        notes.push(
          chartCall >= 0.3
            ? `The chart still calls ${pct(chartCall)} of the time: with ${m(Math.max(0, behind))} behind, ${spot.hand} wins big pots when it hits (implied odds), which this simple estimate doesn't count. Direct odds are the floor, not the whole story.`
            : "So a flat call loses money here; continue only as a raise (with fold equity) or fold.",
        );
      }
    }
  }
  rows.push({ label: "Your hand vs a random hand", value: `${f.equity.toFixed(1)}%` });
  if (f.pair && f.hi <= 8) notes.push("Set mining rule of thumb: call when the effective stacks are at least ~15-20× the price to call (implied odds).");
  return { rows, notes };
}
