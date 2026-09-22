import { useRef } from "react";
import { ALL_HANDS, type HandClass } from "../lib/cards";
import type { Chart, PfAction } from "../lib/chart";
import { primaryAction } from "../lib/chart";
import { ACTION_COLORS } from "../data/charts";

export type GridMode = "simple" | "freq";

function cellBackground(chart: Chart, h: HandClass, mode: GridMode): string {
  const f = chart.freqs[h];
  if (mode === "simple") {
    const a = primaryAction(chart, h);
    return a === chart.rest ? "transparent" : ACTION_COLORS[a];
  }
  const order = chart.actions.filter((a) => a !== chart.rest);
  let acc = 0;
  const stops: string[] = [];
  for (const a of order) {
    const v = (f[a] ?? 0) * 100;
    if (v <= 0) continue;
    stops.push(`${ACTION_COLORS[a]} ${acc}% ${acc + v}%`);
    acc += v;
  }
  if (!stops.length) return "transparent";
  if (acc < 100) stops.push(`transparent ${acc}% 100%`);
  return `linear-gradient(to right, ${stops.join(", ")})`;
}

export function RangeGrid({
  chart,
  mode = "freq",
  highlight,
  selected,
  onSelect,
  paint,
  onPaint,
  diff,
  dimOthers = false,
}: {
  chart: Chart;
  mode?: GridMode;
  highlight?: HandClass | null;
  selected?: HandClass | null;
  onSelect?: (h: HandClass) => void;
  paint?: Record<HandClass, PfAction>;
  onPaint?: (h: HandClass) => void;
  diff?: Record<HandClass, "ok" | "miss" | "extra">;
  dimOthers?: boolean;
}) {
  const dragging = useRef(false);
  const painting = !!onPaint;

  return (
    <div
      className="grid select-none grid-cols-13 gap-[2px] rounded-xl bg-black/40 p-[3px]"
      style={{ gridTemplateColumns: "repeat(13, minmax(0, 1fr))", touchAction: painting ? "none" : undefined }}
      onPointerUp={() => (dragging.current = false)}
      onPointerLeave={() => (dragging.current = false)}
      onPointerMove={(e) => {
        if (!painting || !dragging.current) return;
        const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
        const h = el?.dataset?.hand;
        if (h) onPaint!(h);
      }}
    >
      {ALL_HANDS.map((h) => {
        const isHi = highlight === h;
        const isSel = selected === h;
        let bg: string;
        if (paint) {
          const a = paint[h];
          bg = a && a !== chart.rest ? ACTION_COLORS[a] : "transparent";
        } else bg = cellBackground(chart, h, mode);
        const d = diff?.[h];
        return (
          <button
            key={h}
            type="button"
            data-hand={h}
            onPointerDown={(e) => {
              if (painting) {
                e.preventDefault();
                dragging.current = true;
                onPaint!(h);
              }
            }}
            onClick={() => !painting && onSelect?.(h)}
            className={`relative aspect-square overflow-hidden rounded-[3px] bg-white/[0.035] text-center transition ${
              isHi ? "z-10 animate-pulseRing ring-2 ring-gold-300" : isSel ? "z-10 ring-2 ring-white" : ""
            } ${dimOthers && !isHi ? "opacity-60" : ""} ${onSelect || painting ? "cursor-pointer hover:brightness-125" : "cursor-default"}`}
            title={h}
          >
            <span className="absolute inset-0" style={{ background: bg }} />
            {d === "miss" && <span className="absolute inset-0 ring-2 ring-inset ring-sky-300" />}
            {d === "extra" && <span className="absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.35)_0_2px,transparent_2px_5px)]" />}
            <span className="pointer-events-none relative z-[1] flex h-full w-full items-center justify-center font-mono text-[7.5px] font-bold leading-none text-white/90 [text-shadow:0_1px_1px_rgba(0,0,0,0.7)] sm:text-[10px]">
              {h}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function ActionLegend({ chart, compact = false }: { chart: Chart; compact?: boolean }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${compact ? "text-[11px]" : "text-xs"} text-ink-300`}>
      {chart.actions.map((a) => (
        <span key={a} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: a === chart.rest ? "rgba(255,255,255,0.08)" : ACTION_COLORS[a] }} />
          {chart.labels[a] ?? a}
        </span>
      ))}
    </div>
  );
}
