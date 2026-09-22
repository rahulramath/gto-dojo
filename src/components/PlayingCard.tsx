import { rankOf, suitOf, SUIT_SYMBOLS, type Card } from "../lib/cards";
import { useStore } from "../store/store";

const RANK_FACE = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const FOUR = ["#111827", "#dc2626", "#2563eb", "#15803d"];
const TWO = ["#111827", "#dc2626", "#dc2626", "#111827"];

const SIZES = {
  xs: "h-9 w-[26px] text-[11px] rounded-[5px]",
  sm: "h-12 w-9 text-sm rounded-md",
  md: "h-16 w-12 text-lg rounded-lg",
  lg: "h-[84px] w-[60px] text-2xl rounded-xl sm:h-24 sm:w-[68px]",
};

export function PlayingCard({
  card,
  size = "md",
  delay = 0,
  dim = false,
  glow = false,
}: {
  card: Card | null;
  size?: keyof typeof SIZES;
  delay?: number;
  dim?: boolean;
  glow?: boolean;
}) {
  const fourColor = useStore((s) => s.settings.fourColor);
  if (card === null) {
    return (
      <div
        className={`${SIZES[size]} shrink-0 animate-deal border border-white/20 shadow-md`}
        style={{
          animationDelay: `${delay}ms`,
          background: "repeating-linear-gradient(45deg, #7f1d1d 0 4px, #991b1b 4px 8px)",
        }}
      />
    );
  }
  const r = rankOf(card);
  const s = suitOf(card);
  const color = (fourColor ? FOUR : TWO)[s];
  return (
    <div
      className={`${SIZES[size]} relative flex shrink-0 animate-deal select-none flex-col items-center justify-center bg-[#fbfaf6] font-display font-bold leading-none shadow-[0_6px_14px_-6px_rgba(0,0,0,0.7)] ${
        dim ? "opacity-40" : ""
      } ${glow ? "ring-2 ring-gold-400 ring-offset-2 ring-offset-transparent" : ""}`}
      style={{ color, animationDelay: `${delay}ms` }}
      aria-label={`${RANK_FACE[r]} of ${["spades", "hearts", "diamonds", "clubs"][s]}`}
    >
      <span className={r === 8 ? "tracking-tighter" : ""}>{RANK_FACE[r]}</span>
      <span className="mt-0.5 text-[1.05em] leading-none">{SUIT_SYMBOLS[s]}</span>
    </div>
  );
}

export function CardRow({ cards, size = "md", stagger = 70 }: { cards: (Card | null)[]; size?: keyof typeof SIZES; stagger?: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {cards.map((c, i) => (
        <PlayingCard key={`${c}-${i}`} card={c} size={size} delay={i * stagger} />
      ))}
    </div>
  );
}
