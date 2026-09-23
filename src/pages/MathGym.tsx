import { useEffect, useMemo, useState } from "react";
import { Calculator, Crosshair, Dices, Gauge, Layers, Percent, Sigma, Timer, X } from "lucide-react";
import { navigate, useRoute } from "../lib/router";
import { useStore } from "../store/store";
import { announce } from "../store/ui";
import { play } from "../lib/sound";
import { GEN, type DrillId } from "../lib/mathDrills";
import { mulberry32 } from "../lib/rng";
import { PlayingCard } from "../components/PlayingCard";
import { EquityCalc, OutsCalc, PotCalc } from "../components/Calculators";
import { SessionBar, SessionSummary, type SessionResult } from "../components/Session";
import { ListRow, SectionHeader, Sheet } from "../components/ui";

const DRILLS: { id: DrillId; name: string; desc: string; icon: typeof Percent; tone: string }[] = [
  { id: "potodds", name: "Pot odds", desc: "What equity does this call need?", icon: Percent, tone: "#f2c14e" },
  { id: "outs", name: "Count the outs", desc: "Read a draw in seconds", icon: Crosshair, tone: "#38bdf8" },
  { id: "combos", name: "Combos", desc: "Count hands and blockers", icon: Layers, tone: "#a78bfa" },
  { id: "equity", name: "Who's ahead", desc: "Guess who's ahead preflop, and by how much", icon: Dices, tone: "#22c55e" },
  { id: "mdf", name: "Defense and bluffs", desc: "How often to defend or bluff", icon: Gauge, tone: "#fb923c" },
  { id: "ev", name: "Bluff EV", desc: "Does this bluff make money?", icon: Sigma, tone: "#f87171" },
];

const CALCS = [
  { id: "pot", name: "Pot odds calculator", render: () => <PotCalc /> },
  { id: "eq", name: "Equity calculator", render: () => <EquityCalc /> },
  { id: "outs", name: "Outs calculator", render: () => <OutsCalc /> },
];

const QUESTIONS = 10;
const SECONDS = 15;

function MathSession({ id, day, onExit }: { id: DrillId; day: number | null; onExit: () => void }) {
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const questions = useMemo(() => {
    const rnd = mulberry32(seed);
    return Array.from({ length: QUESTIONS }, () => GEN[id](rnd));
  }, [id, seed]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [results, setResults] = useState<SessionResult[]>([]);
  const [timeLeft, setTimeLeft] = useState(SECONDS);
  const [finished, setFinished] = useState<{ xp: number } | null>(null);
  const q = questions[i];
  const meta = DRILLS.find((d) => d.id === id)!;

  const record = (k: number) => {
    const ok = k === q.answer;
    play(ok ? "perfect" : "bad");
    if (day) useStore.getState().recordDrill(`day-${day}`, ok);
    setPicked(k);
    setResults((r) => [...r, { ok, title: q.prompt, detail: q.explain }]);
  };

  useEffect(() => {
    if (picked !== null || finished) return;
    if (timeLeft <= 0) {
      record(-1);
      return;
    }
    const t = setTimeout(() => setTimeLeft((x) => x - 1), 1000);
    return () => clearTimeout(t);
  });

  const next = () => {
    if (i + 1 >= questions.length) {
      const score = results.filter((r) => r.ok).length;
      const st = useStore.getState();
      const r1 = st.recordMath(id, score, questions.length);
      const r2 = st.recordSession("math", score, questions.length, results.map((r) => (r.ok ? "🟩" : "🟥")).join(""));
      announce(r1);
      announce(r2);
      setFinished({ xp: r1.xp + r2.xp });
      return;
    }
    setI(i + 1);
    setPicked(null);
    setTimeLeft(SECONDS);
  };

  if (finished)
    return (
      <SessionSummary
        results={results}
        xp={finished.xp}
        onDone={() => (day ? navigate(`/lesson?day=${day}`) : onExit())}
        doneLabel={day ? "Back to lesson" : "Done"}
        onAgain={() => {
          setSeed((s) => s + 1);
          setI(0);
          setPicked(null);
          setResults([]);
          setTimeLeft(SECONDS);
          setFinished(null);
        }}
      />
    );

  return (
    <div className="mx-auto max-w-xl">
      <SessionBar done={i + (picked !== null ? 1 : 0)} total={questions.length} onClose={onExit} label={meta.name} />
      <div key={i} className="animate-fadeUp space-y-6 pt-6">
        <div className="flex items-center justify-between">
          <span className="t-label">
            Question {i + 1} of {questions.length}
          </span>
          {picked === null && (
            <span className={`num t-label flex items-center gap-1 ${timeLeft <= 5 ? "text-rose-300" : ""}`}>
              <Timer size={16} /> {timeLeft}s
            </span>
          )}
        </div>
        <h1 className="t-title-lg">{q.prompt}</h1>
        {q.cards && (
          <div className="card-flat flex flex-wrap items-center justify-center gap-4">
            <div className="flex gap-1">
              {q.cards.hero.map((c) => (
                <PlayingCard key={c} card={c} size="md" />
              ))}
            </div>
            {q.cards.board && (
              <div className="flex gap-1">
                {q.cards.board.map((c) => (
                  <PlayingCard key={c} card={c} size="md" />
                ))}
              </div>
            )}
            {q.cards.villain && (
              <>
                <span className="t-label">vs</span>
                <div className="flex gap-1">
                  {q.cards.villain.map((c) => (
                    <PlayingCard key={c} card={c} size="md" />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {q.options.map((o, k) => {
            const right = k === q.answer;
            const cls =
              picked === null ? "border-white/10 hover:bg-white/[0.05]" : right ? "border-emerald-400 bg-emerald-500/15" : picked === k ? "border-rose-400 bg-rose-500/10" : "border-white/10 opacity-50";
            return (
              <button key={o + k} disabled={picked !== null} onClick={() => record(k)} className={`num min-h-14 rounded-2xl border px-4 text-left text-base font-semibold text-ink-100 transition ${cls}`}>
                {o}
              </button>
            );
          })}
        </div>
        {picked !== null && (
          <div className="animate-fadeUp space-y-6">
            <p className={`t-body ${picked === q.answer ? "text-emerald-300" : "text-rose-300"}`}>
              {picked === q.answer ? "Correct. " : picked === -1 ? "Time's up. " : "Not quite. "}
              <span className="text-ink-200">{q.explain}</span>
            </p>
            <button className="btn-filled btn-lg w-full" onClick={next}>
              {i + 1 >= questions.length ? "See results" : "Next"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function MathGym() {
  const { params } = useRoute();
  const initial = params.get("drill") as DrillId | null;
  const day = Number(params.get("day")) || null;
  const [active, setActive] = useState<DrillId | null>(initial && GEN[initial] ? initial : null);
  const [calc, setCalc] = useState<string | null>(null);
  const best = useStore((s) => s.mathBest);

  if (active) return <MathSession key={active} id={active} day={day} onExit={() => (day ? navigate(`/lesson?day=${day}`) : setActive(null))} />;

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex h-14 items-center gap-4">
        <button className="icon-btn -ml-2" onClick={() => navigate("/")} aria-label="Close">
          <X size={24} />
        </button>
        <span className="t-title">Math</span>
      </div>
      <div className="space-y-8 pt-6">
        <div>
          <h1 className="t-headline">Get fast at poker math</h1>
          <p className="t-body mt-1 text-ink-300">10 questions, 15 seconds each.</p>
        </div>
        <section className="card !py-2">
          {DRILLS.map((d) => (
            <ListRow key={d.id} icon={d.icon} tone={d.tone} title={d.name} subtitle={`${d.desc}${best[d.id] ? ` · best ${best[d.id]}/10` : ""}`} onClick={() => setActive(d.id)} />
          ))}
        </section>
        <section>
          <SectionHeader title="Calculators" />
          <div className="card !py-2">
            {CALCS.map((c) => (
              <ListRow key={c.id} icon={Calculator} tone="#94a3b8" title={c.name} onClick={() => setCalc(c.id)} />
            ))}
          </div>
        </section>
      </div>
      {CALCS.map((c) => (
        <Sheet key={c.id} open={calc === c.id} onClose={() => setCalc(null)} title={c.name}>
          {c.render()}
        </Sheet>
      ))}
    </div>
  );
}
