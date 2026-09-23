import { useMemo, useState } from "react";
import { BookOpen, Check, ChevronDown, Play, X } from "lucide-react";
import { DAY_BY_NUM, DAYS, GLOSSARY, PHASES, type Day } from "../data/curriculum";
import { LEGEND_BY_ID } from "../data/legends";
import { navigate, useRoute } from "../lib/router";
import { useStore } from "../store/store";
import { announce, useUi } from "../store/ui";
import { BELTS, dojoBelt } from "../lib/progression";
import { BeltBadge, ListRow, PageHeader, ProgressBar, Sheet } from "../components/ui";
import { LessonVisual } from "../components/visuals";
import { play } from "../lib/sound";

function drillStatus(day: Day, drills: Record<string, { n: number; correct: number }>) {
  if (!day.drill) return { done: true, n: 0, acc: 0 };
  const d = drills[`day-${day.day}`] ?? { n: 0, correct: 0 };
  const acc = d.n ? d.correct / d.n : 0;
  return { done: d.n >= day.drill.target && acc >= day.drill.acc, n: d.n, acc };
}

type Step = { type: "idea"; idx: number } | { type: "quiz"; idx: number } | { type: "finish" };

export function LessonView() {
  const { params } = useRoute();
  const day = DAY_BY_NUM[Number(params.get("day"))] ?? DAYS[0];
  return <Lesson key={day.day} day={day} />;
}

function Lesson({ day }: { day: Day }) {
  const lessons = useStore((s) => s.lessons);
  const drills = useStore((s) => s.drills);
  const quizBest = useStore((s) => s.quizBest);
  const steps: Step[] = useMemo(
    () => [...day.sections.map((_, idx) => ({ type: "idea" as const, idx })), ...day.quiz.map((_, idx) => ({ type: "quiz" as const, idx })), { type: "finish" as const }],
    [day],
  );
  const alreadyPassed = (quizBest[day.day] ?? 0) >= 2;
  const [i, setI] = useState(alreadyPassed ? steps.length - 1 : 0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [more, setMore] = useState(false);
  const step = steps[i];
  const done = !!lessons[day.day];
  const ds = drillStatus(day, drills);
  const passed = alreadyPassed || score >= 2;
  const phase = PHASES.find((p) => p.id === day.phase)!;

  const advance = () => {
    if (step.type === "quiz" && step.idx === day.quiz.length - 1) useStore.getState().recordQuiz(day.day, score);
    setPicked(null);
    setMore(false);
    setI((x) => Math.min(steps.length - 1, x + 1));
  };

  const finish = () => {
    const r = useStore.getState().completeLesson(day.day, Math.max(score, quizBest[day.day] ?? 0));
    announce(r);
    const belt = day.boss ? BELTS.find((b) => b.id === phase.belt) : null;
    if (belt && !done) useUi.getState().celebrate({ kind: "belt", title: `You earned your ${belt.name.toLowerCase()} belt`, body: phase.id === PHASES.length ? "You finished the whole path." : "Great work. On to the next phase.", icon: "🥋", belt });
    else useUi.getState().burst();
    play("level");
    navigate("/learn");
  };

  const legend = day.legend ? LEGEND_BY_ID[day.legend] : undefined;

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex h-14 items-center gap-4">
        <button className="icon-btn -ml-2" onClick={() => navigate("/learn")} aria-label="Close lesson">
          <X size={24} />
        </button>
        <ProgressBar value={i / (steps.length - 1)} className="flex-1" />
      </div>

      <div key={i} className="animate-fadeUp pt-6">
        {step.type === "idea" && (
          <div className="space-y-6">
            <div>
              <div className="t-label">
                Day {day.day} · Idea {step.idx + 1} of {day.sections.length}
              </div>
              <h1 className="t-headline mt-2">{day.sections[step.idx].title}</h1>
            </div>
            {day.sections[step.idx].visual && (
              <div className="card-flat flex justify-center">
                <LessonVisual v={day.sections[step.idx].visual!} />
              </div>
            )}
            <p className="text-base text-ink-100">{day.sections[step.idx].body}</p>
            {day.sections[step.idx].more && (
              <div>
                {more ? (
                  <p className="t-body animate-fadeUp rounded-xl bg-white/[0.04] p-4">{day.sections[step.idx].more}</p>
                ) : (
                  <button className="btn-text -ml-4" onClick={() => setMore(true)}>
                    Tell me more
                  </button>
                )}
              </div>
            )}
            <button className="btn-filled btn-lg w-full" onClick={advance}>
              Continue
            </button>
          </div>
        )}

        {step.type === "quiz" && (
          <div className="space-y-6">
            <div>
              <div className="t-label">
                Quick check {step.idx + 1} of {day.quiz.length}
              </div>
              <h1 className="t-title-lg mt-2">{day.quiz[step.idx].q}</h1>
            </div>
            <div className="space-y-2">
              {day.quiz[step.idx].options.map((o, k) => {
                const q = day.quiz[step.idx];
                const right = k === q.answer;
                const isPicked = picked === k;
                const cls =
                  picked === null
                    ? "border-white/10 hover:bg-white/[0.05]"
                    : right
                      ? "border-emerald-400 bg-emerald-500/15"
                      : isPicked
                        ? "border-rose-400 bg-rose-500/10"
                        : "border-white/10 opacity-50";
                return (
                  <button
                    key={o}
                    disabled={picked !== null}
                    onClick={() => {
                      setPicked(k);
                      if (right) {
                        setScore((s) => s + 1);
                        announce(useStore.getState().bump("reasonRight"));
                      }
                      play(right ? "perfect" : "bad");
                    }}
                    className={`flex min-h-14 w-full items-center justify-between gap-4 rounded-2xl border px-4 text-left text-base font-medium text-ink-100 transition ${cls}`}
                  >
                    {o}
                    {picked !== null && right && <Check size={20} className="shrink-0 text-emerald-400" />}
                  </button>
                );
              })}
            </div>
            {picked !== null && (
              <div className="animate-fadeUp space-y-6">
                <p className={`t-body font-medium ${picked === day.quiz[step.idx].answer ? "text-emerald-300" : "text-rose-300"}`}>
                  {picked === day.quiz[step.idx].answer ? "Correct. " : "Not quite. "}
                  <span className="text-ink-200">{day.quiz[step.idx].explain}</span>
                </p>
                <button className="btn-filled btn-lg w-full" onClick={advance}>
                  Continue
                </button>
              </div>
            )}
          </div>
        )}

        {step.type === "finish" && (
          <div className="space-y-6">
            {!passed ? (
              <>
                <h1 className="t-headline">Almost there</h1>
                <p className="t-body">You got {score} of {day.quiz.length} right. Go through the ideas again and give it another try.</p>
                <button
                  className="btn-filled btn-lg w-full"
                  onClick={() => {
                    setScore(0);
                    setI(0);
                  }}
                >
                  Review the lesson
                </button>
              </>
            ) : (
              <>
                <div>
                  <div className="t-label">Day {day.day}</div>
                  <h1 className="t-headline mt-2">{done ? "Day complete" : day.drill ? "Now try it at the table" : "Nice, lesson done"}</h1>
                </div>
                <div className="card !p-4">
                  <ListRow icon={Check} tone="#22c55e" title="Learn" subtitle={`${day.sections.length} ideas · quiz passed`} trailing={<Check size={20} className="text-emerald-400" />} />
                  {day.drill && (
                    <ListRow
                      icon={Play}
                      tone={ds.done ? "#22c55e" : "#f2c14e"}
                      title={day.drill.label}
                      subtitle={ds.done ? "Passed" : `${day.drill.target} ${day.drill.url.startsWith("/math") ? "questions" : "decisions"}, ${Math.round(day.drill.acc * 100)}% to pass${ds.n ? ` · last try ${Math.round(ds.acc * 100)}%` : ""}`}
                      trailing={ds.done ? <Check size={20} className="text-emerald-400" /> : undefined}
                    />
                  )}
                </div>
                {day.drill && !ds.done ? (
                  <button
                    className="btn-filled btn-lg w-full"
                    onClick={() => {
                      useStore.getState().resetDrill(`day-${day.day}`);
                      navigate(day.drill!.url);
                    }}
                  >
                    Start practice
                  </button>
                ) : (
                  <button className="btn-filled btn-lg w-full" onClick={finish}>
                    {done ? "Back to lessons" : day.boss ? "Claim your belt" : "Finish the day"}
                  </button>
                )}
                <button className="btn-text w-full" onClick={() => setI(0)}>
                  Review the lesson
                </button>
                {legend?.quote && (
                  <div className="border-l-2 border-emerald-400/50 pl-4">
                    <p className="t-body italic text-ink-100">“{legend.quote}”</p>
                    <p className="t-label mt-1">{legend.name}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function LearnPage() {
  const lessons = useStore((s) => s.lessons);
  const next = useMemo(() => DAYS.find((d) => !lessons[d.day]) ?? DAYS[DAYS.length - 1], [lessons]);
  const doneCount = Object.keys(lessons).length;
  const belt = dojoBelt(lessons);
  const [openPhase, setOpenPhase] = useState<number>(next.phase);
  const [glossary, setGlossary] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader title="Learn" subtitle="40 short lessons, one idea at a time." />

      <div className="card">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="t-label">Up next</div>
            <div className="t-title-lg mt-1">
              Day {next.day}: {next.title}
            </div>
            <div className="t-body mt-1 text-ink-300">{next.goal}</div>
          </div>
          <BeltBadge belt={belt} size="lg" />
        </div>
        <ProgressBar value={doneCount / 40} className="mt-6" />
        <div className="t-label mt-2">
          {doneCount} of 40 days · {belt.name} belt
        </div>
        <button className="btn-filled btn-lg mt-6 w-full sm:w-auto" onClick={() => navigate(`/lesson?day=${next.day}`)}>
          {doneCount ? "Continue" : "Start Day 1"}
        </button>
      </div>

      <div className="space-y-2">
        {PHASES.map((ph) => {
          const days = DAYS.filter((d) => d.phase === ph.id);
          const phDone = days.filter((d) => lessons[d.day]).length;
          const phaseBelt = BELTS.find((b) => b.id === ph.belt)!;
          const isOpen = openPhase === ph.id;
          return (
            <div key={ph.id} className="card !p-0">
              <button className="flex min-h-16 w-full items-center gap-4 px-4 text-left sm:px-6" onClick={() => setOpenPhase(isOpen ? 0 : ph.id)}>
                <BeltBadge belt={phaseBelt} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="t-title block truncate">{ph.name}</span>
                  <span className="t-label">
                    Days {days[0].day} to {days[days.length - 1].day} · {phDone} of {days.length} done
                  </span>
                </span>
                <ChevronDown size={20} className={`shrink-0 text-ink-400 transition ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <div className="border-t border-white/[0.06] px-4 pb-2 sm:px-6">
                  {days.map((d) => {
                    const isDone = !!lessons[d.day];
                    const isNext = d.day === next.day;
                    return (
                      <button key={d.day} onClick={() => navigate(`/lesson?day=${d.day}`)} className="flex min-h-14 w-full items-center gap-4 border-b border-white/[0.04] py-2 text-left last:border-0">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            isDone ? "bg-emerald-500 text-ink-950" : isNext ? "bg-gold-400 text-ink-950" : "bg-white/[0.06] text-ink-300"
                          }`}
                        >
                          {isDone ? <Check size={16} strokeWidth={3} /> : d.day}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="t-body block truncate font-medium text-ink-100">{d.title}</span>
                          <span className="t-label block truncate">{d.boss ? "Belt exam" : d.goal}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="card !py-2">
        <ListRow icon={BookOpen} title="Glossary" subtitle="Key terms and formulas" onClick={() => setGlossary(true)} />
      </div>

      <Sheet open={glossary} onClose={() => setGlossary(false)} title="Glossary">
        <div className="divide-y divide-white/[0.06]">
          {GLOSSARY.map((g) => (
            <div key={g.term} className="py-4">
              <div className="t-title">{g.term}</div>
              <p className="t-body mt-1">{g.def}</p>
              {g.formula && <div className="num mt-2 inline-block rounded-lg bg-gold-400/10 px-2 py-1 text-xs font-semibold text-gold-200">{g.formula}</div>}
            </div>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
