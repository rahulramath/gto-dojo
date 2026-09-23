export interface Legend {
  id: string;
  name: string;
  /** Only widely documented lines. Shown in quotation marks. */
  quote?: string;
  /** A paraphrase of their idea. Never shown as a quote. */
  idea: string;
  source: string;
}

export const LEGENDS: Legend[] = [
  {
    id: "sexton",
    name: "Mike Sexton",
    quote: "Poker takes a minute to learn and a lifetime to master.",
    idea: "The rules are easy. The skill is making thousands of small decisions a little better than everyone else.",
    source: "Widely attributed catchphrase from his WPT broadcasts.",
  },
  {
    id: "sklansky",
    name: "David Sklansky",
    idea: "Every time you play a hand differently than you would if you could see their cards, they gain. Every time you play it the same way, you gain.",
    source: "The Theory of Poker, 'The Fundamental Theorem of Poker' (paraphrased).",
  },
  {
    id: "brunson",
    name: "Doyle Brunson",
    idea: "Get into pots by betting and raising, and make your opponents face the hard decisions.",
    source: "Super/System (1979), paraphrased.",
  },
  {
    id: "caro",
    name: "Mike Caro",
    quote: "In the beginning, everything was even money.",
    idea: "Players who act strong are often weak, and players who act weak are often strong.",
    source: "Caro's Book of Poker Tells (1984); quote widely attributed to Caro.",
  },
  {
    id: "harrington",
    name: "Dan Harrington",
    idea: "Play few hands from early seats and many more from late seats, and usually come in with a raise.",
    source: "Harrington on Hold'em (2004), paraphrased.",
  },
  {
    id: "straus",
    name: "Jack 'Treetop' Straus",
    quote: "Limit poker is a science, but no-limit is an art. In limit, you are shooting at a target. In no-limit, the target comes alive and shoots back at you.",
    idea: "Every bet invites a response, so plan for what they'll do next.",
    source: "Widely attributed quote.",
  },
  {
    id: "duke",
    name: "Annie Duke",
    idea: "Don't judge a decision by how it turned out. Good decisions lose sometimes, and bad ones win.",
    source: "Thinking in Bets (2018), paraphrased.",
  },
  {
    id: "moneymaker",
    name: "Chris Moneymaker",
    idea: "An amateur won the 2003 Main Event and started the poker boom. Anyone who puts in the reps can learn this game.",
    source: "2003 WSOP Main Event.",
  },
  {
    id: "miller",
    name: "Ed Miller",
    idea: "You beat live low-stakes games by value betting weak players over and over, betting big with big hands and not bluffing people who don't fold.",
    source: "The Course (2015), paraphrased.",
  },
  {
    id: "galfond",
    name: "Phil Galfond",
    idea: "Don't put your opponent on one hand. Think about every hand they could have and pick the play that does best against all of them.",
    source: "'G-Bucks' articles (2008), paraphrased.",
  },
  {
    id: "janda",
    name: "Matthew Janda",
    idea: "Defend often enough that your opponent can't bluff you with any two cards, and bet with a mix of value hands and bluffs.",
    source: "Applications of No-Limit Hold'em (2013), paraphrased.",
  },
  {
    id: "negreanu",
    name: "Daniel Negreanu",
    idea: "Keep pots small with medium hands, play lots of hands in position and win many small pots without risking your stack.",
    source: "Power Hold'em Strategy (2008), paraphrased.",
  },
  {
    id: "chen",
    name: "Bill Chen and Jerrod Ankenman",
    idea: "How often you can bluff depends on your bet size. With a pot-sized bet, about a third of your bets can be bluffs.",
    source: "The Mathematics of Poker (2006), paraphrased.",
  },
  {
    id: "tipton",
    name: "Will Tipton",
    idea: "When your range is mostly very strong hands and bluffs, bet big. When it's full of medium hands, bet small or check.",
    source: "Expert Heads Up No-Limit Hold'em (2012), paraphrased.",
  },
  {
    id: "proverb",
    name: "An old card room saying, made famous by Rounders",
    quote: "If you can't spot the sucker in your first half hour at the table, then you are the sucker.",
    idea: "Who you play against matters more than almost anything you do at the table.",
    source: "Rounders (1998).",
  },
  {
    id: "tendler",
    name: "Jared Tendler",
    idea: "Everyone has an A game and a C game. Improve your worst play and your whole game moves up.",
    source: "The Mental Game of Poker (2011), paraphrased.",
  },
  {
    id: "angelo",
    name: "Tommy Angelo",
    idea: "Your profit comes from making slightly better decisions than the table, hundreds of times a session. Play your best, and quit when you can't.",
    source: "Elements of Poker (2007), paraphrased.",
  },
  {
    id: "hellmuth",
    name: "Phil Hellmuth",
    quote: "If there weren't luck involved, I would win every time.",
    idea: "Luck is real, and it's also what keeps weaker players coming back to the table.",
    source: "Widely attributed quote.",
  },
];

export const LEGEND_BY_ID: Record<string, Legend> = Object.fromEntries(LEGENDS.map((l) => [l.id, l]));
