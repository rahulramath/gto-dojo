import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { BookOpen, CircleUser, Flame, LayoutGrid, Spade } from "lucide-react";
import { navigate, useRoute } from "../lib/router";
import { useStore } from "../store/store";
import { useUi } from "../store/ui";
import { levelInfo } from "../lib/progression";
import { BeltBadge } from "./ui";
import { play } from "../lib/sound";

const DEST = [
  { to: "/", label: "Train", icon: Spade },
  { to: "/learn", label: "Learn", icon: BookOpen },
  { to: "/charts", label: "Charts", icon: LayoutGrid },
  { to: "/me", label: "Me", icon: CircleUser },
];

export const FOCUS_ROUTES = ["/preflop", "/postflop", "/math", "/daily", "/review", "/lesson"];

const isActive = (path: string, to: string) => (to === "/" ? path === "/" : path.startsWith(to));

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <button className="flex items-center gap-2" onClick={() => navigate("/")} aria-label="GTO Dojo home">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-felt-400 to-felt-800 ring-1 ring-gold-400/60">
        <Spade size={16} className="fill-white text-white" />
      </span>
      {!compact && (
        <span className="t-title">
          GTO <span className="text-gold-400">Dojo</span>
        </span>
      )}
    </button>
  );
}

function TopStats() {
  const xp = useStore((s) => s.xp);
  const streak = useStore((s) => s.streak.current);
  const lv = levelInfo(xp);
  return (
    <button className="flex items-center gap-4" onClick={() => navigate("/me")} aria-label="Your progress">
      <span className="flex items-center gap-1 text-sm font-semibold text-orange-300" title="Day streak">
        <Flame size={20} className={streak ? "fill-orange-400 text-orange-400" : "text-ink-400"} />
        <span className="num">{streak}</span>
      </span>
      <span className="flex h-8 items-center gap-2 rounded-full bg-white/[0.06] pl-1 pr-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold-400 text-xs font-bold text-ink-950">{lv.level}</span>
        <span className="num text-xs font-semibold text-ink-200">{xp} XP</span>
      </span>
    </button>
  );
}

function Toasts() {
  const toasts = useUi((s) => s.toasts);
  const dismiss = useUi((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed left-1/2 top-4 z-[70] flex w-[min(360px,calc(100vw-32px))] -translate-x-1/2 flex-col gap-2">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className="pointer-events-auto flex animate-fadeUp items-center gap-4 rounded-2xl border border-gold-400/30 bg-ink-800 p-4 text-left shadow-sheet"
        >
          <span className="text-2xl leading-none">{t.icon}</span>
          <span className="min-w-0">
            <span className="t-body block font-semibold text-gold-200">{t.title}</span>
            {t.body && <span className="t-label block truncate">{t.body}</span>}
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
    const colors = ["#f2c14e", "#22c55e", "#ef4444", "#38bdf8", "#a855f7"];
    setPieces(
      Array.from({ length: 56 }, (_, i) => ({
        id: n * 1000 + i,
        left: Math.random() * 100,
        dx: (Math.random() - 0.5) * 240,
        rot: Math.random() * 720 - 360,
        dur: 1.6 + Math.random() * 1.2,
        color: colors[i % colors.length],
        delay: Math.random() * 0.2,
      })),
    );
    const t = setTimeout(() => setPieces([]), 3200);
    return () => clearTimeout(t);
  }, [n]);
  if (!pieces.length) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute -top-4 h-3 w-2 animate-confetti rounded-sm"
          style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s`, "--dx": `${p.dx}px`, "--rot": `${p.rot}deg`, "--dur": `${p.dur}s` } as CSSProperties}
        />
      ))}
    </div>
  );
}

function Celebration() {
  const c = useUi((s) => s.celebration);
  const close = useUi((s) => s.closeCelebration);
  useEffect(() => {
    if (c) play("level");
  }, [c]);
  if (!c) return null;
  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/70 p-6" onClick={close}>
      <div className="card w-full max-w-xs animate-pop text-center" onClick={(e) => e.stopPropagation()}>
        <div className="text-5xl">{c.icon}</div>
        {c.belt && (
          <div className="mt-4 flex justify-center">
            <BeltBadge belt={c.belt} size="lg" />
          </div>
        )}
        <h2 className="t-title-lg mt-4 text-gold-300">{c.title}</h2>
        <p className="t-body mt-2 text-ink-300">{c.body}</p>
        <button className="btn-filled mt-6 w-full" onClick={close}>
          Keep going
        </button>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { path } = useRoute();
  const focus = FOCUS_ROUTES.includes(path);

  const overlays = (
    <>
      <Toasts />
      <Confetti />
      <Celebration />
    </>
  );

  if (focus) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto max-w-5xl px-4 pb-8 sm:px-6">{children}</main>
        {overlays}
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <nav className="fixed inset-y-0 left-0 z-30 hidden w-20 flex-col items-center gap-4 border-r border-white/[0.06] bg-ink-900 py-4 lg:flex">
        <Brand compact />
        <div className="mt-4 flex flex-col gap-4">
          {DEST.map((d) => {
            const Icon = d.icon;
            const active = isActive(path, d.to);
            return (
              <button key={d.to} onClick={() => navigate(d.to)} className="group flex flex-col items-center gap-1">
                <span className={`flex h-8 w-14 items-center justify-center rounded-full transition ${active ? "bg-gold-400/20 text-gold-200" : "text-ink-300 group-hover:bg-white/[0.06]"}`}>
                  <Icon size={20} />
                </span>
                <span className={`text-xs font-medium ${active ? "text-ink-100" : "text-ink-300"}`}>{d.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="lg:pl-20">
        <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-ink-900/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
            <Brand />
            <TopStats />
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6 lg:pb-12">{children}</main>
      </div>

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.08] bg-ink-900/95 backdrop-blur lg:hidden" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}>
        <div className="mx-auto grid h-16 max-w-lg grid-cols-4">
          {DEST.map((d) => {
            const Icon = d.icon;
            const active = isActive(path, d.to);
            return (
              <button key={d.to} onClick={() => navigate(d.to)} className="flex flex-col items-center justify-center gap-1">
                <span className={`flex h-8 w-14 items-center justify-center rounded-full ${active ? "bg-gold-400/20 text-gold-200" : "text-ink-300"}`}>
                  <Icon size={20} />
                </span>
                <span className={`text-xs font-medium ${active ? "text-ink-100" : "text-ink-300"}`}>{d.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
      {overlays}
    </div>
  );
}
