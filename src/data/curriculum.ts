import type { VisualKey } from "../components/visuals";

export interface LessonSection {
  title: string;
  body: string;
  visual?: VisualKey;
  more?: string;
}

export interface QuizQ {
  q: string;
  options: string[];
  answer: number;
  explain: string;
}

export interface Drill {
  label: string;
  url: string;
  target: number;
  acc: number;
}

export interface Day {
  day: number;
  phase: number;
  title: string;
  goal: string;
  sections: LessonSection[];
  quiz: QuizQ[];
  drill?: Drill;
  boss?: boolean;
  legend?: string;
}

export const PHASES = [
  { id: 1, name: "Foundations", belt: "yellow" },
  { id: 2, name: "Facing opens", belt: "orange" },
  { id: 3, name: "Re-raised pots & live play", belt: "green" },
  { id: 4, name: "The flop", belt: "blue" },
  { id: 5, name: "Turn & river", belt: "brown" },
  { id: 6, name: "Exploits & mastery", belt: "black" },
];

const pre = (kinds: string, pos: string | null, day: number, target: number, acc: number, extra = "") =>
  `/preflop?kinds=${kinds}${pos ? `&pos=${pos}` : ""}&day=${day}&target=${target}&acc=${acc}${extra}`;
const post = (day: number, target: number, acc: number, extra = "") => `/postflop?day=${day}&target=${target}&acc=${acc}${extra}`;
const math = (drill: string, day: number) => `/math?drill=${drill}&day=${day}`;

export const DAYS: Day[] = [
  {
    day: 1,
    phase: 1,
    title: "Position is power",
    goal: "Know every seat and why the button wins most.",
    legend: "sexton",
    sections: [
      { title: "One order, every hand", body: "Preflop, action starts left of the big blind. After the flop, the blinds act first and the button acts last.", visual: "seats", more: "Full-ring tables add UTG, UTG+1 and UTG+2 before the lojack." },
      { title: "Acting last wins", body: "The last player to act sees every move first. That's why the button is the most profitable seat.", more: "Out of position you capture roughly 70–85% of your equity. In position, all of it." },
      { title: "Wider toward the button", body: "Fewer players behind you means more hands you can open.", visual: "openWidths" },
    ],
    quiz: [
      { q: "Who acts last after the flop?", options: ["Big blind", "Button", "Cutoff"], answer: 1, explain: "The button acts last on every postflop street." },
      { q: "Which seat opens the most hands?", options: ["UTG", "Cutoff", "Button"], answer: 2, explain: "Only the blinds are left, and you'll have position." },
      { q: "Why do early seats open tighter?", options: ["More players left to act", "Bigger blinds", "They always have position"], answer: 0, explain: "More players behind means someone often has a big hand." },
    ],
    drill: { label: "Open from UTG and the button", url: pre("rfi", "LJ,BTN", 1, 20, 70, "&table=6"), target: 20, acc: 0.7 },
  },
  {
    day: 2,
    phase: 1,
    title: "Hands, combos and blockers",
    goal: "Count combinations — the root of range thinking.",
    legend: "brunson",
    sections: [
      { title: "Count combos, not hands", body: "Every pair has 6 combos, every suited hand 4, every offsuit hand 12.", visual: "combos", more: "So AKo shows up three times as often as AKs." },
      { title: "Blockers", body: "Cards you hold can't be in their hand. One ace cuts their AA combos in half.", visual: "blockers" },
    ],
    quiz: [
      { q: "How many AKo combos are there?", options: ["4", "12", "16"], answer: 1, explain: "4 aces × 3 off-suit kings = 12." },
      { q: "You hold an ace. How many AA combos can they have?", options: ["6", "3", "1"], answer: 1, explain: "Three aces left: 3 combos." },
      { q: "How many combos does one pocket pair have?", options: ["4", "6", "12"], answer: 1, explain: "Pick 2 of 4 suits: 6." },
    ],
    drill: { label: "Combo counting sprint", url: math("combos", 2), target: 10, acc: 0.8 },
  },
  {
    day: 3,
    phase: 1,
    title: "Early position discipline",
    goal: "Open a tight, strong range from UTG.",
    legend: "harrington",
    sections: [
      { title: "Tight from early seats", body: "With five or more players behind, open only strong hands: good pairs, suited aces and big broadways.", visual: "chart:rfi_LJ" },
      { title: "Suited beats offsuit", body: "Suited hands make flushes and draws. Offsuit hands with weak kickers mostly make second-best pairs.", more: "At a full-ring table, UTG opens only about 11% of hands." },
    ],
    quiz: [
      { q: "Standard fold from UTG (6-max)?", options: ["A5s", "KQo", "A9o"], answer: 2, explain: "A9o is dominated too often from early position." },
      { q: "Why is full-ring UTG even tighter?", options: ["More players behind", "Smaller blinds", "More rake"], answer: 0, explain: "Eight players left to act instead of five." },
      { q: "Early ranges are…", options: ["Polarized", "Linear", "Capped"], answer: 1, explain: "The best hands in order, down to a cutoff." },
    ],
    drill: { label: "Early-position opens", url: pre("rfi", "EP1,EP2,EP3,LJ", 3, 20, 75, "&table=9"), target: 20, acc: 0.75 },
  },
  {
    day: 4,
    phase: 1,
    title: "Steal from late position",
    goal: "Open wide from the cutoff and button.",
    legend: "brunson",
    sections: [
      { title: "The steal math", body: "Raising 2.5bb to win 1.5bb needs everyone to fold 62.5% of the time. From the button, they usually do.", more: "Break-even fold rate = what you risk ÷ (risk + pot)." },
      { title: "The button opens ~45%", body: "Every pair, every suited ace and king, most suited hands, and offsuit hands down to about K8o.", visual: "chart:rfi_BTN" },
    ],
    quiz: [
      { q: "2.5bb into a 1.5bb pot: break-even fold rate?", options: ["37.5%", "50%", "62.5%"], answer: 2, explain: "2.5 ÷ (2.5 + 1.5) = 62.5%." },
      { q: "Roughly how often does the button open?", options: ["25%", "45%", "70%"], answer: 1, explain: "About 43–46% at 100bb." },
      { q: "Which is a standard button open?", options: ["K8o", "72o", "J3o"], answer: 0, explain: "K8o sits near the bottom of the range." },
    ],
    drill: { label: "Cutoff and button opens", url: pre("rfi", "CO,BTN", 4, 25, 78), target: 25, acc: 0.78 },
  },
  {
    day: 5,
    phase: 1,
    title: "The small blind",
    goal: "Play the hardest seat with one simple rule.",
    legend: "harrington",
    sections: [
      { title: "Raise or fold", body: "When it folds to you, raise to 3bb with about 45% of hands. Don't limp.", visual: "chart:rfi_SB" },
      { title: "3-bet or fold vs opens", body: "Calling in the small blind invites a squeeze and plays out of position. Re-raise or let it go." },
    ],
    quiz: [
      { q: "Small blind, folded to you. The plan?", options: ["Limp everything", "Raise or fold", "Limp strong hands"], answer: 1, explain: "Raise-or-fold to about 3bb." },
      { q: "Why not flat a button open from the SB?", options: ["You're out of position and can get squeezed", "It's against the rules", "The button never folds"], answer: 0, explain: "The big blind acts behind you." },
      { q: "SB 3-bets should be…", options: ["Smaller", "The same", "Bigger than in position"], answer: 2, explain: "Out of position, size up to about 4–4.5×." },
    ],
    drill: { label: "Small blind spots", url: pre("rfi,vsOpen", "SB", 5, 20, 75), target: 20, acc: 0.75 },
  },
  {
    day: 6,
    phase: 1,
    title: "Pot odds",
    goal: "Turn any bet into the equity you need.",
    legend: "caro",
    sections: [
      { title: "The price of a call", body: "Equity needed = your call ÷ the total pot after you call.", visual: "potOdds", more: "⅓ pot → 20% · ½ pot → 25% · pot → 33% · 2× pot → 40%." },
      { title: "Implied odds", body: "When you hit, you often win more later. Draws and small pairs can call a slightly worse price." },
    ],
    quiz: [
      { q: "Facing a pot-sized bet, you need…", options: ["25%", "33%", "50%"], answer: 1, explain: "Call 1 to win 3: 33%." },
      { q: "Pot $80, bet $40. You need…", options: ["20%", "25%", "33%"], answer: 1, explain: "40 ÷ 160 = 25%." },
      { q: "Implied odds are…", options: ["Extra chips you win later when you hit", "The rake", "Your equity vs a random hand"], answer: 0, explain: "They let draws call slightly worse prices." },
    ],
    drill: { label: "Pot odds sprint", url: math("potodds", 6), target: 10, acc: 0.8 },
  },
  {
    day: 7,
    phase: 1,
    boss: true,
    title: "Yellow belt exam",
    goal: "Open correctly from every seat.",
    legend: "moneymaker",
    sections: [{ title: "Your first exam", body: "30 opening decisions from every seat. Score 80% to earn your yellow belt.", visual: "openWidths" }],
    quiz: [
      { q: "Is KTo usually an open from the cutoff?", options: ["Yes", "Never", "Only short-stacked"], answer: 0, explain: "KTo opens most of the time from the cutoff." },
      { q: "Full-ring UTG with 44?", options: ["Always open", "Sometimes", "Never"], answer: 1, explain: "Small pairs are a mix from UTG." },
      { q: "Which seat raises or folds vs only the big blind?", options: ["Button", "Small blind", "Hijack"], answer: 1, explain: "The small blind." },
    ],
    drill: { label: "Exam: 30 opens at 80%+", url: pre("rfi", null, 7, 30, 80), target: 30, acc: 0.8 },
  },
  {
    day: 8,
    phase: 2,
    title: "Big blind defense",
    goal: "Defend enough that stealing isn't free.",
    legend: "janda",
    sections: [
      { title: "The best price at the table", body: "Facing a 2.5bb open you need only about 27% equity. So the big blind defends about half its hands vs the button.", visual: "chart:vo_BB_BTN" },
      { title: "Suited defends, offsuit folds", body: "Out of position you won't capture all your equity. Suited and connected hands capture more." },
    ],
    quiz: [
      { q: "BB vs a 2.5bb button open needs about…", options: ["20%", "27%", "40%"], answer: 1, explain: "1.5 ÷ 5.5 ≈ 27%." },
      { q: "Which defends better out of position?", options: ["K5s", "K5o", "Same"], answer: 0, explain: "Suited hands make flushes and draws." },
      { q: "BB defense vs the button is roughly…", options: ["20%", "55%", "85%"], answer: 1, explain: "About 55% including 3-bets." },
    ],
    drill: { label: "Big blind defense", url: pre("vsOpen", "BB", 8, 25, 72), target: 25, acc: 0.72 },
  },
  {
    day: 9,
    phase: 2,
    title: "Defending vs early opens",
    goal: "Tighten up against strong ranges.",
    legend: "janda",
    sections: [
      { title: "Same price, stronger range", body: "Offsuit hands that defend vs the button fold vs UTG. Suited hands and pairs still defend.", visual: "chart:vo_BB_LJ" },
      { title: "3-bet big from the blinds", body: "Re-raise to about 4× the open with premiums and suited blockers like A5s." },
    ],
    quiz: [
      { q: "BB vs UTG: which defends?", options: ["K8o", "J8s", "Q7o"], answer: 1, explain: "Suited connectors still defend." },
      { q: "BB 3-bet size?", options: ["2×", "3×", "4–4.5×"], answer: 2, explain: "Out of position, size up." },
      { q: "Good BB 3-bet bluff?", options: ["A4s", "K9o", "63o"], answer: 0, explain: "Ace blocker plus flush and wheel potential." },
    ],
    drill: { label: "BB vs every seat", url: pre("vsOpen", "BB", 9, 25, 72), target: 25, acc: 0.72 },
  },
  {
    day: 10,
    phase: 2,
    title: "The 3-bet",
    goal: "Know what to re-raise and why.",
    legend: "tipton",
    sections: [
      { title: "Value plus a few bluffs", body: "3-bet hands that are ahead (QQ+, AK) plus bluffs with blockers (A5s–A4s).", visual: "chart:vo_BTN_CO" },
      { title: "Size it right", body: "About 3× the open in position, 4× from the blinds." },
    ],
    quiz: [
      { q: "Which is a 3-bet bluff?", options: ["KK", "A5s", "AK"], answer: 1, explain: "A5s blocks aces and plays well." },
      { q: "Strong hands + bluffs, no medium hands, is…", options: ["Linear", "Polarized", "Merged"], answer: 1, explain: "Polarized." },
      { q: "In-position 3-bet vs a 2.5bb open?", options: ["5bb", "7.5bb", "15bb"], answer: 1, explain: "About 3×." },
    ],
    drill: { label: "3-bet or call from late seats", url: pre("vsOpen", "CO,BTN", 10, 25, 70), target: 25, acc: 0.7 },
  },
  {
    day: 11,
    phase: 2,
    title: "Choosing bluffs",
    goal: "Bluff with hands that block their best.",
    legend: "tipton",
    sections: [
      { title: "Bluffs that block", body: "A5s holds an ace, so they have fewer AA and AK combos to fight back with.", visual: "blockers" },
      { title: "Bluffs that can hit", body: "Good bluffs still make strong hands when called: suited aces and suited connectors." },
    ],
    quiz: [
      { q: "You hold A♦4♦. Their AK combos?", options: ["16", "12", "8"], answer: 1, explain: "3 aces × 4 kings." },
      { q: "Best 3-bet bluff vs a cutoff open?", options: ["A3s", "Q6o", "94s"], answer: 0, explain: "Blocker plus playability." },
      { q: "Holding a king cuts their KK combos by…", options: ["25%", "50%", "100%"], answer: 1, explain: "6 → 3." },
    ],
    drill: { label: "Facing opens", url: pre("vsOpen", null, 11, 25, 70), target: 25, acc: 0.7 },
  },
  {
    day: 12,
    phase: 2,
    title: "Flat or 3-bet in position",
    goal: "Use position to call more.",
    legend: "galfond",
    sections: [
      { title: "Flat when you have position", body: "Acting last lets you call and keep weaker hands in. Pairs and suited broadways flat well.", visual: "chart:vo_BTN_HJ" },
      { title: "Beware the squeeze", body: "The more players left behind you, the fewer hands you should flat." },
    ],
    quiz: [
      { q: "Which seat can flat the most?", options: ["Hijack", "Button", "Small blind"], answer: 1, explain: "Only the blinds are behind it." },
      { q: "A squeeze is…", options: ["A 3-bet after an open and a call", "A limp-raise", "A small c-bet"], answer: 0, explain: "It punishes wide flats." },
      { q: "HJ vs a UTG open, default plan?", options: ["Flat a lot", "3-bet or fold", "Always 4-bet"], answer: 1, explain: "Four players behind, strong opener." },
    ],
    drill: { label: "HJ, CO and BTN vs opens", url: pre("vsOpen", "HJ,CO,BTN", 12, 25, 70), target: 25, acc: 0.7 },
  },
  {
    day: 13,
    phase: 2,
    title: "Blind vs blind",
    goal: "Win the small blind vs big blind battle.",
    legend: "janda",
    sections: [
      { title: "The small blind opens wide", body: "Only the big blind is left, so raise about 45% of hands.", visual: "chart:rfi_SB" },
      { title: "The big blind defends wider", body: "The big blind has position on the small blind, so it plays over half its hands.", visual: "chart:vo_BB_SB" },
    ],
    quiz: [
      { q: "SB vs BB: who has position after the flop?", options: ["Small blind", "Big blind"], answer: 1, explain: "The big blind acts last." },
      { q: "BB defense vs an SB open is…", options: ["Very wide", "Very tight", "Always a 3-bet"], answer: 0, explain: "Position plus a good price." },
      { q: "BB 3-bets vs the SB lean…", options: ["AA/KK only", "Linear value", "Only bluffs"], answer: 1, explain: "The SB range is wide and capped." },
    ],
    drill: { label: "Blind battles", url: pre("rfi,vsOpen", "SB,BB", 13, 25, 72), target: 25, acc: 0.72 },
  },
  {
    day: 14,
    phase: 2,
    boss: true,
    title: "Orange belt exam",
    goal: "Defend, flat and 3-bet from every seat.",
    legend: "straus",
    sections: [{ title: "Facing opens", body: "30 decisions against opens from every seat. Score 78% to earn your orange belt.", visual: "chart:vo_BB_BTN" }],
    quiz: [
      { q: "BB vs a button min-raise with J5s?", options: ["Fold", "Call", "4-bet"], answer: 1, explain: "Suited hands defend at this price." },
      { q: "SB vs a CO open with 76s?", options: ["Call", "Mostly fold", "Always 3-bet"], answer: 1, explain: "3-bet or fold, mostly fold." },
      { q: "BTN vs HJ open with AQo?", options: ["Fold", "Mix 3-bet and call", "Jam"], answer: 1, explain: "A mix in position." },
    ],
    drill: { label: "Exam: 30 hands at 78%+", url: pre("vsOpen", null, 14, 30, 78), target: 30, acc: 0.78 },
  },
  {
    day: 15,
    phase: 3,
    title: "Facing 3-bets",
    goal: "Defend your opens without over-folding.",
    legend: "straus",
    sections: [
      { title: "Don't over-fold", body: "Continue with 35–50% of your opens, more in position. Fold everything and they'll 3-bet any two cards.", visual: "chart:v3_BTN_IP" },
      { title: "Plan for a small pot-to-stack ratio", body: "After a 3-bet the pot is about 20bb with 90bb behind. Top pair often commits.", visual: "spr" },
    ],
    quiz: [
      { q: "Why not fold everything to 3-bets?", options: ["They'd 3-bet any two", "3-bets are always bluffs", "Less rake"], answer: 0, explain: "Over-folding gets exploited." },
      { q: "Opened the button, BB 3-bets. You're…", options: ["In position", "Out of position"], answer: 0, explain: "The blinds act first after the flop." },
      { q: "Stack-to-pot ratio in a 3-bet pot?", options: ["About 1", "About 4", "About 12"], answer: 1, explain: "20bb pot, 90bb behind." },
    ],
    drill: { label: "Facing 3-bets", url: pre("vs3bet", null, 15, 25, 70), target: 25, acc: 0.7 },
  },
  {
    day: 16,
    phase: 3,
    title: "4-bets and all-ins",
    goal: "Know when to get it in.",
    legend: "chen",
    sections: [
      { title: "Stack-off ranges", body: "4-bet KK+ and AK, plus a few A5s-type bluffs. Your other 3-bet bluffs fold to a 4-bet.", visual: "chart:v4_IP" },
      { title: "Live 4-bets are real", body: "At $1/$2 and $2/$5, an unknown player's 4-bet is almost always KK+ or AK." },
    ],
    quiz: [
      { q: "Typical 4-bet bluff?", options: ["A5s", "JTo", "22"], answer: 0, explain: "Ace blocker plus playability." },
      { q: "Facing a 4-bet with a pure bluff, you…", options: ["Fold", "Call", "Jam"], answer: 0, explain: "Let it go." },
      { q: "A live unknown's 4-bet is usually…", options: ["A bluff", "KK+ or AK", "Suited connectors"], answer: 1, explain: "Live pools rarely 4-bet bluff." },
    ],
    drill: { label: "Facing 4-bets", url: pre("vs4bet", null, 16, 20, 72), target: 20, acc: 0.72 },
  },
  {
    day: 17,
    phase: 3,
    title: "Deep stacks",
    goal: "Adjust when stacks are big.",
    legend: "negreanu",
    sections: [
      { title: "Big pots need big hands", body: "At 200bb, sets and suited connectors win huge pots. One-pair hands lose them." },
      { title: "Set mining", body: "You flop a set 1 in 8.5 times. Call when stacks are 15–20× the price to call.", visual: "spr" },
    ],
    quiz: [
      { q: "How often do you flop a set?", options: ["~5%", "~12%", "~25%"], answer: 1, explain: "About 1 in 8.5." },
      { q: "Which hands gain with deep stacks?", options: ["Offsuit broadways", "Small pairs and suited connectors", "Offsuit aces"], answer: 1, explain: "They make disguised monsters." },
      { q: "With a stack-to-pot ratio of 2, top pair is usually…", options: ["A stack-off", "A fold", "A bluff"], answer: 0, explain: "Low ratios commit strong pairs." },
    ],
    drill: { label: "Mixed preflop", url: pre("rfi,vsOpen,vs3bet", null, 17, 25, 72), target: 25, acc: 0.72 },
  },
  {
    day: 18,
    phase: 3,
    title: "Punish limpers",
    goal: "Iso-raise, over-limp, or fold.",
    legend: "miller",
    sections: [
      { title: "Limpers are weak", body: "Raise strong hands to play them heads-up. Over-limp small pairs and suited connectors.", visual: "chart:vl_LATE_1" },
      { title: "Size up", body: "At $1/$2, iso-raise to about $15 plus $5 per limper.", visual: "liveSizes" },
    ],
    quiz: [
      { q: "$1/$2 iso-raise vs one limper?", options: ["$4", "$15", "$50"], answer: 1, explain: "About $15, plus $5 per extra limper." },
      { q: "Best over-limp behind two limpers?", options: ["KTo", "66", "AKo"], answer: 1, explain: "Small pairs want cheap multiway flops." },
      { q: "BB facing limpers with 83o?", options: ["Fold", "Check", "Raise"], answer: 1, explain: "Checking is free." },
    ],
    drill: { label: "Limper spots", url: pre("vsLimp", null, 18, 25, 72), target: 25, acc: 0.72 },
  },
  {
    day: 19,
    phase: 3,
    title: "Rake, sizes and straddles",
    goal: "Adapt to real card rooms.",
    legend: "miller",
    sections: [
      { title: "Rake punishes small pots", body: "Taking 10% up to a cap hurts limped pots most. Raise first or fold." },
      { title: "Straddles shrink stacks", body: "A $5 straddle at $1/$2 turns a $200 stack into 40 straddles. Tighten up; top pair gains value.", visual: "liveSizes" },
    ],
    quiz: [
      { q: "Rake hurts most in…", options: ["Raised pots", "Small limped pots", "Folded hands"], answer: 1, explain: "Small pots pay the biggest share." },
      { q: "$200 stack, $5 straddle: how many straddles deep?", options: ["100", "40", "20"], answer: 1, explain: "200 ÷ 5." },
      { q: "With bigger live opens, your weakest opens should…", options: ["Widen", "Tighten a bit", "Stay the same"], answer: 1, explain: "You risk more to win the same blinds." },
    ],
    drill: { label: "Opens with live sizes", url: pre("rfi", null, 19, 25, 78, "&sizing=live"), target: 25, acc: 0.78 },
  },
  {
    day: 20,
    phase: 3,
    boss: true,
    title: "Green belt exam",
    goal: "Every preflop spot, graded.",
    legend: "chen",
    sections: [{ title: "All of preflop", body: "40 mixed decisions: opens, defenses, 3-bets, 4-bets and limpers. Score 78% to earn your green belt." }],
    quiz: [
      { q: "QQ facing a tight live player's 4-bet?", options: ["Jam", "Fold or call carefully", "Min-raise"], answer: 1, explain: "Tight 4-bet ranges crush QQ." },
      { q: "Button vs one limper with KJo?", options: ["Iso-raise", "Fold", "Over-limp"], answer: 0, explain: "Isolate in position." },
      { q: "UTG open vs a button 3-bet with 76s?", options: ["Call", "Fold", "4-bet"], answer: 1, explain: "Out of position, weak suited connectors fold." },
    ],
    drill: { label: "Exam: 40 hands at 78%+", url: pre("rfi,vsOpen,vs3bet,vs4bet,vsLimp", null, 20, 40, 78), target: 40, acc: 0.78 },
  },
  {
    day: 21,
    phase: 4,
    title: "Board texture",
    goal: "Read a flop in two seconds.",
    legend: "galfond",
    sections: [
      { title: "Dry vs wet", body: "Dry boards change little — bet small and often. Wet boards shift a lot — bet bigger, less often.", visual: "texture" },
      { title: "Paired and monotone", body: "Paired boards: small, frequent bets. Three of a suit: slow down without the flush." },
    ],
    quiz: [
      { q: "Which flop is most dynamic?", options: ["K♠7♦2♣", "J♥T♥8♣", "Q♦Q♣4♠"], answer: 1, explain: "Connected and two-tone." },
      { q: "On dry boards the raiser bets…", options: ["Small and often", "Huge and rarely", "Never"], answer: 0, explain: "Cheap bets with an edge." },
      { q: "Paired boards have…", options: ["More strong combos", "Fewer strong combos", "No draws"], answer: 1, explain: "Trips and boats are rare." },
    ],
    drill: { label: "Flop decisions", url: post(21, 15, 65), target: 15, acc: 0.65 },
  },
  {
    day: 22,
    phase: 4,
    title: "Whose board is it?",
    goal: "Spot range and nut advantage.",
    legend: "galfond",
    sections: [
      { title: "Range advantage", body: "On high, dry boards the raiser has more strong hands. On low, connected boards the caller catches up.", visual: "rangeAdv" },
      { title: "Nut advantage", body: "Whoever has more of the very best hands can bet big." },
    ],
    quiz: [
      { q: "BTN vs BB on 6♠5♦4♣: who has more straights?", options: ["BTN", "BB", "Equal"], answer: 1, explain: "The BB defends lots of low suited hands." },
      { q: "A nut advantage lets you…", options: ["Bet bigger", "Only check", "Only call"], answer: 0, explain: "Your best hands threaten stacks." },
      { q: "On K♣7♦2♥, who usually has the edge?", options: ["The raiser", "The caller"], answer: 0, explain: "More kings and overpairs." },
    ],
    drill: { label: "BTN vs BB as the raiser", url: post(22, 15, 65, "&lines=BTN_BB&role=pfr"), target: 15, acc: 0.65 },
  },
  {
    day: 23,
    phase: 4,
    title: "C-bet in position",
    goal: "Pick small range bets or big polar bets.",
    legend: "tipton",
    sections: [
      { title: "Small and often", body: "With a big edge on a dry board, bet about ⅓ pot with almost everything.", visual: "rangeAdv", more: "A ⅓-pot bluff only needs to work 25% of the time." },
      { title: "Big and polarized", body: "On wet boards, bet ¾ pot with strong hands and big draws. Check your medium hands." },
    ],
    quiz: [
      { q: "Small range bets fit…", options: ["Dry boards where you have the edge", "Monotone boards", "Every board"], answer: 0, explain: "Cheap bets with a whole-range edge." },
      { q: "A ¾-pot bluff needs folds…", options: ["25%", "43%", "60%"], answer: 1, explain: "0.75 ÷ 1.75." },
      { q: "Medium hands on wet boards usually…", options: ["Bet big", "Check", "Jam"], answer: 1, explain: "They'd rather avoid a raise." },
    ],
    drill: { label: "C-bet in position", url: post(23, 15, 65, "&lines=BTN_BB,CO_BB,LJ_BB&role=pfr"), target: 15, acc: 0.65 },
  },
  {
    day: 24,
    phase: 4,
    title: "C-bet out of position",
    goal: "Play the flop as the out-of-position raiser.",
    legend: "janda",
    sections: [
      { title: "Check more", body: "Out of position you capture less of your equity. Check more and bet a stronger range." },
      { title: "Protect your checks", body: "Check some strong hands too, or opponents will attack every check." },
    ],
    quiz: [
      { q: "Out of position, the raiser c-bets…", options: ["More", "Less", "The same"], answer: 1, explain: "Position matters." },
      { q: "Why check some strong hands?", options: ["So your checks aren't weak", "To lose value", "It's required"], answer: 0, explain: "Protect your checking range." },
      { q: "In 3-bet pots on ace-high boards, the 3-bettor…", options: ["Bets small often", "Never bets", "Always overbets"], answer: 0, explain: "Strong range, low stack-to-pot ratio." },
    ],
    drill: { label: "Out-of-position raiser", url: post(24, 15, 62, "&lines=SB_BB,CO_BTN,BTN_BB_3B&role=pfr"), target: 15, acc: 0.62 },
  },
  {
    day: 25,
    phase: 4,
    title: "Defend vs c-bets",
    goal: "Call, raise, or fold the right hands.",
    legend: "janda",
    sections: [
      { title: "Defend enough", body: "Facing a half-pot bet, continue with about two-thirds of your range.", visual: "mdf" },
      { title: "Raise your best", body: "Raise sets, two pairs and your best draws. Call pairs and decent draws. Fold the rest." },
    ],
    quiz: [
      { q: "Facing ⅓ pot you need…", options: ["20%", "33%", "43%"], answer: 0, explain: "0.33 ÷ 1.66 ≈ 20%." },
      { q: "Minimum defense vs a pot-sized bet?", options: ["33%", "50%", "75%"], answer: 1, explain: "1 ÷ 2." },
      { q: "Best semi-bluff raise?", options: ["Nut flush draw + gutshot", "Bottom pair, no draw", "Ace high, no draw"], answer: 0, explain: "Lots of equity plus fold equity." },
    ],
    drill: { label: "Defend as the caller", url: post(25, 15, 62, "&role=caller"), target: 15, acc: 0.62 },
  },
  {
    day: 26,
    phase: 4,
    title: "Draws and outs",
    goal: "Count outs fast and play draws with purpose.",
    legend: "chen",
    sections: [
      { title: "Count your outs", body: "Flush draw 9, open-ender 8, gutshot 4.", visual: "outs" },
      { title: "The rule of 2 and 4", body: "One card to come: outs × 2. Two cards to come: outs × 4.", visual: "rule24" },
    ],
    quiz: [
      { q: "Outs for an open-ended straight draw?", options: ["4", "8", "9"], answer: 1, explain: "Four cards on each end." },
      { q: "A flush draw on the flop hits by the river about…", options: ["18%", "36%", "50%"], answer: 1, explain: "9 × 4 ≈ 36%." },
      { q: "A semi-bluff wins when…", options: ["They fold or you hit", "Only when they fold", "Only at showdown"], answer: 0, explain: "Two ways to win." },
    ],
    drill: { label: "Outs sprint", url: math("outs", 26), target: 10, acc: 0.8 },
  },
  {
    day: 27,
    phase: 4,
    boss: true,
    title: "Blue belt exam",
    goal: "Play flops as raiser and caller.",
    legend: "galfond",
    sections: [{ title: "The flop exam", body: "25 flop and turn decisions in single-raised and 3-bet pots. Score 68% to earn your blue belt.", visual: "texture" }],
    quiz: [
      { q: "BTN vs BB on A♣8♦3♠ with backdoor draws?", options: ["Small c-bet", "Overbet", "Fold"], answer: 0, explain: "Range-bet small with the edge." },
      { q: "BB facing a small bet with a gutshot + overcard?", options: ["Call", "Fold", "Jam"], answer: 0, explain: "Cheap price, some equity." },
      { q: "3-bet pot, out of position, AK on K♥Q♥4♣?", options: ["Bet", "Check-fold", "Min-raise"], answer: 0, explain: "Top pair, top kicker." },
    ],
    drill: { label: "Exam: 25 decisions at 68%+", url: post(27, 25, 68), target: 25, acc: 0.68 },
  },
  {
    day: 28,
    phase: 5,
    title: "Turn barrels",
    goal: "Know which turns to keep betting.",
    legend: "tipton",
    sections: [
      { title: "Good cards, bad cards", body: "Keep betting when the turn helps your range, like an ace or king. Slow down when it completes draws." },
      { title: "Barrel with equity", body: "Bluff with draws and blockers — not with nothing." },
    ],
    quiz: [
      { q: "As the preflop raiser, which turn helps you?", options: ["An ace", "A flush card", "A low connected card"], answer: 0, explain: "Aces hit your range." },
      { q: "Good turn bluffs have…", options: ["Equity or blockers", "Nothing", "Showdown value"], answer: 0, explain: "They can improve or block calls." },
      { q: "On a bad turn card, air should…", options: ["Give up", "Overbet", "Min-bet"], answer: 0, explain: "Save your chips." },
    ],
    drill: { label: "Barrel as the raiser", url: post(28, 18, 62, "&role=pfr"), target: 18, acc: 0.62 },
  },
  {
    day: 29,
    phase: 5,
    title: "Pot control",
    goal: "Get medium hands to showdown cheaply.",
    legend: "negreanu",
    sections: [
      { title: "Medium hands check", body: "Middle pair wins at showdown but rarely gets called by worse. Keep the pot small." },
      { title: "Check back to catch bluffs", body: "Checking the turn in position gets you to a cheap river and invites bluffs." },
    ],
    quiz: [
      { q: "Betting a medium hand usually…", options: ["Folds worse, gets called by better", "Gets value", "Wins more"], answer: 0, explain: "That's why you check it." },
      { q: "Checking back middle pair on the turn…", options: ["Controls the pot", "Always loses value", "Is a bluff"], answer: 0, explain: "Pot control." },
      { q: "Showdown value means…", options: ["It can win without improving", "It's the nuts", "It must bluff"], answer: 0, explain: "It beats some of their range." },
    ],
    drill: { label: "Pot control spots", url: post(29, 18, 62), target: 18, acc: 0.62 },
  },
  {
    day: 30,
    phase: 5,
    title: "River value",
    goal: "Bet thin for value and size up vs stations.",
    legend: "miller",
    sections: [
      { title: "Bet when worse calls", body: "If worse hands call more often than better ones, it's a value bet — even with one pair." },
      { title: "Size up vs stations", body: "Calling stations pay off big bets. Bet bigger and thinner." },
    ],
    quiz: [
      { q: "A thin value bet works when…", options: ["Worse calls more than better", "Better always calls", "They always fold"], answer: 0, explain: "That's the definition." },
      { q: "Vs a station, value bets should be…", options: ["Smaller", "Bigger and thinner", "Never"], answer: 1, explain: "They call too much." },
      { q: "Checking a strong river hand works best vs…", options: ["Aggressive bluffers", "Nits", "Stations"], answer: 0, explain: "They bet when checked to." },
    ],
    drill: { label: "River spots", url: post(30, 15, 62), target: 15, acc: 0.62 },
  },
  {
    day: 31,
    phase: 5,
    title: "River bluffs",
    goal: "Bluff the right amount with the right hands.",
    legend: "chen",
    sections: [
      { title: "How many bluffs?", body: "At a ¾-pot bet, about 30% of your bets can be bluffs.", visual: "bluffRatio" },
      { title: "Which hands bluff", body: "Bluff with hands that can't win at showdown and that block their calls." },
    ],
    quiz: [
      { q: "Balanced bluff share at pot size?", options: ["10%", "33%", "60%"], answer: 1, explain: "1 ÷ 3." },
      { q: "Best river bluffs…", options: ["Can't win at showdown and block calls", "Have showdown value", "Block folds"], answer: 0, explain: "Turn your worst hands into bluffs." },
      { q: "Against a station, bluff…", options: ["More", "Less", "Only on the flop"], answer: 1, explain: "They don't fold." },
    ],
    drill: { label: "River bluffing", url: post(31, 15, 60), target: 15, acc: 0.6 },
  },
  {
    day: 32,
    phase: 5,
    title: "Bluff-catching",
    goal: "Call the right amount on the river.",
    legend: "duke",
    sections: [
      { title: "Call when they bluff enough", body: "A bluff-catcher only beats bluffs. Call when they bluff more often than your pot odds require.", visual: "potOdds" },
      { title: "Live players under-bluff", body: "Big river bets from passive players are usually value. Fold more." },
    ],
    quiz: [
      { q: "A bluff-catcher beats…", options: ["Only bluffs", "Everything", "Only value"], answer: 0, explain: "By definition." },
      { q: "A passive live player's big river bet?", options: ["Call wider", "Fold more", "Raise"], answer: 1, explain: "It's usually value." },
      { q: "Holding their missed-draw cards makes your call…", options: ["Better", "Worse"], answer: 1, explain: "You block their bluffs." },
    ],
    drill: { label: "Call or fold the river", url: post(32, 15, 60, "&role=caller"), target: 15, acc: 0.6 },
  },
  {
    day: 33,
    phase: 5,
    title: "Overbets",
    goal: "Bet big when your range earns it.",
    legend: "tipton",
    sections: [
      { title: "Overbet with the nuts", body: "Bet more than the pot when you hold strong hands they can't have." },
      { title: "Keep enough bluffs", body: "At 125% pot, about 36% of bets can be bluffs.", visual: "bluffRatio" },
    ],
    quiz: [
      { q: "Overbets work best when…", options: ["You have the nut edge and they're capped", "Ranges are equal", "You have a medium hand"], answer: 0, explain: "Polarized advantage." },
      { q: "Bluff share at 125% pot?", options: ["~20%", "~36%", "~60%"], answer: 1, explain: "1.25 ÷ 3.5." },
      { q: "A capped range…", options: ["Has few nut hands", "Has the nuts", "Always folds"], answer: 0, explain: "Its top end is limited." },
    ],
    drill: { label: "Turn and river decisions", url: post(33, 18, 60), target: 18, acc: 0.6 },
  },
  {
    day: 34,
    phase: 5,
    boss: true,
    title: "Brown belt exam",
    goal: "Play full hands flop to river.",
    legend: "sklansky",
    sections: [{ title: "Full hands", body: "30 postflop decisions on every street. Score 66% to earn your brown belt." }],
    quiz: [
      { q: "You gain when opponents play…", options: ["Differently than if they saw your cards", "Fast", "Tight"], answer: 0, explain: "Sklansky's Fundamental Theorem." },
      { q: "Medium hand when the river completes a flush?", options: ["Check more", "Overbet", "Always call big bets"], answer: 0, explain: "Pot control." },
      { q: "Judging a decision by its result is…", options: ["Resulting", "Counting outs", "Rake"], answer: 0, explain: "Annie Duke's term." },
    ],
    drill: { label: "Exam: 30 decisions at 66%+", url: post(34, 30, 66), target: 30, acc: 0.66 },
  },
  {
    day: 35,
    phase: 6,
    title: "Read the player",
    goal: "Classify opponents fast and adjust.",
    legend: "caro",
    sections: [
      { title: "Five player types", body: "Each common opponent type has a simple counter.", visual: "archetypes" },
      { title: "Adjust to them", body: "Value-bet stations, steal from nits, call down against maniacs." },
    ],
    quiz: [
      { q: "Best adjustment vs a calling station?", options: ["Bluff more", "Value bet more", "Fold more"], answer: 1, explain: "They call too much." },
      { q: "Best adjustment vs a nit?", options: ["Steal more", "Call their big bets", "Slow-play"], answer: 0, explain: "They fold too much." },
      { q: "Against a maniac you should…", options: ["Call down lighter", "Bluff more", "Never call"], answer: 0, explain: "Their betting range is wide." },
    ],
    drill: { label: "Practice vs a calling station", url: pre("rfi,vsOpen,vsLimp", null, 35, 20, 72, "&villain=station"), target: 20, acc: 0.72 },
  },
  {
    day: 36,
    phase: 6,
    title: "Crushing $1/$2",
    goal: "The adjustments that make the most money.",
    legend: "miller",
    sections: [
      { title: "Value over bluffs", body: "The $1/$2 pool calls too much and bluffs too little. Bet your good hands big; bluff rarely." },
      { title: "Isolate limpers", body: "Raise strong hands over limpers. Fold weak offsuit hands.", visual: "chart:vl_LATE_1" },
    ],
    quiz: [
      { q: "Biggest profit source at $1/$2?", options: ["River bluffs", "Value bets", "4-bet bluffs"], answer: 1, explain: "The pool pays off." },
      { q: "A passive player's river raise at $1/$2 is…", options: ["A bluff", "Very strong", "Random"], answer: 1, explain: "Respect it." },
      { q: "Iso-raise KTo from early position vs a limper?", options: ["Usually no", "Always", "Jam"], answer: 0, explain: "Weak offsuit hands play badly multiway." },
    ],
    drill: { label: "$1/$2 postflop", url: post(36, 15, 62, "&villain=pool"), target: 15, acc: 0.62 },
  },
  {
    day: 37,
    phase: 6,
    title: "Beating $2/$5",
    goal: "Adjust to regulars and deep stacks.",
    legend: "straus",
    sections: [
      { title: "More regs, deeper stacks", body: "Expect more 3-bets and 200bb stacks. Play big pots with big hands." },
      { title: "Respect big raises", body: "Turn and river raises at $2/$5 are rarely bluffs." },
    ],
    quiz: [
      { q: "With 250bb stacks, which hand gains value?", options: ["KQo", "65s", "AJo"], answer: 1, explain: "Suited connectors make disguised monsters." },
      { q: "A $2/$5 river raise is usually…", options: ["Strong", "A bluff"], answer: 0, explain: "Population under-bluffs." },
      { q: "Best way to isolate a loose opener?", options: ["3-bet", "Flat", "Fold"], answer: 0, explain: "Get heads-up in position." },
    ],
    drill: { label: "Vs a solid regular", url: post(37, 15, 62, "&villain=tag"), target: 15, acc: 0.62 },
  },
  {
    day: 38,
    phase: 6,
    title: "Mindset and bankroll",
    goal: "Protect your best game.",
    legend: "tendler",
    sections: [
      { title: "Decisions over results", body: "A good call can lose. Judge the decision, not the outcome." },
      { title: "Protect your bankroll", body: "Keep 20–30 buy-ins for your stake, and quit when you're tilting." },
    ],
    quiz: [
      { q: "Improve your worst play and…", options: ["Your whole game moves up", "Nothing changes", "You tilt more"], answer: 0, explain: "Tendler's inchworm idea." },
      { q: "Resulting is…", options: ["Judging by outcome", "Calculating equity", "Moving up"], answer: 0, explain: "A decision trap." },
      { q: "A conservative live bankroll is…", options: ["2–3 buy-ins", "20–30+ buy-ins", "Unlimited"], answer: 1, explain: "Variance is large." },
    ],
  },
  {
    day: 39,
    phase: 6,
    title: "Build the habit",
    goal: "A routine that keeps you improving.",
    legend: "angelo",
    sections: [
      { title: "A daily routine", body: "One session, one lesson, and your mistakes review. Daily beats marathon weekends." },
      { title: "Review your hands", body: "After playing, pick 3 hands. Write the ranges, the price and the right play." },
    ],
    quiz: [
      { q: "Which habit compounds best?", options: ["Short daily sessions", "One long weekly session", "Only playing"], answer: 0, explain: "Spaced, consistent practice." },
      { q: "When reviewing a hand, start with…", options: ["The ranges", "The result", "Your mood"], answer: 0, explain: "Ranges first, result last." },
      { q: "Mistakes come back…", options: ["At growing intervals", "Never", "Randomly"], answer: 0, explain: "Spaced repetition." },
    ],
    drill: { label: "Full postflop hands", url: post(39, 20, 64), target: 20, acc: 0.64 },
  },
  {
    day: 40,
    phase: 6,
    boss: true,
    title: "Black belt exam",
    goal: "Every preflop spot at a pro standard.",
    legend: "hellmuth",
    sections: [{ title: "The final exam", body: "40 mixed preflop decisions at 82%. After this, keep every seat's belt climbing." }],
    quiz: [
      { q: "The biggest preflop input is…", options: ["Position", "The dealer", "Your last result"], answer: 0, explain: "Position drives every range." },
      { q: "JJ vs a nit's 4-bet?", options: ["Fold", "Jam", "Min-raise"], answer: 0, explain: "A nit's 4-bet is KK+ or AK." },
      { q: "A great decision that loses the pot is…", options: ["Still great", "A mistake", "Bad luck and a mistake"], answer: 0, explain: "Decisions, not results." },
    ],
    drill: { label: "Final exam: 40 hands at 82%+", url: pre("rfi,vsOpen,vs3bet,vs4bet,vsLimp", null, 40, 40, 82), target: 40, acc: 0.82 },
  },
];

export const DAY_BY_NUM: Record<number, Day> = Object.fromEntries(DAYS.map((d) => [d.day, d]));

export interface GlossaryTerm {
  term: string;
  def: string;
  formula?: string;
}

export const GLOSSARY: GlossaryTerm[] = [
  { term: "GTO", def: "A strategy opponents can't exploit. A strong baseline, not the max-profit play vs weak players." },
  { term: "Exploit", def: "Adjusting to a specific opponent's mistakes." },
  { term: "Range", def: "Every hand a player could have in a spot." },
  { term: "Combo", def: "One specific two-card holding. Pairs 6, suited 4, offsuit 12." },
  { term: "Equity", def: "Your share of the pot if all cards were dealt out." },
  { term: "Pot odds", def: "The equity a call needs.", formula: "call ÷ (pot + call)" },
  { term: "Minimum defense", def: "How much of your range must continue vs a bet.", formula: "pot ÷ (pot + bet)" },
  { term: "Bluff break-even", def: "How often a bluff must work.", formula: "bet ÷ (pot + bet)" },
  { term: "Bluff share", def: "Bluffs in a balanced river betting range.", formula: "bet ÷ (pot + 2 × bet)" },
  { term: "Fold equity", def: "Value you gain when they fold." },
  { term: "Implied odds", def: "Chips you win later when you hit." },
  { term: "Stack-to-pot ratio", def: "Effective stack ÷ pot on the flop.", formula: "stack ÷ pot" },
  { term: "Range advantage", def: "One range has more equity on the board." },
  { term: "Nut advantage", def: "One range has more of the best hands." },
  { term: "Polarized", def: "Strong hands and bluffs, few medium hands." },
  { term: "Blocker", def: "A card you hold that makes some of their hands impossible." },
  { term: "C-bet", def: "The preflop raiser bets the flop." },
  { term: "Iso-raise", def: "Raising over limpers to play the weak player heads-up." },
  { term: "Squeeze", def: "A 3-bet after an open and a call." },
  { term: "Resulting", def: "Judging a decision by its outcome." },
];
