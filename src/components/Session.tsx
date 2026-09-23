import { useState, type ReactNode } from "react";
import { Check, Copy, Flame, X } from "lucide-react";
import { ProgressBar, Ring } from "./ui";
import { useStore } from "../store/store";

export interface SessionResult {
  ok: boolean;
  title: string;
  detail: string;
}

export function SessionBar({ done, total, onClose, label }: { done: number; total: number; onClose: () => void; label?: string }) {
  const streak = useStore((s) => s.counters.streak);
  return (
    <div className="flex h-14 items-center gap-4">
      <button className="icon-btn -ml-2" onClick={onClose} aria-label="End session">
        <X size={24} />
      </button>
      <div className="min-w-0 flex-1">
        {label && <div className="t-label mb-1 truncate">{label}</div>}
        <ProgressBar value={done / total} />
      </div>
      <span className="num t-label w-12 text-right text-ink-100">
        {done}/{total}
      </span>
      <span className="flex w-12 items-center justify-end gap-1 text-sm font-semibold text-orange-300" title="Correct in a row">
        <Flame size={16} className={streak ? "fill-orange-400 text-orange-400" : "text-ink-400"} />
        <span className="num">{streak}</span>
      </span>
    </div>
  );
}

function verdictFor(score: number, total: number): string {
  const r = score / total;
  if (r === 1) return "Perfect session!";
  if (r >= 0.8) return "Great session";
  if (r >= 0.6) return "Nice work";
  return "Good practice. Keep at it.";
}

export function SessionSummary({
  results,
  xp,
  onAgain,
  onDone,
  doneLabel = "Done",
  againLabel = "Play again",
  share,
  children,
}: {
  results: SessionResult[];
  xp: number;
  onAgain?: () => void;
  onDone: () => void;
  doneLabel?: string;
  againLabel?: string;
  share?: string;
  children?: ReactNode;
}) {
  const score = results.filter((r) => r.ok).length;
  const total = results.length || 1;
  const dayStreak = useStore((s) => s.streak.current);
  const misses = results.filter((r) => !r.ok);
  const [copied, setCopied] = useState(false);
  return (
    <div className="mx-auto w-full max-w-md animate-fadeUp py-6">
      <div className="card text-center">
        <div className="flex justify-center">
          <Ring value={score / total} size={128} stroke={10} color={score / total >= 0.8 ? "#22c55e" : "#f2c14e"}>
            <div>
              <div className="num text-3xl font-bold text-ink-100">
                {score}/{results.length}
              </div>
              <div className="t-label">correct</div>
            </div>
          </Ring>
        </div>
        <h1 className="t-headline mt-4">{verdictFor(score, total)}</h1>
        <p className="t-body mt-1">
          <span className="font-semibold text-gold-300">+{xp} XP</span> · <Flame size={14} className="inline -translate-y-px fill-orange-400 text-orange-400" /> {dayStreak}-day streak
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-1">
          {results.map((r, i) => (
            <span key={i} className={`h-2 w-6 rounded-full ${r.ok ? "bg-emerald-500" : "bg-rose-500"}`} />
          ))}
        </div>
        {children}
        {share && (
          <button
            className="btn-outline mt-6 w-full"
            onClick={() => {
              void navigator.clipboard?.writeText(share);
              setCopied(true);
            }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copied. Paste it anywhere." : "Copy your result"}
          </button>
        )}
      </div>

      {misses.length > 0 && (
        <div className="card mt-4">
          <h2 className="t-title">What to fix</h2>
          <div className="mt-2 divide-y divide-white/[0.06]">
            {misses.map((m, i) => (
              <div key={i} className="py-4">
                <div className="t-body font-semibold text-ink-100">{m.title}</div>
                <p className="t-body mt-1 text-ink-300">{m.detail}</p>
              </div>
            ))}
          </div>
          <p className="t-label mt-2">You'll see these again in Fix your mistakes until you get them right.</p>
        </div>
      )}

      <div className="mt-6 flex gap-2">
        <button className="btn-outline btn-lg flex-1" onClick={onDone}>
          {doneLabel}
        </button>
        {onAgain && (
          <button className="btn-filled btn-lg flex-1" onClick={onAgain}>
            {againLabel}
          </button>
        )}
      </div>
    </div>
  );
}
