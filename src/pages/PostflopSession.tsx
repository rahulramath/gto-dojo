import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Lightbulb, SlidersHorizontal } from "lucide-react";
import { navigate, useRoute } from "../lib/router";
import { applyUrlSettings, missionFrom, useStore } from "../store/store";
import { announce } from "../store/ui";
import { STAKES } from "../data/stakes";
import { getArchetype } from "../data/archetypes";
import { POSITIONS_6, posLabel } from "../data/positions";
import { ACTION_NAMES, heroAct, isAggressive, LINE_BY_ID, LINES, startHand, type Decision, type HandState, type PostAction } from "../lib/postflop";
import { postflopCoach, postflopHint, type Coach } from "../lib/coachText";
import { GRADES } from "../lib/grading";
import { cardsPretty, classOf } from "../lib/cards";
import { fmtMoney } from "../lib/format";
import { randomSeed } from "../lib/rng";
import { play } from "../lib/sound";
import { PokerTable, type TableSeat } from "../components/PokerTable";
import { PlayingCard } from "../components/PlayingCard";
import { Feedback } from "../components/Feedback";
import { PostflopLearnMore } from "../components/LearnMore";
import { PriceMeter, StrengthMeter } from "../components/visuals";
import { SessionBar, SessionSummary, type SessionResult } from "../components/Session";
import { Segmented, Sheet } from "../components/ui";

type Role = "random" | "pfr" | "caller";

const BTN_STYLE: Record<PostAction, string> = {
  X: "bg-teal-600 hover:bg-teal-500",
  C: "bg-emerald-600 hover:bg-emerald-500",
  F: "bg-slate-700 hover:bg-slate-600",
  B33: "bg-orange-600 hover:bg-orange-500",
  B75: "bg-rose-600 hover:bg-rose-500",
  B125: "bg-rose-800 hover:bg-rose-700",
  R: "bg-rose-600 hover:bg-rose-500",
  AI: "bg-purple-600 hover:bg-purple-500",
};
const KEYS: Record<string, PostAction[]> = { x: ["X"], c: ["C", "X"], f: ["F"], "1": ["B33"], "2": ["B75"], "3": ["B125"], r: ["R"], a: ["AI"] };
const DEFAULT_LINES = ["BTN_BB", "CO_BB", "SB_BB", "CO_BTN", "BTN_BB_3B"];

interface Review {
  d: Decision;
  before: HandState;
  coach: Coach;
  xp: number;
}

export function PostflopSession() {
  const { params } = useRoute();
  const paramKey = params.toString();
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const stake = STAKES[settings.stake];
  const arch = getArchetype(settings.villain, settings.stake);
  const mission = useMemo(() => missionFrom(new URLSearchParams(paramKey)), [paramKey]);
  useEffect(() => {
    applyUrlSettings(new URLSearchParams(paramKey));
  }, [paramKey]);

  const [lineIds, setLineIds] = useState<string[]>(() => {
    const ids = (params.get("lines") ?? "").split(",").filter((id) => LINE_BY_ID[id]);
    return ids.length ? ids : DEFAULT_LINES;
  });
  const [role, setRole] = useState<Role>(() => {
    const r = params.get("role");
    return r === "pfr" || r === "caller" ? r : "random";
  });
  const replaySeed = Number(params.get("seed")) || undefined;
  const [srsKey] = useState<string | null>(() => (replaySeed ? params.get("srs") : null));
  const [handsTotal] = useState(() => (replaySeed ? 1 : mission ? Math.max(3, Math.round(mission.target / 3)) : Number(params.get("n")) || 5));

  const deal = useCallback(
    (seed?: number): HandState => {
      const ids = lineIds.length ? lineIds : ["BTN_BB"];
      const lineId = ids[Math.floor(Math.random() * ids.length)];
      const heroRole = role === "random" ? (Math.random() < 0.5 ? "pfr" : "caller") : role;
      return startHand({ lineId, heroRole, archetype: arch, seed: seed ?? randomSeed() });
    },
    [arch, lineIds, role],
  );

  const [hand, setHand] = useState<HandState>(() => deal(replaySeed));
  const [review, setReview] = useState<Review | null>(null);
  const [handsDone, setHandsDone] = useState(0);
  const [results, setResults] = useState<SessionResult[]>([]);
  const [xpSum, setXpSum] = useState(0);
  const [finished, setFinished] = useState<{ xp: number } | null>(null);
  const [hint, setHint] = useState(false);
  const [learnMore, setLearnMore] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const counted = useRef<number | null>(null);

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (!review && !hand.decisions.length) setHand(deal());
  }, [deal]);

  const shown = review ? review.before : hand;
  const pending = shown.pending;
  const m = useCallback((bb: number) => fmtMoney(bb, stake, settings.units), [settings.units, stake]);

  const act = useCallback(
    (a: PostAction) => {
      if (review || !hand.pending || hand.done) return;
      const nextHand = heroAct(hand, a);
      const d = nextHand.decisions[nextHand.decisions.length - 1];
      const value = d.bucket === "nutted" || d.bucket === "strong";
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
        arch: arch.id,
        base: d.gto as Record<string, number>,
        srs: {
          key: `post|${hand.seed}|${hand.line.id}|${hand.heroIsPfr ? "pfr" : "caller"}`,
          mode: "post",
          label: `${cardsPretty(hand.heroCards)} on ${cardsPretty(d.board)}`,
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
      if (mission) useStore.getState().recordDrill(`day-${mission.day}`, reward.correct);
      const coach = postflopCoach(d, d.chosen, d.grade, arch);
      play(d.grade === "perfect" ? "perfect" : GRADES[d.grade].correct ? "good" : "bad");
      announce(reward);
      setResults((r) => [...r, { ok: reward.correct, title: `${cardsPretty(hand.heroCards)} on ${cardsPretty(d.board)} · ${ACTION_NAMES[d.chosen]}`, detail: `${coach.headline} — ${coach.lines[coach.lines.length - 1].text}` }]);
      setXpSum((x) => x + reward.xp);
      setReview({ d, before: hand, coach, xp: reward.xp });
      setHand(nextHand);
    },
    [arch, hand, mission, review],
  );

  useEffect(() => {
    if (!hand.done || review || counted.current === hand.seed) return;
    counted.current = hand.seed;
    const st = useStore.getState();
    if (srsKey) st.reviewSrs(srsKey, hand.decisions.every((x) => GRADES[x.grade].correct));
    announce(st.finishHand());
  }, [hand, review, srsKey]);

  const finishSession = useCallback(() => {
    const score = results.filter((r) => r.ok).length;
    const reward = useStore.getState().recordSession(mission ? "mission" : "postflop", score, results.length, results.map((r) => (r.ok ? "🟩" : "🟥")).join(""));
    announce(reward);
    setFinished({ xp: xpSum + reward.xp });
  }, [mission, results, xpSum]);

  const cont = useCallback(() => {
    setReview(null);
    setHint(false);
    setLearnMore(false);
    play("deal");
  }, []);

  const nextHand = useCallback(() => {
    const doneCount = handsDone + 1;
    setHandsDone(doneCount);
    if (doneCount >= handsTotal) {
      finishSession();
      return;
    }
    setHand(deal());
    setHint(false);
    play("deal");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [deal, finishSession, handsDone, handsTotal]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || learnMore || showSetup || finished) return;
      const k = e.key.toLowerCase();
      if (k === " " || k === "enter") {
        e.preventDefault();
        if (review) cont();
        else if (hand.done) nextHand();
        return;
      }
      if (review || hand.done || !hand.pending) return;
      if (k === "h") setHint(true);
      const legal = hand.pending.legal.map((l) => l.action);
      const a = (KEYS[k] ?? []).find((c) => legal.includes(c));
      if (a) act(a);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [act, cont, finished, hand, learnMore, nextHand, review, showSetup]);

  const showdown = !review && hand.done && hand.result?.showdown;
  const seats: TableSeat[] = useMemo(() => {
    const hi = POSITIONS_6.indexOf(shown.heroPos);
    const rotated = [...POSITIONS_6.slice(hi), ...POSITIONS_6.slice(0, hi)];
    return rotated.map((p) => {
      const isHero = p === shown.heroPos;
      const isVill = p === shown.villPos;
      const who = isHero ? "hero" : "villain";
      const bet = isHero || isVill ? shown.streetBet[who] : 0;
      const evs = shown.events.filter((e) => e.street === shown.street && e.who === "villain");
      return {
        key: p,
        label: posLabel(p, 6),
        stack: isHero || isVill ? m(shown.stacks[who]) : undefined,
        bet: bet > 0 ? m(bet) : undefined,
        status: isHero ? "hero" : isVill ? "active" : "folded",
        isButton: p === "BTN",
        badge: isVill ? arch.emoji : undefined,
        cards: isVill ? (showdown ? [shown.villCards[0], shown.villCards[1]] : [null, null]) : null,
        highlight: isVill,
        action: isVill && evs.length ? ACTION_NAMES[evs[evs.length - 1].action] : undefined,
      };
    });
  }, [arch.emoji, m, shown, showdown]);

  if (finished) {
    const score = results.filter((r) => r.ok).length;
    const passed = mission ? score / Math.max(1, results.length) >= mission.acc : null;
    return (
      <SessionSummary
        results={results}
        xp={finished.xp}
        onDone={() => navigate(mission ? `/lesson?day=${mission.day}` : "/")}
        doneLabel={mission ? "Back to lesson" : "Done"}
        onAgain={() => {
          setResults([]);
          setHandsDone(0);
          setXpSum(0);
          setFinished(null);
          setHand(deal());
        }}
      >
        {mission && (
          <p className={`t-body mt-4 font-semibold ${passed ? "text-emerald-300" : "text-rose-300"}`}>
            {passed ? `Practice passed — ${Math.round(mission.acc * 100)}% needed.` : `Need ${Math.round(mission.acc * 100)}% to pass. Try again.`}
          </p>
        )}
      </SessionSummary>
    );
  }

  const street = shown.street[0].toUpperCase() + shown.street.slice(1);
  const context = pending?.facing ? `${street} · ${posLabel(shown.villPos)} bets ${m(pending.facing.bet)}` : `${street} · ${shown.events.some((e) => e.street === shown.street) ? "checked to you" : "your action"}`;
  const role2 = `${shown.heroIsPfr ? "You raised preflop" : "You called preflop"} · ${shown.heroIP ? "in position" : "out of position"}`;
  const coach = review?.coach;
  const visual = coach ? coach.visual.kind === "price" ? <PriceMeter need={coach.visual.need} have={coach.visual.have} /> : coach.visual.kind === "strength" ? <StrengthMeter eq={coach.visual.eq} bucket={coach.visual.bucket} /> : null : null;
  const result = !review && hand.done ? hand.result : null;
  const handGood = hand.decisions.filter((x) => GRADES[x.grade].correct).length;

  return (
    <div>
      <SessionBar done={handsDone} total={handsTotal} onClose={() => navigate("/")} label={srsKey ? "Replay a mistake" : mission ? `Day ${mission.day} practice` : "Postflop hands"} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
        <div className={review || result ? "pb-[50vh] lg:pb-0" : ""}>
          <div className="flex h-12 items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="t-title truncate">{result ? "Hand complete" : context}</div>
              <div className="t-label truncate">{role2}</div>
            </div>
            {!srsKey && (
              <button className="icon-btn" onClick={() => setShowSetup(true)} aria-label="Practice settings">
                <SlidersHorizontal size={20} />
              </button>
            )}
          </div>
          <div className="mt-2">
            <PokerTable
              seats={seats}
              board={shown.board}
              pot={m(shown.pot)}
              heroCards={shown.heroCards}
              center={review ? <span className="rounded-full bg-gold-400 px-2 text-xs font-semibold text-ink-950">You: {ACTION_NAMES[review.d.chosen]}</span> : null}
            />
          </div>

          {!review && !result && pending && (
            <div className="mt-6 space-y-4">
              <div className={`grid gap-2 ${pending.legal.length <= 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"}`}>
                {pending.legal.map((l) => (
                  <button key={l.action} onClick={() => act(l.action)} className={`flex h-16 flex-col items-center justify-center rounded-2xl text-white transition active:scale-[0.98] ${BTN_STYLE[l.action]}`}>
                    <span className="text-base font-semibold">{l.label}</span>
                    {l.cost > 0 && <span className="num text-xs opacity-80">{m(l.action === "C" ? l.cost : l.to)}</span>}
                  </button>
                ))}
              </div>
              <div className="flex min-h-10 items-center justify-center">
                {hint ? (
                  <p className="t-body animate-fadeUp rounded-xl bg-white/[0.04] px-4 py-2 text-center">💡 {postflopHint(pending)}</p>
                ) : (
                  <button className="btn-text" onClick={() => setHint(true)}>
                    <Lightbulb size={16} /> Need a hint?
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div
          className={
            review || result
              ? "fixed inset-x-0 bottom-0 z-40 max-h-[72vh] animate-sheetUp overflow-y-auto rounded-t-3xl border-t border-white/10 bg-ink-850 px-4 pb-6 pt-4 shadow-sheet lg:static lg:z-auto lg:max-h-none lg:animate-none lg:overflow-visible lg:rounded-2xl lg:border lg:border-white/[0.06] lg:p-6 lg:shadow-card"
              : "hidden lg:block"
          }
        >
          {review && coach ? (
            <Feedback
              coach={coach}
              grade={review.d.grade}
              xp={review.xp}
              visual={visual}
              onLearnMore={() => setLearnMore(true)}
              onNext={cont}
              nextLabel={hand.done ? "See the result" : "Continue hand"}
              context={
                <>
                  <PlayingCard card={shown.heroCards[0]} size="xs" />
                  <PlayingCard card={shown.heroCards[1]} size="xs" />
                  <span className="t-label px-1">on</span>
                  {review.d.board.map((c) => (
                    <PlayingCard key={c} card={c} size="xs" />
                  ))}
                </>
              }
            />
          ) : result ? (
            <div className="space-y-4">
              <div>
                <div className={`t-headline ${result.heroNet >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                  {result.heroNet >= 0 ? "You won" : "You lost"} {m(Math.abs(result.heroNet))}
                </div>
                <div className="t-label">
                  {handGood}/{hand.decisions.length} good decisions this hand
                </div>
              </div>
              <div className="card-flat flex items-center justify-around gap-4">
                <div className="text-center">
                  <div className="flex gap-1">
                    <PlayingCard card={hand.heroCards[0]} size="sm" />
                    <PlayingCard card={hand.heroCards[1]} size="sm" />
                  </div>
                  <div className="t-label mt-2">{result.heroHand}</div>
                </div>
                <span className="t-label">vs</span>
                <div className="text-center">
                  <div className="flex gap-1">
                    <PlayingCard card={hand.villCards[0]} size="sm" />
                    <PlayingCard card={hand.villCards[1]} size="sm" />
                  </div>
                  <div className="t-label mt-2">{result.showdown ? result.villHand : result.foldedBy === "villain" ? "Folded" : result.villHand}</div>
                </div>
              </div>
              <p className="t-label">Judge the decisions, not the result — good plays lose pots sometimes.</p>
              <button className="btn-filled btn-lg w-full" onClick={nextHand}>
                {handsDone + 1 >= handsTotal ? "See results" : "Next hand"}
              </button>
            </div>
          ) : (
            <div className="card-flat text-center">
              <div className="t-title">Your move</div>
              <p className="t-body mt-1 text-ink-300">{shown.line.preflop}</p>
              <p className="t-label mt-4">Keys: X check · C call · 1 2 3 bet · F fold · H hint</p>
            </div>
          )}
        </div>
      </div>

      {review && (
        <PostflopLearnMore open={learnMore} onClose={() => setLearnMore(false)} a={review.d} arch={arch} stake={stake} units={settings.units} heroLabel={posLabel(shown.heroPos)} villLabel={posLabel(shown.villPos)} />
      )}

      <Sheet open={showSetup} onClose={() => setShowSetup(false)} title="Practice settings">
        <div className="space-y-6">
          <div>
            <div className="t-label mb-2">Spots</div>
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
            <div className="t-label mb-2">You are</div>
            <Segmented
              value={role}
              onChange={setRole}
              options={[
                { value: "random", label: "Either" },
                { value: "pfr", label: "Raiser" },
                { value: "caller", label: "Caller" },
              ]}
            />
          </div>
          <div>
            <div className="t-label mb-2">Opponent</div>
            <div className="flex flex-wrap gap-2">
              {(["pool", "gto", "station", "nit", "tag", "lag", "maniac"] as const).map((id) => {
                const a = getArchetype(id, settings.stake);
                return (
                  <button key={id} className={`chip ${settings.villain === id ? "chip-on" : ""}`} onClick={() => setSettings({ villain: id })}>
                    {a.emoji} {a.name}
                  </button>
                );
              })}
            </div>
          </div>
          <button className="btn-filled btn-lg w-full" onClick={() => setShowSetup(false)}>
            Done
          </button>
        </div>
      </Sheet>
    </div>
  );
}
