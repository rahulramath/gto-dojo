import { useMemo } from "react";
import { BookOpen, Calculator, CalendarDays, Flame, RotateCcw, Spade, Swords, Target, Trophy } from "lucide-react";
import { navigate } from "../lib/router";
import { dueCards, useStore } from "../store/store";
import { DAYS } from "../data/curriculum";
import { STAKES } from "../data/stakes";
import { POSITIONS_6, posLabel } from "../data/positions";
import { levelInfo, recentAccuracy } from "../lib/progression";
import { todayKey } from "../lib/format";
import { ListRow, PageHeader, SectionHeader, StatTile } from "../components/ui";

export function HomePage() {
  const s = useStore();
  const lv = levelInfo(s.xp);
  const today = s.days[todayKey()];
  const sessionsToday = today?.sessions ?? 0;
  const due = dueCards(s.srs);
  const dueCount = due.length;
  const nextDay = DAYS.find((d) => !s.lessons[d.day]) ?? DAYS[DAYS.length - 1];
  const daily = s.daily[todayKey()];
  const stake = STAKES[s.settings.stake];

  const weakSeat = useMemo(() => {
    const tried = POSITIONS_6.filter((p) => (s.pos[p]?.n ?? 0) >= 5);
    if (!tried.length) return null;
    return tried.sort((a, b) => recentAccuracy(s.pos[a]) - recentAccuracy(s.pos[b]))[0];
  }, [s.pos]);

  return (
    <div className="space-y-6">
      <PageHeader title="Ready to train?" subtitle={`${stake.label} · ${s.settings.table === 9 ? "9-handed" : "6-max"}`} />

      <div className="grid grid-cols-3 gap-2">
        <StatTile icon={Flame} color="#fb923c" label="Streak" value={s.streak.current} />
        <StatTile icon={Target} color="#22c55e" label="Today" value={`${Math.min(sessionsToday, 1)}/1`} />
        <StatTile icon={Trophy} label="Level" value={lv.level} />
      </div>

      <div className="card relative overflow-hidden">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-felt-500/25 blur-3xl" />
        <div className="relative">
          <div className="t-label text-gold-300">Today's session</div>
          <h2 className="t-title-lg mt-1">10 hands, picked for you</h2>
          <p className="t-body mt-1 text-ink-300">
            {dueCount ? `Starts with ${Math.min(3, dueCount)} ${Math.min(3, dueCount) === 1 ? "hand" : "hands"} you missed` : "Mixed spots from every seat"}
            {weakSeat ? `, plus extra ${posLabel(weakSeat, 6)} practice` : ""}
          </p>
          <button className="btn-filled btn-lg mt-6 w-full sm:w-auto" onClick={() => navigate("/preflop?mode=today")}>
            {sessionsToday ? "Train again" : "Start session"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="card">
          <ListRow
            icon={CalendarDays}
            tone="#38bdf8"
            title="Daily Challenge"
            subtitle={daily ? `Today: ${daily.score}/${daily.total} ${daily.marks}` : "Same 10 hands for everyone today"}
            trailing={
              daily ? (
                <span className="t-label text-emerald-300">Done</span>
              ) : (
                <button className="btn-tonal" onClick={() => navigate("/daily")}>
                  Play
                </button>
              )
            }
          />
        </div>
        <div className="card">
          <ListRow
            icon={RotateCcw}
            tone="#f87171"
            title="Fix your mistakes"
            subtitle={dueCount ? `${dueCount} ready to review` : "You're all caught up"}
            trailing={
              <button className="btn-tonal" disabled={!due.some((c) => c.mode === "pre")} onClick={() => navigate("/review")}>
                Review
              </button>
            }
          />
        </div>
      </div>

      <section>
        <SectionHeader title="Practice" />
        <div className="card !py-2">
          <ListRow icon={Spade} title="Preflop" subtitle="Open, defend and 3-bet from every seat" onClick={() => navigate("/preflop")} />
          <ListRow icon={Swords} tone="#a78bfa" title="Postflop" subtitle="Play hands from flop to river" onClick={() => navigate("/postflop")} />
          <ListRow icon={Calculator} tone="#22c55e" title="Math" subtitle="Pot odds, outs and combos against the clock" onClick={() => navigate("/math")} />
        </div>
      </section>

      <section>
        <SectionHeader title="Keep learning" />
        <div className="card !py-2">
          <ListRow icon={BookOpen} tone="#f2c14e" title={`Day ${nextDay.day}: ${nextDay.title}`} subtitle={`${Object.keys(s.lessons).length} of 40 days done`} onClick={() => navigate(`/learn?day=${nextDay.day}`)} />
        </div>
      </section>
    </div>
  );
}
