import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Brain, Calculator, LayoutGrid, Quote, SlidersHorizontal, Target, Zap } from "lucide-react";
import { useRoute, navigate } from "../lib/router";
import { applyUrlSettings, dueCards, missionFrom, useStore, type Confidence } from "../store/store";
import { announce } from "../store/ui";
import { STAKES } from "../data/stakes";
import { getArchetype, ARCHETYPE_IDS, type ArchetypeId } from "../data/archetypes";
import { POS_INFO, posLabel, positionsFor, type PosId } from "../data/positions";
import { ACTION_COLORS } from "../data/charts";
import { generateSpot, gradePreflop, parseSpotKey, preflopExploit, SPOT_KINDS, type ExploitVerdict, type PreflopResult, type PreflopSpot, type SpotKind } from "../lib/preflop";
import { explainPreflop, preflopMath } from "../lib/explainPreflop";
import { gradeFreq, GRADES, type Grade } from "../lib/grading";
import { mulberry32, randomSeed } from "../lib/rng";
import { fmtMoney, pct } from "../lib/format";
import { actionPercents, type PfAction } from "../lib/chart";
import { combosFromWeights, equityVsRange } from "../lib/equity";
import { handName } from "../lib/cards";
import { play } from "../lib/sound";
import { revealOnMobile, toTopOnMobile } from "../lib/scroll";
import type { ReasonId } from "../data/reasons";
import { PokerTable, type TableSeat } from "../components/PokerTable";
import { ActionLegend, RangeGrid, type GridMode } from "../components/RangeGrid";
import { Ladder, type LadderStep } from "../components/Ladder";
import { ArchetypeCard, ConfidencePicker, LegendLens, MathTable, ProsCons, ReasonQuiz, VerdictCard } from "../components/coach";
import { Modal, Segmented, Stat } from "../components/ui";

const KEY_FOR: Record<PfAction, string> = { fold: "F", call: "C", check: "C", raise: "R", allin: "A" };

const ACTION_BTN: Record<PfAction, string> = {
  fold: "bg-slate-700/80 hover:bg-slate-600 text-white",
  call: "bg-emerald-600 hover:bg-emerald-500 text-white",
  check: "bg-teal-600 hover:bg-teal-500 text-white",
  raise: "bg-rose-600 hover:bg-rose-500 text-white",
  allin: "bg-purple-600 hover:bg-purple-500 text-white",
};

interface Outcome {
  res: PreflopResult;
  exploit: ExploitVerdict;
  exploitGrade: Grade;
  xp: number;
  conf: Confidence;
  fromSrs: boolean;
}

function parseList<T extends string>(v: string | null, allowed: readonly T[]): T[] {
  if (!v) return [];
  return v.split(",").filter((x): x is T => (allowed as readonly string[]).includes(x));
}

function PreflopMath({ spot }: { spot: PreflopSpot }) {
  const settings = useStore((s) => s.settings);
  const stake = STAKES[settings.stake];
  const eq = useMemo(() => {
    if (!spot.villainRange) return null;
    const range = combosFromWeights(spot.villainRange);
    return equityVsRange(spot.cards, [], range, 2500, mulberry32(7)).equity;
  }, [spot]);
  const m = preflopMath(spot, stake, settings.units, eq);
  return <MathTable rows={m.rows} notes={m.notes} />;
}

export function PreflopTrainer() {
  const { params } = useRoute();
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const stake = STAKES[settings.stake];
  const arch = getArchetype(settings.villain, settings.stake);
  const review = params.get("review") === "1";

  const allKinds = SPOT_KINDS.map((k) => k.id);
  const posList = positionsFor(settings.table);
  const urlTable = Number(params.get("table"));
  const [kinds, setKinds] = useState<SpotKind[]>(() => {
    const p = parseList(params.get("kinds"), allKinds);
    if (p.length) return p;
    return settings.stake === "online" ? ["rfi", "vsOpen", "vs3bet"] : ["rfi", "vsOpen", "vs3bet", "vsLimp"];
  });
  const [positions, setPositions] = useState<PosId[]>(() =>
    parseList(params.get("pos"), positionsFor(urlTable === 6 || urlTable === 9 ? urlTable : settings.table)),
  );
  const paramKey = params.toString();
  const mission = useMemo(() => missionFrom(new URLSearchParams(paramKey)), [paramKey]);
  useEffect(() => {
    applyUrlSettings(new URLSearchParams(paramKey));
  }, [paramKey]);

  const srsKeyRef = useRef<string | null>(null);

  const makeSpot = useCallback((): PreflopSpot => {
    const rng = mulberry32(randomSeed());
    const due = dueCards(useStore.getState().srs).filter((c) => c.mode === "pre");
    const pullSrs = review ? due[0] : due.length && Math.random() < 0.15 ? due[0] : undefined;
    if (pullSrs) {
      try {
        const req = parseSpotKey(pullSrs.key);
        srsKeyRef.current = pullSrs.key;
        return generateSpot({ table: req.table, kinds: [req.kind], heroPositions: [], stake, sizing: settings.sizing, units: settings.units, rng, request: req });
      } catch {
        srsKeyRef.current = null;
      }
    }
    srsKeyRef.current = null;
    return generateSpot({ table: settings.table, kinds: kinds.length ? kinds : ["rfi"], heroPositions: positions, stake, sizing: settings.sizing, units: settings.units, rng });
  }, [kinds, positions, review, settings.sizing, settings.table, settings.units, stake]);

  const [spot, setSpot] = useState<PreflopSpot>(() => makeSpot());
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [conf, setConf] = useState<Confidence>("think");
  const [quizPick, setQuizPick] = useState<ReasonId | null>(null);
  const [gridMode, setGridMode] = useState<GridMode>("simple");
  const [session, setSession] = useState({ n: 0, correct: 0, xp: 0, streak: 0, missionN: 0, missionCorrect: 0 });
  const [showSetup, setShowSetup] = useState(false);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1000));
  const ladderTouched = useRef(false);
  const feedbackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (outcome) revealOnMobile(feedbackRef.current);
  }, [outcome]);

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setOutcome(null);
    setSpot(makeSpot());
  }, [makeSpot]);

  const next = useCallback(() => {
    setOutcome(null);
    setQuizPick(null);
    setConf("think");
    ladderTouched.current = false;
    setSeed((s) => s + 1);
    setSpot(makeSpot());
    play("deal");
    toTopOnMobile();
  }, [makeSpot]);

  const explain = useMemo(() => explainPreflop(spot, seed), [spot, seed]);

  const act = useCallback(
    (a: PfAction) => {
      if (outcome) return;
      const res = gradePreflop(spot, a);
      const ex = preflopExploit(spot, arch);
      const exGrade = gradeFreq(ex.freqs[a] ?? 0, ex.freqs[ex.best] ?? 0);
      const fromSrs = srsKeyRef.current === spot.key;
      const store = useStore.getState();
      const reward = store.recordDecision({
        mode: "pre",
        kind: spot.kind,
        pos: spot.hero,
        vs: spot.villain,
        hand: spot.hand,
        action: a,
        best: res.best,
        grade: res.grade,
        exploitGrade: exGrade,
        freq: res.chosenFreq,
        conf,
        arch: arch.id,
        base: spot.chart.freqs[spot.hand] as Record<string, number>,
        srs: { key: spot.key, mode: "pre", label: `${spot.hand} · ${SPOT_KINDS.find((k) => k.id === spot.kind)?.label} · ${posLabel(spot.hero, spot.table)}` },
        flags: { rfi: spot.kind === "rfi", iso: spot.kind === "vsLimp", vsOpen: spot.kind === "vsOpen" },
      });
      if (fromSrs) store.reviewSrs(spot.key, reward.correct);
      if (mission) store.recordDrill(`day-${mission.day}`, reward.correct);
      play(res.grade === "perfect" ? "perfect" : GRADES[res.grade].correct ? "good" : "bad");
      announce(reward);
      setOutcome({ res, exploit: ex, exploitGrade: exGrade, xp: reward.xp, conf, fromSrs });
      setSession((s) => ({
        n: s.n + 1,
        correct: s.correct + (reward.correct ? 1 : 0),
        xp: s.xp + reward.xp,
        streak: reward.correct ? s.streak + 1 : 0,
        missionN: s.missionN + (mission ? 1 : 0),
        missionCorrect: s.missionCorrect + (mission && reward.correct ? 1 : 0),
      }));
      if (settings.autoNext && res.grade === "perfect") {
        setTimeout(() => {
          if (!ladderTouched.current) next();
        }, 1100);
      }
    },
    [arch, conf, mission, next, outcome, settings.autoNext, spot],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.metaKey || e.ctrlKey) return;
      const k = e.key.toLowerCase();
      if (outcome && (k === " " || k === "enter" || k === "n")) {
        e.preventDefault();
        next();
        return;
      }
      if (!outcome) {
        if (k === "1") setConf("guess");
        if (k === "2") setConf("think");
        if (k === "3") setConf("sure");
        const opt = spot.options.find((o) => KEY_FOR[o.key].toLowerCase() === k);
        if (opt) act(opt.key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [act, next, outcome, spot]);

  const seats: TableSeat[] = useMemo(() => {
    const order = spot.seats;
    const hi = order.findIndex((s) => s.status === "hero");
    const rotated = [...order.slice(hi), ...order.slice(0, hi)];
    return rotated.map((s) => ({
      key: s.pos,
      label: s.label,
      stack: fmtMoney(s.stackBB, stake, settings.units),
      bet: s.betBB > 0 ? fmtMoney(s.betBB, stake, settings.units) : undefined,
      status: s.status === "hero" ? "hero" : s.status === "folded" ? "folded" : s.status === "acted" ? "active" : "waiting",
      action: s.action,
      isButton: s.isButton,
      badge: s.isVillain ? arch.emoji : undefined,
      cards: s.status !== "folded" && s.status !== "hero" ? [null, null] : null,
      highlight: s.isVillain,
    }));
  }, [arch.emoji, settings.units, spot, stake]);

  const labelOf = (a: PfAction) => spot.options.find((o) => o.key === a)?.label ?? spot.chart.labels[a] ?? a;
  const onLadderOpen = (_: string, count: number, total: number) => {
    ladderTouched.current = true;
    const st = useStore.getState();
    st.bump("ladderOpens");
    if (count === total) st.bump("fullLadders");
  };

  const steps: LadderStep[] = outcome
    ? [
        {
          id: "why",
          title: "Why?",
          teaser: settings.askWhy ? "Name the key reason, then see the full breakdown" : "Concept, hand factors, pros and cons",
          icon: Brain,
          color: "#a78bfa",
          render: () => (
            <div className="space-y-3">
              {settings.askWhy && (
                <ReasonQuiz
                  prompt={explain.quiz.prompt}
                  options={explain.quiz.options}
                  correct={explain.quiz.correct}
                  picked={quizPick}
                  onPick={(r) => {
                    setQuizPick(r);
                    if (r === explain.quiz.correct) {
                      const rw = useStore.getState().bump("reasonRight");
                      announce(rw);
                      play("good");
                    } else play("bad");
                  }}
                />
              )}
              {(!settings.askWhy || quizPick) && (
                <>
                  <div>
                    <div className="text-sm font-bold text-white">{explain.concept.title}</div>
                    {explain.concept.body.map((b) => (
                      <p key={b} className="mt-1 text-xs leading-relaxed text-ink-200">
                        {b}
                      </p>
                    ))}
                  </div>
                  <div>
                    <div className="label mb-1">Your hand</div>
                    <ul className="space-y-1 text-xs text-ink-200">
                      {explain.handFactors.map((f) => (
                        <li key={f}>• {f}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="label mb-1">Each option, good and bad</div>
                    <ProsCons actions={explain.actions} />
                  </div>
                </>
              )}
            </div>
          ),
        },
        {
          id: "chart",
          title: "The chart",
          teaser: `${spot.chart.title} — see where ${spot.hand} sits`,
          icon: LayoutGrid,
          color: "#38bdf8",
          render: () => {
            const p = actionPercents(spot.chart);
            return (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-white">{spot.chart.title}</div>
                  <Segmented
                    size="sm"
                    value={gridMode}
                    onChange={setGridMode}
                    options={[
                      { value: "simple", label: "Simple" },
                      { value: "freq", label: "Frequencies" },
                    ]}
                  />
                </div>
                <RangeGrid chart={spot.chart} mode={gridMode} highlight={spot.hand} />
                <ActionLegend chart={spot.chart} compact />
                <div className="flex flex-wrap gap-2 text-[11px] text-ink-300">
                  {spot.chart.actions.map((a) => (
                    <span key={a} className="rounded bg-white/5 px-1.5 py-0.5">
                      {spot.chart.labels[a]} <span className="num text-white">{p[a].toFixed(1)}%</span>
                    </span>
                  ))}
                  {spot.chart.source === "live" && <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-200">Live exploit chart</span>}
                </div>
                {spot.chart.notes?.map((n) => (
                  <p key={n} className="text-xs text-ink-200">
                    • {n}
                  </p>
                ))}
                <button className="text-xs font-semibold text-sky-300 hover:text-sky-200" onClick={() => navigate(`/charts?id=${spot.chart.id}`)}>
                  Open in chart explorer →
                </button>
              </div>
            );
          },
        },
        {
          id: "math",
          title: "The math",
          teaser: "Pot odds, fold equity, and your equity vs their range",
          icon: Calculator,
          color: "#f2c14e",
          render: () => <PreflopMath spot={spot} />,
        },
        {
          id: "exploit",
          title: "Exploit it",
          teaser: `How to beat ${arch.name} instead of a solver`,
          icon: Target,
          color: "#fb923c",
          render: () => (
            <div className="space-y-2">
              <ArchetypeCard arch={arch} />
              <div className="rounded-lg bg-orange-500/10 p-3 text-xs text-orange-100">
                <div className="text-sm font-bold">
                  Exploit play: {labelOf(outcome.exploit.best)} {outcome.exploit.changed ? "(adjusts the baseline)" : "(same as baseline)"}
                </div>
                <p className="mt-1">{outcome.exploit.note}</p>
              </div>
              <div>
                <div className="label mb-1">{stake.short} pool tendencies</div>
                <ul className="space-y-1 text-xs text-ink-200">
                  {stake.pool.exploits.slice(0, 3).map((t) => (
                    <li key={t}>• {t}</li>
                  ))}
                </ul>
              </div>
            </div>
          ),
        },
        {
          id: "legend",
          title: "Legend's lens",
          teaser: "What the greats would say about this spot",
          icon: Quote,
          color: "#34d399",
          render: () => <LegendLens id={explain.legendId} line={explain.legendLine} />,
        },
      ]
    : [];

  const acc = session.n ? session.correct / session.n : 0;
  const missionAcc = session.missionN ? session.missionCorrect / session.missionN : 0;
  const missionDone = mission && session.missionN >= mission.target && missionAcc >= mission.acc;
  const exploitAgrees = outcome ? GRADES[outcome.exploitGrade].correct : false;
  const lensGrade = outcome ? (settings.lens === "exploit" ? outcome.exploitGrade : outcome.res.grade) : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="label">{review ? "Leak Deck review" : "Preflop trainer"}</div>
          <h1 className="font-display text-xl font-bold text-white sm:text-2xl">{spot.headline}</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden gap-2 sm:flex">
            <Stat label="Hands" value={session.n} />
            <Stat label="Accuracy" value={session.n ? pct(acc) : "—"} accent={acc >= 0.8 ? "#22c55e" : undefined} />
            <Stat label="Streak" value={`${session.streak}🔥`} />
          </div>
          <button className="btn-ghost" onClick={() => setShowSetup(true)}>
            <SlidersHorizontal size={16} /> Setup
          </button>
        </div>
      </div>

      <div className="flex gap-2 sm:hidden">
        <span className="chip">Hands {session.n}</span>
        <span className="chip">Acc {session.n ? pct(acc) : "—"}</span>
        <span className="chip">🔥 {session.streak}</span>
        <span className="chip">+{session.xp} XP</span>
      </div>

      {mission && (
        <div className={`panel-tight flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm ${missionDone ? "border-emerald-400/50" : ""}`}>
          <span className="font-semibold text-white">
            Day {mission.day} mission: {mission.target} hands at {pct(mission.acc)}+
          </span>
          <span className="num text-ink-200">
            {Math.min(session.missionN, mission.target)}/{mission.target} · {session.missionN ? pct(missionAcc) : "—"}
          </span>
          {missionDone && (
            <button className="btn-primary !py-1.5" onClick={() => navigate(`/learn?day=${mission.day}`)}>
              Mission complete — back to lesson
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="panel p-2 sm:p-4">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {spot.log.map((l, i) => (
                <span key={i} className="rounded-md bg-white/[0.05] px-2 py-0.5 text-[11px] text-ink-300">
                  {l}
                </span>
              ))}
              {outcome?.fromSrs && <span className="rounded-md bg-rose-500/15 px-2 py-0.5 text-[11px] text-rose-200">Leak Deck card</span>}
            </div>
            <PokerTable seats={seats} pot={fmtMoney(spot.potBB, stake, settings.units)} heroCards={spot.cards} />
            <div className="mt-2 text-center text-sm text-ink-300">
              <span className="font-semibold text-white">{spot.hand}</span> · {handName(spot.hand)} · {POS_INFO[spot.hero].name}
            </div>
          </div>

          <div className="panel sticky bottom-[68px] z-20 p-3 lg:static">
            {!outcome ? (
              <>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <ConfidencePicker value={conf} onChange={setConf} />
                  <span className="hidden text-[11px] text-ink-400 sm:block">
                    Keys: <span className="kbd">F</span> <span className="kbd">C</span> <span className="kbd">R</span> <span className="kbd">A</span>
                  </span>
                </div>
                <div className={`grid gap-2 ${spot.options.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                  {spot.options.map((o) => (
                    <button key={o.key} onClick={() => act(o.key)} className={`btn flex-col !gap-0 !py-3 ${ACTION_BTN[o.key]}`}>
                      <span className="text-base">{o.label}</span>
                      {o.costBB > 0 && <span className="num text-xs opacity-80">{o.key === "call" && spot.kind !== "rfi" ? fmtMoney(o.costBB, stake, settings.units) : `to ${fmtMoney(o.toBB, stake, settings.units)}`}</span>}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <button className="btn-primary w-full !py-3 text-base" onClick={next}>
                <Zap size={18} /> Next hand <span className="kbd ml-1 !border-ink-950/30 !bg-ink-950/10 !text-ink-900">Space</span>
              </button>
            )}
          </div>
        </div>

        <div ref={feedbackRef} className="scroll-mt-16 space-y-3">
          {!outcome ? (
            <div className="panel space-y-3 p-4">
              <div>
                <div className="label">Your seat</div>
                <div className="mt-1 font-display text-lg font-bold text-white">
                  {POS_INFO[spot.hero].name} <span className="text-sm text-ink-400">· {POS_INFO[spot.hero].role}</span>
                </div>
                <p className="mt-1 text-sm text-ink-300">{POS_INFO[spot.hero].blurb}</p>
              </div>
              {spot.villain || spot.limpers.length ? <ArchetypeCard arch={arch} compact /> : null}
              <div className="rounded-xl border border-white/[0.07] bg-black/20 p-3 text-xs text-ink-300">
                <div className="mb-1 font-semibold text-ink-100">Before you click, ask:</div>
                <ul className="space-y-0.5">
                  <li>• How many players are left to act, and how strong are their ranges?</li>
                  <li>• What price am I getting — and will I have position?</li>
                  <li>• Does my hand play well (suited, connected, pair) or get dominated?</li>
                </ul>
              </div>
              <p className="text-[11px] text-ink-400">Your answer gets graded instantly, then you can climb the reasoning ladder one step at a time.</p>
            </div>
          ) : (
            <>
              <VerdictCard
                grade={lensGrade!}
                xp={outcome.xp}
                youChose={labelOf(outcome.res.action)}
                bestLabel={labelOf(settings.lens === "exploit" ? outcome.exploit.best : outcome.res.best)}
                line={explain.verdictLine}
                mix={spot.chart.actions.map((a) => ({ label: spot.chart.labels[a] ?? a, value: outcome.res.freqs[a] ?? 0, color: ACTION_COLORS[a] }))}
                exploit={{ name: arch.name, emoji: arch.emoji, best: labelOf(outcome.exploit.best), agrees: exploitAgrees, changed: outcome.exploit.changed }}
              />
              <div className="panel p-3">
                <Ladder steps={steps} resetKey={`${spot.key}-${seed}`} onOpen={onLadderOpen} />
              </div>
            </>
          )}
        </div>
      </div>

      <Modal open={showSetup} onClose={() => setShowSetup(false)} title="Drill setup">
        <div className="space-y-4">
          <div>
            <div className="label mb-2">Spots</div>
            <div className="flex flex-wrap gap-2">
              {SPOT_KINDS.map((k) => {
                const on = kinds.includes(k.id);
                return (
                  <button key={k.id} className={`chip ${on ? "chip-on" : ""}`} onClick={() => setKinds(on ? kinds.filter((x) => x !== k.id) : [...kinds, k.id])} title={k.desc}>
                    {k.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="label mb-2">Your seat (none selected = every seat)</div>
            <div className="flex flex-wrap gap-2">
              {posList.map((p) => {
                const on = positions.includes(p);
                return (
                  <button key={p} className={`chip ${on ? "chip-on" : ""}`} onClick={() => setPositions(on ? positions.filter((x) => x !== p) : [...positions, p])}>
                    {posLabel(p, settings.table)}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="label mb-2">Table</div>
              <Segmented
                value={settings.table}
                onChange={(v) => {
                  setPositions([]);
                  setSettings({ table: v });
                }}
                options={[
                  { value: 6, label: "6-max" },
                  { value: 9, label: "9-handed" },
                ]}
              />
            </div>
            <div>
              <div className="label mb-2">Bet sizes</div>
              <Segmented
                value={settings.sizing}
                onChange={(v) => setSettings({ sizing: v })}
                options={[
                  { value: "live", label: "Live sizes" },
                  { value: "solver", label: "Solver sizes" },
                ]}
              />
            </div>
            <div>
              <div className="label mb-2">Grade me on</div>
              <Segmented
                value={settings.lens}
                onChange={(v) => setSettings({ lens: v })}
                options={[
                  { value: "gto", label: "GTO baseline" },
                  { value: "exploit", label: "Exploit" },
                ]}
              />
            </div>
            <div>
              <div className="label mb-2">Units</div>
              <Segmented
                value={settings.units}
                onChange={(v) => setSettings({ units: v })}
                options={[
                  { value: "$", label: "Dollars" },
                  { value: "bb", label: "Big blinds" },
                ]}
              />
            </div>
          </div>
          <div>
            <div className="label mb-2">Opponent type</div>
            <div className="flex flex-wrap gap-2">
              {ARCHETYPE_IDS.map((id: ArchetypeId) => {
                const a = getArchetype(id, settings.stake);
                return (
                  <button key={id} className={`chip ${settings.villain === id ? "chip-on" : ""}`} onClick={() => setSettings({ villain: id })}>
                    {a.emoji} {a.name}
                  </button>
                );
              })}
            </div>
          </div>
          <button className="btn-primary w-full" onClick={() => setShowSetup(false)}>
            Deal
          </button>
        </div>
      </Modal>
    </div>
  );
}
