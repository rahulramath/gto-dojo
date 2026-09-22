import { useEffect, type ReactNode } from "react";
import { ChevronRight, X, type LucideIcon } from "lucide-react";
import type { Belt } from "../lib/progression";

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="t-headline">{title}</h1>
        {subtitle && <p className="t-body mt-1 text-ink-300">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-2 flex h-10 items-center justify-between">
      <h2 className="t-title">{title}</h2>
      {action}
    </div>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  full = false,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  full?: boolean;
}) {
  return (
    <div className={`flex h-10 items-center gap-1 rounded-full bg-white/[0.06] p-1 ${full ? "w-full" : "inline-flex"}`}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          className={`h-8 flex-1 whitespace-nowrap rounded-full px-4 text-xs font-semibold transition ${
            o.value === value ? "bg-gold-400 text-ink-950" : "text-ink-200 hover:bg-white/[0.06]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex min-h-14 w-full items-center justify-between gap-4 py-2 text-left">
      <span>
        <span className="t-body block text-ink-100">{label}</span>
        {hint && <span className="t-label block">{hint}</span>}
      </span>
      <span role="switch" aria-checked={checked} className={`relative h-6 w-10 shrink-0 rounded-full transition ${checked ? "bg-gold-400" : "bg-white/15"}`}>
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? "left-5" : "left-1"}`} />
      </span>
    </button>
  );
}

export function ProgressBar({ value, color = "#f2c14e", className = "", height = 8 }: { value: number; color?: string; className?: string; height?: number }) {
  return (
    <div className={`w-full overflow-hidden rounded-full bg-white/10 ${className}`} style={{ height }}>
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color }} />
    </div>
  );
}

/** Bottom sheet on phones, centered dialog on larger screens. */
export function Sheet({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 sm:items-center sm:p-6" onClick={onClose}>
      <div
        className={`pb-safe max-h-[88vh] w-full animate-sheetUp overflow-y-auto rounded-t-3xl border border-white/[0.08] bg-ink-850 px-4 pt-2 shadow-sheet sm:rounded-3xl sm:px-6 sm:pb-6 sm:pt-6 ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-2 h-1 w-8 rounded-full bg-white/20 sm:hidden" />
        {title && (
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="t-title-lg">{title}</h2>
            <button className="icon-btn -mr-2" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export const Modal = Sheet;

export function ListRow({
  icon: Icon,
  title,
  subtitle,
  trailing,
  onClick,
  tone,
}: {
  icon?: LucideIcon;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  tone?: string;
}) {
  const inner = (
    <>
      {Icon && (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: `${tone ?? "#f2c14e"}1f`, color: tone ?? "#f2c14e" }}>
          <Icon size={20} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="t-body block truncate font-medium text-ink-100">{title}</span>
        {subtitle && <span className="t-label block truncate">{subtitle}</span>}
      </span>
      {trailing ?? (onClick ? <ChevronRight size={20} className="shrink-0 text-ink-400" /> : null)}
    </>
  );
  if (!onClick) return <div className="flex min-h-14 items-center gap-4 py-2">{inner}</div>;
  return (
    <button type="button" onClick={onClick} className="-mx-2 flex min-h-14 w-[calc(100%+16px)] items-center gap-4 rounded-xl px-2 py-2 text-left transition hover:bg-white/[0.04]">
      {inner}
    </button>
  );
}

export function StatTile({ label, value, icon: Icon, color }: { label: string; value: ReactNode; icon?: LucideIcon; color?: string }) {
  return (
    <div className="card-flat flex items-center gap-2 !p-4">
      {Icon && <Icon size={20} style={{ color: color ?? "#f2c14e" }} className="shrink-0" />}
      <div className="min-w-0">
        <div className="num t-title leading-6">{value}</div>
        <div className="t-label truncate">{label}</div>
      </div>
    </div>
  );
}

export function BeltBadge({ belt, size = "md" }: { belt: Belt; size?: "sm" | "md" | "lg" }) {
  const dims = size === "sm" ? "h-4 w-8" : size === "lg" ? "h-8 w-20" : "h-4 w-12";
  return (
    <span className={`relative inline-block ${dims} shrink-0 rounded`} style={{ background: belt.color, boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.25)" }} title={`${belt.name} belt`}>
      <span className="absolute left-1/2 top-0 h-full w-2 -translate-x-1/2" style={{ background: "rgba(0,0,0,0.28)" }} />
    </span>
  );
}

export function Ring({ value, size = 64, stroke = 8, color = "#f2c14e", children }: { value: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
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

export function FreqBar({ parts, height = 8 }: { parts: { label: string; value: number; color: string }[]; height?: number }) {
  const shown = parts.filter((p) => p.value > 0.005);
  return (
    <div className="w-full">
      <div className="flex w-full overflow-hidden rounded-full bg-white/5" style={{ height }}>
        {shown.map((p) => (
          <div key={p.label} style={{ width: `${p.value * 100}%`, background: p.color }} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {shown.map((p) => (
          <span key={p.label} className="t-label inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            {p.label} <span className="num text-ink-100">{Math.round(p.value * 100)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.06] text-ink-300">
        <Icon size={24} />
      </span>
      <div className="t-title mt-4">{title}</div>
      <p className="t-body mt-1 max-w-xs text-ink-300">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
