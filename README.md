# GTO Dojo

Short daily poker sessions for every seat. Play a hand, and you'll see right away why your move was right or what to do instead. It's built for live $1/$2 and $2/$5 players, with solver-style charts and tips for beating real opponents.

**Try it:** https://rahulramath.github.io/gto-dojo/

## How a session works

1. **Start today's session.** You get 10 hands picked for you, starting with hands you missed before and extra practice in your weakest seat.
2. **Make your move.** Fold, call or raise before the flop, or check and bet after it. Stuck? Tap *Need a hint?*
3. **See the answer.** You get a headline like *"Nice fold"* or *"This one's a raise"*, a sentence on the problem with your play, a sentence on why the better play works, and one picture that shows it: the range chart with your hand highlighted, a meter comparing the equity you need to the equity you have, or a hand strength meter.
4. **Dig in only if you want to.** Questions like *"What about calling?"* open one at a time. *Learn more* has the full chart, the numbers, how to beat this type of player and the idea behind the spot.
5. **Check your results.** You see your score, XP, streak and a *What to fix* list. Hands you miss come back later in *Fix your mistakes* until you get them right.

There's also a **Daily Challenge** with the same 10 hands for everyone and a result you can share, **postflop hands** you play from flop to river, and **math drills** against a 15-second clock.

## Lessons

A 40-day path in six phases, each ending with a belt exam. Every lesson shows one idea per screen with a picture (seat map, opening ranges, combos, pot odds, outs, board textures, bluff ratios and more), then three quick questions and a practice session.

## Design

- Four tabs: **Train, Learn, Charts, Me**. Sessions and lessons open full screen so you can focus.
- Five text sizes (24, 20, 16, 14 and 12), Inter throughout, an 8-point spacing grid, pill buttons, and sheets that slide up on phones.

## How grading works

- **Preflop** answers come from solver-style strategies for 100 big blind cash games (2.5bb opens, 3bb from the small blind), rounded into ranges you can actually learn for 6-max and full ring.
- **Limper charts** are built for loose live games rather than from a solver.
- **Postflop** uses a model inspired by solvers. It sorts every hand in both ranges on the board, picks a strategy from the board and who has the edge, and narrows the ranges after each action. Equity is simulated right in your browser.

It's a training tool, not a live solver.

## Run it locally

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # engine, chart data and copy tests
npm run build    # production build in dist/
```

Your progress is saved in your browser. You can export or import it from Me, under Settings. Every push to `main` runs the tests, builds the app and deploys it to GitHub Pages.
