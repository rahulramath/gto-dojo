export interface Deeper {
  label: "Example" | "The math" | "Common mistake" | "Live exploit" | "Pro tip";
  body: string;
}

export interface LessonSection {
  title: string;
  body: string;
  deeper?: Deeper[];
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
  { id: 1, name: "Foundations", belt: "yellow", blurb: "Positions, combos, opening ranges and pot odds." },
  { id: 2, name: "Facing Opens", belt: "orange", blurb: "Blind defense, 3-bets, blockers and blind battles." },
  { id: 3, name: "Re-raised Pots & Live Preflop", belt: "green", blurb: "3-bets, 4-bets, stack depth, limpers and live sizing." },
  { id: 4, name: "Flop Play", belt: "blue", blurb: "Textures, range advantage, c-bets, defense and draws." },
  { id: 5, name: "Turn & River", belt: "brown", blurb: "Barrels, pot control, value, bluffs and bluff-catching." },
  { id: 6, name: "Exploits & Mastery", belt: "black", blurb: "Player types, live pools, mindset and the final exam." },
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
    goal: "Know every seat, the order of action, and why the button prints money.",
    legend: "sexton",
    sections: [
      {
        title: "The seats",
        body: "Six-max seats in order of preflop action: UTG (also called Lojack), Hijack, Cutoff, Button, Small Blind, Big Blind. Full-ring games (most live $1/$2 and $2/$5 tables) add UTG, UTG+1 and UTG+2 before the Lojack. Preflop, action starts left of the big blind. After the flop, the small blind acts first and the button acts last.",
        deeper: [
          { label: "Example", body: "At a 9-handed live table, if you're two seats right of the button you're the Hijack. If you're directly right of the button, you're the Cutoff." },
          { label: "Pro tip", body: "Name the seats out loud in your first few live sessions. Knowing instantly how many players are left to act is the first input to every preflop decision." },
        ],
      },
      {
        title: "Why acting last wins",
        body: "The player in position sees what the opponent does before deciding. They can bet when checked to, take free cards, control the pot size, and bluff at the right moments. That information advantage is worth a lot: the button is the most profitable seat for nearly every winning player.",
        deeper: [
          { label: "The math", body: "Out of position you typically 'realize' only ~70-85% of your raw equity; in position you can realize 100% or more. Same cards, different results." },
          { label: "Common mistake", body: "Calling raises out of position with hands that would be fine on the button. Position changes what a hand is worth." },
        ],
      },
      {
        title: "Ranges widen toward the button",
        body: "Because fewer players remain to act and you'll have position more often, each seat can open more hands than the one before. Roughly: UTG ~18%, Hijack ~23%, Cutoff ~29%, Button ~45% (6-max). Full-ring UTG is only ~11%.",
        deeper: [{ label: "Live exploit", body: "In loose live games, tighten early-position offsuit hands further — you'll often get called by several players, and weak kickers get punished multiway." }],
      },
    ],
    quiz: [
      { q: "Which seat acts last on every postflop street?", options: ["Big blind", "Button", "Cutoff"], answer: 1, explain: "The button acts last on the flop, turn and river — that's why it's the best seat." },
      { q: "In 6-max, which seat opens the widest range?", options: ["UTG", "Cutoff", "Button"], answer: 2, explain: "With only the blinds behind and guaranteed position, the button opens ~45%." },
      { q: "Why do early seats open tighter?", options: ["More players left to act who can hold strong hands", "The blinds are bigger", "They always have position"], answer: 0, explain: "More players behind means a higher chance someone has a big hand, and you'll often be out of position." },
    ],
    drill: { label: "Open from UTG and the Button", url: pre("rfi", "LJ,BTN", 1, 20, 70, "&table=6"), target: 20, acc: 0.7 },
  },
  {
    day: 2,
    phase: 1,
    title: "Hands, combos and card removal",
    goal: "Count combinations like a pro — the foundation of range thinking.",
    legend: "brunson",
    sections: [
      {
        title: "169 hands, 1,326 combos",
        body: "There are 169 distinct starting hands but 1,326 two-card combinations. Every pocket pair has 6 combos, every suited hand 4, every offsuit hand 12. So AKo is three times as likely as AKs, and there are as many AKo combos (12) as AA+KK combined (12).",
        deeper: [
          { label: "The math", body: "Pairs: C(4,2) = 6. Suited: 4 suits = 4. Offsuit: 4×3 = 12. Total: 13×6 + 78×4 + 78×12 = 1,326." },
          { label: "Example", body: "A range of 'QQ+, AK' is 18 pair combos + 16 AK combos = 34 combos, about 2.6% of all hands." },
        ],
      },
      {
        title: "Card removal (blockers)",
        body: "Cards you hold, or that are on the board, can't be in your opponent's hand. Holding one ace cuts their AA combos from 6 to 3 and their AK combos from 16 to 12. This is why hands like A5s make good 3-bet bluffs: they make it less likely the opponent has the hands that fight back.",
        deeper: [{ label: "The math", body: "With an ace in your hand, 3 aces remain: AA = C(3,2) = 3 combos; AK = 3 aces × 4 kings = 12 combos." }],
      },
      {
        title: "Thinking in ranges",
        body: "Nobody has 'a hand' — they have a range of hands, each with a weight. Good decisions are made against the whole range: how often you're ahead, how often they fold, how often they improve.",
        deeper: [{ label: "Pro tip", body: "When you face a bet, list the value hands and the bluffs they could have, then count combos of each. It turns guessing into arithmetic." }],
      },
    ],
    quiz: [
      { q: "How many combinations of AKo are there?", options: ["4", "12", "16"], answer: 1, explain: "4 aces × 3 non-matching-suit kings = 12 offsuit combos." },
      { q: "You hold A♠5♠. How many AA combos can your opponent have?", options: ["6", "3", "1"], answer: 1, explain: "Only 3 aces remain, and C(3,2) = 3." },
      { q: "How many combos does a single pocket pair have?", options: ["4", "6", "12"], answer: 1, explain: "Choose 2 of 4 suits: 6." },
    ],
    drill: { label: "Combo counting sprint", url: math("combos", 2), target: 10, acc: 0.8 },
  },
  {
    day: 3,
    phase: 1,
    title: "Early position discipline",
    goal: "Open a tight, linear range from UTG in 6-max and full ring.",
    legend: "harrington",
    sections: [
      {
        title: "A linear range",
        body: "Early-position ranges are 'linear': you open the strongest hands and stop at a threshold. Pairs down to about 55 (smaller pairs mix), suited aces, strong suited broadways, a few suited connectors, and offsuit hands only down to ATo/KJo (6-max). Full-ring UTG is tighter still: 66+, ATs+, KTs+, AQo+.",
        deeper: [
          { label: "Common mistake", body: "Opening KTo, QJo or A9o from UTG because they 'look pretty'. Against tight continuing ranges they're dominated by AK/AQ/KQ and play badly out of position." },
          { label: "Example", body: "UTG, 6-max, 100bb: A5s is an open (nut flush potential + ace blocker), A9o is a fold." },
        ],
      },
      {
        title: "Why suited hands survive and offsuit hands don't",
        body: "Suited hands make flushes and flush draws, letting them continue on more flops and win bigger pots. Offsuit hands with weak kickers mostly make one pair — and one pair with a bad kicker loses the big pots.",
      },
      {
        title: "Full ring vs 6-max",
        body: "At a 9-handed table, UTG has eight players behind instead of five. Each extra player adds another chance someone wakes up with a premium, so UTG in full ring opens only ~11% and UTG+2 about ~16%. The Lojack onward plays the same as the matching 6-max seat.",
        deeper: [{ label: "Live exploit", body: "At $1/$2, early-position raises often get 2-3 callers. Favor hands that make the nuts (pairs, suited aces, suited broadways) over offsuit hands." }],
      },
    ],
    quiz: [
      { q: "Which hand is a standard fold UTG in 6-max?", options: ["A5s", "KQo", "A9o"], answer: 2, explain: "A9o is dominated too often; A5s and KQo are opens." },
      { q: "Why does full-ring UTG open fewer hands than 6-max UTG?", options: ["More players left to act", "The blinds are smaller", "Rake is higher"], answer: 0, explain: "Eight players behind vs five means strong hands show up more often." },
      { q: "An early-position range that opens the best hands down to a threshold is called…", options: ["Polarized", "Linear", "Capped"], answer: 1, explain: "Linear ranges contain the best hands in order, without skipping medium hands." },
    ],
    drill: { label: "Early-position opens (full ring)", url: pre("rfi", "EP1,EP2,EP3,LJ", 3, 20, 75, "&table=9"), target: 20, acc: 0.75 },
  },
  {
    day: 4,
    phase: 1,
    title: "Stealing from the cutoff and button",
    goal: "Open wide and profitably from late position.",
    legend: "brunson",
    sections: [
      {
        title: "Steal math",
        body: "Raising 2.5bb to win the 1.5bb in the blinds, a pure bluff profits if everyone folds more than 2.5 ÷ (2.5 + 1.5) = 62.5% of the time. From the button, both blinds together fold more often than that against a solid open — before you even count the times you win after being called.",
        deeper: [{ label: "The math", body: "Breakeven fold % = risk ÷ (risk + reward). Risk 2.5bb to win 1.5bb → 2.5 / 4 = 62.5%." }],
      },
      {
        title: "What gets added",
        body: "Cutoff (~29%) adds more suited kings and queens, suited one-gappers and offsuit broadways like KTo and QTo. Button (~45%) opens every pair, every suited ace and king, most suited hands, and offsuit hands down to about K8o, Q9o, J9o, T8o.",
        deeper: [{ label: "Common mistake", body: "Opening the button too tight. If you only open 25% on the button, you're giving the blinds their money back." }],
      },
      {
        title: "Sizing",
        body: "Online and solver baselines use 2.5bb. Live, standard opens are bigger ($10-$15 at $1/$2) because live players call too much. Bigger sizes mean fewer folds, so tighten the very bottom of your range slightly when you size up.",
        deeper: [{ label: "Live exploit", body: "Against tight blinds (nits), steal even wider. Against blinds that 3-bet a lot, tighten and 4-bet your strong hands." }],
      },
    ],
    quiz: [
      { q: "Raising 2.5bb into a 1.5bb pot, how often must everyone fold for a pure bluff to break even?", options: ["37.5%", "50%", "62.5%"], answer: 2, explain: "2.5 ÷ (2.5 + 1.5) = 62.5%." },
      { q: "About what percent of hands does the button open at 100bb?", options: ["25%", "45%", "70%"], answer: 1, explain: "Roughly 43-46% depending on rake and sizing." },
      { q: "Which is a standard button open?", options: ["K8o", "72o", "J3o"], answer: 0, explain: "K8o is near the bottom of the button range; the others are folds." },
    ],
    drill: { label: "Cutoff and button opens", url: pre("rfi", "CO,BTN", 4, 25, 78), target: 25, acc: 0.78 },
  },
  {
    day: 5,
    phase: 1,
    title: "The small blind",
    goal: "Play the hardest seat with a simple raise-or-fold plan.",
    legend: "harrington",
    sections: [
      {
        title: "Why the small blind is hard",
        body: "You already have half a blind invested, but you'll be out of position against the big blind on every street. Even winning players usually lose money from the small blind — the goal is to lose as little as possible.",
      },
      {
        title: "Raise or fold",
        body: "When it folds to you, raise to about 3bb with ~45% of hands and fold the rest. Solvers also use a limping strategy, but raise-or-fold is simpler and nearly as good. Against an open from another seat, 3-bet or fold: flatting invites the big blind to squeeze and leaves you out of position.",
        deeper: [
          { label: "Common mistake", body: "Completing (limping) the small blind with junk because 'it's only half a bet'. You're buying a hand you'll play out of position against a player who can raise you." },
          { label: "Pro tip", body: "3-bet sizes from the small blind should be bigger (about 4-4.5x the open) because you'll be out of position." },
        ],
      },
      {
        title: "3-bet or fold vs a button open",
        body: "The button opens ~45%, so the small blind can 3-bet about 18%: pairs 88+, most suited aces and broadways, some suited connectors, and offsuit broadways. A few small pairs flat.",
      },
    ],
    quiz: [
      { q: "The standard small-blind strategy when folded to is…", options: ["Complete everything", "Raise or fold", "Limp strong hands"], answer: 1, explain: "Raise-or-fold to ~3bb is the simple, strong baseline." },
      { q: "Why does the small blind 3-bet rather than flat a button open?", options: ["Flatting is out of position and the BB can squeeze", "Flatting is illegal", "The button never folds"], answer: 0, explain: "Calling leaves you OOP in a multiway-capable pot with the BB behind." },
      { q: "3-bet sizing from the small blind should be…", options: ["Smaller than in position", "The same", "Bigger than in position"], answer: 2, explain: "Out of position you size up (~4-4.5x) to deny equity and win more pots immediately." },
    ],
    drill: { label: "Small blind: opens and vs opens", url: pre("rfi,vsOpen", "SB", 5, 20, 75), target: 20, acc: 0.75 },
  },
  {
    day: 6,
    phase: 1,
    title: "Pot odds 101",
    goal: "Instantly convert any bet into the equity you need.",
    legend: "caro",
    sections: [
      {
        title: "The formula",
        body: "Required equity = amount to call ÷ (pot after your call). If the pot is $100 and they bet $50, you call $50 to win $200 total: 50 ÷ 200 = 25%. You need to win at least 25% of the time to break even.",
        deeper: [
          { label: "The math", body: "Common sizes: ⅓ pot → 20%, ½ pot → 25%, ⅔ pot → 28.6%, ¾ pot → 30%, pot → 33.3%, 2× pot → 40%." },
          { label: "Example", body: "BB facing a 2.5bb button open: call 1.5bb into 4bb (2.5 + 0.5 + 1). Required = 1.5 ÷ 5.5 = 27%." },
        ],
      },
      {
        title: "Equity vs a range",
        body: "Compare the required equity to your equity against their range, not against their best hand. A flush draw has ~36% equity with two cards to come but only ~19% with one card to come.",
      },
      {
        title: "Implied odds",
        body: "When you hit, you often win more on later streets. Implied odds let you call slightly worse prices with hands that make disguised, strong hands (sets, straights, flushes). Reverse implied odds are the opposite: weak made hands that win small pots and lose big ones.",
        deeper: [{ label: "Live exploit", body: "Live $1/$2 players pay off big hands, so implied odds are larger. But they also bluff less, so don't pay off big river bets with bluff-catchers." }],
      },
    ],
    quiz: [
      { q: "Facing a pot-sized bet, what equity do you need to call?", options: ["25%", "33%", "50%"], answer: 1, explain: "Call 1 to win 3 (pot + bet + your call): 1/3 = 33%." },
      { q: "Pot $80, villain bets $40. Required equity?", options: ["20%", "25%", "33%"], answer: 1, explain: "40 ÷ (80 + 40 + 40) = 25%." },
      { q: "Implied odds are…", options: ["Money you expect to win on later streets when you hit", "The rake", "Your equity vs a random hand"], answer: 0, explain: "They let drawing hands call slightly worse direct odds." },
    ],
    drill: { label: "Pot odds sprint", url: math("potodds", 6), target: 10, acc: 0.8 },
  },
  {
    day: 7,
    phase: 1,
    boss: true,
    title: "Yellow Belt exam: opening ranges",
    goal: "Prove you can open correctly from every seat.",
    legend: "moneymaker",
    sections: [
      {
        title: "What's tested",
        body: "Raise-first-in decisions from every seat, 6-max and full ring. Expect mixed-frequency hands on the edges of ranges: those are where points are won and lost.",
      },
      {
        title: "Exam tips",
        body: "Count players left to act. Ask whether the hand is suited, connected, or a pair. Fold dominated offsuit hands early; open more from the cutoff and button; raise-or-fold from the small blind.",
      },
    ],
    quiz: [
      { q: "From the cutoff, is KTo usually an open?", options: ["Yes, mostly", "Never", "Only when stacks are 20bb"], answer: 0, explain: "KTo opens from the cutoff most of the time." },
      { q: "From full-ring UTG, is 44 an open?", options: ["Always", "Mixed/sometimes", "Never"], answer: 1, explain: "Small pairs mix in full-ring UTG." },
      { q: "Which seat raise-or-folds against only the big blind?", options: ["Button", "Small blind", "Hijack"], answer: 1, explain: "The small blind." },
    ],
    drill: { label: "Exam: 30 opens from every seat at 80%+", url: pre("rfi", null, 7, 30, 80), target: 30, acc: 0.8 },
  },
  {
    day: 8,
    phase: 2,
    title: "Big blind defense I: the price",
    goal: "Defend the big blind wide enough that stealing isn't free.",
    legend: "janda",
    sections: [
      {
        title: "Closing the action",
        body: "The big blind already has 1bb in and closes the action, so no one can raise behind you. Against a 2.5bb button open you need only ~27% equity — almost any two cards have that much against a wide range. That's why the big blind defends ~55% vs the button.",
        deeper: [{ label: "The math", body: "Call 1.5bb to win 5.5bb total: 1.5 / 5.5 = 27.3%. Even 72o has ~30% equity vs a button opening range, but it realizes far less." }],
      },
      {
        title: "Equity realization",
        body: "Raw equity overstates what an out-of-position hand actually earns, because you'll fold some of your equity on later streets. Suited and connected hands realize more; offsuit, disconnected hands realize less. Defend suited hands very wide and offsuit hands selectively.",
        deeper: [{ label: "Common mistake", body: "Folding suited hands like Q4s or J6s vs a button min-raise. They defend profitably; offsuit versions often don't." }],
      },
      {
        title: "Minimum defense frequency",
        body: "If you fold too much, the opener profits with any two cards. Minimum defense frequency (MDF) = pot ÷ (pot + bet) tells you how much of your range must continue to stop auto-profit bluffs. Preflop it's a guide, not a rule — but big blind over-folding is the #1 leak in most players' games.",
      },
    ],
    quiz: [
      { q: "BB facing a 2.5bb BTN open. Required equity to call?", options: ["~20%", "~27%", "~40%"], answer: 1, explain: "1.5 ÷ 5.5 ≈ 27%." },
      { q: "Which realizes more equity out of position?", options: ["K5s", "K5o", "They're equal"], answer: 0, explain: "Suited hands make flushes/draws and continue more often." },
      { q: "Roughly how often does the BB defend vs a button open at 100bb?", options: ["~20%", "~55%", "~85%"], answer: 1, explain: "About 55-60% including 3-bets." },
    ],
    drill: { label: "Big blind defense", url: pre("vsOpen", "BB", 8, 25, 72), target: 25, acc: 0.72 },
  },
  {
    day: 9,
    phase: 2,
    title: "Big blind defense II: versus early opens",
    goal: "Tighten correctly against strong ranges.",
    legend: "janda",
    sections: [
      {
        title: "Same price, stronger range",
        body: "The price vs a UTG open is the same as vs a button open, but UTG's range is far stronger. Offsuit hands that were defends vs the button (K8o, Q9o, J8o) become folds; suited hands, pairs and connected hands still defend.",
      },
      {
        title: "3-betting from the big blind",
        body: "Big blind 3-bets are polarized-leaning: premiums (QQ+, AK, AQs) plus hands with blockers and playability (A5s-A2s, some suited connectors and kings). Size up to about 4-4.5x the open because you'll be out of position.",
        deeper: [{ label: "Pro tip", body: "Choose 3-bet bluffs that are too weak to call profitably but have good blockers — they gain the most from folding out the opener's range." }],
      },
      {
        title: "Multiway and squeezes",
        body: "When there's an open and a call before you, the price improves further but you face two ranges. Defend tighter with offsuit hands; squeeze (3-bet) your strong hands and some suited blockers.",
        deeper: [{ label: "Live exploit", body: "At $1/$2 many opens get called several times. Big blind: call more suited/connected hands for multiway implied odds, squeeze only for value." }],
      },
    ],
    quiz: [
      { q: "Vs a UTG open, which hand is a BB defend?", options: ["K8o", "J8s", "Q7o"], answer: 1, explain: "Suited connectors keep defending; weak offsuit hands fold vs strong ranges." },
      { q: "BB 3-bet sizes should be…", options: ["~2x", "~3x", "~4-4.5x the open"], answer: 2, explain: "Out of position you size up." },
      { q: "Good BB 3-bet bluff candidate?", options: ["A4s", "K9o", "63o"], answer: 0, explain: "Ace blocker, nut flush potential and wheel straights." },
    ],
    drill: { label: "BB vs every seat", url: pre("vsOpen", "BB", 9, 25, 72), target: 25, acc: 0.72 },
  },
  {
    day: 10,
    phase: 2,
    title: "The 3-bet: value and bluffs",
    goal: "Know why and what to 3-bet from each seat.",
    legend: "tipton",
    sections: [
      {
        title: "Two reasons to 3-bet",
        body: "Value: your hand is ahead of the hands that continue (QQ+, AK, and vs late opens also JJ, TT, AQ, AJs, KQs). Bluff: your hand does poorly as a call but gains from folds and has blockers or playability (A5s-A2s, K9s, suited connectors).",
      },
      {
        title: "Linear vs polarized",
        body: "A linear 3-bet range is the best hands in order (common vs very wide ranges or when calling isn't an option, like from the small blind). A polarized range is strong hands plus bluffs, with medium hands flatted (common in position, where flatting is attractive).",
        deeper: [{ label: "Example", body: "BTN vs CO: 3-bet QQ+, AK, AQs, A5s, 76s; flat 99, AJs, KQs, T9s. SB vs BTN: mostly linear, 3-bet 88+, A9s+, KTs+, ATo+ and suited connectors." }],
      },
      {
        title: "Sizing",
        body: "In position, 3-bet to about 3x the open (7.5bb vs 2.5bb). Out of position, about 4-4.5x (10-11bb). Live, versus bigger opens, scale the same multipliers.",
        deeper: [{ label: "Live exploit", body: "Against $1/$2 players who never fold to 3-bets, cut the bluffs and 3-bet more value hands (AJ, KQ, TT) — they'll call with worse." }],
      },
    ],
    quiz: [
      { q: "Which hand is typically a 3-bet bluff rather than value?", options: ["KK", "A5s", "AK"], answer: 1, explain: "A5s is a blocker-bluff; KK and AK are value." },
      { q: "A range made of strong hands and bluffs with medium hands removed is…", options: ["Linear", "Polarized", "Merged"], answer: 1, explain: "Polarized = strong + bluffs." },
      { q: "3-bet size in position vs a 2.5bb open?", options: ["~5bb", "~7.5bb", "~15bb"], answer: 1, explain: "About 3x." },
    ],
    drill: { label: "3-bet or call from late position", url: pre("vsOpen", "CO,BTN", 10, 25, 70), target: 25, acc: 0.7 },
  },
  {
    day: 11,
    phase: 2,
    title: "Blockers and bluff selection",
    goal: "Pick bluffs that remove your opponent's best hands.",
    legend: "tipton",
    sections: [
      {
        title: "Blocker math",
        body: "Holding an ace removes 50% of AA combos (6 → 3) and 25% of AK combos (16 → 12). Holding a king does the same for KK and AK. Fewer strong combos in their range means they fold more often and 4-bet less.",
      },
      {
        title: "Why A5s and not A9o",
        body: "A5s blocks aces, has nut-flush potential and makes wheel straights, and it's too weak to call profitably. A9o has similar blockers but plays worse when called and has more reverse implied odds (dominated by AT+).",
        deeper: [{ label: "Common mistake", body: "3-bet bluffing with hands like 94s. No blockers, little playability — they lose when called and don't reduce the opener's strong hands." }],
      },
      {
        title: "Unblocking folds",
        body: "Great bluffs also avoid blocking the hands you want your opponent to fold. That matters most on the river, but the idea starts preflop: bluff with hands that don't hold cards from the opener's weak folding hands.",
      },
    ],
    quiz: [
      { q: "You hold A♦4♦. How many AK combos can the opener have?", options: ["16", "12", "8"], answer: 1, explain: "3 aces × 4 kings = 12." },
      { q: "Best 3-bet bluff vs a cutoff open?", options: ["A3s", "Q6o", "94s"], answer: 0, explain: "Ace blocker plus playability." },
      { q: "Holding a king reduces opponents' KK combos by…", options: ["25%", "50%", "100%"], answer: 1, explain: "From 6 to 3." },
    ],
    drill: { label: "Facing opens from every seat", url: pre("vsOpen", null, 11, 25, 70), target: 25, acc: 0.7 },
  },
  {
    day: 12,
    phase: 2,
    title: "Flat or 3-bet in position",
    goal: "Choose between calling and 3-betting when you have position.",
    legend: "galfond",
    sections: [
      {
        title: "Why flat in position",
        body: "In position, calling realizes your equity well and keeps the opener's weaker hands in. Pairs, suited broadways and suited connectors are good flats versus early and middle opens.",
      },
      {
        title: "Squeeze risk",
        body: "Players behind you can 3-bet (squeeze) after you call. The more players left behind, and the more aggressive they are, the tighter your flatting range should be. The button has only the blinds behind, so it flats the most.",
        deeper: [{ label: "Example", body: "HJ vs UTG: mostly 3-bet or fold. BTN vs UTG: flat lots of pairs and suited hands." }],
      },
      {
        title: "Against early vs late opens",
        body: "Versus early opens, 3-bet only strong hands plus a few blockers and flat good hands. Versus late opens, 3-bet much more often, including linear value like AJs, KQs and TT.",
        deeper: [{ label: "Live exploit", body: "In live games, flatting in position is more attractive because stacks are deep and opponents make postflop mistakes. Set mining small pairs IP gets better with deep stacks." }],
      },
    ],
    quiz: [
      { q: "Which seat can flat the most vs an open?", options: ["Hijack", "Button", "Small blind"], answer: 1, explain: "Only the blinds are behind the button." },
      { q: "A squeeze is…", options: ["A 3-bet after an open and a call", "A limp-raise", "A small c-bet"], answer: 0, explain: "It punishes wide flats." },
      { q: "Versus a UTG open from the HJ, the default is…", options: ["Flat wide", "3-bet or fold, few flats", "Always 4-bet"], answer: 1, explain: "Four players behind and a strong opening range." },
    ],
    drill: { label: "HJ, CO and BTN vs opens", url: pre("vsOpen", "HJ,CO,BTN", 12, 25, 70), target: 25, acc: 0.7 },
  },
  {
    day: 13,
    phase: 2,
    title: "Blind vs blind",
    goal: "Win the SB vs BB battle and the BB's reply.",
    legend: "janda",
    sections: [
      {
        title: "Small blind opens wide",
        body: "When it folds to the small blind, only the big blind remains. The SB raises ~45% to 3bb. The BB, being in position for the whole hand, defends very wide — about 48% calls plus ~8% 3-bets.",
      },
      {
        title: "BB 3-bets are more linear",
        body: "Because the SB range is wide and capped, the BB can 3-bet for value with hands like 99, ATs, KJs, AJo, and add suited connectors as semi-bluffs.",
      },
      {
        title: "SB facing a BB 3-bet",
        body: "Blind-vs-blind 3-bets are wide, so the SB defends ~40% of its opens even out of position: pairs, suited broadways, suited aces, and a few 4-bet bluffs like A5s.",
        deeper: [{ label: "Common mistake", body: "Folding too much to BB 3-bets after opening the SB wide. If you open 45% and fold to every 3-bet without a premium, the BB profits with any two." }],
      },
    ],
    quiz: [
      { q: "In SB vs BB, who is in position after the flop?", options: ["Small blind", "Big blind"], answer: 1, explain: "The big blind acts last postflop." },
      { q: "BB defense vs an SB open is…", options: ["Very wide", "Very tight", "Always 3-bet"], answer: 0, explain: "Position plus a good price." },
      { q: "BB 3-bets vs the SB tend to be…", options: ["Only AA/KK", "More linear", "Only bluffs"], answer: 1, explain: "Vs a wide, capped range, value 3-bets widen." },
    ],
    drill: { label: "Blind battles", url: pre("rfi,vsOpen", "SB,BB", 13, 25, 72), target: 25, acc: 0.72 },
  },
  {
    day: 14,
    phase: 2,
    boss: true,
    title: "Orange Belt exam: facing opens",
    goal: "Defend, flat and 3-bet correctly from every seat.",
    legend: "straus",
    sections: [
      { title: "What's tested", body: "Facing an open from every seat: 3-bet, call, or fold. Big blind defense and small blind 3-bet-or-fold are the heaviest-weighted spots." },
      { title: "Exam tips", body: "Ask who opened (range width), whether you'll have position, and whether your hand wants value, fold equity, or a cheap flop." },
    ],
    quiz: [
      { q: "BB vs BTN min-raise with J5s. Default?", options: ["Fold", "Call", "4-bet"], answer: 1, explain: "Suited hands defend wide at this price." },
      { q: "SB vs CO open with 76s?", options: ["Call", "Mostly fold, sometimes 3-bet", "Always 3-bet"], answer: 1, explain: "SB is 3-bet-or-fold; 76s mixes in as an occasional 3-bet." },
      { q: "BTN vs HJ open with AQo?", options: ["Fold", "Mix 3-bet and call", "Jam"], answer: 1, explain: "AQo is a mixed 3-bet/call in position." },
    ],
    drill: { label: "Exam: 30 hands facing opens at 78%+", url: pre("vsOpen", null, 14, 30, 78), target: 30, acc: 0.78 },
  },
  {
    day: 15,
    phase: 3,
    title: "Facing 3-bets",
    goal: "Defend your opens against 3-bets without over-folding.",
    legend: "straus",
    sections: [
      {
        title: "How much to continue",
        body: "If you fold too often to 3-bets, opponents can 3-bet you with any two cards. Continue roughly 35-50% of your opening range: more in position and against wide 3-bettors, less out of position and against tight ones.",
      },
      {
        title: "In position vs out of position",
        body: "Facing a blind 3-bet you'll be in position, so calling is attractive with pairs, suited broadways and suited connectors. Facing a 3-bet from a later seat you'll be out of position: 4-bet or fold more, and call only strong, playable hands.",
      },
      {
        title: "SPR in 3-bet pots",
        body: "After a 3-bet and call, the pot is ~20bb with ~90bb behind: a stack-to-pot ratio around 4. With SPR 4, top pair good kicker often commits. Plan your hand before you call.",
        deeper: [{ label: "Live exploit", body: "Unknown $1/$2 players 3-bet mostly QQ+/AK. Fold hands like AJo and KQo more often against them, and call pairs to set-mine if stacks are deep." }],
      },
    ],
    quiz: [
      { q: "Why continue a decent share of opens vs 3-bets?", options: ["To stop profitable light 3-bets", "Because 3-bets are always bluffs", "To reduce rake"], answer: 0, explain: "Over-folding lets them 3-bet any two cards." },
      { q: "Facing a blind 3-bet after opening the button, you are…", options: ["In position", "Out of position"], answer: 0, explain: "The blinds act first postflop." },
      { q: "SPR in a typical 100bb 3-bet pot?", options: ["~1", "~4", "~12"], answer: 1, explain: "About 20bb pot, 90bb behind." },
    ],
    drill: { label: "Facing 3-bets", url: pre("vs3bet", null, 15, 25, 70), target: 25, acc: 0.7 },
  },
  {
    day: 16,
    phase: 3,
    title: "4-bets and stack-offs",
    goal: "Build 4-bet ranges and know when to get it in.",
    legend: "chen",
    sections: [
      {
        title: "4-bet ranges",
        body: "Value: KK+ and AK (plus QQ some of the time). Bluffs: a few hands with ace/king blockers like A5s-A4s. Size about 2.2-2.5x the 3-bet in position and ~2.8-3x out of position.",
      },
      {
        title: "Facing a 4-bet",
        body: "At 100bb, calling a 4-bet leaves an SPR near 1. Jam KK+, AK and a few blocker bluffs; call QQ-JJ and AQs sometimes, especially in position; fold 3-bet bluffs.",
        deeper: [{ label: "The math", body: "If a 4-bet range is KK+/AK (28 combos), QQ has about 41% equity. Getting ~2:1 on a jam, that's close to break-even." }],
      },
      {
        title: "Live reality",
        body: "Live 4-bets are rarely bluffs, especially at $1/$2 and $2/$5. Against an unknown, a 4-bet is usually KK+ or AK. Tighten your stack-off range accordingly.",
      },
    ],
    quiz: [
      { q: "Typical 4-bet bluff?", options: ["A5s", "JTo", "22"], answer: 0, explain: "Ace blocker with playability." },
      { q: "Facing a 4-bet with a pure 3-bet bluff, you…", options: ["Fold", "Call", "Jam"], answer: 0, explain: "Your bluff has done its job — or failed. Fold." },
      { q: "Against an unknown live player, a 4-bet is usually…", options: ["A bluff", "KK+/AK", "Suited connectors"], answer: 1, explain: "Live populations under-bluff 4-bets." },
    ],
    drill: { label: "Facing 4-bets", url: pre("vs4bet", null, 16, 20, 72), target: 20, acc: 0.72 },
  },
  {
    day: 17,
    phase: 3,
    title: "Stack depth and implied odds",
    goal: "Adjust for deep live stacks.",
    legend: "negreanu",
    sections: [
      {
        title: "Deeper stacks change hand values",
        body: "At 200bb+, hands that make the nuts (small pairs, suited connectors, suited aces) gain value because they can win huge pots. Hands that make one strong pair (AJo, KQo) lose value because they get stacked by sets and two pair.",
      },
      {
        title: "The set-mining rule",
        body: "Calling to flop a set needs implied odds. A rough rule: call when effective stacks are at least 15-20 times the amount to call, and your opponent is likely to pay off.",
        deeper: [{ label: "The math", body: "You flop a set about 11.8% of the time (1 in 8.5). If you call 5bb, you need to win ~37.5bb+ on average when you hit." }],
      },
      {
        title: "SPR planning",
        body: "Low SPR (<3): top pair is often a stack-off hand. Medium SPR (3-8): proceed carefully with one pair. High SPR (>8): big pots need big hands.",
        deeper: [{ label: "Live exploit", body: "At $2/$5 with $1,000 stacks, avoid bloating pots out of position with offsuit broadways. Play for the nuts in big pots." }],
      },
    ],
    quiz: [
      { q: "How often do you flop a set with a pocket pair?", options: ["~5%", "~12%", "~25%"], answer: 1, explain: "About 1 in 8.5." },
      { q: "Which hands gain the most with deeper stacks?", options: ["Offsuit broadways", "Small pairs and suited connectors", "Offsuit aces"], answer: 1, explain: "They make disguised nutted hands." },
      { q: "At SPR 2, top pair good kicker is usually…", options: ["A stack-off", "A fold", "A bluff"], answer: 0, explain: "Low SPR commits strong one-pair hands." },
    ],
    drill: { label: "Mixed preflop (all spots)", url: pre("rfi,vsOpen,vs3bet", null, 17, 25, 72), target: 25, acc: 0.72 },
  },
  {
    day: 18,
    phase: 3,
    title: "Live pools: punishing limpers",
    goal: "Iso-raise, over-limp, or fold against limpers.",
    legend: "miller",
    sections: [
      {
        title: "Why limpers are profitable",
        body: "Most players raise their best hands, so limpers usually have weak, capped ranges. Iso-raising strong hands lets you play heads-up, often in position, with the initiative against the weakest player.",
      },
      {
        title: "Sizing",
        body: "A common live formula: 4-5bb + 1bb per limper, bigger out of position. At $1/$2 many pros use $15 + $5 per limper, because players call too much.",
        deeper: [{ label: "Example", body: "Two limpers at $1/$2, you're on the button with AJs: raise to about $20-25." }],
      },
      {
        title: "Over-limping and folding",
        body: "Over-limp hands that want cheap multiway flops (small pairs, suited connectors, small suited aces). Fold offsuit hands like KTo and QJo from early seats — multiway, they make second-best pairs.",
        deeper: [
          { label: "Common mistake", body: "Iso-raising weak offsuit hands against limpers who call everything. You'll play a bloated multiway pot with a dominated hand." },
          { label: "Live exploit", body: "From the big blind, raise big with value hands and check everything else. Never fold — checking is free." },
        ],
      },
    ],
    quiz: [
      { q: "Standard $1/$2 iso size vs one limper?", options: ["$4", "$15", "$50"], answer: 1, explain: "About $15 (plus $5 per extra limper)." },
      { q: "Which hand likes over-limping behind two limpers?", options: ["KTo", "66", "AKo"], answer: 1, explain: "Small pairs want cheap multiway flops." },
      { q: "BB facing limpers with 83o?", options: ["Fold", "Check", "Raise"], answer: 1, explain: "Checking is free." },
    ],
    drill: { label: "Limper spots", url: pre("vsLimp", null, 18, 25, 72), target: 25, acc: 0.72 },
  },
  {
    day: 19,
    phase: 3,
    title: "Live sizing, rake and straddles",
    goal: "Adapt solver ideas to real card rooms.",
    legend: "miller",
    sections: [
      {
        title: "Rake shapes ranges",
        body: "Live rake (typically 10% up to a $5 cap plus a $1 jackpot drop) takes a big share of small pots. That punishes limping and calling, and rewards raising first and taking pots down preflop. Texas-style clubs charge seat time instead, which punishes small pots less.",
      },
      {
        title: "Bigger opens, tighter bottoms",
        body: "Live opens are often 4-7bb. Bigger opens get fewer folds and put more money in with the bottom of your range, so trim your weakest opens (especially offsuit) and value-bet more postflop.",
      },
      {
        title: "Straddles",
        body: "A $5 straddle at $1/$2 doubles the effective big blind. Your $200 stack is now only 40 'big blinds' of the straddle — ranges tighten, SPRs shrink, and top pair gains value.",
        deeper: [{ label: "Pro tip", body: "In straddled pots, think in straddle-units: your open should be ~2.5-3x the straddle, and set-mining needs deeper stacks than it looks." }],
      },
    ],
    quiz: [
      { q: "Which action does live rake punish most?", options: ["Raising first in", "Limping and calling in small pots", "Folding"], answer: 1, explain: "Small multiway pots pay the most rake relative to size." },
      { q: "With a $5 straddle at $1/$2, a $200 stack is about…", options: ["100 straddles", "40 straddles", "20 straddles"], answer: 1, explain: "200 ÷ 5 = 40." },
      { q: "With bigger live open sizes, the bottom of your range should…", options: ["Widen", "Tighten slightly", "Stay identical"], answer: 1, explain: "You risk more to win the same blinds." },
    ],
    drill: { label: "Opens with live sizing", url: pre("rfi", null, 19, 25, 78, "&sizing=live"), target: 25, acc: 0.78 },
  },
  {
    day: 20,
    phase: 3,
    boss: true,
    title: "Green Belt exam: complete preflop",
    goal: "Every preflop spot, graded.",
    legend: "chen",
    sections: [
      { title: "What's tested", body: "Opens, facing opens, 3-bets, 4-bets and limpers from every seat. This is the whole preflop game." },
      { title: "Exam tips", body: "Slow down on mixed hands. Use the confidence picker honestly — calibration is part of the skill." },
    ],
    quiz: [
      { q: "Facing a 4-bet with QQ vs a tight live player, lean toward…", options: ["Jam", "Fold or call cautiously", "Min-raise"], answer: 1, explain: "Tight 4-bet ranges crush QQ." },
      { q: "Button vs one limper with KJo?", options: ["Iso-raise", "Fold", "Over-limp"], answer: 0, explain: "Late-position iso with a strong offsuit broadway." },
      { q: "UTG open vs button 3-bet with 76s?", options: ["Call", "Fold", "4-bet"], answer: 1, explain: "Out of position vs a 3-bet, weak suited connectors fold." },
    ],
    drill: { label: "Exam: 40 mixed preflop hands at 78%+", url: pre("rfi,vsOpen,vs3bet,vs4bet,vsLimp", null, 20, 40, 78), target: 40, acc: 0.78 },
  },
  {
    day: 21,
    phase: 4,
    title: "Board texture",
    goal: "Read flops: dry vs wet, static vs dynamic.",
    legend: "galfond",
    sections: [
      {
        title: "Dry and static",
        body: "Boards like K♠7♦2♣ have no flush draw and few straight draws. The best hand on the flop is usually still best on the river. These favor small, frequent bets.",
      },
      {
        title: "Wet and dynamic",
        body: "Boards like J♥T♥8♣ are full of draws. Equities shift a lot on the turn and river. Bets get bigger and more polarized; medium hands check more.",
        deeper: [{ label: "Example", body: "On 9♥8♥7♦, an overpair has only ~55-65% equity vs a calling range full of draws and two pairs." }],
      },
      {
        title: "Paired and monotone",
        body: "Paired boards (Q♦Q♣4♠) reduce the number of strong combos, so the preflop raiser often bets small at high frequency. Monotone boards (A♥8♥3♥) make flushes possible already; bet smaller and more selectively.",
      },
    ],
    quiz: [
      { q: "Which flop is most dynamic?", options: ["K♠7♦2♣", "J♥T♥8♣", "Q♦Q♣4♠"], answer: 1, explain: "Connected and two-tone." },
      { q: "On dry static boards, the raiser usually bets…", options: ["Small and often", "Huge and rarely", "Never"], answer: 0, explain: "Cheap bets with a range advantage." },
      { q: "A paired board has…", options: ["More strong combos", "Fewer strong combos", "No draws ever"], answer: 1, explain: "Trips and full houses are rare, so ranges are less polarized." },
    ],
    drill: { label: "Flop decisions", url: post(21, 15, 65), target: 15, acc: 0.65 },
  },
  {
    day: 22,
    phase: 4,
    title: "Range advantage and nut advantage",
    goal: "Know whose board it is before you bet.",
    legend: "galfond",
    sections: [
      {
        title: "Range advantage",
        body: "Whose whole range has more equity on this board? On A-K-x and K-x-x boards the preflop raiser has more big cards and overpairs. On low connected boards (6-5-4), the big blind's range of suited connectors and small pairs catches up.",
      },
      {
        title: "Nut advantage",
        body: "Who has more of the very best hands (sets, two pair, straights)? A player with the nut advantage can bet big, because their strongest hands threaten stacks.",
        deeper: [{ label: "Example", body: "BTN vs BB on A♠K♦4♣: BTN has AA, KK, AK more often — big range advantage, bet small with much of the range." }],
      },
      {
        title: "Using the Range X-ray",
        body: "In the postflop trainer, the Range X-ray step shows how each range hits the board: monsters, strong value, medium, weak, draws and air. Learn to estimate this at the table.",
      },
    ],
    quiz: [
      { q: "BTN vs BB on 6♠5♦4♣: who has more straights and two pairs?", options: ["BTN", "BB", "Equal"], answer: 1, explain: "BB defends many suited connectors and low hands." },
      { q: "A big nut advantage lets you…", options: ["Bet bigger", "Only check", "Only call"], answer: 0, explain: "Strong hands can threaten stacks." },
      { q: "On K♣7♦2♥, who usually has range advantage?", options: ["Preflop raiser", "Big blind caller"], answer: 0, explain: "More Kx and overpairs." },
    ],
    drill: { label: "BTN vs BB as the raiser", url: post(22, 15, 65, "&lines=BTN_BB&role=pfr"), target: 15, acc: 0.65 },
  },
  {
    day: 23,
    phase: 4,
    title: "C-betting in position",
    goal: "Choose between small range bets and polarized big bets.",
    legend: "tipton",
    sections: [
      {
        title: "Small range bets",
        body: "With a strong range advantage on a static board, bet about ⅓ pot with most of your range: value hands, hands that want protection, and air that folds out overcards.",
      },
      {
        title: "Polarized big bets",
        body: "On dynamic boards where you have the nut advantage, bet about ¾ pot with strong hands and strong draws, and check medium hands that would hate a raise.",
        deeper: [{ label: "The math", body: "A ⅓-pot bluff needs to work only 25% of the time; a ¾-pot bluff needs 43%." }],
      },
      {
        title: "Checking back",
        body: "Checking in position isn't weak: it protects your checking range, takes a free card, and controls the pot with medium hands.",
        deeper: [{ label: "Live exploit", body: "Against $1/$2 stations, cut flop bluffs with pure air and bet bigger for value — they call with any pair." }],
      },
    ],
    quiz: [
      { q: "Small range-bet strategy fits…", options: ["Dry boards where you have range advantage", "Monotone boards vs nut advantage", "Every board"], answer: 0, explain: "Cheap bets with a whole-range edge." },
      { q: "A ¾-pot bluff needs how many folds?", options: ["25%", "43%", "60%"], answer: 1, explain: "0.75 ÷ 1.75 ≈ 43%." },
      { q: "Medium hands on dynamic boards usually…", options: ["Bet big", "Check", "Jam"], answer: 1, explain: "They'd rather avoid raises." },
    ],
    drill: { label: "C-bet in position", url: post(23, 15, 65, "&lines=BTN_BB,CO_BB,LJ_BB&role=pfr"), target: 15, acc: 0.65 },
  },
  {
    day: 24,
    phase: 4,
    title: "C-betting out of position",
    goal: "Play the flop as the out-of-position raiser.",
    legend: "janda",
    sections: [
      {
        title: "Why OOP c-bets less",
        body: "Out of position, you realize less equity and face more raises and floats. The raiser OOP (SB vs BB, CO vs BTN) checks more and bets a more selective range.",
      },
      {
        title: "Protect your checking range",
        body: "If you only check weak hands, observant opponents will bet every time you check. Check some strong hands too, so your checks aren't an invitation.",
      },
      {
        title: "3-bet pots",
        body: "In 3-bet pots, SPR is low and the 3-bettor's range is strong. C-bet small very often on high-card boards; slow down on low, connected boards.",
      },
    ],
    quiz: [
      { q: "Compared to IP, an OOP raiser c-bets…", options: ["More often", "Less often", "Exactly the same"], answer: 1, explain: "Positional disadvantage." },
      { q: "Why check some strong hands?", options: ["To protect your checking range", "To lose value", "It's required"], answer: 0, explain: "So checks aren't automatically weak." },
      { q: "In 3-bet pots on A-high boards, the 3-bettor…", options: ["Bets small often", "Never bets", "Always overbets"], answer: 0, explain: "Strong range, low SPR." },
    ],
    drill: { label: "OOP raiser spots", url: post(24, 15, 62, "&lines=SB_BB,CO_BTN,BTN_BB_3B&role=pfr"), target: 15, acc: 0.62 },
  },
  {
    day: 25,
    phase: 4,
    title: "Defending against c-bets",
    goal: "Call, raise, or fold with the right hands.",
    legend: "janda",
    sections: [
      {
        title: "MDF and pot odds",
        body: "Facing a ⅓-pot bet you need 20% equity, and MDF says continue about 75% of your range. Facing a pot-sized bet you need 33% and should continue about 50%.",
      },
      {
        title: "What to call and raise",
        body: "Call with medium pairs, strong draws and good backdoors. Raise your strongest hands (sets, two pair) and some of your best draws as semi-bluffs, especially on wet boards.",
        deeper: [{ label: "Common mistake", body: "Folding too often to small c-bets. Against ⅓ pot, even ace-high with backdoors often continues." }],
      },
      {
        title: "Population reads",
        body: "Live players c-bet their strong hands and give up their weak ones more than solvers do. Raises from passive players are very strong.",
        deeper: [{ label: "Live exploit", body: "Against a $1/$2 player who only bets when strong, fold marginal hands to turn and river bets even if the pot odds look OK." }],
      },
    ],
    quiz: [
      { q: "Facing a ⅓-pot bet, required equity?", options: ["20%", "33%", "43%"], answer: 0, explain: "0.33 ÷ (1 + 0.33 + 0.33) ≈ 20%." },
      { q: "MDF vs a pot-sized bet?", options: ["33%", "50%", "75%"], answer: 1, explain: "1 ÷ (1 + 1) = 50%." },
      { q: "Best semi-bluff raise candidate?", options: ["Nut flush draw + gutshot", "Bottom pair no draw", "Ace high no backdoors"], answer: 0, explain: "Lots of equity plus fold equity." },
    ],
    drill: { label: "Defend as the caller", url: post(25, 15, 62, "&role=caller"), target: 15, acc: 0.62 },
  },
  {
    day: 26,
    phase: 4,
    title: "Draws, outs and semi-bluffs",
    goal: "Count outs fast and play draws aggressively when it pays.",
    legend: "chen",
    sections: [
      {
        title: "Counting outs",
        body: "Flush draw: 9 outs. Open-ended straight draw: 8. Gutshot: 4. Combo draws add up (minus overlap): flush + open-ender ≈ 15 outs.",
      },
      {
        title: "Rule of 2 and 4",
        body: "With one card to come, equity ≈ outs × 2%. With two cards to come (on the flop, all-in), equity ≈ outs × 4%. A flush draw: ~18% on the turn, ~36% by the river.",
        deeper: [{ label: "The math", body: "Exact: 9 outs from 47 unseen cards → 19.1% on the turn; 1 - (38/47 × 37/46) = 35.0% by the river." }],
      },
      {
        title: "Semi-bluffing",
        body: "Betting or raising a draw wins two ways: they fold now, or you hit. The more equity your draw has, the more aggressively you can play it.",
        deeper: [{ label: "Live exploit", body: "Stations don't fold, so semi-bluffs lose fold equity — draw more cheaply and bet big when you hit." }],
      },
    ],
    quiz: [
      { q: "How many outs does an open-ended straight draw have?", options: ["4", "8", "9"], answer: 1, explain: "Four cards on each end." },
      { q: "Rule of 4: a flush draw on the flop has about…", options: ["18%", "36%", "50%"], answer: 1, explain: "9 × 4 = 36%." },
      { q: "A semi-bluff wins when…", options: ["They fold or you hit", "Only when they fold", "Only at showdown"], answer: 0, explain: "Two ways to win." },
    ],
    drill: { label: "Outs counting sprint", url: math("outs", 26), target: 10, acc: 0.8 },
  },
  {
    day: 27,
    phase: 4,
    boss: true,
    title: "Blue Belt exam: the flop",
    goal: "Play flops as raiser and caller, IP and OOP.",
    legend: "galfond",
    sections: [
      { title: "What's tested", body: "Flop and turn decisions across single-raised and 3-bet pots, as both the raiser and the caller." },
      { title: "Exam tips", body: "Read the board, estimate both ranges, place your hand in your range, then pick the action and size." },
    ],
    quiz: [
      { q: "BTN vs BB on A♣8♦3♠, you're the BTN with 76s (backdoors). A common play is…", options: ["Small c-bet", "Overbet", "Fold"], answer: 0, explain: "Range bet small with a big range advantage." },
      { q: "As the BB facing a small bet with a gutshot + overcard, usually…", options: ["Call", "Fold", "Jam"], answer: 0, explain: "Cheap price and some equity." },
      { q: "OOP in a 3-bet pot on K♥Q♥4♣ with AK, you usually…", options: ["Bet", "Check-fold", "Min-raise"], answer: 0, explain: "Top pair top kicker, strong range." },
    ],
    drill: { label: "Exam: 25 postflop decisions at 68%+", url: post(27, 25, 68), target: 25, acc: 0.68 },
  },
  {
    day: 28,
    phase: 5,
    title: "Turn barreling",
    goal: "Know which turn cards to keep betting on.",
    legend: "tipton",
    sections: [
      {
        title: "Good cards for the bettor",
        body: "Overcards that hit your range (A and K after raising preflop), cards that give you more strong hands, and cards that don't complete the caller's draws are good barrel cards.",
      },
      {
        title: "Bad cards",
        body: "Cards that complete obvious draws or pair the caller's likely hands (low connected cards vs a big blind range) favor the caller. Slow down with air and medium hands.",
      },
      {
        title: "Choose your barrels",
        body: "Keep betting value, strong draws, and bluffs with good equity or blockers. Give up on air with no equity.",
        deeper: [{ label: "Live exploit", body: "Many live regs over-fold to turn barrels in single-raised pots — barrel good cards more often against them." }],
      },
    ],
    quiz: [
      { q: "After raising preflop, which turn usually favors you?", options: ["An ace", "A card completing a flush", "A low connected card"], answer: 0, explain: "Aces hit the raiser's range." },
      { q: "Good turn bluffs have…", options: ["Equity or blockers", "Nothing", "Showdown value"], answer: 0, explain: "They can improve or block calls." },
      { q: "On a bad turn card, air should usually…", options: ["Give up", "Overbet", "Min-bet"], answer: 0, explain: "Save money when the caller improved." },
    ],
    drill: { label: "Barrel decisions as the raiser", url: post(28, 18, 62, "&role=pfr"), target: 18, acc: 0.62 },
  },
  {
    day: 29,
    phase: 5,
    title: "Pot control and showdown value",
    goal: "Get medium hands to showdown cheaply.",
    legend: "negreanu",
    sections: [
      {
        title: "Medium hands",
        body: "Middle pair, weak top pair and underpairs beat bluffs but lose to value. Betting them folds out worse and gets called by better — so check and call, or check back.",
      },
      {
        title: "Checking back the turn",
        body: "In position, checking back a medium hand keeps the pot small and gets you to a cheap river showdown. You also induce bluffs on the river.",
      },
      {
        title: "Small ball",
        body: "Daniel Negreanu's small-ball approach: win lots of small pots, avoid huge pots without huge hands.",
        deeper: [{ label: "Common mistake", body: "Betting three streets with middle pair 'for protection' and getting raised off your equity or paying off better hands." }],
      },
    ],
    quiz: [
      { q: "Betting a medium hand usually…", options: ["Folds worse, gets called by better", "Gets value from worse", "Wins more"], answer: 0, explain: "That's why it's a pot-control hand." },
      { q: "Checking back the turn in position with middle pair…", options: ["Controls the pot and induces river bluffs", "Always loses value", "Is a bluff"], answer: 0, explain: "Classic pot control." },
      { q: "Showdown value means…", options: ["The hand can win unimproved at showdown", "The hand is the nuts", "The hand must bluff"], answer: 0, explain: "It beats some of their range." },
    ],
    drill: { label: "Turn and river pot control", url: post(29, 18, 62), target: 18, acc: 0.62 },
  },
  {
    day: 30,
    phase: 5,
    title: "River value betting",
    goal: "Bet thin for value and size up against calling stations.",
    legend: "miller",
    sections: [
      {
        title: "Thin value",
        body: "A value bet needs to be called by worse more often than by better. Top pair on a clean river often qualifies against a wide calling range.",
      },
      {
        title: "Sizing for value",
        body: "Bet big when your opponent's calling range is strong or sticky; bet small when only a few worse hands can call.",
        deeper: [{ label: "Live exploit", body: "Against $1/$2 stations, bet bigger and thinner — they call with second pair and ace high." }],
      },
      {
        title: "Checking strong hands",
        body: "Against aggressive players who bluff when checked to, checking some strong hands on the river can earn more than betting.",
      },
    ],
    quiz: [
      { q: "A thin value bet is profitable when…", options: ["Worse hands call more often than better hands", "Better hands always call", "They always fold"], answer: 0, explain: "The definition of value." },
      { q: "Against a station, value bets should be…", options: ["Smaller", "Bigger and thinner", "Never"], answer: 1, explain: "They call too much." },
      { q: "Checking a strong river hand works best vs…", options: ["Aggressive bluffers", "Nits", "Stations"], answer: 0, explain: "They bet when checked to." },
    ],
    drill: { label: "River spots", url: post(30, 15, 62), target: 15, acc: 0.62 },
  },
  {
    day: 31,
    phase: 5,
    title: "River bluffing",
    goal: "Bluff the right amount with the right hands.",
    legend: "chen",
    sections: [
      {
        title: "How many bluffs",
        body: "With a polarized range, bluffs should make up about bet ÷ (pot + 2 × bet) of your bets. At ¾ pot that's ~30%; at pot size, ~33%; at half pot, 25%.",
        deeper: [{ label: "The math", body: "Your opponent needs 30% equity to call a ¾-pot bet. If exactly 30% of your bets are bluffs, calling and folding are equal for them." }],
      },
      {
        title: "Which hands bluff",
        body: "Bluff with hands that have no showdown value and good blockers — cards that remove the hands your opponent would call with, while not blocking the missed draws they'll fold.",
      },
      {
        title: "Population reality",
        body: "Live players call too much in small pots and fold too much in huge pots. Bluff less against stations and more against thinking players who can fold.",
      },
    ],
    quiz: [
      { q: "At a pot-sized river bet, the balanced bluff share is about…", options: ["10%", "33%", "60%"], answer: 1, explain: "1 ÷ (1 + 2) = 33%." },
      { q: "Best river bluffs…", options: ["Have no showdown value and block calls", "Have showdown value", "Block folds"], answer: 0, explain: "Turn your worst hands into bluffs." },
      { q: "Against a calling station, bluff…", options: ["More", "Less", "Only on the flop"], answer: 1, explain: "They don't fold." },
    ],
    drill: { label: "River bluffing spots", url: post(31, 15, 60), target: 15, acc: 0.6 },
  },
  {
    day: 32,
    phase: 5,
    title: "Bluff-catching",
    goal: "Call the right amount on the river.",
    legend: "duke",
    sections: [
      {
        title: "Bluff-catchers",
        body: "A bluff-catcher beats bluffs and loses to value. Calling is profitable only if they bluff often enough — at least your pot odds.",
      },
      {
        title: "MDF vs reads",
        body: "MDF says how often you must call to stop auto-profit bluffs. But live players under-bluff big rivers, so against most live opponents fold more than MDF with your weakest bluff-catchers.",
        deeper: [{ label: "Live exploit", body: "A passive $1/$2 player's big river bet is almost always value. Save money; fold." }],
      },
      {
        title: "Blockers when calling",
        body: "Holding cards that block their value hands makes calling better. Holding cards that block their bluffs (missed draws) makes calling worse.",
      },
    ],
    quiz: [
      { q: "A bluff-catcher beats…", options: ["Only bluffs", "Everything", "Only value"], answer: 0, explain: "By definition." },
      { q: "Against a passive live player's big river bet, you should usually…", options: ["Call wider", "Fold more", "Raise"], answer: 1, explain: "Under-bluffed spot." },
      { q: "Blocking their missed draws makes your call…", options: ["Better", "Worse"], answer: 1, explain: "You remove their bluffs." },
    ],
    drill: { label: "Call or fold the river", url: post(32, 15, 60, "&role=caller"), target: 15, acc: 0.6 },
  },
  {
    day: 33,
    phase: 5,
    title: "Overbets and polarization",
    goal: "Use big sizes when your range earns it.",
    legend: "tipton",
    sections: [
      {
        title: "When to overbet",
        body: "Overbet when you have many nutted hands your opponent can't have, and their range is capped (no nuts). The turn or river card often creates that situation.",
      },
      {
        title: "Balanced overbets",
        body: "Overbets need more bluffs to be balanced (at 125% pot, ~36% bluffs), so they work best with strong blockers and a clear nut advantage.",
      },
      {
        title: "Facing overbets",
        body: "Overbets are polarized: nuts or air. Bluff-catch with hands that beat the bluffs, but remember live players rarely overbet as a bluff.",
      },
    ],
    quiz: [
      { q: "Overbets work best when…", options: ["You have the nut advantage and they're capped", "Ranges are equal", "You have a medium hand"], answer: 0, explain: "Polarized advantage." },
      { q: "Bluff share for a 125% pot bet?", options: ["~20%", "~36%", "~60%"], answer: 1, explain: "1.25 ÷ 3.5 ≈ 36%." },
      { q: "A capped range…", options: ["Contains few or no nutted hands", "Contains the nuts", "Always folds"], answer: 0, explain: "Capped means its top is limited." },
    ],
    drill: { label: "Turn and river decisions", url: post(33, 18, 60), target: 18, acc: 0.6 },
  },
  {
    day: 34,
    phase: 5,
    boss: true,
    title: "Brown Belt exam: full hands",
    goal: "Play full hands flop to river.",
    legend: "sklansky",
    sections: [
      { title: "What's tested", body: "Every street, as raiser and caller, IP and OOP, single-raised and 3-bet pots." },
      { title: "Exam tips", body: "On every street, re-ask: what changed, whose range improved, and where does my hand sit now?" },
    ],
    quiz: [
      { q: "The Fundamental Theorem says you gain when…", options: ["Opponents play differently than they would if they saw your cards", "You win every pot", "You bluff more"], answer: 0, explain: "Sklansky's theorem." },
      { q: "On a river that completes the flush with no flush yourself and a medium hand…", options: ["Check more", "Overbet", "Always call big bets"], answer: 0, explain: "Pot control with a devalued hand." },
      { q: "Resulting means…", options: ["Judging a decision by its outcome", "Counting outs", "Raking"], answer: 0, explain: "Annie Duke's term." },
    ],
    drill: { label: "Exam: 30 postflop decisions at 66%+", url: post(34, 30, 66), target: 30, acc: 0.66 },
  },
  {
    day: 35,
    phase: 6,
    title: "Profiling players",
    goal: "Classify opponents fast and adjust.",
    legend: "caro",
    sections: [
      {
        title: "The five archetypes",
        body: "Nit (tight-passive), TAG (tight-aggressive regular), LAG (loose-aggressive), Calling Station (loose-passive), Maniac (hyper-aggressive). Each has a clear counter-strategy.",
      },
      {
        title: "Stats and tells",
        body: "Online: VPIP, PFR, 3-bet, aggression. Live: how often they limp, how they size, whether they show down bluffs, how they react to aggression. Caro's rule: acting strong often means weak.",
      },
      {
        title: "Counter-strategies",
        body: "Nits: steal and fold to their aggression. Stations: value-bet and don't bluff. LAGs: call down lighter and trap. Maniacs: tighten preflop, then call down. TAGs: play close to baseline.",
        deeper: [{ label: "Pro tip", body: "Switch the trainer to the Exploit lens and pick an opponent type to practice these adjustments." }],
      },
    ],
    quiz: [
      { q: "Best adjustment vs a calling station?", options: ["Bluff more", "Value bet more", "Fold everything"], answer: 1, explain: "They call too much." },
      { q: "Best adjustment vs a nit?", options: ["Steal more", "Call their big bets", "Slow-play"], answer: 0, explain: "They fold too much." },
      { q: "Vs a maniac, you should…", options: ["Call down lighter", "Bluff more", "Never call"], answer: 0, explain: "Their betting range is wide." },
    ],
    drill: { label: "Exploit lens vs a calling station", url: pre("rfi,vsOpen,vsLimp", null, 35, 20, 72, "&villain=station&lens=exploit"), target: 20, acc: 0.72 },
  },
  {
    day: 36,
    phase: 6,
    title: "Crushing $1/$2",
    goal: "The exploits that make the most money at $1/$2.",
    legend: "miller",
    sections: [
      {
        title: "Value over bluffs",
        body: "The $1/$2 pool calls too much and bluffs too little. Your profit comes from value-betting — especially thin value with top pair — and from folding to big aggression.",
      },
      {
        title: "Punish limpers",
        body: "Iso-raise limpers big with strong hands. Over-limp small pairs and suited connectors for cheap multiway flops. Don't iso-raise weak offsuit hands.",
      },
      {
        title: "Simplify",
        body: "Tighten early offsuit opens, bet big with big hands, give up on bluffs against stations, and respect raises.",
        deeper: [{ label: "Common mistake", body: "Running elaborate bluffs against players who don't fold. Save your creativity for players who can lay hands down." }],
      },
    ],
    quiz: [
      { q: "Main profit source at $1/$2?", options: ["River bluffs", "Value betting", "4-bet bluffs"], answer: 1, explain: "The pool pays off." },
      { q: "A passive player's river raise at $1/$2 is usually…", options: ["A bluff", "Very strong", "A misclick"], answer: 1, explain: "Respect it." },
      { q: "Iso-raise vs a limper with KTo from early position?", options: ["Usually fold or over-limp rarely", "Always iso", "Jam"], answer: 0, explain: "Weak offsuit hands play badly multiway." },
    ],
    drill: { label: "$1/$2 exploits (postflop, exploit lens)", url: post(36, 15, 62, "&villain=pool&lens=exploit"), target: 15, acc: 0.62 },
  },
  {
    day: 37,
    phase: 6,
    title: "Beating $2/$5",
    goal: "Adjust to regulars and deep stacks.",
    legend: "straus",
    sections: [
      {
        title: "More regs, more 3-bets",
        body: "$2/$5 has more thinking players. Defend blinds more, 3-bet recreational players to isolate them, and respect 4-bets.",
      },
      {
        title: "Deep stacks",
        body: "With 200bb+, play for the nuts in big pots. Set-mine and draw to the nuts; be careful with one-pair hands out of position.",
      },
      {
        title: "Big-pot discipline",
        body: "Turn check-raises and river raises at $2/$5 are rarely bluffs. Fold your bluff-catchers unless you have a specific read.",
      },
    ],
    quiz: [
      { q: "With 250bb stacks, which hand gains value?", options: ["KQo", "65s", "AJo"], answer: 1, explain: "Suited connectors make disguised nut hands." },
      { q: "A $2/$5 reg's river raise is usually…", options: ["Strong", "A bluff"], answer: 0, explain: "Population under-bluffs." },
      { q: "Isolating a recreational opener at $2/$5 is best done by…", options: ["3-betting", "Flatting", "Folding"], answer: 0, explain: "Get heads up in position." },
    ],
    drill: { label: "Exploit lens vs a solid reg", url: post(37, 15, 62, "&villain=tag&lens=exploit"), target: 15, acc: 0.62 },
  },
  {
    day: 38,
    phase: 6,
    title: "Mental game and bankroll",
    goal: "Protect your A-game, your bankroll, and your sanity.",
    legend: "tendler",
    sections: [
      {
        title: "Tilt and the inchworm",
        body: "Jared Tendler's inchworm: improve your worst game (C-game) and your whole game moves up. Know your tilt triggers (bad beats, fatigue, being bullied) and have a plan — walk, breathe, or quit.",
      },
      {
        title: "Resulting and variance",
        body: "Annie Duke: don't judge decisions by results. Even a big winner has losing weeks and months. Track your decisions (this trainer does) and your results over tens of thousands of hands.",
      },
      {
        title: "Bankroll management",
        body: "A common guideline for live cash is at least 20-30 buy-ins for your stake (e.g., $6,000-$9,000 for $1/$2 with $300 buy-ins), more if you're risk-averse. Move down when you drop below your threshold.",
        deeper: [{ label: "Pro tip", body: "Tommy Angelo's advice: quitting is a skill. End sessions when you're not playing your best, not when you're 'even'." }],
      },
    ],
    quiz: [
      { q: "The 'inchworm' idea is to…", options: ["Improve your worst play", "Play more hours", "Bluff more"], answer: 0, explain: "Raise your floor and the ceiling follows." },
      { q: "Resulting is…", options: ["Judging a decision by its outcome", "Calculating equity", "Moving up stakes"], answer: 0, explain: "A decision-making trap." },
      { q: "A conservative live cash bankroll is roughly…", options: ["2-3 buy-ins", "20-30+ buy-ins", "Unlimited"], answer: 1, explain: "Variance is large." },
    ],
  },
  {
    day: 39,
    phase: 6,
    title: "Putting it together",
    goal: "Play full hands and build a study routine that lasts.",
    legend: "angelo",
    sections: [
      {
        title: "A daily routine",
        body: "15 minutes of preflop drills (weakest seat first), 15 minutes of postflop hands, 5 minutes of Leak Deck review, and one concept to read. Consistency beats marathon sessions.",
      },
      {
        title: "Reviewing hands",
        body: "After a session, write down 3 hands: the spot, the ranges, your decision, and what the math says. Then drill similar spots here.",
      },
      {
        title: "Beyond the 40 days",
        body: "Keep your belts climbing, clear your Leak Deck daily, and repeat the exam days monthly. Poker takes a minute to learn and a lifetime to master.",
      },
    ],
    quiz: [
      { q: "Which study habit compounds best?", options: ["Short, consistent daily sessions", "One huge weekly session", "Only playing"], answer: 0, explain: "Spaced, consistent practice." },
      { q: "When reviewing a hand, start with…", options: ["The ranges", "The result", "Your feelings"], answer: 0, explain: "Ranges first, results last." },
      { q: "Leak Deck cards come back…", options: ["At growing intervals", "Never", "Randomly"], answer: 0, explain: "Spaced repetition." },
    ],
    drill: { label: "Full postflop hands", url: post(39, 20, 64), target: 20, acc: 0.64 },
  },
  {
    day: 40,
    phase: 6,
    boss: true,
    title: "Black Belt exam",
    goal: "The final test: every preflop spot at a pro standard.",
    legend: "hellmuth",
    sections: [
      { title: "What's tested", body: "Forty mixed preflop decisions from every seat — opens, defenses, 3-bets, 4-bets and limpers — graded at a pro standard." },
      { title: "After the exam", body: "A black belt isn't the end. Keep training every seat to black belt on the Progress page, and keep your Leak Deck empty." },
    ],
    quiz: [
      { q: "The most important preflop input is usually…", options: ["Position", "The dealer's mood", "Your last result"], answer: 0, explain: "Position drives ranges." },
      { q: "Against a nit's 4-bet with JJ, you usually…", options: ["Fold", "Jam", "Min-raise"], answer: 0, explain: "Nit 4-bets are KK+/AK." },
      { q: "A great decision that loses the pot was…", options: ["Still a great decision", "A mistake", "Bad luck and a mistake"], answer: 0, explain: "Decisions, not results." },
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
  { term: "GTO (game theory optimal)", def: "A strategy that can't be exploited: opponents can't gain by deviating. Solvers approximate it. It's a baseline, not the max-profit strategy vs weak players." },
  { term: "Exploitative play", def: "Deviating from the baseline to profit from a specific opponent's mistakes (e.g., bluffing nits more, value-betting stations thinner)." },
  { term: "Range", def: "All the hands a player can have in a spot, with how likely each is." },
  { term: "Combo", def: "A specific two-card holding. Pairs have 6 combos, suited hands 4, offsuit hands 12." },
  { term: "Equity", def: "Your share of the pot if all cards were dealt out, on average." },
  { term: "Pot odds", def: "The price you're getting on a call, turned into the equity you need.", formula: "call ÷ (pot + call)" },
  { term: "Minimum defense frequency (MDF)", def: "How much of your range must continue to stop an opponent's bluffs from auto-profiting.", formula: "pot ÷ (pot + bet)" },
  { term: "Alpha (bluff breakeven)", def: "How often a pure bluff must work to break even.", formula: "bet ÷ (pot + bet)" },
  { term: "Bluff ratio", def: "The share of bluffs in a balanced polarized betting range.", formula: "bet ÷ (pot + 2 × bet)" },
  { term: "Equity realization", def: "How much of your raw equity you actually capture. Position and playability raise it." },
  { term: "Fold equity", def: "The extra value from the times your opponent folds to your bet or raise." },
  { term: "Implied odds", def: "Chips you expect to win on later streets when you hit your hand." },
  { term: "Reverse implied odds", def: "Chips you lose on later streets when your made hand is second-best." },
  { term: "SPR (stack-to-pot ratio)", def: "Effective stack divided by the pot on the flop. Low SPR commits one-pair hands; high SPR demands stronger hands for stacks.", formula: "stack ÷ pot" },
  { term: "Range advantage", def: "One range has more equity overall on a board." },
  { term: "Nut advantage", def: "One range has more of the very best hands on a board." },
  { term: "Polarized range", def: "A range of very strong hands and bluffs, with few medium hands." },
  { term: "Linear / merged range", def: "A range of the best hands in order, including medium-strength hands." },
  { term: "Capped range", def: "A range that can't contain the strongest hands (e.g., because it would have raised them earlier)." },
  { term: "Blocker", def: "A card in your hand that makes certain opponent hands impossible or less likely." },
  { term: "C-bet", def: "Continuation bet: the preflop raiser bets the flop." },
  { term: "Probe bet", def: "The out-of-position caller bets after the raiser checked back the previous street." },
  { term: "Iso-raise", def: "A raise over one or more limpers to isolate a weak player." },
  { term: "Squeeze", def: "A 3-bet after an open and one or more callers." },
  { term: "Set mining", def: "Calling with a small pair mainly to flop a set (about 12% of the time)." },
  { term: "Straddle", def: "An optional blind (often 2× the big blind) posted by UTG in live games, effectively making the game bigger." },
  { term: "Rake", def: "The house's cut of each pot (live: often 10% up to a cap plus a jackpot drop)." },
  { term: "Resulting", def: "Judging a decision by its outcome instead of its quality." },
  { term: "Tilt", def: "Emotional decision-making that degrades your play." },
];
