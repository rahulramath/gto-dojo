import { useState, type ReactNode } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import type { Coach } from "../lib/coachText";
import { GRADES, type Grade } from "../lib/grading";

const TONE = {
  good: { bg: "rgba(34,197,94,0.08)", fg: "#4ade80" },
  bad: { bg: "rgba(239,68,68,0.08)", fg: "#f87171" },
};

function Question({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  return (
    <div className="border-t border-white/[0.06] first:border-t-0">
      <button type="button" onClick={onToggle} className="flex min-h-12 w-full items-center justify-between gap-4 py-2 text-left">
        <span className="t-body font-medium text-ink-100">{q}</span>
        <ChevronDown size={20} className={`shrink-0 text-ink-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <p className="t-body animate-fadeUp pb-4 text-ink-200">{a}</p>}
    </div>
  );
}

/**
 * The one feedback pattern used everywhere: what was right, why (in a line),
 * one visual as proof, then optional questions the learner can open.
 */
export function Feedback({
  coach,
  grade,
  xp,
  visual,
  onLearnMore,
  onNext,
  nextLabel,
  context,
  children,
}: {
  coach: Coach;
  grade: Grade;
  xp: number;
  visual: ReactNode;
  onLearnMore: () => void;
  onNext: () => void;
  nextLabel: string;
  /** Compact reminder of the hand, shown on phones where the sheet covers the table. */
  context?: ReactNode;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const questions = [...coach.others.map((o) => ({ id: o.key, q: o.label, a: o.text }))];
  if (coach.exploit) questions.push({ id: "exploit", q: "How would I exploit this opponent?", a: coach.exploit });
  const ok = GRADES[grade].correct;
  return (
    <div className="space-y-4">
      {context && <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-2 py-2 lg:hidden">{context}</div>}
      <div className="flex items-center gap-4">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${ok ? "animate-pop bg-emerald-500 text-ink-950" : "animate-shake bg-rose-500 text-white"}`}>
          {ok ? <Check size={24} strokeWidth={3} /> : <X size={24} strokeWidth={3} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="t-title-lg">{coach.headline}</div>
          <div className="t-label">
            {GRADES[grade].label} · <span className="text-gold-300">+{xp} XP</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {coach.lines.map((l) => (
          <div key={l.label} className="rounded-xl p-4" style={{ background: TONE[l.tone].bg }}>
            <div className="text-xs font-semibold" style={{ color: TONE[l.tone].fg }}>
              {l.label}
            </div>
            <p className="t-body mt-1 text-ink-100">{l.text}</p>
          </div>
        ))}
      </div>

      <div className="card-flat">{visual}</div>

      {children}

      {questions.length > 0 && (
        <div className="px-1">
          {questions.map((q) => (
            <Question key={q.id} q={q.q} a={q.a} open={open === q.id} onToggle={() => setOpen(open === q.id ? null : q.id)} />
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 pt-2">
        <button type="button" className="btn-text" onClick={onLearnMore}>
          Learn more
        </button>
        <button type="button" className="btn-filled btn-lg flex-1" onClick={onNext}>
          {nextLabel}
        </button>
      </div>
    </div>
  );
}
