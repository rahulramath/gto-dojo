import { useState } from "react";
import { ArrowRight, Brain, Spade, Target, Trophy } from "lucide-react";
import { STAKE_LIST, type StakeId } from "../data/stakes";
import { useStore } from "../store/store";
import { navigate } from "../lib/router";
import { useUi } from "../store/ui";

const LEVELS = [
  { id: "new" as const, title: "New to strategy", sub: "Start with positions and opening ranges", day: 1 },
  { id: "some" as const, title: "I know the basics", sub: "Start with blind defense and 3-bets", day: 8 },
  { id: "reg" as const, title: "I play regularly", sub: "Start with flop strategy", day: 21 },
];

export function Onboarding() {
  const onboarded = useStore((s) => s.settings.onboarded);
  const set = useStore((s) => s.setSettings);
  const [step, setStep] = useState(0);
  const [stake, setStake] = useState<StakeId>("1-2");
  if (onboarded) return null;

  const finish = (level: (typeof LEVELS)[number]) => {
    const st = STAKE_LIST.find((s) => s.id === stake)!;
    set({ stake, table: st.table, units: stake === "online" ? "bb" : "$", sizing: stake === "online" ? "solver" : "live", experience: level.id, onboarded: true });
    useUi.getState().burst();
    navigate(level.day === 1 ? "/" : `/lesson?day=${level.day}`);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-ink-950/95 p-4">
      <div className="card w-full max-w-md animate-pop">
        {step === 0 && (
          <div className="space-y-6">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-felt-400 to-felt-800 ring-1 ring-gold-400/60">
              <Spade size={24} className="fill-white text-white" />
            </span>
            <div>
              <h1 className="t-headline">
                Welcome to GTO <span className="text-gold-400">Dojo</span>
              </h1>
              <p className="t-body mt-2 text-ink-300">Short daily sessions that teach you why each move is right.</p>
            </div>
            <ul className="space-y-4">
              {[
                { icon: Target, c: "#f2c14e", t: "Play a hand, get an instant verdict" },
                { icon: Brain, c: "#a78bfa", t: "See why in one line — tap for more" },
                { icon: Trophy, c: "#22c55e", t: "Earn a belt for every seat" },
              ].map(({ icon: Icon, c, t }) => (
                <li key={t} className="flex items-center gap-4">
                  <Icon size={20} style={{ color: c }} className="shrink-0" />
                  <span className="t-body text-ink-100">{t}</span>
                </li>
              ))}
            </ul>
            <button className="btn-filled btn-lg w-full" onClick={() => setStep(1)}>
              Get started <ArrowRight size={16} />
            </button>
          </div>
        )}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <div className="t-label">1 of 2</div>
              <h2 className="t-title-lg mt-1">Where do you play?</h2>
            </div>
            <div className="space-y-2">
              {STAKE_LIST.map((st) => (
                <button
                  key={st.id}
                  onClick={() => setStake(st.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${stake === st.id ? "border-gold-400/70 bg-gold-400/10" : "border-white/10 hover:bg-white/[0.04]"}`}
                >
                  <div className="t-title">{st.label}</div>
                  <div className="t-label">{st.buyIn}</div>
                </button>
              ))}
            </div>
            <button className="btn-filled btn-lg w-full" onClick={() => setStep(2)}>
              Next
            </button>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <div className="t-label">2 of 2</div>
              <h2 className="t-title-lg mt-1">How much do you know?</h2>
            </div>
            <div className="space-y-2">
              {LEVELS.map((l) => (
                <button key={l.id} onClick={() => finish(l)} className="w-full rounded-2xl border border-white/10 p-4 text-left transition hover:border-gold-400/50 hover:bg-gold-400/5">
                  <div className="t-title">{l.title}</div>
                  <div className="t-label">{l.sub}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
