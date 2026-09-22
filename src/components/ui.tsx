import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import type { Belt } from "../lib/progression";

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  size = "md",
}: {
  value: T;
  options: { value: T; label: ReactNode; hint?: string }[];
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex flex-wrap rounded-xl border border-white/10 bg-black/30 p-0.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          title={o.hint}
          onClick={() => onChange(o.value)}
          className={`rounded-[10px] font-semibold transition ${size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm"} ${
            o.value === value ? "bg-gold-400 text-ink-950 shadow" : "text-ink-200 hover:bg-white/5"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-2">
      <span>
        <span className="block text-sm font-medium text-ink-100">{label}</span>
        {hint && <span className="block text-xs text-ink-400">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-gold-400" : "bg-white/15"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </label>
  );
}

export function ProgressBar({ value, color = "#f2c14e", className = "", height = 6 }: { value: number; color?: string; className?: string; height?: number }) {
  return (
    <div className={`w-full overflow-hidden rounded-full bg-white/10 ${className}`} style={{ height }}>
      <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color }} />
    </div>
  );
}

export function FreqBar({ parts, height = 10 }: { parts: { label: string; value: number; color: string }[]; height?: number }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  return (
    <div className="w-full">
      <div className="flex w-full overflow-hidden rounded-full bg-white/5" style={{ height }}>
        {parts
          .filter((p) => p.value > 0.001)
          .map((p) => (
            <div key={p.label} title={`${p.label} ${Math.round((p.value / total) * 100)}%`} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />
          ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-ink-300">
        {parts
          .filter((p) => p.value > 0.001)
          .map((p) => (
            <span key={p.label} className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
              {p.label} <span className="num text-ink-100">{Math.round((p.value / total) * 100)}%</span>
            </span>
          ))}
      </div>
    </div>
  );
}

export function Modal({ open, onClose, children, title, wide = false }: { open: boolean; onClose: () => void; children: ReactNode; title?: string; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        className={`panel max-h-[92vh] w-full animate-fadeUp overflow-y-auto rounded-b-none p-5 sm:rounded-2xl sm:p-6 ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="font-display text-lg font-bold text-white">{title}</h2>
            <button className="rounded-lg p-1 text-ink-300 hover:bg-white/10" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function BeltBadge({ belt, size = "md", label }: { belt: Belt; size?: "sm" | "md" | "lg"; label?: string }) {
  const dims = size === "sm" ? "h-4 w-10" : size === "lg" ? "h-7 w-20" : "h-5 w-14";
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`relative inline-block ${dims} rounded-[4px] shadow-inner`} style={{ background: belt.color, boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.25)" }}>
        <span className="absolute left-1/2 top-0 h-full w-2 -translate-x-1/2" style={{ background: "rgba(0,0,0,0.28)" }} />
        {belt.id === "black" && <span className="absolute right-1 top-1/2 h-1 w-3 -translate-y-1/2 rounded-sm bg-gold-400" />}
      </span>
      {label && <span className="text-xs font-semibold text-ink-200">{label}</span>}
    </span>
  );
}

export function SectionTitle({ eyebrow, title, desc, right }: { eyebrow?: string; title: string; desc?: string; right?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <div className="label mb-1">{eyebrow}</div>}
        <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
        {desc && <p className="mt-1 max-w-2xl text-sm text-ink-300">{desc}</p>}
      </div>
      {right}
    </div>
  );
}

export function Stat({ label, value, sub, accent }: { label: string; value: ReactNode; sub?: ReactNode; accent?: string }) {
  return (
    <div className="panel-tight px-3 py-2.5">
      <div className="label">{label}</div>
      <div className="num mt-0.5 text-xl font-bold" style={{ color: accent ?? "#fff" }}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-ink-400">{sub}</div>}
    </div>
  );
}

export function Ring({ value, size = 64, stroke = 7, color = "#f2c14e", children }: { value: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
