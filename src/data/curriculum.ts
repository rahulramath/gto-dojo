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
  { id: 2, name: "Facing raises", belt: "orange" },
  { id: 3, name: "3-bets and live play", belt: "green" },
  { id: 4, name: "The flop", belt: "blue" },
  { id: 5, name: "Turn and river", belt: "brown" },
  { id: 6, name: "Beating real players", belt: "black" },
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
    goal: "Learn every seat and why the button wins the most.",
    legend: "sexton",
    sections: [
      {
        title: "One order, every hand",
        body: "Before the flop, action starts to the left of the big blind. After the flop, the blinds act first and the button acts last.",
        visual: "seats",
        more: "Full-ring tables add UTG, UTG+1 and UTG+2 before the lojack.",
      },
      {
        title: "Acting last wins",
        body: "The last player to act gets to see what everyone else does first. That's why the button is the most profitable seat.",
        more: "Out of position you only get about 70 to 85% of your equity. In position, you get all of it.",
      },
      { title: "Wider toward the button", body: "The fewer players left behind you, the more hands you can open.", visual: "openWidths" },
    ],
    quiz: [
      { q: "Who acts last after the flop?", options: ["Big blind", "Button", "Cutoff"], answer: 1, explain: "The button acts last on every street after the flop." },
      { q: "Which seat opens the most hands?", options: ["UTG", "Cutoff", "Button"], answer: 2, explain: "Only the blinds are left, and you'll have position on them." },
      { q: "Why do early seats open fewer hands?", options: ["More players are left to act", "The blinds are bigger", "They always have position"], answer: 0, explain: "With more players behind you, someone often has a big hand." },
    ],
    drill: { label: "Open from UTG and the button", url: pre("rfi", "LJ,BTN", 1, 20, 70, "&table=6"), target: 20, acc: 0.7 },
  },
  {
    day: 2,
    phase: 1,
    title: "Hands, combos and blockers",
    goal: "Count combinations, the base of thinking in ranges.",
    legend: "brunson",
    sections: [
      { title: "Count combos, not hands", body: "Every pair has 6 combos, every suited hand has 4 and every offsuit hand has 12.", visual: "combos", more: "So AKo shows up three times as often as AKs." },
      { title: "Blockers", body: "The cards in your hand can't be in theirs. Holding one ace cuts their AA combos in half.", visual: "blockers" },
    ],
    quiz: [
      { q: "How many AKo combos are there?", options: ["4", "12", "16"], answer: 1, explain: "4 aces times 3 offsuit kings makes 12." },
      { q: "You hold an ace. How many AA combos can they have?", options: ["6", "3", "1"], answer: 1, explain: "There are only three aces left, which makes 3 combos." },
      { q: "How many combos does a pocket pair have?", options: ["4", "6", "12"], answer: 1, explain: "You pick 2 of the 4 suits, which gives you 6." },
    ],
    drill: { label: "Count combos", url: math("combos", 2), target: 10, acc: 0.8 },
  },
  {
    day: 3,
    phase: 1,
    title: "Early position discipline",
    goal: "Open a tight, strong range from UTG.",
    legend: "harrington",
    sections: [
      { title: "Tight from early seats", body: "With five or more players behind you, only open strong hands like good pairs, suited aces and big broadways.", visual: "chart:rfi_LJ" },
      {
        title: "Suited beats offsuit",
        body: "Suited hands make flushes and draws. Offsuit hands with weak kickers mostly make second-best pairs.",
        more: "At a full table, UTG opens only about 11% of hands.",
      },
    ],
    quiz: [
      { q: "Which hand is a standard fold from UTG at 6-max?", options: ["A5s", "KQo", "A9o"], answer: 2, explain: "A9o gets dominated too often from early position." },
      { q: "Why is full-ring UTG even tighter?", options: ["More players are behind you", "The blinds are smaller", "The rake is higher"], answer: 0, explain: "There are eight players left to act instead of five." },
      { q: "What does an early-seat range look like?", options: ["Only big hands and bluffs", "The best hands in order, down to a line", "Mostly suited connectors"], answer: 1, explain: "Early ranges take the best hands first and stop at a line." },
    ],
    drill: { label: "Early position opens", url: pre("rfi", "EP1,EP2,EP3,LJ", 3, 20, 75, "&table=9"), target: 20, acc: 0.75 },
  },
  {
    day: 4,
    phase: 1,
    title: "Steal from late position",
    goal: "Open wide from the cutoff and button.",
    legend: "brunson",
    sections: [
      {
        title: "The steal math",
        body: "Raising 2.5bb to win 1.5bb needs everyone to fold 62.5% of the time. From the button, they usually do.",
        more: "The fold rate you need is what you risk divided by what you risk plus the pot.",
      },
      { title: "The button opens about 45%", body: "Every pair, every suited ace and king, most suited hands, and offsuit hands down to about K8o.", visual: "chart:rfi_BTN" },
    ],
    quiz: [
      { q: "You raise 2.5bb into a 1.5bb pot. How often does everyone need to fold?", options: ["37.5%", "50%", "62.5%"], answer: 2, explain: "2.5 divided by 4 is 62.5%." },
      { q: "About how often does the button open?", options: ["25%", "45%", "70%"], answer: 1, explain: "About 43 to 46% with 100bb stacks." },
      { q: "Which hand is a standard button open?", options: ["K8o", "72o", "J3o"], answer: 0, explain: "K8o is near the bottom of the button's range." },
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
      { title: "3-bet or fold against a raise", body: "Calling from the small blind invites a squeeze and plays out of position. Re-raise or let it go." },
    ],
    quiz: [
      { q: "It folds to you in the small blind. What's the plan?", options: ["Limp everything", "Raise or fold", "Limp your strong hands"], answer: 1, explain: "Raise to about 3bb or fold." },
      { q: "Why not call a button open from the small blind?", options: ["You're out of position and can get squeezed", "It's against the rules", "The button never folds"], answer: 0, explain: "The big blind still acts behind you." },
      { q: "How big should a small blind 3-bet be?", options: ["Smaller than usual", "The same as usual", "Bigger than in position"], answer: 2, explain: "Out of position, make it about 4 to 4.5x the open." },
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
      {
        title: "The price of a call",
        body: "The equity you need is your call divided by the total pot after you call.",
        visual: "potOdds",
        more: "A third of the pot needs 20%. Half the pot needs 25%. A pot-sized bet needs 33%. Twice the pot needs 40%.",
      },
      { title: "Implied odds", body: "When you hit, you often win more on later streets. That lets draws and small pairs call a slightly worse price." },
    ],
    quiz: [
      { q: "How much equity do you need to call a pot-sized bet?", options: ["25%", "33%", "50%"], answer: 1, explain: "You call 1 to win 3, so you need 33%." },
      { q: "The pot is $80 and they bet $40. How much equity do you need?", options: ["20%", "25%", "33%"], answer: 1, explain: "$40 divided by $160 is 25%." },
      { q: "What are implied odds?", options: ["Chips you win later when you hit", "The rake", "Your equity against a random hand"], answer: 0, explain: "They let draws call a slightly worse price." },
    ],
    drill: { label: "Pot odds drill", url: math("potodds", 6), target: 10, acc: 0.8 },
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
      { q: "Is KTo usually an open from the cutoff?", options: ["Yes", "Never", "Only with short stacks"], answer: 0, explain: "KTo opens most of the time from the cutoff." },
      { q: "Do you open 44 from full-ring UTG?", options: ["Always", "Sometimes", "Never"], answer: 1, explain: "Small pairs are a mix from UTG." },
      { q: "Which seat raises or folds against only the big blind?", options: ["Button", "Small blind", "Hijack"], answer: 1, explain: "That's the small blind." },
    ],
    drill: { label: "Exam: 30 opens, 80% to pass", url: pre("rfi", null, 7, 30, 80), target: 30, acc: 0.8 },
  },
  {
    day: 8,
    phase: 2,
    title: "Big blind defense",
    goal: "Defend enough that stealing from you isn't free.",
    legend: "janda",
    sections: [
      {
        title: "The best price at the table",
        body: "Against a 2.5bb open you need only about 27% equity. That's why the big blind defends about half its hands against the button.",
        visual: "chart:vo_BB_BTN",
      },
      { title: "Suited defends, offsuit folds", body: "Out of position you won't get all of your equity. Suited and connected hands hold up better." },
    ],
    quiz: [
      { q: "How much equity does the big blind need against a 2.5bb button open?", options: ["20%", "27%", "40%"], answer: 1, explain: "1.5 divided by 5.5 is about 27%." },
      { q: "Which hand defends better out of position?", options: ["K5s", "K5o", "They're the same"], answer: 0, explain: "Suited hands make flushes and draws." },
      { q: "About how often does the big blind defend against the button?", options: ["20%", "55%", "85%"], answer: 1, explain: "About 55%, counting 3-bets." },
    ],
    drill: { label: "Big blind defense", url: pre("vsOpen", "BB", 8, 25, 72), target: 25, acc: 0.72 },
  },
  {
    day: 9,
    phase: 2,
    title: "Defending against early opens",
    goal: "Tighten up against strong ranges.",
    legend: "janda",
    sections: [
      { title: "Same price, stronger range", body: "Offsuit hands that defend against the button fold against UTG. Suited hands and pairs still defend.", visual: "chart:vo_BB_LJ" },
      { title: "3-bet big from the blinds", body: "Re-raise to about 4x the open with premium hands and suited aces like A5s." },
    ],
    quiz: [
      { q: "Big blind against UTG: which hand defends?", options: ["K8o", "J8s", "Q7o"], answer: 1, explain: "Suited connectors still defend." },
      { q: "How big is a 3-bet from the big blind?", options: ["2x", "3x", "4 to 4.5x"], answer: 2, explain: "Out of position, you size up." },
      { q: "Which is a good 3-bet bluff from the big blind?", options: ["A4s", "K9o", "63o"], answer: 0, explain: "It blocks aces and can make flushes and straights." },
    ],
    drill: { label: "Big blind against every seat", url: pre("vsOpen", "BB", 9, 25, 72), target: 25, acc: 0.72 },
  },
  {
    day: 10,
    phase: 2,
    title: "The 3-bet",
    goal: "Know what to re-raise and why.",
    legend: "tipton",
    sections: [
      { title: "Value plus a few bluffs", body: "3-bet the hands that are ahead, like QQ+ and AK, plus a few bluffs that block aces, like A5s and A4s.", visual: "chart:vo_BTN_CO" },
      { title: "Size it right", body: "Make it about 3x the open in position and 4x from the blinds." },
    ],
    quiz: [
      { q: "Which hand is a 3-bet bluff?", options: ["KK", "A5s", "AK"], answer: 1, explain: "A5s blocks aces and plays well." },
      { q: "What do you call a range of strong hands and bluffs with no medium hands?", options: ["Linear", "Polarized", "Merged"], answer: 1, explain: "That's a polarized range." },
      { q: "How big is a 3-bet in position against a 2.5bb open?", options: ["5bb", "7.5bb", "15bb"], answer: 1, explain: "About 3 times the open." },
    ],
    drill: { label: "3-bet or call from late seats", url: pre("vsOpen", "CO,BTN", 10, 25, 70), target: 25, acc: 0.7 },
  },
  {
    day: 11,
    phase: 2,
    title: "Choosing bluffs",
    goal: "Bluff with hands that block their best hands.",
    legend: "tipton",
    sections: [
      { title: "Bluffs that block", body: "A5s holds an ace, so they have fewer AA and AK combos to fight back with.", visual: "blockers" },
      { title: "Bluffs that can hit", body: "Good bluffs can still make strong hands when called, like suited aces and suited connectors." },
    ],
    quiz: [
      { q: "You hold A♦4♦. How many AK combos can they have?", options: ["16", "12", "8"], answer: 1, explain: "3 aces times 4 kings is 12." },
      { q: "What's the best 3-bet bluff against a cutoff open?", options: ["A3s", "Q6o", "94s"], answer: 0, explain: "It blocks aces and plays well." },
      { q: "How much does holding a king cut their KK combos?", options: ["25%", "50%", "100%"], answer: 1, explain: "From 6 combos down to 3." },
    ],
    drill: { label: "Facing raises", url: pre("vsOpen", null, 11, 25, 70), target: 25, acc: 0.7 },
  },
  {
    day: 12,
    phase: 2,
    title: "Call or 3-bet in position",
    goal: "Use position to call more.",
    legend: "galfond",
    sections: [
      { title: "Call when you have position", body: "Acting last lets you call and keep weaker hands in. Pairs and suited broadways are good calls.", visual: "chart:vo_BTN_HJ" },
      { title: "Watch out for squeezes", body: "The more players left behind you, the fewer hands you should call." },
    ],
    quiz: [
      { q: "Which seat can call the most?", options: ["Hijack", "Button", "Small blind"], answer: 1, explain: "Only the blinds are behind it." },
      { q: "What's a squeeze?", options: ["A 3-bet after an open and a call", "A limp and then a raise", "A small c-bet"], answer: 0, explain: "It punishes players who call too wide." },
      { q: "You're in the hijack and UTG opens. What's the default plan?", options: ["Call a lot", "3-bet or fold", "Always 4-bet"], answer: 1, explain: "Four players are behind you, and the opener is strong." },
    ],
    drill: { label: "Hijack, cutoff and button against raises", url: pre("vsOpen", "HJ,CO,BTN", 12, 25, 70), target: 25, acc: 0.7 },
  },
  {
    day: 13,
    phase: 2,
    title: "Blind against blind",
    goal: "Win the small blind against big blind battle.",
    legend: "janda",
    sections: [
      { title: "The small blind opens wide", body: "Only the big blind is left, so raise about 45% of hands.", visual: "chart:rfi_SB" },
      { title: "The big blind defends even wider", body: "The big blind acts last after the flop, so it plays more than half its hands.", visual: "chart:vo_BB_SB" },
    ],
    quiz: [
      { q: "Small blind against big blind: who acts last after the flop?", options: ["Small blind", "Big blind"], answer: 1, explain: "The big blind acts last." },
      { q: "How wide does the big blind defend against a small blind open?", options: ["Very wide", "Very tight", "It always 3-bets"], answer: 0, explain: "It has position and a good price." },
      { q: "What should big blind 3-bets look like against the small blind?", options: ["Only AA and KK", "Lots of good hands for value", "Only bluffs"], answer: 1, explain: "The small blind's range is wide and weak." },
    ],
    drill: { label: "Blind battles", url: pre("rfi,vsOpen", "SB,BB", 13, 25, 72), target: 25, acc: 0.72 },
  },
  {
    day: 14,
    phase: 2,
    boss: true,
    title: "Orange belt exam",
    goal: "Defend, call and 3-bet from every seat.",
    legend: "straus",
    sections: [{ title: "Facing raises", body: "30 decisions against raises from every seat. Score 78% to earn your orange belt.", visual: "chart:vo_BB_BTN" }],
    quiz: [
      { q: "Big blind against a button min-raise with J5s?", options: ["Fold", "Call", "4-bet"], answer: 1, explain: "Suited hands defend at this price." },
      { q: "Small blind against a cutoff open with 76s?", options: ["Call", "Mostly fold", "Always 3-bet"], answer: 1, explain: "It's 3-bet or fold here, and mostly fold." },
      { q: "Button against a hijack open with AQo?", options: ["Fold", "Mix 3-bets and calls", "Go all-in"], answer: 1, explain: "It's a mix when you have position." },
    ],
    drill: { label: "Exam: 30 hands, 78% to pass", url: pre("vsOpen", null, 14, 30, 78), target: 30, acc: 0.78 },
  },
  {
    day: 15,
    phase: 3,
    title: "Facing 3-bets",
    goal: "Defend your opens without folding too much.",
    legend: "straus",
    sections: [
      {
        title: "Don't over-fold",
        body: "Keep going with 35 to 50% of your opens, more in position. If you fold everything, they'll 3-bet you with any two cards.",
        visual: "chart:v3_BTN_IP",
      },
      { title: "Small pot, big commitment", body: "After a 3-bet the pot is about 20bb with 90bb behind. Top pair often plays for your whole stack.", visual: "spr" },
    ],
    quiz: [
      { q: "Why not fold everything to 3-bets?", options: ["They'd 3-bet you with anything", "3-bets are always bluffs", "It saves rake"], answer: 0, explain: "Folding too much gets exploited." },
      { q: "You open the button and the big blind 3-bets. Do you have position?", options: ["Yes", "No"], answer: 0, explain: "The blinds act first after the flop." },
      { q: "What's the stack-to-pot ratio in a 3-bet pot?", options: ["About 1", "About 4", "About 12"], answer: 1, explain: "It's a 20bb pot with 90bb behind." },
    ],
    drill: { label: "Facing 3-bets", url: pre("vs3bet", null, 15, 25, 70), target: 25, acc: 0.7 },
  },
  {
    day: 16,
    phase: 3,
    title: "4-bets and all-ins",
    goal: "Know when to get it all in.",
    legend: "chen",
    sections: [
      { title: "When to get it in", body: "4-bet KK+ and AK, plus a few bluffs like A5s. Your other 3-bet bluffs fold to a 4-bet.", visual: "chart:v4_IP" },
      { title: "Live 4-bets are real", body: "At $1/$2 and $2/$5, a 4-bet from someone you don't know is almost always KK+ or AK." },
    ],
    quiz: [
      { q: "What's a typical 4-bet bluff?", options: ["A5s", "JTo", "22"], answer: 0, explain: "It blocks aces and plays well." },
      { q: "They 4-bet and you were bluffing. What now?", options: ["Fold", "Call", "Go all-in"], answer: 0, explain: "Let it go." },
      { q: "What does a live 4-bet from someone you don't know usually mean?", options: ["A bluff", "KK+ or AK", "Suited connectors"], answer: 1, explain: "Live players rarely 4-bet bluff." },
    ],
    drill: { label: "Facing 4-bets", url: pre("vs4bet", null, 16, 20, 72), target: 20, acc: 0.72 },
  },
  {
    day: 17,
    phase: 3,
    title: "Deep stacks",
    goal: "Adjust when the stacks are big.",
    legend: "negreanu",
    sections: [
      { title: "Big pots need big hands", body: "At 200bb, sets and suited connectors win huge pots, and one pair loses them." },
      { title: "Set mining", body: "You flop a set about 1 in 8 times. Call when the stacks are 15 to 20 times the price.", visual: "spr" },
    ],
    quiz: [
      { q: "How often do you flop a set?", options: ["About 5%", "About 12%", "About 25%"], answer: 1, explain: "About 1 in 8 times." },
      { q: "Which hands get better with deep stacks?", options: ["Offsuit broadways", "Small pairs and suited connectors", "Offsuit aces"], answer: 1, explain: "They make big hands that are hard to see coming." },
      { q: "With a stack-to-pot ratio of 2, what do you do with top pair?", options: ["Usually get it in", "Usually fold", "Use it as a bluff"], answer: 0, explain: "When the ratio is low, strong pairs play for stacks." },
    ],
    drill: { label: "Mixed preflop", url: pre("rfi,vsOpen,vs3bet", null, 17, 25, 72), target: 25, acc: 0.72 },
  },
  {
    day: 18,
    phase: 3,
    title: "Punish limpers",
    goal: "Raise, limp behind or fold.",
    legend: "miller",
    sections: [
      { title: "Limpers are weak", body: "Raise strong hands to play them heads-up. Limp behind with small pairs and suited connectors.", visual: "chart:vl_LATE_1" },
      { title: "Size up", body: "At $1/$2, raise to about $15 plus $5 for each limper.", visual: "liveSizes" },
    ],
    quiz: [
      { q: "How much do you raise over one limper at $1/$2?", options: ["$4", "$15", "$50"], answer: 1, explain: "About $15, plus $5 for each extra limper." },
      { q: "Which hand is the best limp behind two limpers?", options: ["KTo", "66", "AKo"], answer: 1, explain: "Small pairs want cheap flops with lots of players." },
      { q: "You're in the big blind with 83o and there are limpers. What do you do?", options: ["Fold", "Check", "Raise"], answer: 1, explain: "Checking is free." },
    ],
    drill: { label: "Limper spots", url: pre("vsLimp", null, 18, 25, 72), target: 25, acc: 0.72 },
  },
  {
    day: 19,
    phase: 3,
    title: "Rake, sizes and straddles",
    goal: "Adjust to real card rooms.",
    legend: "miller",
    sections: [
      { title: "Rake hurts small pots", body: "When the house takes 10% up to a cap, limped pots get hit the hardest. Raise first or fold." },
      {
        title: "Straddles shrink stacks",
        body: "A $5 straddle at $1/$2 turns a $200 stack into 40 straddles. Tighten up, and top pair gets more valuable.",
        visual: "liveSizes",
      },
    ],
    quiz: [
      { q: "Where does rake hurt the most?", options: ["Raised pots", "Small limped pots", "Hands that fold"], answer: 1, explain: "Small pots pay the biggest share." },
      { q: "You have $200 and there's a $5 straddle. How many straddles deep are you?", options: ["100", "40", "20"], answer: 1, explain: "$200 divided by $5 is 40." },
      { q: "With bigger live opens, what happens to your weakest opens?", options: ["Play more of them", "Play a few less", "Nothing changes"], answer: 1, explain: "You risk more to win the same blinds." },
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
    sections: [{ title: "All of preflop", body: "40 mixed decisions covering opens, defense, 3-bets, 4-bets and limpers. Score 78% to earn your green belt." }],
    quiz: [
      { q: "You have QQ and a tight live player 4-bets. What do you do?", options: ["Go all-in", "Fold or call carefully", "Min-raise"], answer: 1, explain: "A tight player's 4-bet crushes QQ." },
      { q: "You're on the button with KJo and one player limps. What do you do?", options: ["Raise", "Fold", "Limp behind"], answer: 0, explain: "Raise and play them heads-up in position." },
      { q: "You open UTG with 76s and the button 3-bets. What do you do?", options: ["Call", "Fold", "4-bet"], answer: 1, explain: "Out of position, weak suited connectors fold." },
    ],
    drill: { label: "Exam: 40 hands, 78% to pass", url: pre("rfi,vsOpen,vs3bet,vs4bet,vsLimp", null, 20, 40, 78), target: 40, acc: 0.78 },
  },
  {
    day: 21,
    phase: 4,
    title: "Board texture",
    goal: "Read a flop in two seconds.",
    legend: "galfond",
    sections: [
      {
        title: "Dry vs wet",
        body: "Dry boards don't change much, so bet small and often. Wet boards change a lot, so bet bigger and less often.",
        visual: "texture",
      },
      { title: "Paired and one-suit boards", body: "On paired boards, bet small and often. On boards with three of one suit, slow down unless you have the flush." },
    ],
    quiz: [
      { q: "Which flop changes the most by the river?", options: ["K♠7♦2♣", "J♥T♥8♣", "Q♦Q♣4♠"], answer: 1, explain: "It's connected and has two hearts." },
      { q: "How does the raiser bet on dry boards?", options: ["Small and often", "Huge and rarely", "Never"], answer: 0, explain: "Cheap bets work when you have the edge." },
      { q: "Are strong hands more or less common on paired boards?", options: ["More common", "Less common", "The same"], answer: 1, explain: "Trips and full houses are rare." },
    ],
    drill: { label: "Flop decisions", url: post(21, 15, 65), target: 15, acc: 0.65 },
  },
  {
    day: 22,
    phase: 4,
    title: "Whose board is it?",
    goal: "Spot who has the edge on a flop.",
    legend: "galfond",
    sections: [
      { title: "Range advantage", body: "On high, dry boards the raiser has more strong hands. On low, connected boards the caller catches up.", visual: "rangeAdv" },
      { title: "Nut advantage", body: "Whoever has more of the very best hands gets to bet big." },
    ],
    quiz: [
      { q: "Button against big blind on 6♠5♦4♣: who has more straights?", options: ["Button", "Big blind", "Neither"], answer: 1, explain: "The big blind defends lots of low suited hands." },
      { q: "What does having more of the best hands let you do?", options: ["Bet bigger", "Only check", "Only call"], answer: 0, explain: "Your best hands can threaten their whole stack." },
      { q: "On K♣7♦2♥, who usually has the edge?", options: ["The raiser", "The caller"], answer: 0, explain: "The raiser has more kings and overpairs." },
    ],
    drill: { label: "Button against big blind as the raiser", url: post(22, 15, 65, "&lines=BTN_BB&role=pfr"), target: 15, acc: 0.65 },
  },
  {
    day: 23,
    phase: 4,
    title: "C-bet in position",
    goal: "Choose between small bets and big bets.",
    legend: "tipton",
    sections: [
      {
        title: "Small and often",
        body: "When you have a big edge on a dry board, bet about a third of the pot with almost everything.",
        visual: "rangeAdv",
        more: "A bluff that size only needs to work 25% of the time.",
      },
      { title: "Big bets on wet boards", body: "On wet boards, bet about 3/4 of the pot with strong hands and big draws, and check your medium hands." },
    ],
    quiz: [
      { q: "When do small bets with your whole range work?", options: ["On dry boards where you have the edge", "On one-suit boards", "On every board"], answer: 0, explain: "Cheap bets work when your whole range is ahead." },
      { q: "How often does a 3/4 pot bluff need to work?", options: ["25%", "43%", "60%"], answer: 1, explain: "0.75 divided by 1.75 is about 43%." },
      { q: "What do medium hands usually do on wet boards?", options: ["Bet big", "Check", "Go all-in"], answer: 1, explain: "They'd rather not face a raise." },
    ],
    drill: { label: "C-bets in position", url: post(23, 15, 65, "&lines=BTN_BB,CO_BB,LJ_BB&role=pfr"), target: 15, acc: 0.65 },
  },
  {
    day: 24,
    phase: 4,
    title: "C-bet out of position",
    goal: "Play the flop as the raiser when you act first.",
    legend: "janda",
    sections: [
      { title: "Check more", body: "Out of position you get less of your equity. Check more often and bet a stronger range." },
      { title: "Protect your checks", body: "Check some strong hands too, or players will attack every time you check." },
    ],
    quiz: [
      { q: "Out of position, does the raiser c-bet more or less?", options: ["More", "Less", "The same"], answer: 1, explain: "Acting first makes betting worse." },
      { q: "Why check some strong hands?", options: ["So your checks aren't always weak", "To lose value", "It's a rule"], answer: 0, explain: "It keeps your checking range strong." },
      { q: "In 3-bet pots on ace-high boards, what does the 3-bettor do?", options: ["Bets small a lot", "Never bets", "Always overbets"], answer: 0, explain: "Their range is strong and the pot is already big." },
    ],
    drill: { label: "Raiser out of position", url: post(24, 15, 62, "&lines=SB_BB,CO_BTN,BTN_BB_3B&role=pfr"), target: 15, acc: 0.62 },
  },
  {
    day: 25,
    phase: 4,
    title: "Defend against c-bets",
    goal: "Call, raise or fold the right hands.",
    legend: "janda",
    sections: [
      { title: "Defend enough", body: "Against a half-pot bet, keep playing about two-thirds of your range.", visual: "mdf" },
      { title: "Raise your best", body: "Raise sets, two pairs and your best draws. Call with pairs and decent draws. Fold the rest." },
    ],
    quiz: [
      { q: "How much equity do you need against a third-pot bet?", options: ["20%", "33%", "43%"], answer: 0, explain: "You need about 20%." },
      { q: "How much of your range should keep playing against a pot-sized bet?", options: ["33%", "50%", "75%"], answer: 1, explain: "About half." },
      { q: "Which hand makes the best semi-bluff raise?", options: ["Nut flush draw with a gutshot", "Bottom pair with no draw", "Ace high with no draw"], answer: 0, explain: "It has lots of equity, and they might fold." },
    ],
    drill: { label: "Defend as the caller", url: post(25, 15, 62, "&role=caller"), target: 15, acc: 0.62 },
  },
  {
    day: 26,
    phase: 4,
    title: "Draws and outs",
    goal: "Count outs fast and play draws with a plan.",
    legend: "chen",
    sections: [
      { title: "Count your outs", body: "A flush draw has 9 outs, an open-ended straight draw has 8 and a gutshot has 4.", visual: "outs" },
      { title: "The rule of 2 and 4", body: "With one card to come, multiply your outs by 2. With two cards to come, multiply by 4.", visual: "rule24" },
    ],
    quiz: [
      { q: "How many outs does an open-ended straight draw have?", options: ["4", "8", "9"], answer: 1, explain: "Four cards on each end." },
      { q: "How often does a flush draw on the flop hit by the river?", options: ["18%", "36%", "50%"], answer: 1, explain: "9 outs times 4 is about 36%." },
      { q: "When does a semi-bluff win?", options: ["When they fold or you hit", "Only when they fold", "Only at showdown"], answer: 0, explain: "It has two ways to win." },
    ],
    drill: { label: "Outs drill", url: math("outs", 26), target: 10, acc: 0.8 },
  },
  {
    day: 27,
    phase: 4,
    boss: true,
    title: "Blue belt exam",
    goal: "Play flops as the raiser and the caller.",
    legend: "galfond",
    sections: [{ title: "The flop exam", body: "25 flop and turn decisions in raised and 3-bet pots. Score 68% to earn your blue belt.", visual: "texture" }],
    quiz: [
      { q: "Button against big blind on A♣8♦3♠ with backdoor draws?", options: ["Small c-bet", "Overbet", "Fold"], answer: 0, explain: "Bet small with your whole range when you have the edge." },
      { q: "Big blind facing a small bet with a gutshot and an overcard?", options: ["Call", "Fold", "Go all-in"], answer: 0, explain: "The price is cheap and you have some outs." },
      { q: "3-bet pot, out of position, AK on K♥Q♥4♣?", options: ["Bet", "Check and fold", "Min-raise"], answer: 0, explain: "You have top pair, top kicker." },
    ],
    drill: { label: "Exam: 25 decisions, 68% to pass", url: post(27, 25, 68), target: 25, acc: 0.68 },
  },
  {
    day: 28,
    phase: 5,
    title: "Turn barrels",
    goal: "Know which turns to keep betting.",
    legend: "tipton",
    sections: [
      { title: "Good cards, bad cards", body: "Keep betting when the turn helps your range, like an ace or a king. Slow down when it completes draws." },
      { title: "Bluff with a reason", body: "Bluff with draws and blockers, not with nothing at all." },
    ],
    quiz: [
      { q: "As the preflop raiser, which turn card helps you most?", options: ["An ace", "A flush card", "A low connected card"], answer: 0, explain: "Aces hit your range." },
      { q: "What do good turn bluffs have?", options: ["Outs or blockers", "Nothing", "Showdown value"], answer: 0, explain: "They can improve or block the hands that call." },
      { q: "On a bad turn card, what should your air do?", options: ["Give up", "Overbet", "Min-bet"], answer: 0, explain: "Save your chips." },
    ],
    drill: { label: "Keep betting as the raiser", url: post(28, 18, 62, "&role=pfr"), target: 18, acc: 0.62 },
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
      { q: "What usually happens when you bet a medium hand?", options: ["Worse hands fold and better hands call", "You get value", "You win more"], answer: 0, explain: "That's why you check it." },
      { q: "Why check back middle pair on the turn?", options: ["To keep the pot small", "It always loses value", "It's a bluff"], answer: 0, explain: "It keeps the pot under control." },
      { q: "What does showdown value mean?", options: ["It can win without improving", "It's the nuts", "It has to bluff"], answer: 0, explain: "It beats some of their range already." },
    ],
    drill: { label: "Pot control spots", url: post(29, 18, 62), target: 18, acc: 0.62 },
  },
  {
    day: 30,
    phase: 5,
    title: "River value",
    goal: "Bet thin for value and size up against stations.",
    legend: "miller",
    sections: [
      { title: "Bet when worse calls", body: "If worse hands call more often than better ones, it's a value bet, even with one pair." },
      { title: "Size up against stations", body: "Calling stations pay off big bets. Bet bigger and thinner." },
    ],
    quiz: [
      { q: "When does a thin value bet work?", options: ["When worse hands call more than better ones", "When better hands always call", "When they always fold"], answer: 0, explain: "More calls from worse hands means profit." },
      { q: "How should you value bet against a calling station?", options: ["Smaller", "Bigger and thinner", "Not at all"], answer: 1, explain: "They call too much." },
      { q: "Checking a strong river hand works best against who?", options: ["Aggressive bluffers", "Nits", "Calling stations"], answer: 0, explain: "They bet when you check." },
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
      { title: "How many bluffs?", body: "When you bet 3/4 of the pot, about 30% of your bets can be bluffs.", visual: "bluffRatio" },
      { title: "Which hands bluff", body: "Bluff with hands that can't win at showdown and that block the hands they'd call with." },
    ],
    quiz: [
      { q: "With a pot-sized bet, how much of your betting range can be bluffs?", options: ["10%", "33%", "60%"], answer: 1, explain: "About a third." },
      { q: "What makes a good river bluff?", options: ["It can't win at showdown and blocks their calls", "It has showdown value", "It blocks their folds"], answer: 0, explain: "Turn your worst hands into bluffs." },
      { q: "Should you bluff more or less against a calling station?", options: ["More", "Less", "Only on the flop"], answer: 1, explain: "They don't fold." },
    ],
    drill: { label: "River bluffs", url: post(31, 15, 60), target: 15, acc: 0.6 },
  },
  {
    day: 32,
    phase: 5,
    title: "Bluff-catching",
    goal: "Call the right amount on the river.",
    legend: "duke",
    sections: [
      { title: "Call when they bluff enough", body: "A bluff-catcher only beats bluffs. Call when they bluff more often than your pot odds need.", visual: "potOdds" },
      { title: "Live players bluff less", body: "Big river bets from passive players are usually value. Fold more." },
    ],
    quiz: [
      { q: "What does a bluff-catcher beat?", options: ["Only bluffs", "Everything", "Only value hands"], answer: 0, explain: "Bluffs are all it beats." },
      { q: "A passive live player makes a big river bet. What do you do?", options: ["Call more", "Fold more", "Raise"], answer: 1, explain: "It's usually value." },
      { q: "You hold the cards they'd need for a missed draw. Is calling better or worse?", options: ["Better", "Worse"], answer: 1, explain: "You block their bluffs, so they have fewer of them." },
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
      { title: "Overbet with the nuts", body: "Bet more than the pot when you have strong hands they can't have." },
      { title: "Keep enough bluffs", body: "When you bet 125% of the pot, about 36% of your bets can be bluffs.", visual: "bluffRatio" },
    ],
    quiz: [
      { q: "When do overbets work best?", options: ["When you can have the best hands and they can't", "When ranges are even", "When you have a medium hand"], answer: 0, explain: "You need more of the nuts than they do." },
      { q: "How much of a 125% pot bet can be bluffs?", options: ["About 20%", "About 36%", "About 60%"], answer: 1, explain: "1.25 divided by 3.5 is about 36%." },
      { q: "What does a capped range mean?", options: ["It has few of the best hands", "It has the nuts", "It always folds"], answer: 0, explain: "Its best hands are limited." },
    ],
    drill: { label: "Turn and river decisions", url: post(33, 18, 60), target: 18, acc: 0.6 },
  },
  {
    day: 34,
    phase: 5,
    boss: true,
    title: "Brown belt exam",
    goal: "Play full hands from flop to river.",
    legend: "sklansky",
    sections: [{ title: "Full hands", body: "30 decisions after the flop on every street. Score 66% to earn your brown belt." }],
    quiz: [
      { q: "When do you gain from how your opponent plays?", options: ["When they play differently than if they saw your cards", "When they play fast", "When they play tight"], answer: 0, explain: "That's Sklansky's Fundamental Theorem." },
      { q: "You have a medium hand and the river completes a flush. What do you do?", options: ["Check more", "Overbet", "Always call big bets"], answer: 0, explain: "Keep the pot small." },
      { q: "What's it called when you judge a decision by its result?", options: ["Resulting", "Counting outs", "Rake"], answer: 0, explain: "Annie Duke calls it resulting." },
    ],
    drill: { label: "Exam: 30 decisions, 66% to pass", url: post(34, 30, 66), target: 30, acc: 0.66 },
  },
  {
    day: 35,
    phase: 6,
    title: "Read the player",
    goal: "Spot player types fast and adjust.",
    legend: "caro",
    sections: [
      { title: "Five player types", body: "Each common type of player has a simple counter.", visual: "archetypes" },
      { title: "Adjust to them", body: "Value bet calling stations, steal from nits and call down against maniacs." },
    ],
    quiz: [
      { q: "What's the best adjustment against a calling station?", options: ["Bluff more", "Value bet more", "Fold more"], answer: 1, explain: "They call too much." },
      { q: "What's the best adjustment against a nit?", options: ["Steal more", "Call their big bets", "Slow-play"], answer: 0, explain: "They fold too much." },
      { q: "What should you do against a maniac?", options: ["Call down lighter", "Bluff more", "Never call"], answer: 0, explain: "They bet with lots of weak hands." },
    ],
    drill: { label: "Practice against a calling station", url: pre("rfi,vsOpen,vsLimp", null, 35, 20, 72, "&villain=station"), target: 20, acc: 0.72 },
  },
  {
    day: 36,
    phase: 6,
    title: "Winning at $1/$2",
    goal: "The changes that make the most money.",
    legend: "miller",
    sections: [
      { title: "Value over bluffs", body: "Players at $1/$2 call too much and bluff too little. Bet your good hands big and bluff rarely." },
      { title: "Punish limpers", body: "Raise strong hands over limpers and fold weak offsuit hands.", visual: "chart:vl_LATE_1" },
    ],
    quiz: [
      { q: "Where does most of the money come from at $1/$2?", options: ["River bluffs", "Value bets", "4-bet bluffs"], answer: 1, explain: "They pay you off." },
      { q: "A passive player raises the river at $1/$2. What does that usually mean?", options: ["A bluff", "A very strong hand", "Nothing"], answer: 1, explain: "Respect it." },
      { q: "Should you raise KTo from early position over a limper?", options: ["Usually not", "Always", "Go all-in"], answer: 0, explain: "Weak offsuit hands play badly against several players." },
    ],
    drill: { label: "$1/$2 hands after the flop", url: post(36, 15, 62, "&villain=pool"), target: 15, acc: 0.62 },
  },
  {
    day: 37,
    phase: 6,
    title: "Beating $2/$5",
    goal: "Adjust to regulars and deep stacks.",
    legend: "straus",
    sections: [
      { title: "More regulars, deeper stacks", body: "Expect more 3-bets and 200bb stacks. Play big pots with big hands." },
      { title: "Respect big raises", body: "Turn and river raises at $2/$5 are rarely bluffs." },
    ],
    quiz: [
      { q: "With 250bb stacks, which hand gets better?", options: ["KQo", "65s", "AJo"], answer: 1, explain: "Suited connectors make big hands that are hard to see coming." },
      { q: "What does a river raise at $2/$5 usually mean?", options: ["A strong hand", "A bluff"], answer: 0, explain: "Most players don't bluff enough there." },
      { q: "How do you get heads-up with a loose opener?", options: ["3-bet", "Call", "Fold"], answer: 0, explain: "3-bet them and play them in position." },
    ],
    drill: { label: "Against a solid regular", url: post(37, 15, 62, "&villain=tag"), target: 15, acc: 0.62 },
  },
  {
    day: 38,
    phase: 6,
    title: "Mindset and bankroll",
    goal: "Protect your best game.",
    legend: "tendler",
    sections: [
      { title: "Decisions over results", body: "A good call can still lose. Judge the decision, not how it turned out." },
      { title: "Protect your bankroll", body: "Keep 20 to 30 buy-ins for your stakes, and quit when you're tilting." },
    ],
    quiz: [
      { q: "What happens when you improve your worst play?", options: ["Your whole game gets better", "Nothing changes", "You tilt more"], answer: 0, explain: "That's Jared Tendler's idea." },
      { q: "What is resulting?", options: ["Judging a decision by its outcome", "Figuring out equity", "Moving up in stakes"], answer: 0, explain: "It's a common trap." },
      { q: "What's a safe live bankroll?", options: ["2 to 3 buy-ins", "20 to 30 buy-ins or more", "No limit"], answer: 1, explain: "Swings are big in live poker." },
    ],
  },
  {
    day: 39,
    phase: 6,
    title: "Build the habit",
    goal: "A routine that keeps you improving.",
    legend: "angelo",
    sections: [
      { title: "A daily routine", body: "One session, one lesson and your mistakes review. A little every day beats a marathon on the weekend." },
      { title: "Review your hands", body: "After you play, pick 3 hands. Write down the ranges, the price and the right play." },
    ],
    quiz: [
      { q: "Which habit helps the most?", options: ["Short daily sessions", "One long session a week", "Only playing"], answer: 0, explain: "Practice that's spread out sticks better." },
      { q: "What do you look at first when reviewing a hand?", options: ["The ranges", "The result", "Your mood"], answer: 0, explain: "Ranges first, result last." },
      { q: "When do your mistakes come back?", options: ["At growing intervals", "Never", "At random"], answer: 0, explain: "Seeing them again later helps them stick." },
    ],
    drill: { label: "Full hands after the flop", url: post(39, 20, 64), target: 20, acc: 0.64 },
  },
  {
    day: 40,
    phase: 6,
    boss: true,
    title: "Black belt exam",
    goal: "Every preflop spot at a pro level.",
    legend: "hellmuth",
    sections: [{ title: "The final exam", body: "40 mixed preflop decisions at 82%. After this, keep every seat's belt climbing." }],
    quiz: [
      { q: "What matters most before the flop?", options: ["Position", "The dealer", "Your last result"], answer: 0, explain: "Position shapes every range." },
      { q: "You have JJ and a nit 4-bets you. What do you do?", options: ["Fold", "Go all-in", "Min-raise"], answer: 0, explain: "A nit's 4-bet is KK+ or AK." },
      { q: "A great decision that loses the pot is what?", options: ["Still a great decision", "A mistake", "Bad luck and a mistake"], answer: 0, explain: "Judge decisions, not results." },
    ],
    drill: { label: "Final exam: 40 hands, 82% to pass", url: pre("rfi,vsOpen,vs3bet,vs4bet,vsLimp", null, 40, 40, 82), target: 40, acc: 0.82 },
  },
];

export const DAY_BY_NUM: Record<number, Day> = Object.fromEntries(DAYS.map((d) => [d.day, d]));

export interface GlossaryTerm {
  term: string;
  def: string;
  formula?: string;
}

export const GLOSSARY: GlossaryTerm[] = [
  { term: "GTO", def: "A strategy nobody can exploit. It's a great default, but it won't win the most against weak players." },
  { term: "Exploit", def: "Changing how you play to take advantage of a player's mistakes." },
  { term: "Range", def: "Every hand a player could have in a spot." },
  { term: "Combo", def: "One specific two-card hand. Pairs have 6, suited hands have 4 and offsuit hands have 12." },
  { term: "Equity", def: "Your share of the pot if all the cards were dealt out." },
  { term: "Pot odds", def: "The equity you need to call.", formula: "call ÷ (pot + call)" },
  { term: "Minimum defense", def: "How much of your range needs to keep playing against a bet.", formula: "pot ÷ (pot + bet)" },
  { term: "Bluff break-even", def: "How often a bluff needs to work.", formula: "bet ÷ (pot + bet)" },
  { term: "Bluff share", def: "How many of your river bets can be bluffs.", formula: "bet ÷ (pot + 2 × bet)" },
  { term: "Fold equity", def: "What you win when they fold." },
  { term: "Implied odds", def: "Chips you win later when you hit." },
  { term: "Stack-to-pot ratio", def: "Your stack divided by the pot on the flop.", formula: "stack ÷ pot" },
  { term: "Range advantage", def: "When one player's range has more equity on the board." },
  { term: "Nut advantage", def: "When one player's range has more of the best hands." },
  { term: "Polarized", def: "Strong hands and bluffs, with few medium hands." },
  { term: "Blocker", def: "A card you hold that makes some of their hands impossible." },
  { term: "C-bet", def: "When the preflop raiser bets the flop." },
  { term: "Iso-raise", def: "Raising over limpers to play the weak player heads-up." },
  { term: "Squeeze", def: "A 3-bet after someone opens and someone else calls." },
  { term: "Resulting", def: "Judging a decision by how it turned out." },
];
