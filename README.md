# GTO Dojo

A gamified poker strategy trainer that teaches the **reasoning** behind every decision — preflop and postflop, for every seat, with live **$1/$2** and **$2/$5** exploits.

**Live:** https://rahulramath.github.io/gto-dojo/

## What makes it different

- **Reasoning ladder.** After every decision you get an instant grade, then climb five rungs of progressive disclosure: *Why?* (name the key reason before the explanation unlocks), *The chart*, *The math*, *Exploit it*, and *Legend's lens*.
- **Two lenses.** Every spot is graded against a solver-style baseline *and* against the exploitative play for the opponent in front of you (calling station, nit, TAG, LAG, maniac, or the average $1/$2 or $2/$5 pool).
- **Built for live cash.** Full-ring and 6-max, dollar or big-blind units, live open sizes, limper spots (iso-raise / over-limp / fold), rake and straddle lessons, and pool tendencies by stake.
- **Real postflop hands.** Play single-raised and 3-bet pots street by street against bots. Both ranges start from the preflop charts and narrow after every action; equities, pot odds, MDF, outs and balanced bluff ratios are computed live.
- **Range X-ray.** See how both ranges hit the board — monsters, value, medium, weak, draws and air — and who holds the range and nut advantage.
- **Belts for every seat.** UTG through the big blind each earn their own belt from White to Black based on volume and recent accuracy.
- **40-day Pro Path.** Six phases, forty lessons with quizzes and drills, and a belt exam at the end of each phase.
- **Leak Deck.** Every mistake becomes a spaced-repetition card that comes back at growing intervals until you've fixed it.
- **Math Gym.** Timed drills for pot odds, MDF and bluff break-evens, outs, combos, preflop equity instincts and bluff EV — plus pot-odds, equity and outs calculators.
- **Charts explorer.** Simple view → exact frequencies → per-hand reasoning. Compare two seats to see exactly which hands get added, or paint a range from memory and get scored.
- **Game feel.** XP and levels, streaks, 40+ achievements, confidence calibration, legends to collect, sounds and confetti.

## How it knows what's right

- **Preflop baselines** are solver-approximated 100bb cash strategies (2.5bb opens, 3bb from the small blind, rake-aware), rounded into learnable frequencies for 6-max and full ring.
- **Live limper charts** are exploitative coaching heuristics for loose live games — solvers don't model open-limping pools.
- **Postflop** uses a solver-inspired strategy model: every combo is classified on the board, texture plus range/nut advantage select a strategy family, and ranges are narrowed Bayesian-style after each action. Hand equities are Monte Carlo simulations run in the browser; the preflop equity table was generated with the same evaluator (`npm run gen:equity`).
- **Exploits** come from widely discussed live pool tendencies and opponent archetypes.

It's a training model, not a live solver. Treat the baseline as the starting point and the exploit lens as the adjustment.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # engine + chart-data tests
npm run build    # production build in dist/
```

Progress is stored in `localStorage` (export/import from Settings).

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which tests, builds with the correct base path, and publishes to GitHub Pages.

## Project layout

```
src/
  lib/          poker engine: cards, ranges, 7-card evaluator, Monte Carlo equity,
                board texture, hand classifier, preflop + postflop engines, explanations
  data/         charts, stakes, opponent archetypes, curriculum, legends, achievements
  pages/        Dojo, Preflop, Postflop, Charts, Pro Path, Math Gym, Progress, Legends, Settings
  components/   table, cards, range grid, reasoning ladder, coaching widgets
  store/        persisted progress (zustand)
```

## Further study

Books and ideas referenced in the lessons: *The Theory of Poker* (Sklansky), *Super/System* (Brunson), *Harrington on Hold'em* and *Harrington on Cash Games*, *The Mathematics of Poker* (Chen & Ankenman), *Applications of No-Limit Hold'em* (Janda), *Expert Heads Up No-Limit Hold'em* (Tipton), *The Course* and *Poker's 1%* (Ed Miller), *Thinking in Bets* (Annie Duke), *The Mental Game of Poker* (Tendler), *Elements of Poker* (Angelo), *Caro's Book of Poker Tells* (Caro).
