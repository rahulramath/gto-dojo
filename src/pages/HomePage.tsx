import { useMemo } from "react";
import { BookOpen, Calculator, Flame, LayoutGrid, Paintbrush, RotateCcw, Spade, Swords, Target } from "lucide-react";
import { navigate } from "../lib/router";
import { dueCards, useStore } from "../store/store";
import { DAYS } from "../data/curriculum";
import { STAKES } from "../data/stakes";
import { LEGENDS } from "../data/legends";
import { ACHIEVEMENTS } from "../data/achievements";
import { POSITIONS_6, posLabel, POS_INFO } from "../data/positions";
import { beltFor, dojoBelt, levelInfo, rankTitle, recentAccuracy } from "../lib/progression";
import { todayKey, pct } from "../lib/format";
import { BeltBadge, ProgressBar, Ring } from "../components/ui";
import { isLegendUnlocked } from "./LegendsPage";

const DAILY_GOAL = 40;

export function HomePage() {
  const s = useStore();
  const lv = levelInfo(s.xp);
  const belt = dojoBelt(s.lessons);
  const today = s.days[todayKey()] ?? { decisions: 0, correct: 0, xp: 0 };
  const nextDay = DAYS.find((d) => !s.lessons[d.day]) ?? DAYS[DAYS.length - 1];
  const due = dueCards(s.srs);
  const stake = STAKES[s.settings.stake];

  const weakest = useMemo(() => {
    const seats = POSITIONS_6.map((p) => ({ p, st: s.pos[p] }));
    const tried = seats.filter((x) => (x.st?.n ?? 0) >= 5);
    if (!tried.length) return seats.find((x) => !x.st)?.p ?? "BB";
    return tried.sort((a, b) => recentAccuracy(a.st) - recentAccuracy(b.st))[0].p;
  }, [s.pos]);

  const legend = useMemo(() => {
    const done = Object.keys(s.lessons).length;
    const open = LEGENDS.filter((l) => isLegendUnlocked(l, done, lv.level));
    const dayIdx = Math.floor(Date.now() / 86400000);
    return open[dayIdx % open.length] ?? LEGENDS[0];
  }, [lv.level, s.lessons]);

  const recent = Object.entries(s.achievements)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => ACHIEVEMENTS.find((a) => a.id === id))
    .filter(Boolean);

  const plan = [
    { icon: BookOpen, title: `Day ${nextDay.day}: ${nextDay.title}`, sub: nextDay.goal, cta: "Start lesson", go: () => navigate(`/learn?day=${nextDay.day}`), done: !!s.lessons[nextDay.day] },
    {
      icon: RotateCcw,
      title: due.length ? `Leak Deck: ${due.length} card${due.length > 1 ? "s" : ""} due` : "Leak Deck is clear",
      sub: due.length ? "Mistakes come back until you've mastered them." : "Nice. New mistakes will show up here.",
      cta: "Review",
      go: () => navigate(due.some((c) => c.mode === "pre") ? "/preflop?review=1" : "/progress"),
      done: due.length === 0,
    },
    {
      icon: Target,
      title: `Sharpen your weakest seat: ${posLabel(weakest)}`,
      sub: POS_INFO[weakest].blurb,
      cta: "Drill",
      go: () => navigate(`/preflop?pos=${weakest}`),
      done: false,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="panel relative overflow-hidden p-5 sm:p-6">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-felt-500/20 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-gold-400/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="max-w-xl">
            <div className="label">GTO Dojo · {stake.label}</div>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Train like a pro. <span className="text-gold-400">Every seat.</span>
            </h1>
            <p className="mt-2 text-ink-300">
              Real hands, instant grades, and reasoning you unlock one step at a time: the chart, the math, the exploit, and what the legends would do.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn-primary" onClick={() => navigate("/preflop")}>
                <Spade size={16} /> Preflop drill
              </button>
              <button className="btn-ghost" onClick={() => navigate("/postflop")}>
                <Swords size={16} /> Play postflop hands
              </button>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <Ring value={today.decisions / DAILY_GOAL} size={104} stroke={9}>
              <div className="text-center">
                <div className="num text-xl font-bold text-white">{today.decisions}</div>
                <div className="text-[10px] text-ink-400">/ {DAILY_GOAL} today</div>
              </div>
            </Ring>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-orange-300">
                <Flame size={18} className={s.streak.current ? "fill-orange-400 text-orange-400" : ""} /> {s.streak.current}-day streak
              </div>
              <BeltBadge belt={belt} label={`${belt.name} belt`} />
              <div className="w-40">
                <div className="flex justify-between text-[11px] text-ink-300">
                  <span>
                    Lv {lv.level} · {rankTitle(lv.level)}
                  </span>
                  <span className="num">{s.xp} XP</span>
                </div>
                <ProgressBar value={lv.pct} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section className="panel p-4">
          <h2 className="mb-3 font-display text-lg font-bold text-white">Today's training</h2>
          <div className="space-y-2">
            {plan.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.title} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-black/20 p-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${p.done ? "bg-emerald-500/15 text-emerald-300" : "bg-gold-400/15 text-gold-300"}`}>
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white">{p.title}</div>
                    <div className="truncate text-xs text-ink-400">{p.sub}</div>
                  </div>
                  <button className="btn-soft shrink-0 !px-3 !py-1.5 text-xs" onClick={p.go}>
                    {p.cta}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel p-4">
          <div className="label">Legend of the day</div>
          <div className="mt-1 font-display text-lg font-bold text-white">{legend.name}</div>
          <div className="text-xs text-ink-400">{legend.knownFor}</div>
          {legend.quote ? (
            <blockquote className="mt-3 border-l-2 border-emerald-400/50 pl-3 text-sm italic text-ink-100">“{legend.quote}”</blockquote>
          ) : (
            <p className="mt-3 text-sm text-ink-100">{legend.idea}</p>
          )}
          <p className="mt-2 text-xs text-emerald-200">{legend.apply}</p>
          <button className="mt-3 text-xs font-semibold text-gold-300" onClick={() => navigate("/legends")}>
            See all legends →
          </button>
        </section>
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-white">Seat belts</h2>
          <button className="text-xs font-semibold text-gold-300" onClick={() => navigate("/progress")}>
            Full progress →
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {POSITIONS_6.map((p) => {
            const st = s.pos[p];
            const b = beltFor(st);
            return (
              <button key={p} className="panel-tight p-3 text-left transition hover:border-white/20" onClick={() => navigate(`/preflop?pos=${p}`)}>
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-white">{posLabel(p, 6)}</span>
                  <BeltBadge belt={b.belt} size="sm" />
                </div>
                <div className="mt-1 text-[11px] text-ink-400">{st ? `${st.n} hands · ${pct(recentAccuracy(st))}` : "Not trained yet"}</div>
                <ProgressBar className="mt-2" value={b.progress} height={4} color={b.next?.color ?? b.belt.color} />
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { icon: LayoutGrid, title: "Chart explorer", sub: "Every range, every seat", go: "/charts" },
          { icon: Paintbrush, title: "Range painter", sub: "Paint a chart from memory", go: "/charts?id=rfi_BTN" },
          { icon: Calculator, title: "Math Gym", sub: "Pot odds, outs, combos", go: "/math" },
          { icon: BookOpen, title: "Pro Path", sub: `${Object.keys(s.lessons).length}/40 days`, go: "/learn" },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.title} onClick={() => navigate(t.go)} className="panel group p-4 text-left transition hover:border-gold-400/40">
              <Icon size={20} className="text-gold-300" />
              <div className="mt-2 text-sm font-semibold text-white">{t.title}</div>
              <div className="text-xs text-ink-400">{t.sub}</div>
            </button>
          );
        })}
      </section>

      {recent.length > 0 && (
        <section className="panel p-4">
          <div className="label mb-2">Recent achievements</div>
          <div className="flex flex-wrap gap-2">
            {recent.map((a) => (
              <span key={a!.id} className="inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-400/10 px-3 py-1 text-xs font-semibold text-gold-100">
                {a!.icon} {a!.name}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="panel p-4">
        <div className="label mb-2">Your pool: {stake.label}</div>
        <p className="text-sm text-ink-200">{stake.pool.headline}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <ul className="space-y-1 text-xs text-ink-300">
            {stake.pool.tendencies.slice(0, 3).map((t) => (
              <li key={t}>• {t}</li>
            ))}
          </ul>
          <ul className="space-y-1 text-xs text-emerald-200">
            {stake.pool.exploits.slice(0, 3).map((t) => (
              <li key={t}>✓ {t}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
