import { useMemo } from "react";
import { Flame, Play, RotateCcw, Trash2 } from "lucide-react";
import { dueCards, useStore, type DecisionLog } from "../store/store";
import { ACHIEVEMENTS, type AchState } from "../data/achievements";
import { ALL_POSITIONS, posLabel, POS_INFO, type PosId } from "../data/positions";
import { beltFor, dojoBelt, levelInfo, rankTitle, recentAccuracy } from "../lib/progression";
import { ALL_HANDS, type HandClass } from "../lib/cards";
import { GRADES } from "../lib/grading";
import { ACTION_NAMES, type PostAction } from "../lib/postflop";
import { navigate } from "../lib/router";
import { BeltBadge, ProgressBar, SectionTitle, Stat } from "../components/ui";
import { GradePill } from "../components/coach";
import { pct, todayKey } from "../lib/format";

const PRE_LABEL: Record<string, Record<string, string>> = {
  rfi: { raise: "open", call: "limp", fold: "fold" },
  vsOpen: { raise: "3-bet", call: "call", fold: "fold" },
  vs3bet: { raise: "4-bet", call: "call", fold: "fold" },
  vs4bet: { allin: "jam", call: "call", fold: "fold" },
  vsLimp: { raise: "iso-raise", call: "over-limp", fold: "fold", check: "check" },
};
const KIND_NAME: Record<string, string> = { rfi: "opens", vsOpen: "facing opens", vs3bet: "facing 3-bets", vs4bet: "facing 4-bets", vsLimp: "vs limpers", flop: "flop", turn: "turn", river: "river" };

interface Leak {
  label: string;
  detail: string;
  severity: number;
  url: string;
}

function findLeaks(log: DecisionLog[]): Leak[] {
  const groups = new Map<string, DecisionLog[]>();
  for (const d of log.slice(-1200)) {
    const key = d.mode === "pre" ? `pre|${d.kind}|${d.pos}` : `post|${d.kind}`;
    const arr = groups.get(key) ?? [];
    arr.push(d);
    groups.set(key, arr);
  }
  const out: Leak[] = [];
  for (const [key, arr] of groups) {
    if (arr.length < 8) continue;
    const [mode, kind, pos] = key.split("|");
    const user: Record<string, number> = {};
    const base: Record<string, number> = {};
    for (const d of arr) {
      user[d.action] = (user[d.action] ?? 0) + 1 / arr.length;
      for (const a in d.base) base[a] = (base[a] ?? 0) + (d.base[a] ?? 0) / arr.length;
    }
    let worst = "";
    let diff = 0;
    for (const a of new Set([...Object.keys(user), ...Object.keys(base)])) {
      const dv = (user[a] ?? 0) - (base[a] ?? 0);
      if (Math.abs(dv) > Math.abs(diff)) {
        diff = dv;
        worst = a;
      }
    }
    if (Math.abs(diff) < 0.08) continue;
    const name = mode === "pre" ? PRE_LABEL[kind]?.[worst] ?? worst : ACTION_NAMES[worst as PostAction]?.toLowerCase() ?? worst;
    const where = mode === "pre" ? `${posLabel(pos as PosId)} ${KIND_NAME[kind]}` : `${KIND_NAME[kind]} decisions`;
    out.push({
      label: `${diff > 0 ? "Over" : "Under"}-${name === "fold" ? "folding" : name === "call" ? "calling" : `using "${name}"`} — ${where}`,
      detail: `You ${name} ${pct(user[worst] ?? 0)} of the time; the baseline does ${pct(base[worst] ?? 0)} (${arr.length} decisions).`,
      severity: Math.abs(diff),
      url: mode === "pre" ? `/preflop?kinds=${kind}&pos=${pos}` : "/postflop",
    });
  }
  return out.sort((a, b) => b.severity - a.severity).slice(0, 5);
}

export function ProgressPage() {
  const s = useStore();
  const lv = levelInfo(s.xp);
  const belt = dojoBelt(s.lessons);
  const leaks = useMemo(() => findLeaks(s.log), [s.log]);
  const due = dueCards(s.srs);
  const acc = s.counters.decisions ? s.counters.correct / s.counters.decisions : 0;

  const heat = useMemo(() => {
    const m: Record<HandClass, { n: number; wrong: number }> = {};
    for (const d of s.log) {
      if (d.mode !== "pre") continue;
      const e = m[d.hand] ?? { n: 0, wrong: 0 };
      e.n++;
      if (!GRADES[d.grade].correct) e.wrong++;
      m[d.hand] = e;
    }
    return m;
  }, [s.log]);

  const calib = useMemo(() => {
    const c: Record<string, { n: number; ok: number }> = { sure: { n: 0, ok: 0 }, think: { n: 0, ok: 0 }, guess: { n: 0, ok: 0 } };
    for (const d of s.log) if (d.conf) {
      c[d.conf].n++;
      if (GRADES[d.grade].correct) c[d.conf].ok++;
    }
    return c;
  }, [s.log]);

  const achState: AchState = { counters: s.counters, pos: s.pos, bestStreakDays: s.streak.best, lessonsDone: Object.keys(s.lessons).map(Number) };
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const k = todayKey(d);
    return { k, label: d.toLocaleDateString(undefined, { weekday: "narrow" }), n: s.days[k]?.decisions ?? 0 };
  });
  const maxDay = Math.max(10, ...days.map((d) => d.n));
  const seats = ALL_POSITIONS.filter((p) => s.settings.table === 9 || !["EP1", "EP2", "EP3"].includes(p));

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Progress" title={`Level ${lv.level} · ${rankTitle(lv.level)}`} desc="Decisions, not results. Everything here is graded against the baseline (or your exploit lens)." right={<BeltBadge belt={belt} size="lg" label={`${belt.name} belt`} />} />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Stat label="Total XP" value={s.xp.toLocaleString()} sub={`${lv.into}/${lv.need} to next level`} accent="#f2c14e" />
        <Stat label="Decisions" value={s.counters.decisions.toLocaleString()} />
        <Stat label="Accuracy" value={s.counters.decisions ? pct(acc) : "—"} accent={acc >= 0.8 ? "#22c55e" : undefined} />
        <Stat label="Best streak" value={s.counters.bestStreak} sub="correct in a row" />
        <Stat label="Day streak" value={<span className="inline-flex items-center gap-1"><Flame size={16} className="text-orange-400" />{s.streak.current}</span>} sub={`best ${s.streak.best}`} />
      </div>

      <section>
        <h2 className="mb-3 font-display text-xl font-bold text-white">Seat belts</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {seats.map((p) => {
            const st = s.pos[p];
            const b = beltFor(st);
            return (
              <div key={p} className="panel-tight p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">{posLabel(p, s.settings.table)}</div>
                    <div className="text-[11px] text-ink-400">{POS_INFO[p].name}</div>
                  </div>
                  <BeltBadge belt={b.belt} />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-ink-300">
                  <span>{st?.n ?? 0} decisions · {st ? pct(recentAccuracy(st)) : "—"} recent</span>
                  {b.next && <span>next: {b.next.name} ({b.next.min} @ {pct(b.next.acc)})</span>}
                </div>
                <ProgressBar className="mt-1.5" value={b.progress} color={b.next?.color ?? b.belt.color} />
                <button className="mt-2 text-xs font-semibold text-gold-300 hover:text-gold-200" onClick={() => navigate(`/preflop?pos=${p}`)}>
                  Train {posLabel(p, s.settings.table)} →
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel p-4">
          <h2 className="font-display text-lg font-bold text-white">Leak finder</h2>
          <p className="mb-3 text-xs text-ink-400">Compares how often you take each action with how often the baseline would, spot by spot.</p>
          {leaks.length ? (
            <div className="space-y-2">
              {leaks.map((l) => (
                <div key={l.label} className="rounded-lg border border-orange-400/20 bg-orange-500/[0.06] p-3">
                  <div className="text-sm font-semibold text-orange-100">{l.label}</div>
                  <div className="text-xs text-ink-300">{l.detail}</div>
                  <button className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-gold-300" onClick={() => navigate(l.url)}>
                    <Play size={12} /> Drill it
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-400">Play at least 8 decisions in a spot and your biggest tendencies will show up here.</p>
          )}
        </section>

        <section className="panel p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-white">Leak Deck</h2>
            <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-xs font-bold text-rose-200">{due.length} due</span>
          </div>
          <p className="mb-3 text-xs text-ink-400">Every mistake becomes a card that comes back at growing intervals (5 min → 1 day → 3 → 7 → 16 → 35) until you've mastered it.</p>
          <div className="flex gap-2">
            <button className="btn-primary" disabled={!due.some((c) => c.mode === "pre")} onClick={() => navigate("/preflop?review=1")}>
              <RotateCcw size={16} /> Review preflop leaks
            </button>
          </div>
          <div className="scroll-thin mt-3 max-h-64 space-y-1.5 overflow-y-auto">
            {s.srs.length === 0 && <p className="text-sm text-ink-400">No leaks yet. Mistakes you make will appear here.</p>}
            {s.srs
              .slice()
              .sort((a, b) => a.due - b.due)
              .map((c) => (
                <div key={c.key} className="flex items-center justify-between gap-2 rounded-lg bg-black/20 px-2.5 py-1.5 text-xs">
                  <span className="min-w-0 flex-1 truncate text-ink-100">{c.label}</span>
                  <span className="shrink-0 text-ink-400">{c.due <= Date.now() ? "due" : `in ${Math.max(1, Math.round((c.due - Date.now()) / 3600000))}h`} · box {c.box}</span>
                  {c.mode === "post" && c.seed !== undefined && (
                    <button className="shrink-0 font-semibold text-gold-300" onClick={() => navigate(`/postflop?seed=${c.seed}&lines=${c.lineId}&role=${c.role}&srs=${encodeURIComponent(c.key)}`)}>
                      Replay
                    </button>
                  )}
                  <button className="shrink-0 text-ink-500 hover:text-rose-300" title="Remove" onClick={() => useStore.getState().removeSrs(c.key)}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="panel p-4">
          <h2 className="font-display text-lg font-bold text-white">Mistake heatmap</h2>
          <p className="mb-3 text-xs text-ink-400">Preflop hands you get wrong most often (red = frequent mistakes).</p>
          <div className="grid gap-[2px] rounded-xl bg-black/40 p-[3px]" style={{ gridTemplateColumns: "repeat(13, minmax(0, 1fr))" }}>
            {ALL_HANDS.map((h) => {
              const e = heat[h];
              const rate = e ? e.wrong / e.n : 0;
              const bg = !e ? "rgba(255,255,255,0.03)" : rate === 0 ? "rgba(34,197,94,0.35)" : `rgba(239,68,68,${0.25 + rate * 0.7})`;
              return (
                <div key={h} title={e ? `${h}: ${e.wrong}/${e.n} wrong` : h} className="flex aspect-square items-center justify-center rounded-[3px] font-mono text-[7.5px] font-bold text-white/85 sm:text-[10px]" style={{ background: bg }}>
                  {h}
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <div className="panel p-4">
            <h2 className="font-display text-lg font-bold text-white">Confidence calibration</h2>
            <p className="mb-3 text-xs text-ink-400">Pros know when they know. Your accuracy by how sure you said you were:</p>
            {(["sure", "think", "guess"] as const).map((k) => {
              const c = calib[k];
              const v = c.n ? c.ok / c.n : 0;
              return (
                <div key={k} className="mb-2">
                  <div className="flex justify-between text-xs text-ink-300">
                    <span className="capitalize">{k === "think" ? "Think so" : k}</span>
                    <span className="num">{c.n ? `${pct(v)} of ${c.n}` : "—"}</span>
                  </div>
                  <ProgressBar value={v} color={k === "sure" ? "#22c55e" : k === "think" ? "#f2c14e" : "#94a3b8"} />
                </div>
              );
            })}
          </div>
          <div className="panel p-4">
            <h2 className="mb-3 font-display text-lg font-bold text-white">Last 14 days</h2>
            <div className="flex h-24 items-end gap-1">
              {days.map((d) => (
                <div key={d.k} className="flex flex-1 flex-col items-center gap-1">
                  <div className="w-full rounded-t bg-gold-400/80" style={{ height: `${(d.n / maxDay) * 80}px`, minHeight: d.n ? 3 : 0 }} title={`${d.n} decisions`} />
                  <span className="text-[9px] text-ink-500">{d.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section>
        <h2 className="mb-3 font-display text-xl font-bold text-white">
          Achievements <span className="text-sm text-ink-400">{Object.keys(s.achievements).length}/{ACHIEVEMENTS.length}</span>
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ACHIEVEMENTS.map((a) => {
            const got = s.achievements[a.id];
            const [cur, target] = a.progress(achState);
            return (
              <div key={a.id} className={`panel-tight flex items-center gap-3 p-3 ${got ? "border-gold-400/40" : ""}`}>
                <span className={`text-2xl ${got ? "" : "opacity-30 grayscale"}`}>{a.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`truncate text-sm font-semibold ${got ? "text-gold-200" : "text-ink-200"}`}>{a.name}</span>
                    <span className="shrink-0 text-[10px] text-ink-400">+{a.xp} XP</span>
                  </div>
                  <div className="truncate text-[11px] text-ink-400">{a.desc}</div>
                  {!got && <ProgressBar className="mt-1" value={cur / target} height={4} />}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel p-4">
        <h2 className="mb-3 font-display text-lg font-bold text-white">Recent decisions</h2>
        <div className="space-y-1.5">
          {s.log.length === 0 && <p className="text-sm text-ink-400">Nothing yet — deal some hands.</p>}
          {s.log
            .slice(-15)
            .reverse()
            .map((d) => (
              <div key={d.t} className="flex items-center justify-between gap-2 rounded-lg bg-black/20 px-2.5 py-1.5 text-xs">
                <span className="w-24 shrink-0 font-semibold text-ink-300">
                  {d.mode === "pre" ? posLabel(d.pos) : "Postflop"} · {KIND_NAME[d.kind] ?? d.kind}
                </span>
                <span className="w-12 shrink-0 font-mono text-white">{d.hand}</span>
                <span className="min-w-0 flex-1 truncate text-ink-200">
                  {d.mode === "pre" ? PRE_LABEL[d.kind]?.[d.action] ?? d.action : ACTION_NAMES[d.action as PostAction]}
                  {d.action !== d.best && <span className="text-ink-400"> · best {d.mode === "pre" ? PRE_LABEL[d.kind]?.[d.best] ?? d.best : ACTION_NAMES[d.best as PostAction]}</span>}
                </span>
                <GradePill grade={d.grade} small />
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}
