import { Lock } from "lucide-react";
import { LEGENDS, type Legend } from "../data/legends";
import { useStore } from "../store/store";
import { levelInfo } from "../lib/progression";
import { SectionTitle } from "../components/ui";

export function isLegendUnlocked(l: Legend, lessonsDone: number, level: number): boolean {
  return lessonsDone >= l.unlockDay - 1 || level >= l.unlockDay;
}

export function LegendsPage() {
  const lessons = useStore((s) => s.lessons);
  const xp = useStore((s) => s.xp);
  const done = Object.keys(lessons).length;
  const level = levelInfo(xp).level;
  const unlocked = LEGENDS.filter((l) => isLegendUnlocked(l, done, level)).length;

  return (
    <div>
      <SectionTitle
        eyebrow="Legends"
        title="Lessons from the greats"
        desc={`Ideas and a few famous lines from the players and authors who shaped modern poker. Unlock cards by completing Pro Path days or leveling up. ${unlocked}/${LEGENDS.length} unlocked.`}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {LEGENDS.map((l) => {
          const open = isLegendUnlocked(l, done, level);
          return (
            <div key={l.id} className={`panel relative overflow-hidden p-4 ${open ? "" : "opacity-70"}`}>
              <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-emerald-400/10 blur-2xl" />
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-display text-lg font-bold text-white">{l.name}</div>
                  <div className="text-xs text-ink-400">{l.knownFor}</div>
                </div>
                {!open && <Lock size={16} className="shrink-0 text-ink-400" />}
              </div>
              {open ? (
                <>
                  {l.quote && <blockquote className="mt-3 border-l-2 border-emerald-400/50 pl-3 text-sm italic text-ink-100">“{l.quote}”</blockquote>}
                  <p className="mt-3 text-sm text-ink-200">{l.idea}</p>
                  <p className="mt-2 rounded-lg bg-emerald-500/[0.07] p-2 text-xs text-emerald-100">
                    <span className="font-semibold">Apply it: </span>
                    {l.apply}
                  </p>
                  <p className="mt-2 text-[10px] text-ink-500">{l.source}</p>
                </>
              ) : (
                <p className="mt-3 text-sm text-ink-400">Unlocks at Pro Path Day {l.unlockDay} (or level {l.unlockDay}).</p>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-6 text-xs text-ink-500">Quotes are limited to widely documented lines; book ideas are paraphrased in our own words with their sources.</p>
    </div>
  );
}
