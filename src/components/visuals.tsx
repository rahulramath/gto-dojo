import { useMemo } from "react";
import { ALL_HANDS, parseCards, type HandClass } from "../lib/cards";
import { actionPercents, type Chart } from "../lib/chart";
import { ACTION_COLORS, CHARTS, rfiChart } from "../data/charts";
import { BUCKETS, BUCKET_COLOR, BUCKET_LABEL, type Bucket } from "../lib/handStrength";
import { LINE_BY_ID, rangeMix } from "../lib/postflop";
import { ARCHETYPES } from "../data/archetypes";
import { PlayingCard } from "./PlayingCard";
import { pct } from "../lib/format";

/* ------------------------------------------------------------------ */
/* In-hand feedback visuals                                             */
/* ------------------------------------------------------------------ */

export function RangeSnippet({ chart, hand, caption }: { chart: Chart; hand?: HandClass; caption?: string }) {
  const actions = chart.actions.filter((a) => a !== chart.rest);
  return (
    <div className="w-full max-w-[248px]">
      {caption && <div className="t-label mb-2 text-ink-200">{caption}</div>}
      <div className="grid gap-[2px] rounded-lg bg-black/40 p-[2px]" style={{ gridTemplateColumns: "repeat(13, minmax(0, 1fr))" }}>
        {ALL_HANDS.map((h) => {
          const f = chart.freqs[h];
          let best = actions[0];
          let bv = 0;
          for (const a of actions) {
            const v = f[a] ?? 0;
            if (v > bv) {
              bv = v;
              best = a;
            }
          }
          const on = bv > 0.001;
          const isHero = h === hand;
          return (
            <div
              key={h}
              className={`aspect-square rounded-[2px] ${isHero ? "relative z-10 ring-2 ring-white ring-offset-1 ring-offset-black" : ""}`}
              style={{ background: isHero && !on ? "#e7eeea" : on ? ACTION_COLORS[best] : "rgba(255,255,255,0.05)", opacity: on && !isHero ? Math.max(0.35, bv) : 1 }}
              title={h}
            />
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        {actions.map((a) => (
          <span key={a} className="t-label inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: ACTION_COLORS[a] }} />
            {chart.labels[a]}
          </span>
        ))}
        {hand && (
          <span className="t-label inline-flex items-center gap-1 text-ink-100">
            <span className="h-2 w-2 rounded-sm bg-ink-100 ring-1 ring-white" /> Your hand: {hand}
          </span>
        )}
      </div>
    </div>
  );
}

export function PriceMeter({ need, have }: { need: number; have: number }) {
  const ok = have >= need;
  const color = ok ? "#22c55e" : "#ef4444";
  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between">
        <span className="t-body font-semibold" style={{ color }}>
          You have <span className="num">{pct(have)}</span>
        </span>
        <span className="t-label">
          Need <span className="num text-ink-100">{pct(need)}</span> to call
        </span>
      </div>
      <div className="relative mt-2 h-3 w-full rounded-full bg-white/10">
        <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.min(1, have) * 100}%`, background: color }} />
        <div className="absolute -top-1 h-5 w-[2px] rounded bg-white" style={{ left: `calc(${Math.min(1, need) * 100}% - 1px)` }} />
      </div>
    </div>
  );
}

export function StrengthMeter({ eq, bucket }: { eq: number; bucket: Bucket }) {
  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between gap-2">
        <span className="t-body font-semibold text-ink-100">
          Your equity <span className="num">{pct(eq)}</span>
        </span>
        <span className="rounded-full px-2 py-0.5 text-xs font-semibold text-ink-950" style={{ background: BUCKET_COLOR[bucket] }}>
          {BUCKET_LABEL[bucket]}
        </span>
      </div>
      <div className="relative mt-2 h-3 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400" style={{ width: `${eq * 100}%` }} />
      </div>
      <div className="t-label mt-1 flex justify-between">
        <span>Behind</span>
        <span>vs their range</span>
        <span>Ahead</span>
      </div>
    </div>
  );
}

export function MixBar({ mix, label }: { mix: Record<Bucket, number>; label: string }) {
  return (
    <div>
      <div className="t-label mb-1 text-ink-200">{label}</div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/5">
        {BUCKETS.map((b) => (mix[b] > 0.004 ? <div key={b} title={`${BUCKET_LABEL[b]} ${Math.round(mix[b] * 100)}%`} style={{ width: `${mix[b] * 100}%`, background: BUCKET_COLOR[b] }} /> : null))}
      </div>
    </div>
  );
}

export function MixLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {BUCKETS.map((b) => (
        <span key={b} className="t-label inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ background: BUCKET_COLOR[b] }} />
          {BUCKET_LABEL[b]}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Lesson visuals                                                       */
/* ------------------------------------------------------------------ */

const SEAT_GROUPS: { id: string; label: string; color: string; x: number; y: number }[] = [
  { id: "UTG", label: "UTG", color: "#f87171", x: 38, y: 88 },
  { id: "HJ", label: "HJ", color: "#fbbf24", x: 10, y: 50 },
  { id: "CO", label: "CO", color: "#4ade80", x: 38, y: 12 },
  { id: "BTN", label: "BTN", color: "#4ade80", x: 62, y: 12 },
  { id: "SB", label: "SB", color: "#60a5fa", x: 90, y: 50 },
  { id: "BB", label: "BB", color: "#60a5fa", x: 62, y: 88 },
];

function SeatsDiagram() {
  return (
    <div className="w-full">
      <div className="relative mx-auto aspect-[2/1] w-full max-w-sm">
        <div className="felt absolute inset-[12%] rounded-full shadow-felt" />
        {SEAT_GROUPS.map((s) => (
          <div key={s.id} className="absolute flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-bold text-ink-950" style={{ left: `${s.x}%`, top: `${s.y}%`, background: s.color }}>
            {s.label}
          </div>
        ))}
        <div className="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-xs font-bold text-ink-950" style={{ left: "72%", top: "26%" }}>
          D
        </div>
      </div>
      <div className="mt-2 flex justify-center gap-4">
        {[
          ["#f87171", "Early"],
          ["#fbbf24", "Middle"],
          ["#4ade80", "Late"],
          ["#60a5fa", "Blinds"],
        ].map(([c, l]) => (
          <span key={l} className="t-label inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: c }} />
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

function OpenWidthBars() {
  const rows = (["LJ", "HJ", "CO", "BTN", "SB"] as const).map((p) => ({ p: p === "LJ" ? "UTG" : p, v: actionPercents(rfiChart(p)!).raise }));
  return (
    <div className="w-full space-y-2">
      {rows.map((r) => (
        <div key={r.p} className="flex items-center gap-2">
          <span className="t-label w-10 text-ink-100">{r.p}</span>
          <div className="h-4 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full bg-rose-500/80" style={{ width: `${r.v * 2}%` }} />
          </div>
          <span className="num t-label w-10 text-right text-ink-100">{Math.round(r.v)}%</span>
        </div>
      ))}
      <div className="t-label">Share of hands each seat opens (6-max, 100bb)</div>
    </div>
  );
}

function BigNumber({ n, label, cards }: { n: string; label: string; cards: string }) {
  return (
    <div className="card-flat flex-1 !p-4 text-center">
      <div className="num text-2xl font-bold text-gold-300">{n}</div>
      <div className="t-label text-ink-100">{label}</div>
      <div className="t-label mt-1">{cards}</div>
    </div>
  );
}

function CombosVisual() {
  return (
    <div className="flex w-full gap-2">
      <BigNumber n="6" label="Each pair" cards="A♠A♥ A♠A♦ …" />
      <BigNumber n="4" label="Suited" cards="A♠K♠ A♥K♥ …" />
      <BigNumber n="12" label="Offsuit" cards="A♠K♥ A♦K♣ …" />
    </div>
  );
}

function BlockersVisual() {
  const all = ["♠♥", "♠♦", "♠♣", "♥♦", "♥♣", "♦♣"];
  return (
    <div className="w-full">
      <div className="t-label mb-2 text-ink-200">Their AA combos when you hold A♠</div>
      <div className="flex flex-wrap gap-2">
        {all.map((s) => {
          const gone = s.includes("♠");
          return (
            <span key={s} className={`rounded-lg px-2 py-1 text-sm font-semibold ${gone ? "bg-white/[0.04] text-ink-500 line-through" : "bg-white/[0.1] text-ink-100"}`}>
              A{s[0]}A{s[1]}
            </span>
          );
        })}
      </div>
      <div className="t-body mt-2">
        <span className="font-semibold text-emerald-300">6 → 3 combos.</span> One ace cuts their aces in half.
      </div>
    </div>
  );
}

function PotOddsVisual({ frac = 0.5 }: { frac?: number }) {
  const total = 1 + 2 * frac;
  const need = frac / total;
  return (
    <div className="w-full">
      <div className="flex h-8 w-full overflow-hidden rounded-lg text-xs font-semibold text-ink-950">
        <div className="flex items-center justify-center bg-ink-300" style={{ width: `${(1 / total) * 100}%` }}>
          Pot 100
        </div>
        <div className="flex items-center justify-center bg-rose-400" style={{ width: `${(frac / total) * 100}%` }}>
          Bet {Math.round(frac * 100)}
        </div>
        <div className="flex items-center justify-center bg-gold-400" style={{ width: `${(frac / total) * 100}%` }}>
          You
        </div>
      </div>
      <div className="t-body mt-2">
        You pay {Math.round(frac * 100)} to win {Math.round(total * 100)} → need <span className="num font-semibold text-gold-300">{pct(need)}</span> equity.
      </div>
    </div>
  );
}

function MdfVisual({ frac = 0.5 }: { frac?: number }) {
  const mdf = 1 / (1 + frac);
  return (
    <div className="w-full">
      <div className="flex h-8 w-full overflow-hidden rounded-lg text-xs font-semibold">
        <div className="flex items-center justify-center bg-emerald-500 text-ink-950" style={{ width: `${mdf * 100}%` }}>
          Continue {pct(mdf)}
        </div>
        <div className="flex flex-1 items-center justify-center bg-white/10 text-ink-200">Fold</div>
      </div>
      <div className="t-label mt-2">Facing a {Math.round(frac * 100)}% pot bet: defend at least this much of your range.</div>
    </div>
  );
}

function OutsVisual() {
  const hero = parseCards("AhQh");
  const board = parseCards("Kh7h2c");
  const outs = parseCards("2h3h4h5h6h8h9hThJh");
  return (
    <div className="w-full space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {hero.map((c) => (
          <PlayingCard key={c} card={c} size="sm" />
        ))}
        <span className="t-label">on</span>
        {board.map((c) => (
          <PlayingCard key={c} card={c} size="sm" />
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {outs.map((c) => (
          <PlayingCard key={c} card={c} size="xs" />
        ))}
      </div>
      <div className="t-body">
        <span className="font-semibold text-gold-300">9 outs</span> · ~19% on the turn · ~35% by the river
      </div>
    </div>
  );
}

function Rule24Visual() {
  const rows = [4, 8, 9, 12, 15].map((o) => ({ o, one: o / 47, two: 1 - ((47 - o) / 47) * ((46 - o) / 46) }));
  return (
    <div className="w-full overflow-hidden rounded-xl border border-white/[0.06]">
      <div className="t-label grid grid-cols-3 bg-white/[0.04] px-4 py-2">
        <span>Outs</span>
        <span>Next card</span>
        <span>By river</span>
      </div>
      {rows.map((r) => (
        <div key={r.o} className="num t-body grid grid-cols-3 border-t border-white/[0.05] px-4 py-2">
          <span className="font-semibold text-ink-100">{r.o}</span>
          <span>{pct(r.one)}</span>
          <span>{pct(r.two)}</span>
        </div>
      ))}
    </div>
  );
}

function TextureVisual() {
  const boards: [string, string, string][] = [
    ["Ks7d2c", "Dry", "Few draws — bet small, often"],
    ["JhTh8c", "Wet", "Lots of draws — bet bigger, less often"],
  ];
  return (
    <div className="grid w-full grid-cols-2 gap-2">
      {boards.map(([b, name, note]) => (
        <div key={b} className="card-flat !p-4">
          <div className="flex gap-1">
            {parseCards(b).map((c) => (
              <PlayingCard key={c} card={c} size="sm" />
            ))}
          </div>
          <div className="t-title mt-2">{name}</div>
          <div className="t-label">{note}</div>
        </div>
      ))}
    </div>
  );
}

function RangeAdvVisual() {
  const mix = useMemo(() => {
    const line = LINE_BY_ID.BTN_BB;
    const board = parseCards("Ks7d2c");
    return { btn: rangeMix(line.pfrRange(), board), bb: rangeMix(line.callerRange(), board) };
  }, []);
  return (
    <div className="w-full space-y-4">
      <div className="flex gap-1">
        {parseCards("Ks7d2c").map((c) => (
          <PlayingCard key={c} card={c} size="sm" />
        ))}
      </div>
      <MixBar mix={mix.btn} label="Button (raiser)" />
      <MixBar mix={mix.bb} label="Big blind (caller)" />
      <MixLegend />
    </div>
  );
}

function SprVisual() {
  const bands = [
    { l: "SPR under 3", d: "Top pair is often a stack-off", c: "#f87171" },
    { l: "SPR 3–8", d: "One pair: proceed with care", c: "#fbbf24" },
    { l: "SPR over 8", d: "Big pots need big hands", c: "#4ade80" },
  ];
  return (
    <div className="w-full space-y-2">
      {bands.map((b) => (
        <div key={b.l} className="flex items-center gap-4">
          <span className="h-8 w-2 rounded-full" style={{ background: b.c }} />
          <div>
            <div className="t-body font-semibold text-ink-100">{b.l}</div>
            <div className="t-label">{b.d}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function BluffRatioVisual({ frac = 0.75 }: { frac?: number }) {
  const bluff = frac / (1 + 2 * frac);
  return (
    <div className="w-full">
      <div className="flex h-8 w-full overflow-hidden rounded-lg text-xs font-semibold text-ink-950">
        <div className="flex items-center justify-center bg-emerald-400" style={{ width: `${(1 - bluff) * 100}%` }}>
          Value {pct(1 - bluff)}
        </div>
        <div className="flex flex-1 items-center justify-center bg-rose-400">Bluffs {pct(bluff)}</div>
      </div>
      <div className="t-label mt-2">A balanced {Math.round(frac * 100)}% pot bet on the river</div>
    </div>
  );
}

function ArchetypesVisual() {
  const list = [ARCHETYPES.station, ARCHETYPES.nit, ARCHETYPES.tag, ARCHETYPES.lag, ARCHETYPES.maniac];
  const counter: Record<string, string> = { station: "Value bet", nit: "Steal more", tag: "Play solid", lag: "Call lighter", maniac: "Trap" };
  return (
    <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3">
      {list.map((a) => (
        <div key={a.id} className="card-flat flex items-center gap-2 !p-2">
          <span className="text-2xl">{a.emoji}</span>
          <div className="min-w-0">
            <div className="t-body truncate font-semibold text-ink-100">{a.name}</div>
            <div className="t-label">{counter[a.id]}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LiveSizesVisual() {
  const items = [
    ["Open", "$10–15"],
    ["Iso-raise", "$15 + $5 / limper"],
    ["3-bet", "3× in position · 4× out"],
  ];
  return (
    <div className="grid w-full gap-2 sm:grid-cols-3">
      {items.map(([k, v]) => (
        <div key={k} className="card-flat !p-4">
          <div className="t-label">{k} at $1/$2</div>
          <div className="t-title">{v}</div>
        </div>
      ))}
    </div>
  );
}

export type VisualKey =
  | "seats"
  | "openWidths"
  | "combos"
  | "blockers"
  | "potOdds"
  | "mdf"
  | "outs"
  | "rule24"
  | "texture"
  | "rangeAdv"
  | "spr"
  | "bluffRatio"
  | "archetypes"
  | "liveSizes"
  | `chart:${string}`;

export function LessonVisual({ v }: { v: VisualKey }) {
  if (v.startsWith("chart:")) {
    const c = CHARTS[v.slice(6)];
    if (!c) return null;
    const p = actionPercents(c);
    const main = c.actions.find((a) => a !== c.rest) ?? c.rest;
    return <RangeSnippet chart={c} caption={`${c.title} · ${c.labels[main]} ${Math.round(p[main])}%`} />;
  }
  switch (v) {
    case "seats":
      return <SeatsDiagram />;
    case "openWidths":
      return <OpenWidthBars />;
    case "combos":
      return <CombosVisual />;
    case "blockers":
      return <BlockersVisual />;
    case "potOdds":
      return <PotOddsVisual />;
    case "mdf":
      return <MdfVisual />;
    case "outs":
      return <OutsVisual />;
    case "rule24":
      return <Rule24Visual />;
    case "texture":
      return <TextureVisual />;
    case "rangeAdv":
      return <RangeAdvVisual />;
    case "spr":
      return <SprVisual />;
    case "bluffRatio":
      return <BluffRatioVisual />;
    case "archetypes":
      return <ArchetypesVisual />;
    case "liveSizes":
      return <LiveSizesVisual />;
    default:
      return null;
  }
}
