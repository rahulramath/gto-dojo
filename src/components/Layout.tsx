import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  BookOpen,
  Calculator,
  ChartColumn,
  Flame,
  House,
  LayoutGrid,
  Menu,
  Quote,
  Settings,
  Spade,
  Swords,
  Trophy,
  X,
} from "lucide-react";
import { navigate, useRoute } from "../lib/router";
import { dueCards, useStore } from "../store/store";
import { useUi } from "../store/ui";
import { dojoBelt, levelInfo, rankTitle } from "../lib/progression";
import { STAKES } from "../data/stakes";
import { BeltBadge, ProgressBar } from "./ui";
import { play } from "../lib/sound";

const NAV = [
  { to: "/", label: "Dojo", icon: House },
  { to: "/preflop", label: "Preflop", icon: Spade },
  { to: "/postflop", label: "Postflop", icon: Swords },
  { to: "/charts", label: "Charts", icon: LayoutGrid },
  { to: "/learn", label: "Pro Path", icon: BookOpen },
  { to: "/math", label: "Math Gym", icon: Calculator },
  { to: "/progress", label: "Progress", icon: ChartColumn },
  { to: "/legends", label: "Legends", icon: Quote },
  { to: "/settings", label: "Settings", icon: Settings },
];

const MOBILE = ["/", "/preflop", "/postflop", "/charts"];

function isActive(path: string, to: string) {
  return to === "/" ? path === "/" : path.startsWith(to);
}

function Brand() {
  return (
    <button className="flex items-center gap-2" onClick={() => navigate("/")}>
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-felt-400 to-felt-800 ring-1 ring-gold-400/60">
        <Spade size={16} className="fill-white text-white" />
      </span>
      <span className="font-display text-lg font-bold tracking-tight text-white">
        GTO <span className="text-gold-400">Dojo</span>
      </span>
    </button>
  );
}

function TopStats() {
  const xp = useStore((s) => s.xp);
  const streak = useStore((s) => s.streak);
  const lessons = useStore((s) => s.lessons);
  const stake = useStore((s) => s.settings.stake);
  const lv = levelInfo(xp);
  const belt = dojoBelt(lessons);
  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <button
        onClick={() => navigate("/settings")}
        className="hidden rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-semibold text-ink-200 hover:bg-white/10 sm:block"
        title="Change stakes"
      >
        {STAKES[stake].short}
      </button>
      <div className="flex items-center gap-1 text-sm font-bold text-orange-300" title="Daily streak">
        <Flame size={16} className={streak.current > 0 ? "fill-orange-400 text-orange-400" : "text-ink-400"} />
        <span className="num">{streak.current}</span>
      </div>
      <button className="hidden sm:block" onClick={() => navigate("/progress")} title={`${belt.name} belt`}>
        <BeltBadge belt={belt} size="sm" />
      </button>
      <button onClick={() => navigate("/progress")} className="flex items-center gap-2" title={`${lv.into}/${lv.need} XP to level ${lv.level + 1}`}>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold-400 font-display text-xs font-black text-ink-950">{lv.level}</span>
        <span className="hidden w-24 md:block">
          <span className="block text-left text-[10px] font-semibold uppercase tracking-wider text-ink-300">{rankTitle(lv.level)}</span>
          <ProgressBar value={lv.pct} height={4} />
        </span>
      </button>
    </div>
  );
}

function Toasts() {
  const toasts = useUi((s) => s.toasts);
  const dismiss = useUi((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed right-3 top-16 z-[60] flex w-[min(360px,calc(100vw-24px))] flex-col gap-2">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className="pointer-events-auto flex animate-fadeUp items-start gap-3 rounded-xl border border-gold-400/40 bg-ink-850/95 p-3 text-left shadow-glow backdrop-blur"
        >
          <span className="text-2xl leading-none">{t.icon}</span>
          <span>
            <span className="block text-sm font-bold text-gold-200">{t.title}</span>
            {t.body && <span className="block text-xs text-ink-300">{t.body}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}

function Confetti() {
  const n = useUi((s) => s.confetti);
  const [pieces, setPieces] = useState<{ id: number; left: number; dx: number; rot: number; dur: number; color: string; delay: number }[]>([]);
  useEffect(() => {
    if (!n) return;
    const colors = ["#f2c14e", "#22c55e", "#ef4444", "#38bdf8", "#a855f7", "#fb923c"];
    setPieces(
      Array.from({ length: 70 }, (_, i) => ({
        id: n * 1000 + i,
        left: Math.random() * 100,
        dx: (Math.random() - 0.5) * 240,
        rot: Math.random() * 720 - 360,
        dur: 1.6 + Math.random() * 1.4,
        color: colors[i % colors.length],
        delay: Math.random() * 0.25,
      })),
    );
    const t = setTimeout(() => setPieces([]), 3400);
    return () => clearTimeout(t);
  }, [n]);
  if (!pieces.length) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute -top-4 h-3 w-2 animate-confetti rounded-sm"
          style={
            {
              left: `${p.left}%`,
              background: p.color,
              animationDelay: `${p.delay}s`,
              "--dx": `${p.dx}px`,
              "--rot": `${p.rot}deg`,
              "--dur": `${p.dur}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

function CelebrationModal() {
  const c = useUi((s) => s.celebration);
  const close = useUi((s) => s.closeCelebration);
  useEffect(() => {
    if (c) play("level");
  }, [c]);
  if (!c) return null;
  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm" onClick={close}>
      <div className="panel w-full max-w-sm animate-pop p-6 text-center shadow-glow" onClick={(e) => e.stopPropagation()}>
        <div className="text-5xl">{c.icon}</div>
        {c.belt && (
          <div className="mt-3 flex justify-center">
            <BeltBadge belt={c.belt} size="lg" />
          </div>
        )}
        <h2 className="mt-3 font-display text-2xl font-bold text-gold-300">{c.title}</h2>
        <p className="mt-2 text-sm text-ink-300">{c.body}</p>
        <button className="btn-primary mt-5 w-full" onClick={close}>
          Keep training
        </button>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { path } = useRoute();
  const [more, setMore] = useState(false);
  const srs = useStore((s) => s.srs);
  const due = useMemo(() => dueCards(srs).length, [srs]);

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-white/[0.06] bg-ink-900/80 px-4 py-5 backdrop-blur lg:flex">
        <Brand />
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = isActive(path, n.to);
            return (
              <button
                key={n.to}
                onClick={() => navigate(n.to)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  active ? "bg-gold-400/15 text-gold-200 ring-1 ring-gold-400/30" : "text-ink-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={18} />
                {n.label}
                {n.to === "/progress" && due > 0 && <span className="ml-auto rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">{due}</span>}
              </button>
            );
          })}
        </nav>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-[11px] leading-relaxed text-ink-400">
          <Trophy size={14} className="mb-1 text-gold-400" />
          Baselines are solver-approximated and simplified for learning. Live charts are exploit heuristics.
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink-900/80 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
            <div className="lg:hidden">
              <Brand />
            </div>
            <div className="hidden lg:block" />
            <TopStats />
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-3 pb-28 pt-4 sm:px-5 lg:pb-12">{children}</main>
      </div>

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-ink-900/95 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {NAV.filter((n) => MOBILE.includes(n.to)).map((n) => {
            const Icon = n.icon;
            const active = isActive(path, n.to);
            return (
              <button key={n.to} onClick={() => navigate(n.to)} className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${active ? "text-gold-300" : "text-ink-400"}`}>
                <Icon size={20} />
                {n.label}
              </button>
            );
          })}
          <button onClick={() => setMore(true)} className="relative flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold text-ink-400">
            <Menu size={20} />
            More
            {due > 0 && <span className="absolute right-5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />}
          </button>
        </div>
      </nav>

      {more && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60 lg:hidden" onClick={() => setMore(false)}>
          <div className="pb-safe w-full animate-fadeUp rounded-t-2xl border-t border-white/10 bg-ink-850 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <span className="label">More</span>
              <button onClick={() => setMore(false)} className="rounded-lg p-1 text-ink-300">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {NAV.filter((n) => !MOBILE.includes(n.to)).map((n) => {
                const Icon = n.icon;
                return (
                  <button
                    key={n.to}
                    onClick={() => {
                      setMore(false);
                      navigate(n.to);
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] py-3 text-xs font-semibold text-ink-100"
                  >
                    <Icon size={20} className="text-gold-300" />
                    {n.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <Toasts />
      <Confetti />
      <CelebrationModal />
    </div>
  );
}
