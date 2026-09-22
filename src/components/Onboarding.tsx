import { useState } from "react";
import { ArrowRight, Brain, Spade, Target, Trophy } from "lucide-react";
import { STAKE_LIST, type StakeId } from "../data/stakes";
import { useStore } from "../store/store";
import { navigate } from "../lib/router";
import { useUi } from "../store/ui";

const LEVELS = [
  { id: "new" as const, title: "New to strategy", sub: "Start at Day 1: positions, combos and opening ranges.", day: 1 },
  { id: "some" as const, title: "I know the basics", sub: "Start at Day 8: blind defense, 3-bets and blockers.", day: 8 },
  { id: "reg" as const, title: "I'm a regular", sub: "Start at Day 21: flop strategy, then turns, rivers and exploits.", day: 21 },
];

export function Onboarding() {
  const onboarded = useStore((s) => s.settings.onboarded);
  const set = useStore((s) => s.setSettings);
  const [step, setStep] = useState(0);
  const [stake, setStake] = useState<StakeId>("1-2");
  if (onboarded) return null;

  const finish = (level: (typeof LEVELS)[number]) => {
    const st = STAKE_LIST.find((s) => s.id === stake)!;
    set({
      stake,
      table: st.table,
      units: stake === "online" ? "bb" : "$",
      sizing: stake === "online" ? "solver" : "live",
      experience: level.id,
      askWhy: level.id !== "reg",
      onboarded: true,
    });
    useUi.getState().burst();
    navigate(`/learn?day=${level.day}`);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink-950/90 p-4 backdrop-blur">
      <div className="panel w-full max-w-xl animate-pop p-6">
        {step === 0 && (
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-felt-400 to-felt-800 ring-1 ring-gold-400/60">
              <Spade size={22} className="fill-white text-white" />
            </div>
            <h1 className="mt-4 font-display text-3xl font-bold text-white">
              Welcome to GTO <span className="text-gold-400">Dojo</span>
            </h1>
            <p className="mt-2 text-ink-300">A poker trainer that teaches the reasoning behind every decision, not just the answer.</p>
            <ul className="mt-5 space-y-3 text-sm text-ink-200">
              <li className="flex gap-3">
                <Target size={18} className="shrink-0 text-gold-300" /> Play real spots from every seat and get instant grades against a solver-style baseline — and an exploit lens for live players.
              </li>
              <li className="flex gap-3">
                <Brain size={18} className="shrink-0 text-violet-300" /> Climb a reasoning ladder after each hand: why, the chart, the math, the exploit, and a legend's take.
              </li>
              <li className="flex gap-3">
                <Trophy size={18} className="shrink-0 text-emerald-300" /> Earn belts for every seat, streaks, achievements, and follow a 40-day path to a black belt.
              </li>
            </ul>
            <button className="btn-primary mt-6 w-full" onClick={() => setStep(1)}>
              Let's set up your game <ArrowRight size={16} />
            </button>
          </div>
        )}
        {step === 1 && (
          <div>
            <div className="label">Step 1 of 2</div>
            <h2 className="mt-1 font-display text-2xl font-bold text-white">Where do you play?</h2>
            <div className="mt-4 space-y-2">
              {STAKE_LIST.map((st) => (
                <button
                  key={st.id}
                  onClick={() => setStake(st.id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${stake === st.id ? "border-gold-400/70 bg-gold-400/10" : "border-white/10 hover:bg-white/5"}`}
                >
                  <div className="font-semibold text-white">{st.label}</div>
                  <div className="text-xs text-ink-400">{st.pool.headline}</div>
                </button>
              ))}
            </div>
            <button className="btn-primary mt-5 w-full" onClick={() => setStep(2)}>
              Next <ArrowRight size={16} />
            </button>
          </div>
        )}
        {step === 2 && (
          <div>
            <div className="label">Step 2 of 2</div>
            <h2 className="mt-1 font-display text-2xl font-bold text-white">How experienced are you?</h2>
            <div className="mt-4 space-y-2">
              {LEVELS.map((l) => (
                <button key={l.id} onClick={() => finish(l)} className="w-full rounded-xl border border-white/10 p-3 text-left transition hover:border-gold-400/50 hover:bg-gold-400/5">
                  <div className="font-semibold text-white">{l.title}</div>
                  <div className="text-xs text-ink-400">{l.sub}</div>
                </button>
              ))}
            </div>
            <p className="mt-4 text-[11px] text-ink-500">Every lesson stays open, so you can jump anywhere later.</p>
          </div>
        )}
      </div>
    </div>
  );
}
