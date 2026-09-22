import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Brain, Calculator, ChartColumn, Quote, SlidersHorizontal, Target, Zap, ArrowRight } from "lucide-react";
import { applyUrlSettings, missionFrom, useStore, type Confidence } from "../store/store";
import { navigate, useRoute } from "../lib/router";
import { announce } from "../store/ui";
import { STAKES } from "../data/stakes";
import { ARCHETYPE_IDS, getArchetype } from "../data/archetypes";
import { POSITIONS_6, posLabel, POS_INFO } from "../data/positions";
import { ACTION_NAMES, heroAct, isAggressive, LINE_BY_ID, LINES, POST_ACTION_COLOR, startHand, type Decision, type HandState, type PostAction, type Street } from "../lib/postflop";
import { explainPostflop } from "../lib/explainPostflop";
import { BUCKETS, BUCKET_COLOR, BUCKET_LABEL, type Bucket } from "../lib/handStrength";
import { GRADES, type Grade } from "../lib/grading";
import { cardsPretty, classOf } from "../lib/cards";
import { fmtMoney, pct } from "../lib/format";
import { randomSeed } from "../lib/rng";
import { play } from "../lib/sound";
import { revealOnMobile, toTopOnMobile } from "../lib/scroll";
import type { ReasonId } from "../data/reasons";
import { PokerTable, type TableSeat } from "../components/PokerTable";
import { PlayingCard } from "../components/PlayingCard";
import { Ladder, type LadderStep } from "../components/Ladder";
import { ArchetypeCard, ConfidencePicker, GradePill, LegendLens, MathTable, ProsCons, ReasonQuiz, VerdictCard } from "../components/coach";
import { Modal, Segmented, Stat } from "../components/ui";

type Role = "random" | "pfr" | "caller";

const BTN_STYLE: Record<PostAction, string> = {
  X: "bg-teal-600 hover:bg-teal-500",
  C: "bg-emerald-600 hover:bg-emerald-500",
  F: "bg-slate-700/80 hover:bg-slate-600",
  B33: "bg-orange-600 hover:bg-orange-500",
  B75: "bg-rose-600 hover:bg-rose-500",
  B125: "bg-rose-800 hover:bg-rose-700",
  R: "bg-rose-600 hover:bg-rose-500",
  AI: "bg-purple-600 hover:bg-purple-500",
};

const KEYS: Partial<Record<string, PostAction[]>> = {
  x: ["X"],
  c: ["C", "X"],
  f: ["F"],
  "1": ["B33"],
  "2": ["B75"],
  "3": ["B125"],
  r: ["R"],
  a: ["AI"],
};

const GRADE_POINTS: Record<Grade, number> = { perfect: 100, good: 80, inaccuracy: 50, mistake: 20, blunder: 0 };

function MixBar({ mix, label }: { mix: Record<Bucket, number>; label: string }) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold text-ink-200">{label}</div>
      <div className="flex h-4 w-full overflow-hidden rounded-md bg-white/5">
        {BUCKETS.map((b) =>
          mix[b] > 0.002 ? <div key={b} title={`${BUCKET_LABEL[b]} ${Math.round(mix[b] * 100)}%`} style={{ width: `${mix[b] * 100}%`, background: BUCKET_COLOR[b] }} /> : null,
        )}
      </div>
    </div>
  );
}

function HandHistory({ hand, stakeId, units }: { hand: HandState; stakeId: keyof typeof STAKES; units: "bb" | "$" }) {
  const stake = STAKES[stakeId];
  const streets: Street[] = ["flop", "turn", "river"];
  const boardAt = (st: Street) => (st === "flop" ? hand.runout.slice(0, 3) : st === "turn" ? hand.runout.slice(3, 4) : hand.runout.slice(4, 5));
  return (
    <div className="space-y-1.5 text-xs">
      <div className="text-ink-400">Preflop: {hand.line.preflop}</div>
      {streets.map((st) => {
        const evs = hand.events.filter((e) => e.street === st);
        if (!evs.length && !(hand.board.length >= (st === "flop" ? 3 : st === "turn" ? 4 : 5))) return null;
        return (
          <div key={st} className="flex flex-wrap items-center gap-1.5">
            <span className="w-10 font-semibold uppercase tracking-wide text-ink-400">{st}</span>
            <span className="font-mono text-ink-100">{hand.board.length >= (st === "flop" ? 3 : st === "turn" ? 4 : 5) ? cardsPretty(boardAt(st)) : ""}</span>
            {evs.map((e, i) => (
              <span key={i} className={`rounded px-1.5 py-0.5 ${e.who === "hero" ? "bg-gold-400/15 text-gold-100" : "bg-white/[0.06] text-ink-200"}`}>
                {e.who === "hero" ? "You" : posLabel(hand.villPos)} {ACTION_NAMES[e.action].toLowerCase()}
                {e.cost > 0 && e.action !== "F" ? ` ${fmtMoney(e.cost, stake, units)}` : ""}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function PostflopTrainer() {
  const { params } = useRoute();
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const stake = STAKES[settings.stake];
  const arch = getArchetype(settings.villain, settings.stake);
  const paramKey = params.toString();
  const mission = useMemo(() => missionFrom(new URLSearchParams(paramKey)), [paramKey]);
  useEffect(() => {
    applyUrlSettings(new URLSearchParams(paramKey));
  }, [paramKey]);

  const [lineIds, setLineIds] = useState<string[]>(() => {
    const ids = (params.get("lines") ?? "").split(",").filter((id) => LINE_BY_ID[id]);
    return ids.length ? ids : ["BTN_BB", "CO_BB", "SB_BB", "CO_BTN", "BTN_BB_3B"];
  });
  const [role, setRole] = useState<Role>(() => {
    const r = params.get("role");
    return r === "pfr" || r === "caller" ? r : "random";
  });
  const [showSetup, setShowSetup] = useState(false);

  const deal = useCallback(
    (replaySeed?: number): HandState => {
      const ids = lineIds.length ? lineIds : ["BTN_BB"];
      const lineId = ids[Math.floor(Math.random() * ids.length)];
      const heroRole = role === "random" ? (Math.random() < 0.5 ? "pfr" : "caller") : role;
      return startHand({ lineId, heroRole, archetype: arch, seed: replaySeed ?? randomSeed() });
    },
    [arch, lineIds, role],
  );

  const replaySeed = Number(params.get("seed")) || undefined;
  const [srsKey, setSrsKey] = useState<string | null>(() => (replaySeed ? params.get("srs") : null));
  const [hand, setHand] = useState<HandState>(() => deal(replaySeed));
  const [review, setReview] = useState<{ decision: Decision; before: HandState; xp: number } | null>(null);
  const [quizPick, setQuizPick] = useState<ReasonId | null>(null);
  const [conf, setConf] = useState<Confidence>("think");
  const [session, setSession] = useState({ n: 0, correct: 0, hands: 0, net: 0, missionN: 0, missionCorrect: 0 });
  const finishedRef = useRef<number | null>(null);

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setReview(null);
    setHand(deal());
  }, [deal]);

  const shown = review ? review.before : hand;
  const pending = shown.pending;

  const explain = useMemo(() => {
    if (!review) return null;
    return explainPostflop(review.decision, arch, stake, settings.units, review.decision.board.length * 7 + hand.seed % 11);
  }, [arch, hand.seed, review, settings.units, stake]);

  const act = useCallback(
    (a: PostAction) => {
      if (review || !hand.pending || hand.done) return;
      const nextHand = heroAct(hand, a);
      const d = nextHand.decisions[nextHand.decisions.length - 1];
      const bucket = d.bucket;
      const value = bucket === "nutted" || bucket === "strong";
      const reward = useStore.getState().recordDecision({
        mode: "post",
        kind: d.street,
        pos: hand.heroPos,
        vs: hand.villPos,
        hand: classOf(hand.heroCards[0], hand.heroCards[1]),
        action: d.chosen,
        best: d.gtoBest,
        grade: d.grade,
        exploitGrade: d.exploitGrade,
        freq: d.chosenFreq,
        conf,
        arch: arch.id,
        base: d.gto as Record<string, number>,
        srs: {
          key: `post|${hand.seed}|${hand.line.id}|${hand.heroIsPfr ? "pfr" : "caller"}`,
          mode: "post",
          label: `${hand.line.label} · ${cardsPretty(hand.heroCards)} on ${cardsPretty(d.board)}`,
          seed: hand.seed,
          lineId: hand.line.id,
          role: hand.heroIsPfr ? "pfr" : "caller",
          arch: arch.id,
        },
        flags: {
          flop: d.street === "flop",
          river: d.street === "river",
          riverCall: d.street === "river" && !!d.facing && d.gtoBest === "C" && d.chosen === "C",
          riverValue: d.street === "river" && !d.facing && value && isAggressive(d.chosen) && isAggressive(d.gtoBest),
        },
      });
      const g = settings.lens === "exploit" ? d.exploitGrade : d.grade;
      play(g === "perfect" ? "perfect" : GRADES[g].correct ? "good" : "bad");
      if (isAggressive(a) || a === "C") play("chip");
      announce(reward);
      if (mission) useStore.getState().recordDrill(`day-${mission.day}`, reward.correct);
      setSession((s) => ({
        ...s,
        n: s.n + 1,
        correct: s.correct + (reward.correct ? 1 : 0),
        missionN: s.missionN + (mission ? 1 : 0),
        missionCorrect: s.missionCorrect + (mission && reward.correct ? 1 : 0),
      }));
      setReview({ decision: d, before: hand, xp: reward.xp });
      setHand(nextHand);
      setQuizPick(null);
    },
    [arch.id, conf, hand, mission, review, settings.lens],
  );

  const feedbackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (review) revealOnMobile(feedbackRef.current);
  }, [review]);

  const cont = useCallback(() => {
    setReview(null);
    setConf("think");
    play("deal");
    if (hand.done) setTimeout(() => revealOnMobile(feedbackRef.current), 50);
    else toTopOnMobile();
  }, [hand.done]);

  const nextHand = useCallback(() => {
    setReview(null);
    setQuizPick(null);
    setSrsKey(null);
    setHand(deal());
    play("deal");
    toTopOnMobile();
  }, [deal]);

  useEffect(() => {
    if (!hand.done || review || finishedRef.current === hand.seed) return;
    finishedRef.current = hand.seed;
    const st = useStore.getState();
    if (srsKey) {
      const allCorrect = hand.decisions.every((x) => GRADES[st.settings.lens === "exploit" ? x.exploitGrade : x.grade].correct);
      st.reviewSrs(srsKey, allCorrect);
    }
    const r = st.finishHand();
    announce(r);
    setSession((s) => ({ ...s, hands: s.hands + 1, net: s.net + (hand.result?.heroNet ?? 0) }));
  }, [hand, review, srsKey]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey) return;
      const k = e.key.toLowerCase();
      if (k === " " || k === "enter") {
        e.preventDefault();
        if (review) cont();
        else if (hand.done) nextHand();
        return;
      }
      if (review || hand.done || !hand.pending) return;
      const cands = KEYS[k];
      if (!cands) return;
      const legal = hand.pending.legal.map((l) => l.action);
      const a = cands.find((c) => legal.includes(c));
      if (a) act(a);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [act, cont, hand, nextHand, review]);

  const showdown = !review && hand.done && hand.result?.showdown;
  const seats: TableSeat[] = useMemo(() => {
    const order = POSITIONS_6;
    const hi = order.indexOf(shown.heroPos);
    const rotated = [...order.slice(hi), ...order.slice(0, hi)];
    return rotated.map((p) => {
      const isHero = p === shown.heroPos;
      const isVill = p === shown.villPos;
      const who = isHero ? "hero" : "villain";
      const bet = isHero || isVill ? shown.streetBet[who] : 0;
      return {
        key: p,
        label: posLabel(p, 6),
        stack: isHero || isVill ? fmtMoney(shown.stacks[who], stake, settings.units) : undefined,
        bet: bet > 0 ? fmtMoney(bet, stake, settings.units) : undefined,
        status: isHero ? "hero" : isVill ? "active" : "folded",
        isButton: p === "BTN",
        badge: isVill ? arch.emoji : undefined,
        cards: isVill ? (showdown ? [shown.villCards[0], shown.villCards[1]] : [null, null]) : null,
        highlight: isVill,
        action: isVill ? lastAction(shown, "villain") : undefined,
      };
    });
  }, [arch.emoji, settings.units, shown, showdown, stake]);

  const onLadderOpen = (_: string, count: number, total: number) => {
    const st = useStore.getState();
    st.bump("ladderOpens");
    if (count === total) st.bump("fullLadders");
  };

  const d = review?.decision;
  const steps: LadderStep[] =
    d && explain
      ? [
          {
            id: "why",
            title: "Why?",
            teaser: settings.askWhy ? "Name the key reason, then read the board and ranges" : "Board, ranges, your hand, and each option",
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
                        announce(useStore.getState().bump("reasonRight"));
                        play("good");
                      } else play("bad");
                    }}
                  />
                )}
                {(!settings.askWhy || quizPick) && (
                  <>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-lg bg-black/20 p-2.5">
                        <div className="label mb-1">Board</div>
                        <div className="text-sm font-semibold text-white">{explain.boardRead.title}</div>
                        <ul className="mt-1 space-y-0.5 text-xs text-ink-300">
                          {explain.boardRead.notes.map((n) => (
                            <li key={n}>• {n}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-lg bg-black/20 p-2.5">
                        <div className="label mb-1">Your hand</div>
                        <div className="text-sm font-semibold text-white">{explain.handRead.label}</div>
                        <div className="mt-1 text-xs">
                          <span className="rounded px-1.5 py-0.5 font-semibold text-ink-950" style={{ background: BUCKET_COLOR[explain.handRead.bucket] }}>
                            {explain.handRead.bucketLabel}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-ink-300">{explain.handRead.blurb}</p>
                      </div>
                    </div>
                    <div className="rounded-lg bg-black/20 p-2.5">
                      <div className="label mb-1">Strategy here</div>
                      <div className="text-sm font-semibold text-white">{explain.strategy.title}</div>
                      <p className="mt-1 text-xs text-ink-200">{explain.strategy.body}</p>
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
            id: "ranges",
            title: "Range X-ray",
            teaser: "How both ranges hit this board",
            icon: ChartColumn,
            color: "#38bdf8",
            render: () => (
              <div className="space-y-3">
                <MixBar mix={d.heroMix} label={`Your range (${POS_INFO[shown.heroPos].name})`} />
                <MixBar mix={d.villMix} label={`${posLabel(shown.villPos)}'s range · ${Math.round(d.villCombos)} combos left`} />
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-300">
                  {BUCKETS.map((b) => (
                    <span key={b} className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-sm" style={{ background: BUCKET_COLOR[b] }} />
                      {BUCKET_LABEL[b]}
                    </span>
                  ))}
                </div>
                <ul className="space-y-1 text-xs text-ink-200">
                  {explain.rangeRead.map((r) => (
                    <li key={r}>• {r}</li>
                  ))}
                </ul>
                <p className="text-[11px] text-ink-400">Ranges start from the preflop charts and narrow after every action according to how often each hand type takes that action.</p>
              </div>
            ),
          },
          {
            id: "math",
            title: "The math",
            teaser: "Pot odds, MDF, outs, bluff ratios",
            icon: Calculator,
            color: "#f2c14e",
            render: () => <MathTable rows={explain.math.rows} notes={explain.math.notes} />,
          },
          {
            id: "exploit",
            title: "Exploit it",
            teaser: `Adjusting for ${arch.name}`,
            icon: Target,
            color: "#fb923c",
            render: () => (
              <div className="space-y-2">
                <ArchetypeCard arch={arch} />
                <div className="rounded-lg bg-orange-500/10 p-3 text-xs text-orange-100">
                  <div className="text-sm font-bold">{explain.exploit.title}</div>
                  {explain.exploit.notes.map((n) => (
                    <p key={n} className="mt-1">
                      {n}
                    </p>
                  ))}
                </div>
              </div>
            ),
          },
          {
            id: "legend",
            title: "Legend's lens",
            teaser: "A principle from the greats",
            icon: Quote,
            color: "#34d399",
            render: () => <LegendLens id={explain.legendId} line={explain.legendLine} />,
          },
        ]
      : [];

  const acc = session.n ? session.correct / session.n : 0;
  const missionAcc = session.missionN ? session.missionCorrect / session.missionN : 0;
  const missionDone = mission && session.missionN >= mission.target && missionAcc >= mission.acc;
  const lensGrade = d ? (settings.lens === "exploit" ? d.exploitGrade : d.grade) : null;
  const handScore = hand.decisions.length ? Math.round(hand.decisions.reduce((n, x) => n + GRADE_POINTS[settings.lens === "exploit" ? x.exploitGrade : x.grade], 0) / hand.decisions.length) : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="label">
            Postflop trainer · {shown.line.label}
            {srsKey && <span className="ml-2 rounded bg-rose-500/20 px-1.5 py-0.5 text-rose-200">Leak Deck replay</span>}
          </div>
          <h1 className="font-display text-xl font-bold text-white sm:text-2xl">
            You're {shown.heroIsPfr ? "the preflop raiser" : "the caller"} in the {POS_INFO[shown.heroPos].name}, {shown.heroIP ? "in position" : "out of position"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden gap-2 sm:flex">
            <Stat label="Decisions" value={session.n} />
            <Stat label="Accuracy" value={session.n ? pct(acc) : "—"} accent={acc >= 0.75 ? "#22c55e" : undefined} />
            <Stat label="Hands" value={session.hands} />
          </div>
          <button className="btn-ghost" onClick={() => setShowSetup(true)}>
            <SlidersHorizontal size={16} /> Setup
          </button>
        </div>
      </div>

      {mission && (
        <div className={`panel-tight flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm ${missionDone ? "border-emerald-400/50" : ""}`}>
          <span className="font-semibold text-white">
            Day {mission.day} mission: {mission.target} decisions at {pct(mission.acc)}+
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
            <PokerTable
              seats={seats}
              board={shown.board}
              pot={fmtMoney(shown.pot, stake, settings.units)}
              heroCards={shown.heroCards}
              center={
                review ? (
                  <span className="rounded-full bg-gold-400 px-2.5 py-0.5 text-[11px] font-bold text-ink-950 shadow">You: {ACTION_NAMES[review.decision.chosen]}</span>
                ) : null
              }
            />
            <div className="mt-2 px-1">
              <HandHistory hand={shown} stakeId={settings.stake} units={settings.units} />
            </div>
          </div>

          <div className="panel sticky bottom-[68px] z-20 p-3 lg:static">
            {review ? (
              <button className="btn-primary w-full !py-3 text-base" onClick={cont}>
                <ArrowRight size={18} /> {hand.done ? "See how the hand ended" : "Continue the hand"} <span className="kbd ml-1 !border-ink-950/30 !bg-ink-950/10 !text-ink-900">Space</span>
              </button>
            ) : hand.done ? (
              <button className="btn-primary w-full !py-3 text-base" onClick={nextHand}>
                <Zap size={18} /> Next hand <span className="kbd ml-1 !border-ink-950/30 !bg-ink-950/10 !text-ink-900">Space</span>
              </button>
            ) : pending ? (
              <>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <ConfidencePicker value={conf} onChange={setConf} />
                  <span className="text-[11px] text-ink-300">
                    {pending.facing ? `Facing ${fmtMoney(pending.facing.bet, stake, settings.units)} into ${fmtMoney(pending.facing.potBefore, stake, settings.units)}` : "Checked to you" }
                  </span>
                </div>
                <div className={`grid gap-2 ${pending.legal.length <= 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"}`}>
                  {pending.legal.map((l) => (
                    <button key={l.action} onClick={() => act(l.action)} className={`btn flex-col !gap-0 !py-3 text-white ${BTN_STYLE[l.action]}`}>
                      <span className="text-sm sm:text-base">{l.label}</span>
                      {l.cost > 0 && <span className="num text-xs opacity-80">{fmtMoney(l.action === "C" ? l.cost : l.to, stake, settings.units)}</span>}
                    </button>
                  ))}
                </div>
                <div className="mt-2 hidden text-[11px] text-ink-400 sm:block">
                  Keys: <span className="kbd">X</span>/<span className="kbd">C</span> check·call, <span className="kbd">F</span> fold, <span className="kbd">1</span>
                  <span className="kbd">2</span>
                  <span className="kbd">3</span> bet sizes, <span className="kbd">R</span> raise, <span className="kbd">A</span> all-in
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div ref={feedbackRef} className="scroll-mt-16 space-y-3">
          {review && d && explain ? (
            <>
              <VerdictCard
                grade={lensGrade!}
                xp={review.xp}
                youChose={ACTION_NAMES[d.chosen]}
                bestLabel={ACTION_NAMES[settings.lens === "exploit" ? d.exploitBest : d.gtoBest]}
                line={explain.verdictLine}
                mix={d.legal.map((l) => ({ label: ACTION_NAMES[l.action], value: d.gto[l.action] ?? 0, color: POST_ACTION_COLOR[l.action] }))}
                exploit={{ name: arch.name, emoji: arch.emoji, best: ACTION_NAMES[d.exploitBest], agrees: GRADES[d.exploitGrade].correct, changed: d.exploitBest !== d.gtoBest }}
              >
                <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div className="rounded-lg bg-black/25 p-1.5">
                    <div className="text-ink-400">Your equity</div>
                    <div className="num text-sm font-bold text-white">{pct(d.eqHero)}</div>
                  </div>
                  <div className="rounded-lg bg-black/25 p-1.5">
                    <div className="text-ink-400">{d.reqEq !== null ? "Needed" : "Range edge"}</div>
                    <div className="num text-sm font-bold text-white">{d.reqEq !== null ? pct(d.reqEq) : pct(d.eqAdv)}</div>
                  </div>
                  <div className="rounded-lg bg-black/25 p-1.5">
                    <div className="text-ink-400">Hand</div>
                    <div className="truncate text-sm font-bold" style={{ color: BUCKET_COLOR[d.bucket] }}>
                      {BUCKET_LABEL[d.bucket]}
                    </div>
                  </div>
                </div>
              </VerdictCard>
              <div className="panel p-3">
                <Ladder steps={steps} resetKey={`${hand.seed}-${hand.decisions.length}`} onOpen={onLadderOpen} />
              </div>
            </>
          ) : hand.done && hand.result ? (
            <div className="panel space-y-3 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="label">Hand over</div>
                  <div className={`font-display text-2xl font-bold ${hand.result.heroNet >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                    {hand.result.heroNet >= 0 ? "Won" : "Lost"} {fmtMoney(Math.abs(hand.result.heroNet), stake, settings.units)}
                  </div>
                </div>
                {handScore !== null && (
                  <div className="text-right">
                    <div className="label">Decision score</div>
                    <div className="num text-2xl font-bold text-gold-300">{handScore}</div>
                  </div>
                )}
              </div>
              {hand.result.showdown ? (
                <div className="flex items-center gap-4 rounded-lg bg-black/20 p-3 text-sm">
                  <div>
                    <div className="text-xs text-ink-400">You</div>
                    <div className="flex gap-1">
                      <PlayingCard card={hand.heroCards[0]} size="sm" />
                      <PlayingCard card={hand.heroCards[1]} size="sm" />
                    </div>
                    <div className="mt-1 text-xs text-white">{hand.result.heroHand}</div>
                  </div>
                  <div className="text-ink-400">vs</div>
                  <div>
                    <div className="text-xs text-ink-400">{posLabel(hand.villPos)}</div>
                    <div className="flex gap-1">
                      <PlayingCard card={hand.villCards[0]} size="sm" />
                      <PlayingCard card={hand.villCards[1]} size="sm" />
                    </div>
                    <div className="mt-1 text-xs text-white">{hand.result.villHand}</div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-black/20 p-3 text-sm text-ink-200">
                  {hand.result.foldedBy === "villain" ? `${posLabel(hand.villPos)} folded.` : "You folded."} They held{" "}
                  <span className="font-mono text-white">{cardsPretty(hand.villCards)}</span> ({hand.result.villHand}).
                </div>
              )}
              <div>
                <div className="label mb-1.5">Your decisions</div>
                <div className="space-y-1.5">
                  {hand.decisions.map((x, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 rounded-lg bg-black/20 px-2.5 py-1.5 text-xs">
                      <span className="w-12 font-semibold uppercase text-ink-400">{x.street}</span>
                      <span className="flex-1 text-ink-100">
                        {ACTION_NAMES[x.chosen]}
                        {x.chosen !== x.gtoBest && <span className="text-ink-400"> · best {ACTION_NAMES[x.gtoBest]}</span>}
                      </span>
                      <GradePill grade={settings.lens === "exploit" ? x.exploitGrade : x.grade} small />
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-ink-400">
                Results and decisions are different things. A great decision can lose a pot and a mistake can win one — Annie Duke calls judging by the outcome “resulting.”
              </p>
            </div>
          ) : (
            <div className="panel space-y-3 p-4">
              <div className="label">The spot</div>
              <p className="text-sm text-ink-200">{shown.line.preflop}</p>
              <ArchetypeCard arch={arch} compact />
              <div className="rounded-xl border border-white/[0.07] bg-black/20 p-3 text-xs text-ink-300">
                <div className="mb-1 font-semibold text-ink-100">Think in this order:</div>
                <ol className="list-decimal space-y-0.5 pl-4">
                  <li>What does this board do to each range?</li>
                  <li>Where does my hand sit in my range (value, medium, draw, air)?</li>
                  <li>What worse hands call, and what better hands fold?</li>
                  <li>What's the price, and what's my equity?</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal open={showSetup} onClose={() => setShowSetup(false)} title="Postflop setup">
        <div className="space-y-4">
          <div>
            <div className="label mb-2">Spots</div>
            <div className="flex flex-wrap gap-2">
              {LINES.map((l) => {
                const on = lineIds.includes(l.id);
                return (
                  <button key={l.id} className={`chip ${on ? "chip-on" : ""}`} onClick={() => setLineIds(on ? lineIds.filter((x) => x !== l.id) : [...lineIds, l.id])}>
                    {l.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="label mb-2">You are</div>
            <Segmented
              value={role}
              onChange={setRole}
              options={[
                { value: "random", label: "Random" },
                { value: "pfr", label: "Preflop raiser" },
                { value: "caller", label: "Caller" },
              ]}
            />
          </div>
          <div>
            <div className="label mb-2">Opponent type</div>
            <div className="flex flex-wrap gap-2">
              {ARCHETYPE_IDS.map((id) => {
                const a = getArchetype(id, settings.stake);
                return (
                  <button key={id} className={`chip ${settings.villain === id ? "chip-on" : ""}`} onClick={() => setSettings({ villain: id })}>
                    {a.emoji} {a.name}
                  </button>
                );
              })}
            </div>
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
          <button className="btn-primary w-full" onClick={() => setShowSetup(false)}>
            Deal
          </button>
        </div>
      </Modal>
    </div>
  );
}

function lastAction(s: HandState, who: "hero" | "villain"): string | undefined {
  const evs = s.events.filter((e) => e.street === s.street && e.who === who);
  const e = evs[evs.length - 1];
  return e ? ACTION_NAMES[e.action] : undefined;
}
