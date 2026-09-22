export type ReasonId =
  | "value"
  | "thin-value"
  | "protection"
  | "bluff"
  | "semi-bluff"
  | "blockers"
  | "steal"
  | "fold-equity"
  | "playability"
  | "set-mine"
  | "implied"
  | "price"
  | "position"
  | "dominated"
  | "oop"
  | "too-weak"
  | "merge"
  | "initiative"
  | "pot-control"
  | "bluff-catch"
  | "pot-odds"
  | "range-bet"
  | "induce"
  | "give-up"
  | "showdown"
  | "multiway"
  | "no-fold-equity";

export interface Reason {
  label: string;
  blurb: string;
}

export const REASONS: Record<ReasonId, Reason> = {
  value: { label: "Value", blurb: "Worse hands will call. Bet or raise to get paid." },
  "thin-value": { label: "Thin value", blurb: "You're only a little ahead of the calling range, but still ahead often enough to bet." },
  protection: { label: "Protection / denial", blurb: "Charge draws and overcards now instead of giving free cards." },
  bluff: { label: "Bluff", blurb: "You rarely win at showdown, but they fold enough to make betting profitable." },
  "semi-bluff": { label: "Semi-bluff", blurb: "Bet a draw: win now when they fold, or improve when they call." },
  blockers: { label: "Blockers", blurb: "Your cards remove their strongest hands (or their calls), making a bluff work more often." },
  steal: { label: "Steal", blurb: "Win the blinds and antes uncontested often enough to profit." },
  "fold-equity": { label: "Fold equity", blurb: "Their range folds often to aggression here." },
  playability: { label: "Playability", blurb: "Suited, connected hands make strong draws and realize their equity well." },
  "set-mine": { label: "Set mining", blurb: "Small pairs flop a set ~12% of the time and win big pots when they do." },
  implied: { label: "Implied odds", blurb: "You'll win extra chips on later streets when you hit." },
  price: { label: "Good price", blurb: "You're getting great pot odds, so a small amount of equity is enough." },
  position: { label: "Position", blurb: "Acting last lets you control the pot and realize more equity." },
  dominated: { label: "Domination risk", blurb: "Often up against a better version of your hand (same card, higher kicker)." },
  oop: { label: "Out of position", blurb: "Acting first every street makes it hard to realize equity." },
  "too-weak": { label: "Too weak", blurb: "Below the range this seat can profitably play." },
  merge: { label: "Linear value", blurb: "Strong enough to 3-bet for value against a wide range, even though it's not a monster." },
  initiative: { label: "Initiative", blurb: "The last preflop aggressor wins lots of pots with a single c-bet." },
  "pot-control": { label: "Pot control", blurb: "A medium hand that wants a showdown without building a huge pot." },
  "bluff-catch": { label: "Bluff-catch", blurb: "You only beat bluffs, but they bluff often enough to make calling profitable." },
  "pot-odds": { label: "Pot odds", blurb: "Compare your equity to the price. Continue only if equity ≥ required equity." },
  "range-bet": { label: "Range advantage", blurb: "Your whole range beats theirs on this board, so you can bet small with almost everything." },
  induce: { label: "Trap / induce", blurb: "Check a strong hand to let them bluff or catch up." },
  "give-up": { label: "Give up", blurb: "No equity and no fold equity: stop putting money in." },
  showdown: { label: "Showdown value", blurb: "Good enough to win at showdown sometimes, so check rather than turn it into a bluff." },
  multiway: { label: "Multiway risk", blurb: "More players means your one-pair hands and bluffs lose value." },
  "no-fold-equity": { label: "No fold equity", blurb: "This opponent won't fold, so bluffing burns money." },
};
