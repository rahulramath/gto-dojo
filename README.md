# GTO Dojo

Short daily poker sessions for every seat — with clear, one-line answers to *why a move is right* and *why yours wasn't*. Built for live **$1/$2** and **$2/$5** players, with a solver-style baseline and exploit tips.

**Live:** https://rahulramath.github.io/gto-dojo/

## The loop

1. **Start today's session** — 10 hands picked for you: your due mistakes first, then extra reps on your weakest seat.
2. **Make your move** — fold, call, raise (or check and bet sizes postflop). Stuck? Tap *Need a hint?*
3. **Get the verdict** — a single headline (*"Fold was better"*), one line on why your play was wrong, one line on why the better play is right, and one visual as proof: the range chart with your hand highlighted, a price meter (equity needed vs equity you have), or a strength meter.
4. **Go deeper only if you want** — *Why not call?* questions open one at a time; *Learn more* holds the full chart, the numbers, the exploit, and the idea behind it.
5. **See your results** — score, XP, streak, and a *What to fix* list. Misses come back in *Fix your mistakes* at growing intervals.

Plus a **Daily Challenge** (the same 10 hands for everyone, with a shareable result), **postflop hands** played flop to river, and **math drills** with a 15-second timer.

## Learn

A 40-day path in six phases, each ending in a belt exam. Every lesson is a short stepper: one idea per screen with a visual (seat map, open ranges, combos, pot odds, outs, board textures, range advantage, bluff ratios…), three quick questions, then a practice session.

## Design system

- Four destinations: **Train, Learn, Charts, Me**. Sessions and lessons run in a distraction-free focus mode.
- Five type roles only (24 / 20 / 16 / 14 / 12, Inter), an 8-point spacing grid, pill buttons, bottom sheets on mobile and dialogs on desktop.

## How grading works

- **Preflop baselines** are solver-approximated 100bb cash strategies (2.5bb opens, 3bb from the small blind, rake-aware), rounded into learnable frequencies for 6-max and full ring.
- **Live limper charts** are exploitative coaching heuristics for loose live games.
- **Postflop** uses a solver-inspired model: every combo in both ranges is classified on the board, texture and range/nut advantage pick a strategy, and ranges narrow after each action. Equities are Monte Carlo simulations run in the browser.

It's a training model, not a live solver.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # engine, chart data and coaching copy tests
npm run build    # production build in dist/
```

Progress is stored in `localStorage` (export/import from Me → Settings). Pushing to `main` tests, builds and deploys to GitHub Pages.
