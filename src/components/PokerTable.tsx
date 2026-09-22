import type { ReactNode } from "react";
import type { Card } from "../lib/cards";
import { PlayingCard } from "./PlayingCard";

export interface TableSeat {
  key: string;
  label: string;
  stack?: string;
  bet?: string;
  status: "folded" | "active" | "hero" | "waiting";
  action?: string;
  isButton?: boolean;
  badge?: string;
  cards?: (Card | null)[] | null;
  highlight?: boolean;
}

/**
 * Oval table. seats[0] is the hero (bottom center); the rest follow clockwise,
 * which is the direction action moves at a real table.
 */
export function PokerTable({
  seats,
  board = [],
  pot,
  center,
  heroCards,
  compact = false,
}: {
  seats: TableSeat[];
  board?: Card[];
  pot?: string;
  center?: ReactNode;
  heroCards?: [Card, Card] | null;
  compact?: boolean;
}) {
  const n = seats.length;
  return (
    <div className={`relative mx-auto w-full ${compact ? "max-w-[560px]" : "max-w-[760px]"}`}>
      <div className="relative aspect-[1.55/1] w-full sm:aspect-[1.9/1]">
        <div className="rail absolute inset-[4%] rounded-[999px] p-[1.6%] shadow-felt">
          <div className="felt relative h-full w-full rounded-[999px] border border-black/40 shadow-[inset_0_0_0_2px_rgba(242,193,78,0.18)]">
            <div className="absolute left-1/2 top-[16%] -translate-x-1/2 select-none font-display text-[10px] font-semibold uppercase tracking-[0.35em] text-white/15 sm:text-xs">
              GTO Dojo
            </div>
            <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2">
              {board.length > 0 && (
                <div className="flex gap-1 sm:gap-1.5">
                  {board.map((c, i) => (
                    <PlayingCard key={`${c}-${i}`} card={c} size={compact ? "sm" : "md"} delay={i * 80} />
                  ))}
                </div>
              )}
              {pot && (
                <div className="rounded-full bg-black/45 px-3 py-0.5 text-xs font-semibold text-gold-200 ring-1 ring-gold-400/30 sm:text-sm">
                  Pot <span className="num">{pot}</span>
                </div>
              )}
              {center}
            </div>
          </div>
        </div>

        {seats.map((seat, i) => {
          const theta = (Math.PI / 2) + (i * 2 * Math.PI) / n;
          const x = 50 + 45 * Math.cos(theta);
          const y = 50 + 42 * Math.sin(theta);
          const bx = 50 + 29 * Math.cos(theta);
          const by = 50 + 25 * Math.sin(theta);
          const isHero = seat.status === "hero";
          const folded = seat.status === "folded";
          return (
            <div key={seat.key}>
              <div
                className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                {!isHero && seat.cards && seat.cards.length > 0 && (
                  <div className="mb-[-10px] flex gap-0.5">
                    {seat.cards.map((c, k) => (
                      <PlayingCard key={k} card={c} size="xs" />
                    ))}
                  </div>
                )}
                <div
                  className={`relative min-w-[54px] rounded-xl border px-2 py-1 text-center shadow-lg transition sm:min-w-[72px] ${
                    isHero
                      ? "border-gold-400/80 bg-ink-800 ring-2 ring-gold-400/40"
                      : seat.highlight
                        ? "border-rose-400/70 bg-ink-800"
                        : "border-white/10 bg-ink-850/95"
                  } ${folded ? "opacity-40" : ""}`}
                >
                  {seat.badge && <span className="absolute -right-2 -top-2 text-base leading-none">{seat.badge}</span>}
                  <div className={`font-display text-[11px] font-bold sm:text-xs ${isHero ? "text-gold-300" : "text-ink-100"}`}>
                    {isHero ? `You · ${seat.label}` : seat.label}
                  </div>
                  {seat.stack && <div className="num text-[10px] text-ink-300 sm:text-[11px]">{seat.stack}</div>}
                  {seat.action && !isHero && (
                    <div
                      className={`mt-0.5 rounded px-1 text-[9px] font-semibold uppercase tracking-wide sm:text-[10px] ${
                        folded ? "text-ink-400" : "bg-white/10 text-white"
                      }`}
                    >
                      {seat.action}
                    </div>
                  )}
                </div>
                {seat.isButton && (
                  <div className="absolute -left-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[9px] font-black text-ink-950 shadow ring-2 ring-ink-900 sm:h-6 sm:w-6 sm:text-[10px]">
                    D
                  </div>
                )}
              </div>
              {seat.bet && (
                <div
                  className="absolute z-0 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full bg-black/50 px-1.5 py-0.5 text-[10px] font-semibold text-white ring-1 ring-white/10 sm:text-[11px]"
                  style={{ left: `${bx}%`, top: `${by}%` }}
                >
                  <span className="inline-block h-2.5 w-2.5 rounded-full border border-white/60 bg-gradient-to-br from-rose-400 to-rose-700" />
                  <span className="num">{seat.bet}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {heroCards && (
        <div className="mt-1 flex justify-center gap-2">
          <PlayingCard card={heroCards[0]} size="lg" />
          <PlayingCard card={heroCards[1]} size="lg" delay={90} />
        </div>
      )}
    </div>
  );
}
