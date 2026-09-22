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
 * the direction action moves at a real table.
 */
export function PokerTable({
  seats,
  board = [],
  pot,
  center,
  heroCards,
}: {
  seats: TableSeat[];
  board?: Card[];
  pot?: string;
  center?: ReactNode;
  heroCards?: [Card, Card] | null;
}) {
  const n = seats.length;
  return (
    <div className="relative mx-auto w-full max-w-[680px]">
      <div className="relative aspect-[1.6/1] w-full sm:aspect-[1.9/1]">
        <div className="rail absolute inset-[5%] rounded-full p-[1.5%] shadow-felt">
          <div className="felt relative h-full w-full rounded-full border border-black/40">
            <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2">
              {board.length > 0 && (
                <div className="flex gap-1">
                  {board.map((c, i) => (
                    <PlayingCard key={`${c}-${i}`} card={c} size="sm" delay={i * 80} />
                  ))}
                </div>
              )}
              {pot && (
                <div className="num rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-gold-200">
                  Pot {pot}
                </div>
              )}
              {center}
            </div>
          </div>
        </div>

        {seats.map((seat, i) => {
          const theta = Math.PI / 2 + (i * 2 * Math.PI) / n;
          const x = 50 + 44 * Math.cos(theta);
          const y = 50 + 41 * Math.sin(theta);
          const bx = 50 + 28 * Math.cos(theta);
          const by = 50 + 24 * Math.sin(theta);
          const isHero = seat.status === "hero";
          const folded = seat.status === "folded";
          return (
            <div key={seat.key}>
              <div className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={{ left: `${x}%`, top: `${y}%` }}>
                {!isHero && seat.cards && seat.cards.length > 0 && (
                  <div className="mb-[-8px] flex gap-0.5">
                    {seat.cards.map((c, k) => (
                      <PlayingCard key={k} card={c} size="xs" />
                    ))}
                  </div>
                )}
                <div
                  className={`relative min-w-14 rounded-xl px-2 py-1 text-center ${
                    isHero ? "bg-gold-400 text-ink-950" : seat.highlight ? "bg-ink-800 ring-2 ring-rose-400/70" : "bg-ink-850/95"
                  } ${folded ? "opacity-40" : ""}`}
                >
                  {seat.badge && <span className="absolute -right-2 -top-2 text-base leading-none">{seat.badge}</span>}
                  <div className={`text-xs font-bold ${isHero ? "text-ink-950" : "text-ink-100"}`}>{isHero ? `You · ${seat.label}` : seat.label}</div>
                  {seat.action && !isHero && !folded ? (
                    <div className="text-xs font-semibold text-gold-300">{seat.action}</div>
                  ) : (
                    seat.stack && <div className={`num text-xs ${isHero ? "text-ink-900/80" : "text-ink-300"}`}>{seat.stack}</div>
                  )}
                </div>
                {seat.isButton && (
                  <div className="absolute -left-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-white text-xs font-bold text-ink-950 shadow">D</div>
                )}
              </div>
              {seat.bet && (
                <div className="num absolute z-0 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white" style={{ left: `${bx}%`, top: `${by}%` }}>
                  <span className="inline-block h-2 w-2 rounded-full bg-rose-400" />
                  {seat.bet}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {heroCards && (
        <div className="mt-2 flex justify-center gap-2">
          <PlayingCard card={heroCards[0]} size="lg" />
          <PlayingCard card={heroCards[1]} size="lg" delay={90} />
        </div>
      )}
    </div>
  );
}
