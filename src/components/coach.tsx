import { useState, type ReactNode } from "react";
import { Check, CircleCheck, CircleX, ThumbsDown, ThumbsUp } from "lucide-react";
import { GRADES, type Grade } from "../lib/grading";
import { REASONS, type ReasonId } from "../data/reasons";
import { LEGEND_BY_ID } from "../data/legends";
import type { Archetype } from "../data/archetypes";
import { FreqBar } from "./ui";

export function GradePill({ grade, small = false }: { grade: Grade; small?: boolean }) {
  const g = GRADES[grade];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold ${small ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-sm"}`}
      style={{ background: `${g.color}22`, color: g.color, boxShadow: `inset 0 0 0 1px ${g.color}55` }}
    >
      {g.correct ? <CircleCheck size={small ? 12 : 15} /> : <CircleX size={small ? 12 : 15} />}
      {g.label}
    </span>
  );
}

export function VerdictCard({
  grade,
  xp,
  youChose,
  bestLabel,
  line,
  mix,
  exploit,
  children,
}: {
  grade: Grade;
  xp: number;
  youChose: string;
  bestLabel: string;
  line: string;
  mix: { label: string; value: number; color: string }[];
  exploit?: { name: string; emoji: string; best: string; agrees: boolean; changed: boolean };
  children?: ReactNode;
}) {
  const g = GRADES[grade];
  return (
    <div className={`panel relative overflow-hidden p-4 ${g.correct ? "" : "animate-shake"}`} style={{ boxShadow: `inset 0 0 0 1px ${g.color}44` }}>
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: g.color }} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <GradePill grade={grade} />
        <span className="relative text-sm font-bold text-gold-300">
          +{xp} XP
          <span className="absolute -top-3 right-0 animate-rise text-xs text-gold-200">+{xp}</span>
        </span>
      </div>
      <div className="mt-3 text-sm text-ink-200">
        You chose <span className="font-semibold text-white">{youChose}</span>
        {g.correct ? "." : <> · baseline prefers <span className="font-semibold text-white">{bestLabel}</span>.</>}
      </div>
      <p className="mt-1 text-sm text-ink-300">{line}</p>
      <div className="mt-3">
        <FreqBar parts={mix} />
      </div>
      {exploit && (
        <div className={`mt-3 flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs ${exploit.changed ? "bg-orange-500/10 text-orange-200" : "bg-white/[0.04] text-ink-300"}`}>
          <span className="text-base">{exploit.emoji}</span>
          <span className="flex-1">
            Exploit vs {exploit.name}: <span className="font-semibold text-white">{exploit.best}</span>
            {exploit.changed ? " (differs from baseline)" : ""}
          </span>
          {exploit.agrees ? <ThumbsUp size={14} className="text-emerald-400" /> : <ThumbsDown size={14} className="text-orange-300" />}
        </div>
      )}
      {children}
    </div>
  );
}

export function ReasonQuiz({
  prompt,
  options,
  correct,
  picked,
  onPick,
}: {
  prompt: string;
  options: ReasonId[];
  correct: ReasonId;
  picked: ReasonId | null;
  onPick: (r: ReasonId) => void;
}) {
  return (
    <div className="rounded-xl border border-violet-400/25 bg-violet-500/[0.06] p-3">
      <div className="text-sm font-semibold text-violet-100">{prompt}</div>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {options.map((o) => {
          const isPicked = picked === o;
          const isRight = o === correct;
          const reveal = picked !== null;
          return (
            <button
              key={o}
              disabled={reveal}
              onClick={() => onPick(o)}
              className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                reveal
                  ? isRight
                    ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-100"
                    : isPicked
                      ? "border-rose-400/60 bg-rose-500/10 text-rose-100"
                      : "border-white/10 text-ink-400"
                  : "border-white/10 bg-white/[0.03] text-ink-100 hover:border-violet-300/50 hover:bg-violet-500/10"
              }`}
            >
              <span className="flex items-center gap-1 font-semibold">
                {reveal && isRight && <Check size={12} />}
                {REASONS[o].label}
              </span>
              {reveal && <span className="mt-0.5 block text-[11px] opacity-80">{REASONS[o].blurb}</span>}
            </button>
          );
        })}
      </div>
      {picked && (
        <div className={`mt-2 text-xs font-semibold ${picked === correct ? "text-emerald-300" : "text-rose-300"}`}>
          {picked === correct ? "Exactly — +3 XP for thinking like a pro." : `Not quite. The key idea: ${REASONS[correct].label.toLowerCase()}.`}
        </div>
      )}
    </div>
  );
}

export function ProsCons({ actions }: { actions: { key: string; label: string; freq: number; tone: "best" | "ok" | "bad"; pros: string[]; cons: string[] }[] }) {
  const [open, setOpen] = useState<string | null>(actions.find((a) => a.tone === "best")?.key ?? null);
  const toneColor = { best: "#22c55e", ok: "#84cc16", bad: "#f97316" };
  return (
    <div className="space-y-2">
      {actions.map((a) => {
        const isOpen = open === a.key;
        return (
          <div key={a.key} className="rounded-lg border border-white/[0.07] bg-black/20">
            <button className="flex w-full items-center gap-2 px-3 py-2 text-left" onClick={() => setOpen(isOpen ? null : a.key)}>
              <span className="h-2 w-2 rounded-full" style={{ background: toneColor[a.tone] }} />
              <span className="flex-1 text-sm font-semibold text-white">{a.label}</span>
              <span className="num text-xs text-ink-300">{Math.round(a.freq * 100)}%</span>
            </button>
            {isOpen && (
              <div className="grid gap-2 border-t border-white/[0.06] px-3 py-2 text-xs sm:grid-cols-2">
                <div>
                  <div className="mb-1 flex items-center gap-1 font-semibold text-emerald-300">
                    <ThumbsUp size={12} /> Why it's good
                  </div>
                  <ul className="space-y-1 text-ink-200">
                    {a.pros.length ? a.pros.map((p) => <li key={p}>• {p}</li>) : <li className="text-ink-400">• Not much going for it here.</li>}
                  </ul>
                </div>
                <div>
                  <div className="mb-1 flex items-center gap-1 font-semibold text-orange-300">
                    <ThumbsDown size={12} /> Why it's bad
                  </div>
                  <ul className="space-y-1 text-ink-200">
                    {a.cons.length ? a.cons.map((p) => <li key={p}>• {p}</li>) : <li className="text-ink-400">• No real downside in this spot.</li>}
                  </ul>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function MathTable({ rows, notes }: { rows: { label: string; value: string; note?: string; highlight?: boolean }[]; notes: string[] }) {
  return (
    <div>
      <div className="overflow-hidden rounded-lg border border-white/[0.07]">
        {rows.map((r) => (
          <div key={r.label} className={`flex items-center justify-between gap-3 border-b border-white/[0.05] px-3 py-1.5 text-xs last:border-0 ${r.highlight ? "bg-gold-400/[0.07]" : ""}`}>
            <span className="text-ink-300">
              {r.label}
              {r.note && <span className="ml-1 text-[10px] text-ink-400">({r.note})</span>}
            </span>
            <span className={`num font-bold ${r.highlight ? "text-gold-200" : "text-white"}`}>{r.value}</span>
          </div>
        ))}
      </div>
      {notes.map((n) => (
        <p key={n} className="mt-2 text-xs leading-relaxed text-ink-200">
          {n}
        </p>
      ))}
    </div>
  );
}

export function ArchetypeCard({ arch, compact = false }: { arch: Archetype; compact?: boolean }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-black/20 p-3">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{arch.emoji}</span>
        <div>
          <div className="text-sm font-bold text-white">{arch.name}</div>
          <div className="text-[11px] text-ink-400">
            VPIP {arch.stats.vpip} · PFR {arch.stats.pfr} · 3-bet {arch.stats.threeBet} · AF {arch.stats.af}
          </div>
        </div>
      </div>
      {!compact && <p className="mt-2 text-xs text-ink-300">{arch.blurb}</p>}
    </div>
  );
}

export function LegendLens({ id, line }: { id: string; line: string }) {
  const l = LEGEND_BY_ID[id];
  if (!l) return null;
  return (
    <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/[0.05] p-3">
      <div className="text-sm font-bold text-emerald-100">{l.name}</div>
      <div className="text-[11px] text-ink-400">{l.knownFor}</div>
      {l.quote && <blockquote className="mt-2 border-l-2 border-emerald-400/50 pl-3 text-sm italic text-ink-100">“{l.quote}”</blockquote>}
      <p className="mt-2 text-xs text-ink-200">{l.idea}</p>
      <p className="mt-2 text-xs font-semibold text-emerald-200">In this spot: {line}</p>
      <p className="mt-1 text-[10px] text-ink-400">Source: {l.source}</p>
    </div>
  );
}

export function ConfidencePicker({ value, onChange }: { value: "sure" | "think" | "guess"; onChange: (v: "sure" | "think" | "guess") => void }) {
  const opts: { v: "sure" | "think" | "guess"; label: string; key: string }[] = [
    { v: "guess", label: "Guessing", key: "1" },
    { v: "think", label: "Think so", key: "2" },
    { v: "sure", label: "Sure", key: "3" },
  ];
  return (
    <div className="flex items-center gap-1.5">
      <span className="mr-1 text-[11px] text-ink-400">Confidence</span>
      {opts.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)} className={`chip !px-2 !py-0.5 ${value === o.v ? "chip-on" : ""}`} title={`Press ${o.key}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
