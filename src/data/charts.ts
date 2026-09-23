import { buildChart, type Chart, type ChartDef, type PfAction } from "../lib/chart";
import { isInPositionOn, type PosId } from "./positions";

/*
 * Preflop baselines: solver-approximated 6-max / full-ring 100bb cash strategies
 * (2.5bb opens, 3bb from the SB, rake-aware), rounded to learnable frequencies.
 * Live limper charts are exploitative coaching heuristics, not solver output.
 */

const RFI_LABELS = { raise: "Raise", fold: "Fold" } as const;
const VO_LABELS = { raise: "3-bet", call: "Call", fold: "Fold" } as const;
const V3_LABELS = { raise: "4-bet", call: "Call", fold: "Fold" } as const;
const V4_LABELS = { allin: "All-in", call: "Call", fold: "Fold" } as const;

const SEAT_NAME: Record<string, string> = { EP1: "UTG", EP2: "UTG+1", EP3: "UTG+2", LJ: "UTG", IP: "In position" };
const SEAT_FULL: Record<string, string> = { LJ: "UTG", HJ: "Hijack", CO: "Cutoff", BTN: "Button", SB: "Small blind", BB: "Big blind", IP: "In position" };
const SEAT_MID: Record<string, string> = { LJ: "UTG", HJ: "hijack", CO: "cutoff", BTN: "button", SB: "small blind", BB: "big blind" };
const seat = (p: string) => SEAT_NAME[p] ?? p;
const RFI_SHORT: Record<string, string> = { EP1: "UTG (9-max)", EP2: "UTG+1", EP3: "UTG+2", LJ: "Lojack" };

const V3_SHORT: Record<string, string> = {
  v3_LJ_OOP: "UTG vs a later 3-bet",
  v3_LJ_IP: "UTG vs a blind 3-bet",
  v3_HJ_OOP: "HJ vs a later 3-bet",
  v3_HJ_IP: "HJ vs a blind 3-bet",
  v3_CO_OOP: "CO vs a button 3-bet",
  v3_CO_IP: "CO vs a blind 3-bet",
  v3_BTN_IP: "BTN vs a blind 3-bet",
  v3_SB_OOP: "SB vs a BB 3-bet",
  v3_EP: "Early seat vs a 3-bet",
};

const rfi = (hero: PosId, title: string, raise: string, notes: string[], format: ChartDef["format"] = "both"): ChartDef => ({
  id: `rfi_${hero}`,
  title,
  short: `${RFI_SHORT[hero] ?? hero} open`,
  kind: "rfi",
  format,
  source: "solver",
  hero,
  actions: ["raise", "fold"],
  labels: RFI_LABELS,
  ranges: { raise },
  rest: "fold",
  notes,
});

const vo = (hero: string, villain: string, raise: string, call: string, notes: string[], format: ChartDef["format"] = "both"): ChartDef => ({
  id: `vo_${hero}_${villain}`,
  title: villain === "EP" ? `${SEAT_FULL[hero] ?? hero} vs an early open (full ring)` : `${SEAT_FULL[hero] ?? hero} vs ${SEAT_MID[villain] ?? villain} open`,
  short: villain === "EP" ? `${seat(hero)} vs early open` : `${seat(hero)} vs ${seat(villain)}`,
  kind: "vsOpen",
  format,
  source: "solver",
  hero,
  villain,
  actions: ["raise", "call", "fold"],
  labels: VO_LABELS,
  ranges: { raise, call },
  rest: "fold",
  notes,
});

const v3 = (id: string, hero: string, villain: string, title: string, raise: string, call: string, notes: string[], format: ChartDef["format"] = "both"): ChartDef => ({
  id,
  title,
  short: V3_SHORT[id] ?? title,
  kind: "vs3bet",
  format,
  source: "solver",
  hero,
  villain,
  actions: ["raise", "call", "fold"],
  labels: V3_LABELS,
  ranges: { raise, call },
  rest: "fold",
  notes,
});

const DEFS: ChartDef[] = [
  /* ----------------------------- RFI ----------------------------- */
  rfi(
    "EP1",
    "UTG open (full ring)",
    "66+, 55:0.5, 44:0.4, 33:0.3, 22:0.3, ATs+, A9s:0.5, A5s:0.7, A4s:0.4, KTs+, K9s:0.3, QJs, QTs:0.6, JTs, T9s:0.5, 98s:0.2, AQo+, AJo:0.6, KQo:0.7",
    ["At a full table, UTG opens only about 11% of hands, since eight players are still to act.", "Open big pairs, big broadways and a few suited wheel aces. Fold offsuit hands below AJ."],
    "9max",
  ),
  rfi(
    "EP2",
    "UTG+1 open (full ring)",
    "55+, 44:0.4, 33:0.4, 22:0.4, A9s+, A8s:0.5, A5s, A4s:0.6, A3s:0.3, KTs+, K9s:0.6, QTs+, Q9s:0.3, JTs, J9s:0.3, T9s:0.7, 98s:0.4, 87s:0.3, AJo+, ATo:0.4, KQo, KJo:0.3",
    ["Opens about 14% of hands.", "A few more suited aces and suited connectors than UTG."],
    "9max",
  ),
  rfi(
    "EP3",
    "UTG+2 open (full ring)",
    "55+, 44:0.7, 33:0.3, 22:0.3, A8s+, A7s:0.5, A5s-A4s, A3s:0.5, K9s+, Q9s+, J9s+, T9s, 98s:0.6, 87s:0.5, 76s:0.2, AJo+, ATo:0.6, KQo, KJo:0.3",
    ["Opens about 16% of hands. Suited kings and more connectors start to show up here."],
    "9max",
  ),
  rfi(
    "LJ",
    "Lojack open (UTG in 6-max)",
    "55+, 44:0.6, 33:0.5, 22:0.5, A8s+, A7s:0.8, A6s:0.6, A5s-A3s, A2s:0.7, K9s+, K8s:0.5, K7s:0.3, K6s:0.3, K5s:0.3, QTs+, Q9s:0.6, JTs, J9s:0.6, T9s, T8s:0.4, 98s:0.5, 87s:0.4, 76s:0.4, 65s:0.4, 54s:0.3, AJo+, ATo:0.8, KQo, KJo:0.8, QJo:0.3",
    [
      "Opens about 18% of hands. Five players are still to act, so your hands need to hold up when someone has a big one.",
      "Every suited ace opens at least some of the time. The ace blocks big hands and can make the nut flush.",
      "Offsuit hands stop at ATo and KJo. Weaker offsuit hands get dominated and lose money out of position.",
    ],
  ),
  rfi(
    "HJ",
    "Hijack open",
    "33+, 22:0.5, A2s+, K6s+, K5s:0.6, Q9s+, Q8s:0.6, J9s+, J8s:0.4, T8s+, 98s, 97s:0.5, 87s, 76s, 65s, 54s:0.6, ATo+, A9o:0.25, KJo+, KTo:0.5, QJo:0.7, QTo:0.25, JTo:0.25",
    ["Opens about 23% of hands.", "Every pair and every suited ace opens now, and KTo, QTo and A9o start to mix in."],
  ),
  rfi(
    "CO",
    "Cutoff open",
    "22+, A2s+, K5s+, K4s-K2s:0.4, Q7s+, Q6s:0.4, J7s+, T7s+, 97s+, 96s:0.5, 86s+, 75s+, 65s, 64s:0.4, 54s, 53s:0.25, A9o+, A8o:0.7, A7o:0.25, A5o:0.3, KJo+, KTo:0.8, K9o:0.25, QJo, QTo:0.8, JTo:0.7, T9o:0.15",
    [
      "Opens about 29% of hands. Only the button and the blinds are left.",
      "You're stealing from the button too, so open wide enough that they can't 3-bet you light and win.",
    ],
  ),
  rfi(
    "BTN",
    "Button open",
    "22+, A2s+, K2s+, Q5s+, Q4s-Q2s:0.5, J6s+, J5s:0.5, J4s:0.5, J3s:0.3, T6s+, T5s:0.5, 96s+, 95s:0.3, 85s+, 74s+, 63s+, 53s+, 43s, A5o+, A4o-A2o:0.5, K8o+, K7o:0.25, Q9o+, Q8o:0.25, J9o+, J8o:0.15, T9o, T8o:0.35, 98o:0.6, 87o:0.15",
    [
      "Opens about 45% of hands. You act last after the flop, so almost every suited hand and most big offsuit hands make money.",
      "The blinds have to play out of position against you, and that's where your profit comes from.",
    ],
  ),
  rfi(
    "SB",
    "Small blind open",
    "22+, A2s+, K2s+, Q4s+, Q3s-Q2s:0.4, J5s+, J4s:0.5, T6s+, 96s+, 86s+, 85s:0.4, 75s+, 64s+, 53s+, 43s:0.3, A5o+, A4o-A2o:0.5, K7o+, Q8o+, J9o+, J8o:0.3, T9o, T8o:0.3, 98o:0.5",
    [
      "Raises about 45% of hands to 3bb. Only the big blind is left, but they act after you on every street.",
      "Solvers also limp some hands here. Raise or fold is simpler and almost as good, so learn it first.",
    ],
  ),

  /* --------------------------- vs Open --------------------------- */
  vo(
    "HJ",
    "LJ",
    "QQ+, AKs, AKo, JJ:0.4, AQs:0.5, AJs:0.2, KQs:0.3, A5s:0.6, A4s:0.4, AQo:0.3, KJs:0.15, QJs:0.1",
    "JJ:0.6, TT-88, 77:0.5, 66:0.3, AQs:0.5, AJs:0.6, ATs:0.5, KQs:0.6, KJs:0.4, QJs:0.4, JTs:0.4, T9s:0.2, AQo:0.2",
    ["UTG's range is tight, so only keep going with about 10% of hands.", "3-bet QQ+ and AK plus A5s and A4s as bluffs. Call with pairs and suited broadways that play well in position."],
  ),
  vo(
    "CO",
    "LJ",
    "QQ+, AKs, AKo, JJ:0.4, AQs:0.5, AJs:0.25, KQs:0.35, A5s:0.7, A4s:0.5, A3s:0.2, AQo:0.35, KJs:0.2, QJs:0.1, 76s:0.1, 65s:0.1",
    "JJ:0.6, TT-77, 66:0.5, 55:0.3, AQs:0.5, AJs:0.6, ATs:0.6, KQs:0.6, KJs:0.5, KTs:0.3, QJs:0.5, QTs:0.3, JTs:0.6, T9s:0.4, 98s:0.2, AQo:0.25",
    ["You're still up against a strong range, so offsuit hands like AJo and KQo mostly fold.", "The button behind you can squeeze, so keep your calls tight."],
  ),
  vo(
    "CO",
    "HJ",
    "QQ+, AKs, AKo, JJ:0.5, TT:0.2, AQs:0.6, AJs:0.35, ATs:0.15, KQs:0.45, KJs:0.25, A5s:0.8, A4s:0.6, A3s:0.3, AQo:0.5, AJo:0.15, KQo:0.15, QJs:0.15, JTs:0.1, 76s:0.15, 65s:0.15, K9s:0.1",
    "JJ:0.5, TT:0.8, 99-77, 66:0.6, 55:0.4, AQs:0.4, AJs:0.6, ATs:0.7, A9s:0.3, KQs:0.55, KJs:0.6, KTs:0.4, QJs:0.6, QTs:0.4, JTs:0.7, T9s:0.5, 98s:0.3, 87s:0.2, AQo:0.3",
    ["The hijack opens about 23%, so you play wider than against UTG.", "You 3-bet more often, with more bluffs like suited wheel aces and a few suited connectors."],
  ),
  vo(
    "BTN",
    "LJ",
    "QQ+, AKs, AKo, JJ:0.35, AQs:0.45, AJs:0.2, KQs:0.3, A5s:0.6, A4s:0.4, AQo:0.3, KJs:0.15, 76s:0.1, 65s:0.1, 54s:0.1",
    "JJ:0.65, TT-44, 33:0.5, 22:0.5, AQs:0.55, AJs:0.8, ATs-A9s, A8s:0.4, KQs:0.7, KJs:0.85, KTs:0.8, K9s:0.3, QJs:0.9, QTs:0.8, Q9s:0.3, JTs:0.9, J9s:0.5, T9s:0.9, T8s:0.3, 98s:0.7, 87s:0.6, 76s:0.5, 65s:0.4, 54s:0.2, AQo:0.5, AJo:0.3, KQo:0.4",
    ["Acting last lets the button call a lot more than other seats.", "Pairs and suited hands do well when you act last."],
  ),
  vo(
    "BTN",
    "HJ",
    "QQ+, AKs, AKo, JJ:0.45, TT:0.15, AQs:0.55, AJs:0.3, ATs:0.15, KQs:0.4, KJs:0.2, A5s:0.7, A4s:0.55, A3s:0.3, AQo:0.45, AJo:0.15, KQo:0.15, K9s:0.15, QJs:0.15, 76s:0.15, 65s:0.15, 54s:0.1",
    "JJ:0.55, TT:0.85, 99-33, 22:0.6, AQs:0.45, AJs:0.7, ATs:0.85, A9s-A8s, A7s:0.5, A6s:0.3, KQs:0.6, KJs:0.8, KTs, K9s:0.6, QJs:0.85, QTs, Q9s:0.5, JTs, J9s:0.7, T9s, T8s:0.5, 98s:0.9, 97s:0.3, 87s:0.8, 76s:0.7, 65s:0.6, 54s:0.4, AQo:0.5, AJo:0.5, ATo:0.2, KQo:0.6, KJo:0.3, QJo:0.2",
    ["You keep going with about 20% of hands, 3-betting about 6% and calling about 14%."],
  ),
  vo(
    "BTN",
    "CO",
    "QQ+, AKs, AKo, JJ:0.6, TT:0.3, 99:0.1, AQs:0.7, AJs:0.45, ATs:0.3, A9s:0.15, KQs:0.55, KJs:0.35, KTs:0.2, QJs:0.3, QTs:0.15, JTs:0.2, A5s:0.8, A4s:0.7, A3s:0.5, A2s:0.3, AQo:0.6, AJo:0.35, ATo:0.1, KQo:0.35, KJo:0.1, K9s:0.2, K8s:0.15, Q9s:0.1, J9s:0.1, T9s:0.15, 98s:0.1, 87s:0.1, 76s:0.2, 65s:0.2, 54s:0.15",
    "JJ:0.4, TT:0.7, 99:0.9, 88-22, AQs:0.3, AJs:0.55, ATs:0.7, A9s:0.85, A8s-A6s, A5s:0.2, A4s:0.3, A3s:0.3, A2s:0.4, KQs:0.45, KJs:0.65, KTs:0.8, K9s:0.8, K8s:0.4, K7s:0.3, QJs:0.7, QTs:0.85, Q9s:0.8, Q8s:0.3, JTs:0.8, J9s:0.9, J8s:0.4, T9s:0.85, T8s:0.8, 98s:0.9, 97s:0.5, 87s:0.9, 86s:0.3, 76s:0.8, 75s:0.2, 65s:0.8, 54s:0.6, AQo:0.4, AJo:0.65, ATo:0.6, A9o:0.2, KQo:0.65, KJo:0.6, KTo:0.3, QJo:0.5, QTo:0.2, JTo:0.4",
    [
      "The classic steal against steal spot. You 3-bet about 11% and call about 22%.",
      "You act after the cutoff for the whole hand, which is why calling works here and much less from the blinds.",
    ],
  ),
  vo(
    "SB",
    "LJ",
    "QQ+, AKs, AKo, JJ:0.8, TT:0.45, 99:0.2, AQs:0.9, AJs:0.55, ATs:0.25, KQs:0.65, KJs:0.3, QJs:0.15, A5s:0.65, A4s:0.45, A3s:0.2, AQo:0.55, AJo:0.1, KQo:0.1, 76s:0.1, 65s:0.1",
    "JJ:0.2, TT:0.3, 99:0.3, 88:0.25, 77:0.2",
    ["The small blind is out of position against everyone, so 3-bet or fold is the default.", "A few pairs call to hit a set, but the big blind can still squeeze."],
  ),
  vo(
    "SB",
    "HJ",
    "QQ+, AKs, AKo, JJ:0.9, TT:0.6, 99:0.3, 88:0.15, AQs, AJs:0.7, ATs:0.4, A9s:0.1, KQs:0.75, KJs:0.45, KTs:0.25, QJs:0.3, QTs:0.1, JTs:0.2, A5s:0.8, A4s:0.6, A3s:0.3, A2s:0.15, AQo:0.75, AJo:0.3, KQo:0.3, 76s:0.15, 65s:0.15, 54s:0.1",
    "JJ:0.1, TT:0.2, 99:0.3, 88:0.3, 77:0.25, 66:0.2",
    ["3-bet or fold, and size up to about 4.5x the open since you're out of position."],
  ),
  vo(
    "SB",
    "CO",
    "TT+, 99:0.6, 88:0.35, 77:0.2, AJs+, ATs:0.7, A9s:0.35, A8s:0.2, KQs, KJs:0.75, KTs:0.5, K9s:0.2, QJs:0.6, QTs:0.4, JTs:0.45, T9s:0.2, A5s-A4s, A3s:0.6, A2s:0.4, AQo+, AJo:0.6, ATo:0.25, KQo:0.6, KJo:0.25, 98s:0.15, 87s:0.15, 76s:0.2, 65s:0.2, 54s:0.15",
    "99:0.2, 88:0.3, 77:0.3, 66:0.3, 55:0.2",
    ["The cutoff opens about 29%, so you 3-bet about 13%."],
  ),
  vo(
    "SB",
    "BTN",
    "88+, 77:0.7, 66:0.5, 55:0.35, 44:0.2, A9s+, A8s:0.7, A7s:0.5, A6s:0.4, A5s-A2s, KTs+, K9s:0.6, K8s:0.35, K7s:0.2, QTs+, Q9s:0.5, Q8s:0.2, JTs, J9s:0.5, T9s:0.6, T8s:0.3, 98s:0.4, 87s:0.35, 76s:0.35, 65s:0.35, 54s:0.3, ATo+, A9o:0.4, A8o:0.2, A5o:0.2, KJo+, KTo:0.5, QJo:0.5, QTo:0.2, JTo:0.25",
    "77:0.2, 66:0.3, 55:0.35, 44:0.4, 33:0.3, 22:0.3",
    ["The button opens about 45%, so you 3-bet about 18%, with lots of suited aces, broadways and suited connectors.", "Calling is rare, since the big blind could squeeze or see a cheap flop with position on you."],
  ),
  vo(
    "BB",
    "LJ",
    "QQ+, AKs, AKo:0.8, JJ:0.4, AQs:0.5, AJs:0.15, KQs:0.3, A5s:0.5, A4s:0.35, A3s:0.15, K9s:0.1, 76s:0.1, 65s:0.1, 54s:0.1",
    "AKo:0.2, JJ:0.6, TT-22, AQs:0.5, AJs:0.85, ATs-A6s, A5s:0.5, A4s:0.65, A3s:0.85, A2s, KQs:0.7, KJs-KTs, K9s:0.9, K8s-K7s, K6s:0.6, K5s:0.4, K4s:0.4, K3s:0.2, QJs-Q8s, Q7s:0.5, Q6s:0.3, JTs-J8s, J7s:0.5, T9s, T8s, T7s:0.6, 98s, 97s:0.8, 96s:0.4, 87s, 86s:0.6, 85s:0.2, 76s:0.9, 75s:0.7, 65s:0.9, 64s:0.5, 54s:0.9, 53s:0.4, 43s:0.3, AQo, AJo, ATo:0.8, A9o:0.2, KQo, KJo:0.8, KTo:0.4, QJo:0.7, QTo:0.3, JTo:0.4, T9o:0.2, 98o:0.1",
    ["You get a great price, about 3.5 to 1, but UTG's range is strong, so most offsuit hands fold.", "Suited hands defend much wider than offsuit ones because they play better out of position."],
  ),
  vo(
    "BB",
    "HJ",
    "QQ+, AKs, AKo:0.85, JJ:0.5, TT:0.15, AQs:0.55, AJs:0.25, ATs:0.1, KQs:0.4, KJs:0.15, A5s:0.6, A4s:0.45, A3s:0.25, A2s:0.1, AQo:0.2, K9s:0.15, Q9s:0.1, J9s:0.1, T8s:0.1, 97s:0.1, 86s:0.1, 76s:0.15, 65s:0.15, 54s:0.15",
    "AKo:0.15, JJ:0.5, TT:0.85, 99-22, AQs:0.45, AJs:0.75, ATs:0.9, A9s-A6s, A5s:0.4, A4s:0.55, A3s:0.75, A2s:0.9, KQs:0.6, KJs:0.85, KTs, K9s:0.85, K8s-K6s, K5s:0.7, K4s:0.5, K3s:0.3, K2s:0.2, QJs-QTs, Q9s:0.9, Q8s, Q7s:0.6, Q6s:0.4, Q5s:0.2, JTs, J9s:0.9, J8s, J7s:0.6, T9s, T8s:0.9, T7s:0.6, 98s, 97s:0.9, 96s:0.5, 87s, 86s:0.9, 85s:0.3, 76s:0.85, 75s:0.7, 65s:0.85, 64s:0.5, 54s:0.85, 53s:0.4, 43s:0.3, AQo:0.8, AJo, ATo, A9o:0.5, A8o:0.2, KQo, KJo, KTo:0.6, K9o:0.1, QJo:0.9, QTo:0.5, JTo:0.6, T9o:0.3, 98o:0.15",
    ["You defend about 33%. Your 3-bets are premium hands plus some suited aces and connectors."],
  ),
  vo(
    "BB",
    "CO",
    "QQ+, AKs, AKo, JJ:0.6, TT:0.3, 99:0.1, AQs:0.7, AJs:0.4, ATs:0.2, KQs:0.55, KJs:0.3, KTs:0.15, QJs:0.2, A5s:0.7, A4s:0.55, A3s:0.35, A2s:0.2, AQo:0.35, AJo:0.1, KQo:0.15, K8s:0.1, K7s:0.1, Q9s:0.15, J9s:0.15, T9s:0.1, T8s:0.15, 97s:0.15, 86s:0.15, 76s:0.2, 75s:0.1, 65s:0.2, 54s:0.2",
    "JJ:0.4, TT:0.7, 99:0.9, 88-22, AQs:0.3, AJs:0.6, ATs:0.8, A9s-A6s, A5s:0.3, A4s:0.45, A3s:0.65, A2s:0.8, KQs:0.45, KJs:0.7, KTs:0.85, K9s, K8s:0.9, K7s:0.9, K6s-K2s, QJs:0.8, QTs, Q9s:0.85, Q8s-Q3s, Q2s:0.5, JTs, J9s:0.85, J8s-J5s, J4s:0.5, T9s:0.9, T8s:0.85, T7s-T6s, T5s:0.5, 98s, 97s:0.85, 96s, 95s:0.4, 87s, 86s:0.85, 85s, 84s:0.3, 76s:0.8, 75s:0.9, 74s:0.6, 65s:0.8, 64s, 63s:0.5, 54s:0.8, 53s, 52s:0.3, 43s:0.6, 42s:0.2, 32s:0.2, AQo:0.65, AJo:0.9, ATo, A9o:0.9, A8o:0.7, A7o:0.5, A6o:0.3, A5o:0.5, A4o:0.3, KQo:0.85, KJo, KTo:0.9, K9o:0.6, K8o:0.2, QJo, QTo:0.9, Q9o:0.4, JTo:0.9, J9o:0.4, T9o:0.6, T8o:0.2, 98o:0.3, 87o:0.15",
    ["You defend about 48%. Nearly every suited hand plays, and offsuit hands need big cards or connectors."],
  ),
  vo(
    "BB",
    "BTN",
    "JJ+, TT:0.8, 99:0.4, 88:0.2, AQs+, AJs:0.6, ATs:0.4, A9s:0.2, KQs:0.7, KJs:0.5, KTs:0.35, K9s:0.2, QJs:0.4, QTs:0.3, JTs:0.3, A5s:0.8, A4s:0.7, A3s:0.5, A2s:0.4, AKo, AQo:0.6, AJo:0.35, ATo:0.15, KQo:0.4, KJo:0.2, K5s:0.2, K4s:0.2, Q8s:0.2, J8s:0.2, T8s:0.25, 97s:0.25, 86s:0.25, 75s:0.2, 64s:0.2, 53s:0.15, 98s:0.15, 87s:0.15, 76s:0.2, 65s:0.25, 54s:0.25",
    "TT:0.2, 99:0.6, 88:0.8, 77-22, AJs:0.4, ATs:0.6, A9s:0.8, A8s-A6s, A5s:0.2, A4s:0.3, A3s:0.5, A2s:0.6, KQs:0.3, KJs:0.5, KTs:0.65, K9s:0.8, K8s-K6s, K5s:0.8, K4s:0.8, K3s-K2s, QJs:0.6, QTs:0.7, Q9s, Q8s:0.8, Q7s-Q2s, JTs:0.7, J9s, J8s:0.8, J7s-J3s, T9s, T8s:0.75, T7s-T4s, 98s:0.85, 97s:0.75, 96s-94s, 87s:0.85, 86s:0.75, 85s-84s, 76s:0.8, 75s:0.8, 74s-73s, 65s:0.75, 64s:0.8, 63s, 54s:0.75, 53s:0.85, 52s, 43s, 42s:0.5, 32s:0.5, AQo:0.4, AJo:0.65, ATo:0.85, A9o-A8o, A7o-A5o:0.9, A4o-A2o:0.5, KQo:0.6, KJo:0.8, KTo-K9o, K8o-K7o:0.7, K6o-K5o:0.5, QJo, QTo, Q9o:0.9, Q8o:0.7, Q7o:0.5, JTo, J9o, J8o:0.7, J7o:0.6, T9o, T8o:0.7, T7o:0.6, 98o:0.8, 97o:0.6, 87o:0.7, 86o:0.4, 76o:0.6, 65o:0.5, 54o:0.3",
    [
      "The widest defense in poker, about 57% of hands. You 3-bet about 12% and call about 45%.",
      "You only need about 27% equity to call a 2.5x open, and nobody acts after you.",
      "3-bet value hands like JJ+, AK and AQ, plus suited hands that play well when called.",
    ],
  ),
  vo(
    "BB",
    "SB",
    "99+, 88:0.5, AJs+, ATs:0.6, KQs:0.8, KJs:0.5, A5s:0.6, A4s:0.5, A3s:0.3, AKo, AQo:0.7, AJo:0.35, KQo:0.4, K9s:0.2, Q9s:0.2, J9s:0.2, T9s:0.25, 98s:0.2, 87s:0.2, 76s:0.2, 65s:0.2, 54s:0.2, K8s:0.15, Q8s:0.15, KTo:0.15, QJo:0.2, JTo:0.15",
    "88:0.5, 77-22, KQs:0.2, ATs:0.4, A9s-A6s, A5s:0.4, A4s:0.5, A3s:0.7, A2s, KJs:0.5, KTs, K9s:0.8, K8s:0.85, K7s-K2s, QJs-QTs, Q9s:0.8, Q8s:0.85, Q7s-Q3s, JTs, J9s:0.8, J8s-J5s, T9s:0.75, T8s-T6s, 98s:0.8, 97s-96s, 87s:0.8, 86s-85s, 76s:0.8, 75s, 74s:0.6, 65s:0.8, 64s, 63s:0.4, 54s:0.8, 53s, 43s:0.7, AQo:0.3, AJo:0.65, ATo-A2o, KQo:0.6, KJo, KTo:0.85, K9o-K7o, K6o:0.5, QJo:0.8, QTo, Q9o, Q8o:0.6, JTo:0.85, J9o, J8o:0.5, T9o, T8o:0.6, 98o, 97o:0.3, 87o:0.6, 76o:0.3",
    ["You act after the small blind for the whole hand, so defend very wide.", "3-bet more of your good hands for value, since the small blind's range is wide and weak."],
  ),

  /* 9-max: facing early-position opens */
  vo(
    "IP",
    "EP",
    "QQ+, AKs, AKo:0.7, JJ:0.2, AQs:0.3, A5s:0.3, KQs:0.15",
    "JJ:0.8, TT-77, 66-22:0.5, AKo:0.3, AQs:0.7, AJs:0.7, ATs:0.4, KQs:0.7, KJs:0.4, QJs:0.4, JTs:0.5, T9s:0.3, 98s:0.2, AQo:0.35",
    ["Early opens at a full table are only 11 to 16% of hands, so tighten up a lot.", "Call with small pairs to hit sets when stacks are deep enough, which they usually are live."],
    "9max",
  ),
  vo(
    "SB",
    "EP",
    "QQ+, AKs, AKo:0.8, JJ:0.4, AQs:0.4, A5s:0.3, KQs:0.2",
    "JJ:0.4, TT-88:0.6, 77-66:0.3, AQs:0.4, AJs:0.3, KQs:0.3",
    ["You're out of position against a strong range, so play very tight."],
    "9max",
  ),
  vo(
    "BB",
    "EP",
    "QQ+, AKs, AKo:0.7, JJ:0.25, AQs:0.3, A5s:0.35, A4s:0.2",
    "JJ:0.75, TT-22, AKo:0.3, AQs:0.7, AJs-A6s, A5s:0.65, A4s:0.8, A3s-A2s, KQs-K9s, QJs-Q9s, JTs-J9s, T9s-T8s, 98s-97s, 87s, 76s, 65s, 54s, AQo, AJo:0.7, KQo:0.8, KJo:0.3, QJo:0.2",
    ["You get a good price, but early ranges crush weak offsuit hands. Defend with suited hands and pairs."],
    "9max",
  ),

  /* --------------------------- vs 3-bet --------------------------- */
  v3(
    "v3_LJ_OOP",
    "LJ",
    "IP 3-bettor",
    "UTG open vs a 3-bet from a later seat",
    "KK+, AKs, AKo:0.6, QQ:0.4, A5s:0.4, A4s:0.2, AQs:0.1",
    "QQ:0.6, JJ-99, 88:0.6, 77:0.4, AKo:0.4, AQs:0.9, AJs:0.8, ATs:0.5, KQs:0.8, KJs:0.4, QJs:0.4, JTs:0.5, T9s:0.3, A5s:0.4, AQo:0.3",
    ["A later seat 3-bet you and will act after you. Keep going with about 45% of your opens.", "4-bet KK+ and AK, plus A5s and A4s as bluffs that block AA and AK."],
  ),
  v3(
    "v3_LJ_IP",
    "LJ",
    "Blinds",
    "UTG open vs a 3-bet from the blinds",
    "KK+, AKs, AKo:0.5, QQ:0.35, A5s:0.35, A4s:0.2",
    "QQ:0.65, JJ-88, 77:0.6, 66:0.4, AKo:0.5, AQs, AJs:0.9, ATs:0.7, KQs:0.9, KJs:0.6, KTs:0.3, QJs:0.6, QTs:0.3, JTs:0.7, T9s:0.5, 98s:0.3, A5s:0.5, A4s:0.4, AQo:0.5",
    ["You'll act last, so you can call more. Suited broadways and pairs play well here."],
  ),
  v3(
    "v3_HJ_OOP",
    "HJ",
    "IP 3-bettor",
    "Hijack open vs a 3-bet from a later seat",
    "KK+, AKs, AKo:0.65, QQ:0.45, AQs:0.15, A5s:0.45, A4s:0.3, A3s:0.1",
    "QQ:0.55, JJ-88, 77:0.5, 66:0.3, AKo:0.35, AQs:0.85, AJs:0.85, ATs:0.6, KQs:0.85, KJs:0.5, KTs:0.2, QJs:0.5, JTs:0.55, T9s:0.4, 98s:0.2, A5s:0.4, A4s:0.3, AQo:0.4",
    ["Keep going with about 42% of your hijack opens. Most offsuit hands fold."],
  ),
  v3(
    "v3_HJ_IP",
    "HJ",
    "Blinds",
    "Hijack open vs a 3-bet from the blinds",
    "KK+, AKs, AKo:0.55, QQ:0.4, A5s:0.4, A4s:0.25, A3s:0.1",
    "QQ:0.6, JJ-77, 66:0.6, 55:0.4, AKo:0.45, AQs, AJs, ATs:0.8, A9s:0.3, KQs, KJs:0.75, KTs:0.5, QJs:0.75, QTs:0.4, JTs:0.8, J9s:0.2, T9s:0.6, 98s:0.4, 87s:0.3, 76s:0.2, A5s:0.5, A4s:0.4, AQo:0.6, AJo:0.2, KQo:0.3",
    ["With position you can call with suited connectors and more pairs."],
  ),
  v3(
    "v3_CO_OOP",
    "CO",
    "BTN",
    "Cutoff open vs a button 3-bet",
    "KK+, AKs, AKo:0.7, QQ:0.5, JJ:0.15, AQs:0.25, A5s:0.5, A4s:0.4, A3s:0.2, K9s:0.1, AJo:0.05",
    "QQ:0.5, JJ:0.85, TT-77, 66:0.6, 55:0.4, AKo:0.3, AQs:0.75, AJs:0.9, ATs:0.8, A9s:0.3, KQs:0.9, KJs:0.7, KTs:0.4, QJs:0.7, QTs:0.3, JTs:0.7, T9s:0.5, 98s:0.3, 87s:0.2, A5s:0.4, A4s:0.3, AQo:0.6, KQo:0.2",
    ["The button 3-bets you wide, about 11%, so you defend wider than you would from UTG."],
  ),
  v3(
    "v3_CO_IP",
    "CO",
    "Blinds",
    "Cutoff open vs a 3-bet from the blinds",
    "KK+, AKs, AKo:0.6, QQ:0.45, JJ:0.1, A5s:0.45, A4s:0.35, A3s:0.15, AQs:0.15",
    "QQ:0.55, JJ:0.9, TT-66, 55:0.6, 44:0.4, AKo:0.4, AQs:0.85, AJs, ATs, A9s:0.5, A8s:0.2, KQs, KJs:0.9, KTs:0.7, K9s:0.3, QJs:0.9, QTs:0.6, Q9s:0.2, JTs:0.9, J9s:0.4, T9s:0.8, T8s:0.3, 98s:0.6, 87s:0.5, 76s:0.4, 65s:0.3, A5s:0.55, A4s:0.5, A3s:0.3, AQo:0.75, AJo:0.35, KQo:0.5, KJo:0.15",
    ["Blind 3-bets are bigger, about 11bb, and you'll have position. Keep going about half the time."],
  ),
  v3(
    "v3_BTN_IP",
    "BTN",
    "Blinds",
    "Button open vs a 3-bet from the blinds",
    "KK+, AKs, AKo:0.6, QQ:0.5, JJ:0.2, AQs:0.2, A5s:0.5, A4s:0.4, A3s:0.25, A2s:0.1, K9s:0.1, K8s:0.1, Q9s:0.05, AJo:0.1, ATo:0.05",
    "QQ:0.5, JJ:0.8, TT-55, 44:0.7, 33:0.5, 22:0.4, AKo:0.4, AQs:0.8, AJs, ATs, A9s:0.8, A8s:0.6, A7s:0.4, A6s:0.3, A5s:0.5, A4s:0.5, A3s:0.4, A2s:0.3, KQs, KJs, KTs:0.9, K9s:0.6, K8s:0.3, K7s:0.3, K6s:0.2, QJs, QTs:0.85, Q9s:0.5, Q8s:0.3, JTs:0.9, J9s:0.6, J8s:0.3, T9s:0.85, T8s:0.5, T7s:0.2, 98s:0.75, 97s:0.3, 96s:0.2, 87s:0.7, 86s:0.3, 76s:0.6, 75s:0.3, 65s:0.5, 64s:0.2, 54s:0.4, 53s:0.2, AQo:0.85, AJo:0.6, ATo:0.3, A9o:0.2, KQo:0.7, KJo:0.4, KTo:0.3, QJo:0.3, QTo:0.2, JTo:0.3",
    ["The blinds 3-bet the button wide, so you defend about 45% of your opens, mostly by calling."],
  ),
  v3(
    "v3_SB_OOP",
    "SB",
    "BB",
    "Small blind open vs a big blind 3-bet",
    "KK+, AKs, AKo:0.7, QQ:0.55, JJ:0.2, AQs:0.3, A5s:0.5, A4s:0.4, A3s:0.3, K9s:0.1, K8s:0.1, AJo:0.1",
    "QQ:0.45, JJ:0.8, TT-55, 44:0.6, 33:0.4, AKo:0.3, AQs:0.7, AJs, ATs:0.9, A9s:0.6, A8s:0.4, A5s:0.4, A4s:0.4, KQs:0.9, KJs:0.8, KTs:0.6, K9s:0.3, QJs:0.8, QTs:0.5, JTs:0.8, J9s:0.3, T9s:0.6, 98s:0.4, 87s:0.3, 76s:0.3, 65s:0.2, AQo:0.7, AJo:0.45, KQo:0.5, KJo:0.15",
    ["Blind against blind 3-bets are wide, so defend about 40% of your opens even out of position."],
  ),
  v3(
    "v3_EP",
    "EP",
    "Any",
    "Early open vs a 3-bet (full ring)",
    "KK+, AKs, AKo:0.5, QQ:0.3, A5s:0.25",
    "QQ:0.7, JJ-99, 88:0.5, 77:0.3, AKo:0.5, AQs:0.8, AJs:0.5, KQs:0.6, KJs:0.2, QJs:0.2, JTs:0.3, A5s:0.3, AQo:0.2",
    ["Your range is already strong, so keep going about half the time and rarely 4-bet bluff."],
    "9max",
  ),

  /* --------------------------- vs 4-bet --------------------------- */
  {
    id: "v4_IP",
    title: "Your 3-bet vs a 4-bet, in position",
    short: "In position",
    kind: "vs4bet",
    format: "both",
    source: "solver",
    hero: "3-bettor",
    villain: "Opener",
    actions: ["allin", "call", "fold"],
    labels: V4_LABELS,
    ranges: {
      allin: "KK+, AKs:0.7, AKo:0.5, QQ:0.25, A5s:0.15",
      call: "QQ:0.75, JJ:0.8, TT:0.4, AKs:0.3, AKo:0.4, AQs:0.6, AJs:0.2, KQs:0.3, A5s:0.2, 99:0.15",
    },
    rest: "fold",
    notes: ["A 4-bet puts about a quarter of your stack in. Get it in with KK+ and AK, call with QQ to TT and AQs, and fold your 3-bet bluffs."],
  },
  {
    id: "v4_OOP",
    title: "Your 3-bet vs a 4-bet, out of position",
    short: "Out of position",
    kind: "vs4bet",
    format: "both",
    source: "solver",
    hero: "3-bettor",
    villain: "Opener",
    actions: ["allin", "call", "fold"],
    labels: V4_LABELS,
    ranges: {
      allin: "KK+, AKs:0.75, AKo:0.6, QQ:0.35, A5s:0.2, A4s:0.1",
      call: "QQ:0.65, JJ:0.7, TT:0.3, AKs:0.25, AKo:0.3, AQs:0.5, AJs:0.15, KQs:0.2, A5s:0.15",
    },
    rest: "fold",
    notes: ["Calling a 4-bet out of position is worse, so you go all-in a bit more and call less."],
  },

  /* ------------------------ Live: vs limpers ------------------------ */
  {
    id: "vl_EARLY_1",
    title: "One limper, early or middle seat",
    short: "Early seat, 1 limper",
    kind: "vsLimp",
    format: "both",
    source: "live",
    hero: "EP-HJ",
    villain: "1 limper",
    actions: ["raise", "call", "fold"],
    labels: { raise: "Iso-raise", call: "Over-limp", fold: "Fold" },
    ranges: {
      raise: "88+, ATs+, A5s:0.5, KJs+, QJs:0.5, AQo+, KQo:0.5, AJo:0.3",
      call: "77-22, A9s-A2s, A5s:0.5, KTs, QTs, QJs:0.5, JTs, T9s, 98s, 87s, 76s, 65s",
    },
    rest: "fold",
    notes: [
      "Raise strong hands so you play the weak limper heads-up.",
      "Limp behind with small pairs and suited connectors. They want cheap flops with lots of players.",
      "Offsuit hands like KJo and ATo play badly against several players, so fold them.",
    ],
  },
  {
    id: "vl_LATE_1",
    title: "One limper, cutoff or button",
    short: "Late seat, 1 limper",
    kind: "vsLimp",
    format: "both",
    source: "live",
    hero: "CO-BTN",
    villain: "1 limper",
    actions: ["raise", "call", "fold"],
    labels: { raise: "Iso-raise", call: "Over-limp", fold: "Fold" },
    ranges: {
      raise: "77+, A8s+, A5s-A4s, KTs+, QTs+, JTs, ATo+, KJo+, QJo:0.5, T9s:0.5, 98s:0.3",
      call: "66-22, A7s-A6s, A3s-A2s, K9s-K8s, Q9s, J9s, T8s, 97s, 87s, 76s, 65s, 54s, T9s:0.5, 98s:0.7, KTo:0.3, QJo:0.3",
    },
    rest: "fold",
    notes: [
      "With position you can raise wider, since you'll often play heads-up against a weak range.",
      "Raise to 4 or 5 big blinds plus 1 for each limper. At $1/$2 a lot of good players make it $15 plus $5 per limper.",
    ],
  },
  {
    id: "vl_MULTI",
    title: "Two or more limpers",
    short: "2+ limpers",
    kind: "vsLimp",
    format: "both",
    source: "live",
    hero: "Any non-blind",
    villain: "2+ limpers",
    actions: ["raise", "call", "fold"],
    labels: { raise: "Iso-raise", call: "Over-limp", fold: "Fold" },
    ranges: {
      raise: "99+, AJs+, KQs, AQo+",
      call: "88-22, ATs-A2s, KJs-K9s, QJs-Q9s, JTs-J9s, T9s-T8s, 98s-97s, 87s, 76s, 65s, 54s, KQo:0.5, AJo:0.3",
    },
    rest: "fold",
    notes: [
      "With several limpers your raise often gets called by more than one player, so only raise for value and size up.",
      "Hands that make the nuts, like sets and nut flushes, love big multiway pots. Hands that make one pair don't.",
    ],
  },
  {
    id: "vl_SB",
    title: "Small blind facing limpers",
    short: "SB vs limpers",
    kind: "vsLimp",
    format: "both",
    source: "live",
    hero: "SB",
    villain: "Limpers",
    actions: ["raise", "call", "fold"],
    labels: { raise: "Raise", call: "Complete", fold: "Fold" },
    ranges: {
      raise: "TT+, AJs+, KQs, AQo+",
      call: "99-22, ATs-A2s, KJs-K2s, Q5s+, J7s+, T7s+, 97s+, 86s+, 75s+, 64s+, 54s, AJo-A8o, KJo-KTo, QJo, JTo, QTo:0.5",
    },
    rest: "fold",
    notes: [
      "Completing costs half a blind with several players in, so the price is great.",
      "Only raise strong hands, since you'll be out of position against several players.",
    ],
  },
  {
    id: "vl_BB",
    title: "Big blind facing limpers",
    short: "BB vs limpers",
    kind: "vsLimp",
    format: "both",
    source: "live",
    hero: "BB",
    villain: "Limpers",
    actions: ["raise", "check"],
    labels: { raise: "Raise", check: "Check" },
    ranges: {
      raise: "TT+, AQs+, AKo, AQo:0.7, KQs:0.5, AJs:0.5, A5s:0.3",
    },
    rest: "check",
    notes: [
      "Checking is free, so you never fold.",
      "Raise big with value hands, about 5 or 6 big blinds plus 1 for each limper. Limpers call too much, so don't bluff.",
    ],
  },
];

export const CHARTS: Record<string, Chart> = Object.fromEntries(DEFS.map((d) => [d.id, buildChart(d)]));

export const chartList = (): Chart[] => DEFS.map((d) => CHARTS[d.id]);

const EARLY: PosId[] = ["EP1", "EP2", "EP3"];

export function rfiChart(pos: PosId): Chart | undefined {
  return CHARTS[`rfi_${pos}`];
}

export function vsOpenChart(hero: PosId, opener: PosId): Chart | undefined {
  if (EARLY.includes(opener)) {
    if (hero === "SB") return CHARTS.vo_SB_EP;
    if (hero === "BB") return CHARTS.vo_BB_EP;
    return CHARTS.vo_IP_EP;
  }
  const direct = CHARTS[`vo_${hero}_${opener}`];
  if (direct) return direct;
  // Full-ring seats facing an LJ+ open fall back to the nearest 6-max seat.
  if (EARLY.includes(hero)) return CHARTS.vo_IP_EP;
  return undefined;
}

export function vs3betChart(opener: PosId, threeBettor: PosId): Chart | undefined {
  if (EARLY.includes(opener)) return CHARTS.v3_EP;
  if (opener === "SB") return CHARTS.v3_SB_OOP;
  const heroIP = isInPositionOn(opener, threeBettor);
  if (opener === "BTN") return CHARTS.v3_BTN_IP;
  return CHARTS[`v3_${opener}_${heroIP ? "IP" : "OOP"}`];
}

export function vs4betChart(hero: PosId, opener: PosId): Chart {
  return isInPositionOn(hero, opener) ? CHARTS.v4_IP : CHARTS.v4_OOP;
}

export function vsLimpChart(hero: PosId, limpers: number): Chart {
  if (hero === "BB") return CHARTS.vl_BB;
  if (hero === "SB") return CHARTS.vl_SB;
  if (limpers >= 2) return CHARTS.vl_MULTI;
  if (hero === "CO" || hero === "BTN") return CHARTS.vl_LATE_1;
  return CHARTS.vl_EARLY_1;
}

export const ACTION_COLORS: Record<PfAction, string> = {
  raise: "#ef4444",
  call: "#22c55e",
  fold: "#3b4a5c",
  check: "#14b8a6",
  allin: "#a855f7",
};
