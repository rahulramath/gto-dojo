import { useEffect, useMemo, useState } from "react";
import { Calculator, Crosshair, Dices, Gauge, Layers, Percent, Play, Sigma, Timer } from "lucide-react";
import { navigate, useRoute } from "../lib/router";
import { useStore } from "../store/store";
import { announce } from "../store/ui";
import { play } from "../lib/sound";
import { cardsPretty, parseCards, type Card } from "../lib/cards";
import { classify } from "../lib/handStrength";
import { combosFromWeights, equityVsRange, handVsHand } from "../lib/equity";
import { parseWeights } from "../lib/ranges";
import { mulberry32 } from "../lib/rng";
import { PlayingCard } from "../components/PlayingCard";
import { SectionTitle } from "../components/ui";
import { pct } from "../lib/format";

interface Q {
  prompt: string;
  cards?: { hero: Card[]; board?: Card[]; villain?: Card[] };
  options: string[];
  answer: number;
  explain: string;
}

type DrillId = "potodds" | "mdf" | "outs" | "combos" | "equity" | "ev";

const DRILLS: { id: DrillId; name: string; desc: string; icon: typeof Percent }[] = [
  { id: "potodds", name: "Pot Odds Sprint", desc: "Turn any bet into required equity.", icon: Percent },
  { id: "mdf", name: "MDF & Bluffs", desc: "Defense frequencies and bluff break-evens.", icon: Gauge },
  { id: "outs", name: "Count the Outs", desc: "Read a draw and count clean outs fast.", icon: Crosshair },
  { id: "combos", name: "Combo Counter", desc: "Combinations and card removal.", icon: Layers },
  { id: "equity", name: "Equity Instinct", desc: "Estimate classic preflop matchups.", icon: Dices },
  { id: "ev", name: "Bluff EV", desc: "Is the bluff profitable?", icon: Sigma },
];

const shuffleOpts = (correct: string, wrong: string[], rnd: () => number): { options: string[]; answer: number } => {
  const opts = [correct, ...Array.from(new Set(wrong.filter((w) => w !== correct))).slice(0, 3)];
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return { options: opts, answer: opts.indexOf(correct) };
};

const FRACS = [0.25, 0.33, 0.5, 0.66, 0.75, 1, 1.25, 1.5, 2];
const fracName = (f: number) => (f === 0.33 ? "⅓ pot" : f === 0.66 ? "⅔ pot" : f === 1 ? "pot" : `${Math.round(f * 100)}% pot`);

function genPotOdds(rnd: () => number): Q {
  const pot = [20, 40, 60, 80, 100, 120, 150, 200, 300][Math.floor(rnd() * 9)];
  const f = FRACS[Math.floor(rnd() * FRACS.length)];
  const bet = Math.round(pot * f);
  const req = bet / (pot + 2 * bet);
  const c = pct(req);
  const wrong = [pct(bet / (pot + bet)), pct(req + 0.08), pct(Math.max(0.05, req - 0.07)), pct(bet / pot / 2)];
  return {
    prompt: `The pot is $${pot}. Your opponent bets $${bet} (${fracName(f)}). What equity do you need to call?`,
    ...shuffleOpts(c, wrong, rnd),
    explain: `Call $${bet} to win $${pot + 2 * bet} total: ${bet} ÷ ${pot + 2 * bet} = ${c}.`,
  };
}

function genMdf(rnd: () => number): Q {
  const f = FRACS[Math.floor(rnd() * FRACS.length)];
  const kind = Math.floor(rnd() * 3);
  if (kind === 0) {
    const mdf = 1 / (1 + f);
    return {
      prompt: `Facing a ${fracName(f)} bet, what's your minimum defense frequency?`,
      ...shuffleOpts(pct(mdf), [pct(f / (1 + f)), pct(f / (1 + 2 * f)), pct(Math.min(0.95, mdf + 0.12))], rnd),
      explain: `MDF = pot ÷ (pot + bet) = 1 ÷ ${(1 + f).toFixed(2)} = ${pct(mdf)}.`,
    };
  }
  if (kind === 1) {
    const a = f / (1 + f);
    return {
      prompt: `You bluff ${fracName(f)}. How often must they fold for the bluff to break even?`,
      ...shuffleOpts(pct(a), [pct(1 / (1 + f)), pct(f / (1 + 2 * f)), pct(Math.min(0.95, a + 0.1))], rnd),
      explain: `Break-even fold % = bet ÷ (pot + bet) = ${f} ÷ ${(1 + f).toFixed(2)} = ${pct(a)}.`,
    };
  }
  const b = f / (1 + 2 * f);
  return {
    prompt: `On the river you bet ${fracName(f)} with a polarized range. What share of your bets should be bluffs to stay balanced?`,
    ...shuffleOpts(pct(b), [pct(f / (1 + f)), pct(1 / (1 + f)), pct(Math.max(0.05, b - 0.1))], rnd),
    explain: `Bluff share = bet ÷ (pot + 2×bet) = ${f} ÷ ${(1 + 2 * f).toFixed(2)} = ${pct(b)} — exactly the equity a caller needs.`,
  };
}

function genOuts(rnd: () => number): Q {
  for (let tries = 0; tries < 400; tries++) {
    const deck: Card[] = Array.from({ length: 52 }, (_, i) => i);
    const pickCard = () => deck.splice(Math.floor(rnd() * deck.length), 1)[0];
    const hero = [pickCard(), pickCard()] as [Card, Card];
    const board = [pickCard(), pickCard(), pickCard()];
    const info = classify(hero, board);
    const d = info.draws;
    if (info.category !== 0 || d.overcards > 0) continue;
    const eight = d.oesd || d.doubleGut;
    if (!d.flushDraw && !eight && !d.gutshot) continue;
    const outs = (d.flushDraw ? 9 : 0) + (eight ? (d.flushDraw ? 6 : 8) : d.gutshot ? (d.flushDraw ? 3 : 4) : 0);
    const name = [d.flushDraw ? "flush draw" : "", d.oesd ? "open-ended straight draw" : d.doubleGut ? "double gutshot" : d.gutshot ? "gutshot" : ""].filter(Boolean).join(" + ");
    return {
      prompt: "How many clean outs does this hand have to a flush or straight?",
      cards: { hero, board },
      ...shuffleOpts(String(outs), [String(outs + 1), String(Math.max(2, outs - 1)), String(outs + 3), String(Math.max(2, outs - 4)), "6"], rnd),
      explain: `${name[0].toUpperCase()}${name.slice(1)}: ${outs} outs (flush draws have 9, open-enders 8, gutshots 4; combos subtract overlapping cards). Rule of 4: ~${Math.min(100, outs * 4)}% by the river.`,
    };
  }
  return genPotOdds(rnd);
}

function genCombos(rnd: () => number): Q {
  const bank: { p: string; a: number; e: string; w: number[] }[] = [
    { p: "How many combinations of AK (suited + offsuit) are there?", a: 16, e: "4 aces × 4 kings = 16 (4 suited, 12 offsuit).", w: [12, 4, 8] },
    { p: "How many combos of any specific pocket pair (e.g. JJ)?", a: 6, e: "Choose 2 of 4 suits: 6.", w: [4, 12, 3] },
    { p: "How many combos of a specific suited hand (e.g. T9s)?", a: 4, e: "One per suit: 4.", w: [6, 12, 16] },
    { p: "You hold an ace. How many AA combos remain for your opponent?", a: 3, e: "3 aces left: C(3,2) = 3.", w: [6, 1, 4] },
    { p: "You hold an ace. How many AK combos remain?", a: 12, e: "3 aces × 4 kings = 12.", w: [16, 9, 6] },
    { p: "You hold A♠. How many AKo combos remain?", a: 9, e: "3 aces × 4 kings = 12 AK, minus 3 suited = 9 offsuit.", w: [12, 6, 3] },
    { p: "Board has a 7. How many combos of pocket sevens (a set) are possible?", a: 3, e: "3 sevens left: C(3,2) = 3.", w: [6, 1, 4] },
    { p: "Board is K♣Q♦4♠. How many KQ (top two pair) combos exist?", a: 9, e: "3 kings × 3 queens = 9.", w: [16, 12, 6] },
    { p: "Board is A♥7♦2♣. How many AA combos are possible?", a: 3, e: "One ace is on board: C(3,2) = 3.", w: [6, 1, 4] },
    { p: "How many total starting-hand combos are there?", a: 1326, e: "C(52,2) = 1,326.", w: [169, 2652, 1024] },
    { p: "How many offsuit combos does any non-pair hand have?", a: 12, e: "4 × 3 = 12.", w: [16, 4, 8] },
    { p: "Board has two hearts. How many combos of a specific suited heart hand (e.g. A♥5♥) are possible?", a: 1, e: "Only one combo can be both hearts: A♥5♥.", w: [4, 3, 2] },
  ];
  const q = bank[Math.floor(rnd() * bank.length)];
  return { prompt: q.p, ...shuffleOpts(String(q.a), q.w.map(String), rnd), explain: q.e };
}

const MATCHUPS: [string, string][] = [
  ["AsAh", "KdKc"],
  ["QhQd", "AsKs"],
  ["JcJd", "AhKd"],
  ["AsKd", "AhQc"],
  ["AhKh", "7c7d"],
  ["8s8d", "7h6h"],
  ["KsQs", "AdTc"],
  ["AdKc", "Jh9h"],
  ["TcTd", "9h9s"],
  ["AhJd", "KcQs"],
  ["5c5d", "AsKd"],
  ["9h8h", "AcKc"],
  ["KhKd", "AsQs"],
  ["AcQd", "KsJh"],
  ["7s7h", "Kc6d"],
];

function genEquity(rnd: () => number): Q {
  const [a, b] = MATCHUPS[Math.floor(rnd() * MATCHUPS.length)];
  const h1 = parseCards(a) as [Card, Card];
  const h2 = parseCards(b) as [Card, Card];
  const eq = handVsHand(h1, h2, [], 4000, mulberry32(Math.floor(rnd() * 1e9))).equity;
  const bucket = (e: number) => {
    const x = Math.max(e, 1 - e);
    if (x >= 0.75) return "About 80 / 20";
    if (x >= 0.62) return "About 70 / 30";
    if (x >= 0.53) return "About 55 / 45";
    return "About 50 / 50";
  };
  const fav = eq >= 0.5 ? cardsPretty(h1) : cardsPretty(h2);
  const correct = bucket(eq);
  const opts = ["About 80 / 20", "About 70 / 30", "About 55 / 45", "About 50 / 50"];
  return {
    prompt: `${cardsPretty(h1)} vs ${cardsPretty(h2)} all-in preflop. How close is it?`,
    cards: { hero: h1, villain: h2 },
    options: opts,
    answer: opts.indexOf(correct),
    explain: `${fav} is the favorite: ${pct(Math.max(eq, 1 - eq), 1)} vs ${pct(Math.min(eq, 1 - eq), 1)}. Pair vs two overcards is ~55/45, dominated hands ~70/30+, pair vs lower pair ~80/20.`,
  };
}

function genEv(rnd: () => number): Q {
  const pot = [50, 80, 100, 120, 200][Math.floor(rnd() * 5)];
  const f = [0.33, 0.5, 0.75, 1][Math.floor(rnd() * 4)];
  const bet = Math.round(pot * f);
  const fold = [0.3, 0.4, 0.5, 0.6, 0.7][Math.floor(rnd() * 5)];
  const ev = fold * pot - (1 - fold) * bet;
  const fmt = (x: number) => `${x >= 0 ? "+" : "−"}$${Math.abs(Math.round(x))}`;
  return {
    prompt: `Pot $${pot}. You bluff $${bet} with a hand that never wins at showdown. They fold ${pct(fold)}. What's the bluff's EV?`,
    ...shuffleOpts(fmt(ev), [fmt(fold * pot), fmt(-ev), fmt(ev + bet * 0.5), fmt(fold * (pot + bet) - bet)], rnd),
    explain: `EV = fold% × pot − call% × bet = ${fold} × ${pot} − ${(1 - fold).toFixed(1)} × ${bet} = ${fmt(ev)}. Break-even fold rate here is ${pct(bet / (pot + bet))}.`,
  };
}

const GEN: Record<DrillId, (r: () => number) => Q> = { potodds: genPotOdds, mdf: genMdf, outs: genOuts, combos: genCombos, equity: genEquity, ev: genEv };

function DrillRunner({ id, day, onExit, onRestart }: { id: DrillId; day: number | null; onExit: () => void; onRestart: () => void }) {
  const [seed] = useState(() => Math.floor(Math.random() * 1e9));
  const questions = useMemo(() => {
    const rnd = mulberry32(seed);
    return Array.from({ length: 10 }, () => GEN[id](rnd));
  }, [id, seed]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [finished, setFinished] = useState(false);
  const best = useStore((s) => s.mathBest[id] ?? 0);
  const q = questions[i];

  useEffect(() => {
    if (picked !== null || finished) return;
    if (timeLeft <= 0) {
      setPicked(-1);
      play("bad");
      if (day) useStore.getState().recordDrill(`day-${day}`, false);
      return;
    }
    const t = setTimeout(() => setTimeLeft((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [day, finished, picked, timeLeft]);

  const answer = (k: number) => {
    if (picked !== null) return;
    setPicked(k);
    const right = k === q.answer;
    if (right) setScore((s) => s + 1);
    play(right ? "perfect" : "bad");
    if (day) useStore.getState().recordDrill(`day-${day}`, right);
  };

  const nextQ = () => {
    if (i + 1 >= questions.length) {
      setFinished(true);
      const r = useStore.getState().recordMath(id, score, questions.length);
      announce(r);
      if (score === questions.length) play("level");
      return;
    }
    setI(i + 1);
    setPicked(null);
    setTimeLeft(15);
  };

  const meta = DRILLS.find((d) => d.id === id)!;

  if (finished)
    return (
      <div className="panel mx-auto max-w-lg p-6 text-center">
        <div className="text-5xl">{score >= 9 ? "🏆" : score >= 7 ? "🎯" : "📚"}</div>
        <div className="mt-2 font-display text-3xl font-bold text-gold-300">
          {score}/{questions.length}
        </div>
        <div className="text-sm text-ink-300">{meta.name} · best {Math.max(best, score)}/10</div>
        <p className="mt-3 text-sm text-ink-200">{score >= 8 ? "Excellent — that math is becoming automatic." : "Run it again: speed comes from repetition."}</p>
        <div className="mt-5 flex justify-center gap-2">
          <button className="btn-ghost" onClick={onExit}>
            Back to gym
          </button>
          {day ? (
            <button className="btn-primary" onClick={() => navigate(`/learn?day=${day}`)}>
              Back to Day {day}
            </button>
          ) : (
            <button className="btn-primary" onClick={onRestart}>
              Again
            </button>
          )}
        </div>
      </div>
    );

  return (
    <div className="panel mx-auto max-w-2xl p-5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-white">{meta.name}</span>
        <span className="flex items-center gap-3 text-ink-300">
          <span className="num">
            {i + 1}/{questions.length}
          </span>
          <span className={`num flex items-center gap-1 ${timeLeft <= 5 && picked === null ? "text-rose-300" : ""}`}>
            <Timer size={14} /> {picked === null ? `${timeLeft}s` : "—"}
          </span>
          <span className="num text-gold-300">★ {score}</span>
        </span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full bg-gold-400 transition-all" style={{ width: `${((i + (picked !== null ? 1 : 0)) / questions.length) * 100}%` }} />
      </div>
      <h2 className="mt-5 text-lg font-semibold text-white">{q.prompt}</h2>
      {q.cards && (
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div className="flex gap-1.5">
            {q.cards.hero.map((c) => (
              <PlayingCard key={c} card={c} size="md" />
            ))}
          </div>
          {q.cards.board && (
            <>
              <span className="text-ink-400">on</span>
              <div className="flex gap-1.5">
                {q.cards.board.map((c) => (
                  <PlayingCard key={c} card={c} size="md" />
                ))}
              </div>
            </>
          )}
          {q.cards.villain && (
            <>
              <span className="text-ink-400">vs</span>
              <div className="flex gap-1.5">
                {q.cards.villain.map((c) => (
                  <PlayingCard key={c} card={c} size="md" />
                ))}
              </div>
            </>
          )}
        </div>
      )}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {q.options.map((o, k) => {
          const right = k === q.answer;
          const isPicked = picked === k;
          return (
            <button
              key={o + k}
              onClick={() => answer(k)}
              disabled={picked !== null}
              className={`rounded-xl border px-4 py-3 text-left font-semibold transition ${
                picked === null
                  ? "border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.08]"
                  : right
                    ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-100"
                    : isPicked
                      ? "border-rose-400/60 bg-rose-500/10 text-rose-100"
                      : "border-white/10 text-ink-400"
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className="mt-4 animate-fadeUp rounded-xl bg-black/25 p-3 text-sm text-ink-200">
          {picked === -1 && <div className="mb-1 font-semibold text-rose-300">Time's up.</div>}
          {q.explain}
          <button className="btn-primary mt-3 w-full" onClick={nextQ}>
            {i + 1 >= questions.length ? "See results" : "Next question"}
          </button>
        </div>
      )}
    </div>
  );
}

function PotCalc() {
  const [pot, setPot] = useState(100);
  const [bet, setBet] = useState(75);
  const req = bet / (pot + 2 * bet);
  const mdf = pot / (pot + bet);
  const alpha = bet / (pot + bet);
  const bluff = bet / (pot + 2 * bet);
  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center gap-2 font-semibold text-white">
        <Calculator size={16} className="text-gold-300" /> Pot odds & MDF
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-ink-300">
          Pot
          <input type="number" value={pot} min={1} onChange={(e) => setPot(Math.max(1, Number(e.target.value)))} className="mt-1 w-full rounded-lg border border-white/10 bg-ink-800 px-2 py-1.5 text-sm text-white" />
        </label>
        <label className="text-xs text-ink-300">
          Bet
          <input type="number" value={bet} min={0} onChange={(e) => setBet(Math.max(0, Number(e.target.value)))} className="mt-1 w-full rounded-lg border border-white/10 bg-ink-800 px-2 py-1.5 text-sm text-white" />
        </label>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        {[
          ["Equity to call", pct(req, 1), "call ÷ (pot + 2×bet)"],
          ["Min. defense (MDF)", pct(mdf, 1), "pot ÷ (pot + bet)"],
          ["Bluff break-even", pct(alpha, 1), "bet ÷ (pot + bet)"],
          ["Balanced bluff share", pct(bluff, 1), "bet ÷ (pot + 2×bet)"],
        ].map(([l, v, n]) => (
          <div key={l} className="rounded-lg bg-black/25 p-2">
            <div className="text-ink-400">{l}</div>
            <div className="num text-lg font-bold text-gold-200">{v}</div>
            <div className="text-[10px] text-ink-500">{n}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EquityCalc() {
  const [hero, setHero] = useState("AhKh");
  const [villain, setVillain] = useState("QQ+, AK, AQs");
  const [board, setBoard] = useState("");
  const [res, setRes] = useState<{ eq: number; err?: string } | null>(null);
  const run = () => {
    try {
      const h = parseCards(hero);
      if (h.length !== 2) throw new Error("Enter exactly two hero cards, like AhKh.");
      const b = board.trim() ? parseCards(board) : [];
      if (b.length > 5 || b.length === 1 || b.length === 2) throw new Error("Board must be 0, 3, 4 or 5 cards.");
      const all = [...h, ...b];
      if (new Set(all).size !== all.length) throw new Error("Duplicate cards.");
      let eq: number;
      const vCards = villain.replace(/[\s,]/g, "");
      if (/^([2-9TJQKA][shdc]){2}$/i.test(vCards)) {
        const v = parseCards(vCards) as [Card, Card];
        eq = handVsHand(h as [Card, Card], v, b, 20000).equity;
      } else {
        const range = combosFromWeights(parseWeights(villain));
        eq = equityVsRange(h as [Card, Card], b, range, 20000).equity;
      }
      setRes({ eq });
    } catch (e) {
      setRes({ eq: 0, err: e instanceof Error ? e.message : "Invalid input" });
    }
  };
  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center gap-2 font-semibold text-white">
        <Dices size={16} className="text-gold-300" /> Equity calculator
      </div>
      <div className="space-y-2 text-xs text-ink-300">
        <label className="block">
          Your hand
          <input value={hero} onChange={(e) => setHero(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-ink-800 px-2 py-1.5 font-mono text-sm text-white" />
        </label>
        <label className="block">
          Opponent (hand like QsQd, or range like "QQ+, AK, A5s:0.5")
          <input value={villain} onChange={(e) => setVillain(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-ink-800 px-2 py-1.5 font-mono text-sm text-white" />
        </label>
        <label className="block">
          Board (optional)
          <input value={board} placeholder="e.g. Kh7h2d" onChange={(e) => setBoard(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-ink-800 px-2 py-1.5 font-mono text-sm text-white" />
        </label>
      </div>
      <button className="btn-primary mt-3 w-full" onClick={run}>
        Run 20,000 simulations
      </button>
      {res && (
        <div className="mt-3 rounded-lg bg-black/25 p-3 text-center">
          {res.err ? <span className="text-sm text-rose-300">{res.err}</span> : <span className="num text-2xl font-bold text-gold-200">{pct(res.eq, 1)}</span>}
        </div>
      )}
    </div>
  );
}

function OutsCalc() {
  const [outs, setOuts] = useState(9);
  const turn = outs / 47;
  const byRiver = 1 - ((47 - outs) / 47) * ((46 - outs) / 46);
  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center gap-2 font-semibold text-white">
        <Crosshair size={16} className="text-gold-300" /> Outs → equity
      </div>
      <input type="range" min={1} max={20} value={outs} onChange={(e) => setOuts(Number(e.target.value))} className="w-full accent-[#f2c14e]" />
      <div className="mt-1 text-sm text-white">
        <span className="num font-bold">{outs}</span> outs
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-black/25 p-2">
          <div className="text-ink-400">Next card (flop → turn)</div>
          <div className="num text-lg font-bold text-gold-200">{pct(turn, 1)}</div>
          <div className="text-[10px] text-ink-500">rule of 2: ~{outs * 2}%</div>
        </div>
        <div className="rounded-lg bg-black/25 p-2">
          <div className="text-ink-400">By the river (from flop)</div>
          <div className="num text-lg font-bold text-gold-200">{pct(byRiver, 1)}</div>
          <div className="text-[10px] text-ink-500">rule of 4: ~{Math.min(100, outs * 4)}%</div>
        </div>
      </div>
    </div>
  );
}

export function MathGym() {
  const { params } = useRoute();
  const initial = params.get("drill") as DrillId | null;
  const day = Number(params.get("day")) || null;
  const [active, setActive] = useState<DrillId | null>(initial && GEN[initial] ? initial : null);
  const [run, setRun] = useState(0);
  const best = useStore((s) => s.mathBest);

  if (active) return <DrillRunner key={`${active}-${run}`} id={active} day={day} onExit={() => setActive(null)} onRestart={() => setRun((r) => r + 1)} />;

  return (
    <div>
      <SectionTitle eyebrow="Math Gym" title="Make the math automatic" desc="Ten questions, fifteen seconds each. Every answer shows the formula so the shortcut sticks." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DRILLS.map((d) => {
          const Icon = d.icon;
          return (
            <button key={d.id} onClick={() => setActive(d.id)} className="panel group p-4 text-left transition hover:border-gold-400/40">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-400/15 text-gold-300">
                  <Icon size={20} />
                </span>
                <span className="num text-xs text-ink-400">best {best[d.id] ?? 0}/10</span>
              </div>
              <div className="mt-3 font-semibold text-white">{d.name}</div>
              <div className="text-sm text-ink-400">{d.desc}</div>
              <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-gold-300">
                <Play size={12} /> Start
              </div>
            </button>
          );
        })}
      </div>
      <h2 className="mb-3 mt-8 font-display text-xl font-bold text-white">Calculators</h2>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <PotCalc />
        <EquityCalc />
        <OutsCalc />
      </div>
    </div>
  );
}
