import { useMemo, useRef, useState } from "react";
import { Download, Flame, Grid3x3, Hand, Percent, RotateCcw, Target, Upload, Users, Wallet } from "lucide-react";
import { useStore, type DecisionLog } from "../store/store";
import { ACHIEVEMENTS, type Achievement, type AchState } from "../data/achievements";
import { ALL_POSITIONS, posLabel, POS_INFO, type PosId } from "../data/positions";
import { STAKE_LIST, STAKES } from "../data/stakes";
import { ARCHETYPE_IDS, getArchetype } from "../data/archetypes";
import { beltFor, levelInfo, rankTitle, recentAccuracy } from "../lib/progression";
import { navigate } from "../lib/router";
import { useUi } from "../store/ui";
import { BeltBadge, ListRow, PageHeader, ProgressBar, Ring, SectionHeader, Segmented, Sheet, StatTile, Switch } from "../components/ui";
import { pct } from "../lib/format";

const PRE_VERB: Record<string, Record<string, string>> = {
  rfi: { raise: "open", call: "limp", fold: "fold" },
  vsOpen: { raise: "3-bet", call: "call", fold: "fold" },
  vs3bet: { raise: "4-bet", call: "call", fold: "fold" },
  vs4bet: { allin: "jam", call: "call", fold: "fold" },
  vsLimp: { raise: "iso-raise", call: "limp", fold: "fold", check: "check" },
};
const KIND_NAME: Record<string, string> = { rfi: "opening", vsOpen: "facing opens", vs3bet: "facing 3-bets", vs4bet: "facing 4-bets", vsLimp: "vs limpers" };

function topLeak(log: DecisionLog[]): { title: string; body: string; url: string } | null {
  const groups = new Map<string, DecisionLog[]>();
  for (const d of log.slice(-800)) {
    if (d.mode !== "pre") continue;
    const k = `${d.kind}|${d.pos}`;
    groups.set(k, [...(groups.get(k) ?? []), d]);
  }
  let best: { title: string; body: string; url: string; sev: number } | null = null;
  for (const [k, arr] of groups) {
    if (arr.length < 8) continue;
    const [kind, pos] = k.split("|");
    const user: Record<string, number> = {};
    const base: Record<string, number> = {};
    for (const d of arr) {
      user[d.action] = (user[d.action] ?? 0) + 1 / arr.length;
      for (const a in d.base) base[a] = (base[a] ?? 0) + (d.base[a] ?? 0) / arr.length;
    }
    for (const a of Object.keys({ ...user, ...base })) {
      const diff = (user[a] ?? 0) - (base[a] ?? 0);
      if (Math.abs(diff) >= 0.1 && (!best || Math.abs(diff) > best.sev)) {
        const verb = PRE_VERB[kind]?.[a] ?? a;
        best = {
          sev: Math.abs(diff),
          title: `You ${diff > 0 ? "over" : "under"}-${verb === "fold" ? "fold" : verb === "call" ? "call" : `use ${verb}`} ${posLabel(pos as PosId)} ${KIND_NAME[kind] ?? ""}`,
          body: `You ${verb} ${pct(user[a] ?? 0)} of the time. The baseline does ${pct(base[a] ?? 0)}.`,
          url: `/preflop?kinds=${kind}&pos=${pos}`,
        };
      }
    }
  }
  return best;
}

type SettingSheet = null | "stake" | "table" | "units" | "villain" | "reset";

export function MePage() {
  const s = useStore();
  const set = s.setSettings;
  const lv = levelInfo(s.xp);
  const acc = s.counters.decisions ? s.counters.correct / s.counters.decisions : 0;
  const leak = useMemo(() => topLeak(s.log), [s.log]);
  const [sheet, setSheet] = useState<SettingSheet>(null);
  const [ach, setAch] = useState<Achievement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const seats = ALL_POSITIONS.filter((p) => s.settings.table === 9 || !["EP1", "EP2", "EP3"].includes(p));
  const achState: AchState = { counters: s.counters, pos: s.pos, bestStreakDays: s.streak.best, lessonsDone: Object.keys(s.lessons).map(Number) };
  const unlocked = ACHIEVEMENTS.filter((a) => s.achievements[a.id]).length;
  const [allAch, setAllAch] = useState(false);
  const got = ACHIEVEMENTS.filter((a) => s.achievements[a.id]).sort((a, b) => s.achievements[b.id] - s.achievements[a.id]);
  const closest = ACHIEVEMENTS.filter((a) => !s.achievements[a.id])
    .map((a) => {
      const [cur, target] = a.progress(achState);
      return { a, p: cur / target };
    })
    .sort((x, y) => y.p - x.p)
    .map((x) => x.a);
  const featured = [...got.slice(0, 4), ...closest].slice(0, 8);
  const arch = getArchetype(s.settings.villain, s.settings.stake);

  const exportData = () => {
    const blob = new Blob([localStorage.getItem("gto-dojo-v1") ?? "{}"], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `gto-dojo-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Me" subtitle="Your progress and settings." />

      <div className="card flex items-center gap-6">
        <Ring value={lv.pct} size={88}>
          <span className="t-title-lg">{lv.level}</span>
        </Ring>
        <div className="min-w-0">
          <div className="t-title-lg">{rankTitle(lv.level)}</div>
          <div className="t-body text-ink-300">
            {lv.need - lv.into} XP to level {lv.level + 1}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatTile icon={Flame} color="#fb923c" label={`Best ${s.streak.best}`} value={`${s.streak.current} ${s.streak.current === 1 ? "day" : "days"}`} />
        <StatTile icon={Hand} label="Decisions" value={s.counters.decisions} />
        <StatTile icon={Percent} color="#22c55e" label="Accuracy" value={s.counters.decisions ? pct(acc) : "—"} />
      </div>

      <section>
        <SectionHeader title="Seat belts" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {seats.map((p) => {
            const st = s.pos[p];
            const b = beltFor(st);
            return (
              <button key={p} className="card-flat text-left transition hover:bg-white/[0.06]" onClick={() => navigate(`/preflop?pos=${p}`)}>
                <div className="flex items-center justify-between gap-2">
                  <span className="t-title">{posLabel(p, s.settings.table)}</span>
                  <BeltBadge belt={b.belt} />
                </div>
                <div className="t-label mt-1 truncate">{st ? `${st.n} hands · ${pct(recentAccuracy(st))}` : POS_INFO[p].name}</div>
                <ProgressBar className="mt-2" value={b.progress} height={4} color={b.next?.color ?? b.belt.color} />
              </button>
            );
          })}
        </div>
      </section>

      {leak && (
        <section>
          <SectionHeader title="Your biggest leak" />
          <div className="card space-y-4">
            <div>
              <div className="t-title">{leak.title}</div>
              <p className="t-body mt-1">{leak.body}</p>
            </div>
            <button className="btn-filled" onClick={() => navigate(leak.url)}>
              <Target size={16} /> Practice this spot
            </button>
          </div>
        </section>
      )}

      <section>
        <SectionHeader
          title={`Achievements · ${unlocked}/${ACHIEVEMENTS.length}`}
          action={
            <button className="btn-text" onClick={() => setAllAch(true)}>
              See all
            </button>
          }
        />
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {featured.map((a) => {
            const got = !!s.achievements[a.id];
            const [cur, target] = a.progress(achState);
            return (
              <button key={a.id} onClick={() => setAch(a)} className={`card-flat flex aspect-square flex-col items-center justify-center gap-2 !p-2 ${got ? "ring-1 ring-gold-400/50" : ""}`} title={a.name}>
                <span className={`text-2xl ${got ? "" : "opacity-40 grayscale"}`}>{a.icon}</span>
                {!got && <ProgressBar value={cur / target} height={4} className="w-3/4" />}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <SectionHeader title="Settings" />
        <div className="card !py-2">
          <ListRow icon={Wallet} title="Stakes" subtitle={STAKES[s.settings.stake].label} onClick={() => setSheet("stake")} />
          <ListRow icon={Grid3x3} title="Table" subtitle={s.settings.table === 9 ? "9-handed" : "6-max"} onClick={() => setSheet("table")} />
          <ListRow icon={Percent} title="Show amounts in" subtitle={s.settings.units === "$" ? "Dollars" : "Big blinds"} onClick={() => setSheet("units")} />
          <ListRow icon={Users} title="Default opponent" subtitle={`${arch.emoji} ${arch.name}`} onClick={() => setSheet("villain")} />
          <div className="border-t border-white/[0.06]">
            <Switch checked={s.settings.sound} onChange={(v) => set({ sound: v })} label="Sound effects" />
            <Switch checked={s.settings.fourColor} onChange={(v) => set({ fourColor: v })} label="Four-color deck" hint="Blue diamonds, green clubs" />
          </div>
          <div className="border-t border-white/[0.06]">
            <ListRow icon={Download} tone="#94a3b8" title="Export progress" onClick={exportData} />
            <ListRow icon={Upload} tone="#94a3b8" title="Import progress" onClick={() => fileRef.current?.click()} />
            <ListRow icon={RotateCcw} tone="#f87171" title="Reset everything" onClick={() => setSheet("reset")} />
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const ok = useStore.getState().importState(await f.text());
            useUi.getState().push({ icon: ok ? "✅" : "⚠️", title: ok ? "Progress imported" : "Couldn't read that file", tone: "gold" });
          }}
        />
      </section>

      <Sheet open={sheet === "stake"} onClose={() => setSheet(null)} title="Stakes">
        <div className="space-y-2">
          {STAKE_LIST.map((st) => (
            <button
              key={st.id}
              onClick={() => {
                set({ stake: st.id, table: st.table, units: st.id === "online" ? "bb" : "$", sizing: st.id === "online" ? "solver" : "live" });
                setSheet(null);
              }}
              className={`w-full rounded-2xl border p-4 text-left transition ${s.settings.stake === st.id ? "border-gold-400/70 bg-gold-400/10" : "border-white/10 hover:bg-white/[0.04]"}`}
            >
              <div className="t-title">{st.label}</div>
              <div className="t-body mt-1 text-ink-300">{st.pool.headline}</div>
            </button>
          ))}
        </div>
      </Sheet>
      <Sheet open={sheet === "table"} onClose={() => setSheet(null)} title="Table">
        <Segmented full value={s.settings.table} onChange={(v) => set({ table: v })} options={[{ value: 6, label: "6-max" }, { value: 9, label: "9-handed" }]} />
      </Sheet>
      <Sheet open={sheet === "units"} onClose={() => setSheet(null)} title="Show amounts in">
        <Segmented full value={s.settings.units} onChange={(v) => set({ units: v })} options={[{ value: "$", label: "Dollars" }, { value: "bb", label: "Big blinds" }]} />
      </Sheet>
      <Sheet open={sheet === "villain"} onClose={() => setSheet(null)} title="Default opponent">
        <div className="space-y-2">
          {ARCHETYPE_IDS.map((id) => {
            const a = getArchetype(id, s.settings.stake);
            return (
              <button
                key={id}
                onClick={() => {
                  set({ villain: id });
                  setSheet(null);
                }}
                className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left ${s.settings.villain === id ? "border-gold-400/70 bg-gold-400/10" : "border-white/10 hover:bg-white/[0.04]"}`}
              >
                <span className="text-2xl">{a.emoji}</span>
                <span>
                  <span className="t-title block">{a.name}</span>
                  <span className="t-label block">{a.blurb}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Sheet>
      <Sheet open={sheet === "reset"} onClose={() => setSheet(null)} title="Reset everything?">
        <p className="t-body">This clears XP, belts, achievements, lessons and mistakes. Export first if you want a backup.</p>
        <div className="mt-6 flex gap-2">
          <button className="btn-outline flex-1" onClick={() => setSheet(null)}>
            Cancel
          </button>
          <button
            className="btn flex-1 bg-rose-600 text-white hover:bg-rose-500"
            onClick={() => {
              useStore.getState().resetAll();
              setSheet(null);
            }}
          >
            Reset
          </button>
        </div>
      </Sheet>
      <Sheet open={allAch} onClose={() => setAllAch(false)} title={`Achievements · ${unlocked}/${ACHIEVEMENTS.length}`} wide>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {ACHIEVEMENTS.map((a) => {
            const has = !!s.achievements[a.id];
            return (
              <button
                key={a.id}
                onClick={() => {
                  setAllAch(false);
                  setAch(a);
                }}
                className={`card-flat flex aspect-square items-center justify-center !p-2 ${has ? "ring-1 ring-gold-400/50" : ""}`}
                title={a.name}
              >
                <span className={`text-2xl ${has ? "" : "opacity-25 grayscale"}`}>{a.icon}</span>
              </button>
            );
          })}
        </div>
      </Sheet>
      <Sheet open={!!ach} onClose={() => setAch(null)} title={ach?.name}>
        {ach && (
          <div className="space-y-4 text-center">
            <div className={`text-5xl ${s.achievements[ach.id] ? "" : "opacity-40 grayscale"}`}>{ach.icon}</div>
            <p className="t-body">{ach.desc}</p>
            {(() => {
              const [cur, target] = ach.progress(achState);
              return s.achievements[ach.id] ? (
                <p className="t-label text-gold-300">Unlocked · +{ach.xp} XP</p>
              ) : (
                <div>
                  <ProgressBar value={cur / target} />
                  <p className="num t-label mt-2">
                    {Math.min(cur, target)}/{target}
                  </p>
                </div>
              );
            })()}
          </div>
        )}
      </Sheet>
      <p className="t-label text-center">Grades use solver-approximated 100bb baselines. Live limper charts are exploit heuristics.</p>
    </div>
  );
}
