import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, Lock, Play, Sparkles, Trophy } from "lucide-react";
import { DAY_BY_NUM, DAYS, GLOSSARY, PHASES, type Day } from "../data/curriculum";
import { navigate, useRoute } from "../lib/router";
import { useStore } from "../store/store";
import { announce, useUi } from "../store/ui";
import { BELTS } from "../lib/progression";
import { BeltBadge, ProgressBar, SectionTitle, Segmented } from "../components/ui";
import { LegendLens } from "../components/coach";
import { play } from "../lib/sound";
import { pct } from "../lib/format";

const DEEPER_COLOR: Record<string, string> = {
  Example: "#38bdf8",
  "The math": "#f2c14e",
  "Common mistake": "#fb7185",
  "Live exploit": "#fb923c",
  "Pro tip": "#34d399",
};

function drillStatus(day: Day, drills: Record<string, { n: number; correct: number }>) {
  if (!day.drill) return { done: true, n: 0, acc: 0 };
  const d = drills[`day-${day.day}`] ?? { n: 0, correct: 0 };
  const acc = d.n ? d.correct / d.n : 0;
  return { done: d.n >= day.drill.target && acc >= day.drill.acc, n: d.n, acc };
}

function Lesson({ day }: { day: Day }) {
  const lessons = useStore((s) => s.lessons);
  const drills = useStore((s) => s.drills);
  const [opened, setOpened] = useState<string[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>(day.quiz.map(() => null));
  const [revealed, setRevealed] = useState(1);
  const done = !!lessons[day.day];
  const phase = PHASES.find((p) => p.id === day.phase)!;
  const ds = drillStatus(day, drills);
  const score = answers.filter((a, i) => a === day.quiz[i].answer).length;
  const quizDone = answers.every((a) => a !== null);
  const quizPass = quizDone && score >= 2;

  const complete = () => {
    const r = useStore.getState().completeLesson(day.day, score);
    announce(r);
    play("level");
    const boss = day.boss ? BELTS.find((b) => b.id === phase.belt) : null;
    if (boss) useUi.getState().celebrate({ kind: "belt", title: `${boss.name} Belt earned!`, body: `You passed the Day ${day.day} exam. ${phase.name} complete.`, icon: "🥋", belt: boss });
    else useUi.getState().burst();
  };

  return (
    <div className="space-y-4">
      <button className="inline-flex items-center gap-1 text-sm text-ink-300 hover:text-white" onClick={() => navigate("/learn")}>
        <ArrowLeft size={16} /> All days
      </button>
      <div className="panel overflow-hidden">
        <div className="bg-gradient-to-r from-felt-700/60 to-transparent p-5">
          <div className="label">
            Day {day.day} of 40 · {phase.name}
            {day.boss && <span className="ml-2 rounded bg-gold-400/20 px-1.5 py-0.5 text-gold-200">Belt exam</span>}
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">{day.title}</h1>
          <p className="mt-1 text-ink-200">{day.goal}</p>
          {done && (
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">
              <Check size={14} /> Completed
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          {day.sections.slice(0, revealed).map((s, i) => (
            <div key={s.title} className="panel animate-fadeUp p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold-400 text-xs font-black text-ink-950">{i + 1}</span>
                <h2 className="font-display text-lg font-bold text-white">{s.title}</h2>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink-100">{s.body}</p>
              {s.deeper && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {s.deeper.map((d) => {
                    const key = `${s.title}-${d.label}`;
                    const on = opened.includes(key);
                    return (
                      <button
                        key={key}
                        onClick={() => setOpened((o) => (on ? o.filter((x) => x !== key) : [...o, key]))}
                        className="chip"
                        style={on ? { borderColor: `${DEEPER_COLOR[d.label]}88`, color: DEEPER_COLOR[d.label] } : undefined}
                      >
                        <ChevronDown size={12} className={on ? "rotate-180" : ""} /> {d.label}
                      </button>
                    );
                  })}
                </div>
              )}
              {s.deeper
                ?.filter((d) => opened.includes(`${s.title}-${d.label}`))
                .map((d) => (
                  <div key={d.label} className="mt-2 animate-fadeUp rounded-lg border-l-2 bg-black/20 p-3 text-sm text-ink-200" style={{ borderColor: DEEPER_COLOR[d.label] }}>
                    <div className="mb-0.5 text-xs font-bold" style={{ color: DEEPER_COLOR[d.label] }}>
                      {d.label}
                    </div>
                    {d.body}
                  </div>
                ))}
            </div>
          ))}
          {revealed < day.sections.length ? (
            <button className="btn-ghost w-full" onClick={() => setRevealed((r) => r + 1)}>
              Next idea ({revealed}/{day.sections.length}) <ArrowRight size={16} />
            </button>
          ) : (
            <div className="panel p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-white">Check yourself</h2>
                {quizDone && (
                  <span className={`text-sm font-bold ${quizPass ? "text-emerald-300" : "text-rose-300"}`}>
                    {score}/{day.quiz.length}
                  </span>
                )}
              </div>
              <div className="mt-3 space-y-4">
                {day.quiz.map((q, qi) => {
                  const a = answers[qi];
                  return (
                    <div key={q.q}>
                      <div className="text-sm font-semibold text-white">
                        {qi + 1}. {q.q}
                      </div>
                      <div className="mt-2 grid gap-2 sm:grid-cols-3">
                        {q.options.map((o, oi) => {
                          const picked = a === oi;
                          const right = oi === q.answer;
                          return (
                            <button
                              key={o}
                              disabled={a !== null}
                              onClick={() => {
                                setAnswers((prev) => prev.map((x, i) => (i === qi ? oi : x)));
                                play(right ? "good" : "bad");
                              }}
                              className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                                a === null
                                  ? "border-white/10 bg-white/[0.03] text-ink-100 hover:bg-white/[0.07]"
                                  : right
                                    ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-100"
                                    : picked
                                      ? "border-rose-400/60 bg-rose-500/10 text-rose-100"
                                      : "border-white/10 text-ink-400"
                              }`}
                            >
                              {o}
                            </button>
                          );
                        })}
                      </div>
                      {a !== null && <p className="mt-1.5 text-xs text-ink-300">{q.explain}</p>}
                    </div>
                  );
                })}
              </div>
              {quizDone && !quizPass && (
                <button className="btn-ghost mt-3" onClick={() => setAnswers(day.quiz.map(() => null))}>
                  Retry quiz
                </button>
              )}
            </div>
          )}
        </div>

        <div className="space-y-3">
          {day.drill && (
            <div className="panel p-4">
              <div className="label mb-1">Today's drill</div>
              <div className="font-semibold text-white">{day.drill.label}</div>
              <div className="mt-1 text-xs text-ink-400">
                Target: {day.drill.target} at {pct(day.drill.acc)}+ accuracy
              </div>
              <div className="mt-3">
                <ProgressBar value={Math.min(1, ds.n / day.drill.target)} color={ds.done ? "#22c55e" : "#f2c14e"} />
                <div className="num mt-1 text-xs text-ink-300">
                  {Math.min(ds.n, day.drill.target)}/{day.drill.target} · {ds.n ? pct(ds.acc) : "—"} {ds.done && "· done ✓"}
                </div>
              </div>
              <button
                className="btn-primary mt-3 w-full"
                onClick={() => {
                  useStore.getState().resetDrill(`day-${day.day}`);
                  navigate(day.drill!.url);
                }}
              >
                <Play size={16} /> {ds.n ? "Restart drill" : "Start drill"}
              </button>
            </div>
          )}
          <div className="panel p-4">
            <div className="label mb-2">Finish the day</div>
            <ul className="space-y-1.5 text-sm">
              <li className={`flex items-center gap-2 ${revealed >= day.sections.length ? "text-emerald-300" : "text-ink-300"}`}>
                <Check size={14} /> Read all {day.sections.length} ideas
              </li>
              <li className={`flex items-center gap-2 ${quizPass ? "text-emerald-300" : "text-ink-300"}`}>
                <Check size={14} /> Pass the quiz (2/3)
              </li>
              {day.drill && (
                <li className={`flex items-center gap-2 ${ds.done ? "text-emerald-300" : "text-ink-300"}`}>
                  <Check size={14} /> Complete the drill
                </li>
              )}
            </ul>
            <button className="btn-primary mt-3 w-full" disabled={!(quizPass && ds.done) && !done} onClick={complete}>
              <Trophy size={16} /> {done ? "Completed — claim again" : day.boss ? "Claim your belt" : "Complete day"}
            </button>
          </div>
          {day.legend && <LegendLens id={day.legend} line={day.goal} />}
          <div className="flex justify-between">
            {DAY_BY_NUM[day.day - 1] ? (
              <button className="btn-ghost" onClick={() => navigate(`/learn?day=${day.day - 1}`)}>
                <ArrowLeft size={16} /> Day {day.day - 1}
              </button>
            ) : (
              <span />
            )}
            {DAY_BY_NUM[day.day + 1] && (
              <button className="btn-ghost" onClick={() => navigate(`/learn?day=${day.day + 1}`)}>
                Day {day.day + 1} <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LearnPage() {
  const { params } = useRoute();
  const lessons = useStore((s) => s.lessons);
  const [tab, setTab] = useState<"path" | "glossary">("path");
  const dayNum = Number(params.get("day"));
  const day = DAY_BY_NUM[dayNum];
  const next = useMemo(() => DAYS.find((d) => !lessons[d.day]) ?? DAYS[DAYS.length - 1], [lessons]);
  const doneCount = Object.keys(lessons).length;

  if (day) return <Lesson key={day.day} day={day} />;

  return (
    <div>
      <SectionTitle
        eyebrow="The Pro Path"
        title="40 days to a black belt"
        desc="One focused lesson a day, a quiz to lock it in, and a drill graded against the baseline. Every sixth or seventh day is a belt exam."
        right={
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: "path", label: "Path" },
              { value: "glossary", label: "Glossary" },
            ]}
          />
        }
      />

      {tab === "glossary" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {GLOSSARY.map((g) => (
            <div key={g.term} className="panel p-4">
              <div className="font-semibold text-white">{g.term}</div>
              <p className="mt-1 text-sm text-ink-300">{g.def}</p>
              {g.formula && <div className="mt-2 inline-block rounded bg-gold-400/10 px-2 py-0.5 font-mono text-xs text-gold-200">{g.formula}</div>}
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="panel mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <div className="label">Up next</div>
              <div className="font-display text-xl font-bold text-white">
                Day {next.day}: {next.title}
              </div>
              <div className="text-sm text-ink-300">{next.goal}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="num text-lg font-bold text-white">{doneCount}/40</div>
                <div className="text-[11px] text-ink-400">days complete</div>
              </div>
              <button className="btn-primary" onClick={() => navigate(`/learn?day=${next.day}`)}>
                <BookOpen size={16} /> Start Day {next.day}
              </button>
            </div>
          </div>

          <div className="space-y-5">
            {PHASES.map((ph) => {
              const days = DAYS.filter((d) => d.phase === ph.id);
              const phDone = days.filter((d) => lessons[d.day]).length;
              const belt = BELTS.find((b) => b.id === ph.belt)!;
              return (
                <div key={ph.id}>
                  <div className="mb-2 flex flex-wrap items-center gap-3">
                    <BeltBadge belt={belt} size="sm" />
                    <h2 className="font-display text-lg font-bold text-white">
                      Phase {ph.id}: {ph.name}
                    </h2>
                    <span className="text-xs text-ink-400">
                      {phDone}/{days.length} · {ph.blurb}
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {days.map((d) => {
                      const isDone = !!lessons[d.day];
                      const isNext = d.day === next.day;
                      return (
                        <button
                          key={d.day}
                          onClick={() => navigate(`/learn?day=${d.day}`)}
                          className={`panel-tight group flex items-start gap-3 p-3 text-left transition hover:border-white/20 ${isNext ? "ring-1 ring-gold-400/60" : ""}`}
                        >
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-display text-sm font-bold ${
                              isDone ? "bg-emerald-500/20 text-emerald-300" : d.boss ? "bg-gold-400/20 text-gold-300" : "bg-white/5 text-ink-200"
                            }`}
                          >
                            {isDone ? <Check size={16} /> : d.boss ? "🥋" : d.day}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                              Day {d.day} {isNext && <span className="text-gold-300">· next</span>}
                            </span>
                            <span className="block text-sm font-semibold text-white">{d.title}</span>
                            <span className="line-clamp-2 block text-xs text-ink-400">{d.goal}</span>
                          </span>
                          {!isDone && d.day > next.day + 3 && <Lock size={12} className="ml-auto shrink-0 text-ink-500" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-6 flex items-center gap-2 text-xs text-ink-400">
            <Sparkles size={14} className="text-gold-400" /> All days are open — skip ahead if you already know the basics. The lock just marks days you haven't reached yet.
          </p>
        </>
      )}
    </div>
  );
}
