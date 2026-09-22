import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CircleCheck, Lightbulb, SlidersHorizontal } from "lucide-react";
import { navigate, useRoute } from "../lib/router";
import { applyUrlSettings, dueCards, missionFrom, useStore } from "../store/store";
import { announce, useUi } from "../store/ui";
import { STAKES } from "../data/stakes";
import { getArchetype } from "../data/archetypes";
import { POSITIONS_6, posLabel, positionsFor, type PosId } from "../data/positions";
import { generateSpot, gradePreflop, parseSpotKey, preflopExploit, SPOT_KINDS, type ExploitVerdict, type PreflopResult, type PreflopSpot, type SpotKind } from "../lib/preflop";
import { preflopCoach, preflopContext, preflopHint, type Coach } from "../lib/coachText";
import { gradeFreq, GRADES } from "../lib/grading";
import { mulberry32, randomSeed, type Rng } from "../lib/rng";
import { fmtMoney, todayKey } from "../lib/format";
import { recentAccuracy } from "../lib/progression";
import type { PfAction } from "../lib/chart";
import { play } from "../lib/sound";
import { PokerTable, type TableSeat } from "../components/PokerTable";
import { PlayingCard } from "../components/PlayingCard";
import { Feedback } from "../components/Feedback";
import { PreflopLearnMore } from "../components/LearnMore";
import { PriceMeter, RangeSnippet } from "../components/visuals";
import { SessionBar, SessionSummary, type SessionResult } from "../components/Session";
import { EmptyState, Segmented, Sheet } from "../components/ui";

export type PreflopMode = "free" | "today" | "daily" | "review";

const ACTION_STYLE: Record<PfAction, string> = {
  fold: "bg-slate-700 hover:bg-slate-600",
  call: "bg-emerald-600 hover:bg-emerald-500",
  check: "bg-teal-600 hover:bg-teal-500",
  raise: "bg-rose-600 hover:bg-rose-500",
  allin: "bg-purple-600 hover:bg-purple-500",
};
const KEY_FOR: Record<PfAction, string> = { fold: "f", call: "c", check: "c", raise: "r", allin: "a" };

function seedFrom(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function parseList<T extends string>(v: string | null, allowed: readonly T[]): T[] {
  if (!v) return [];
  return v.split(",").filter((x): x is T => (allowed as readonly string[]).includes(x));
}

interface Answer {
  action: PfAction;
  res: PreflopResult;
  exploit: ExploitVerdict;
  coach: Coach;
  xp: number;
}

export function PreflopSession({ mode }: { mode: PreflopMode }) {
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

  const allKinds = SPOT_KINDS.map((k) => k.id);
  const urlTable = Number(params.get("table"));
  const [kinds, setKinds] = useState<SpotKind[]>(() => {
    const p = parseList(params.get("kinds"), allKinds);
    if (p.length) return p;
    return settings.stake === "online" ? ["rfi", "vsOpen", "vs3bet"] : ["rfi", "vsOpen", "vs3bet", "vsLimp"];
  });
  const [positions, setPositions] = useState<PosId[]>(() => parseList(params.get("pos"), positionsFor(urlTable === 6 || urlTable === 9 ? urlTable : settings.table)));
  const [showSetup, setShowSetup] = useState(false);

  const [initialDue] = useState(() => dueCards(useStore.getState().srs).filter((c) => c.mode === "pre").length);
  const [total] = useState(() => (mode === "review" ? Math.max(1, Math.min(10, initialDue)) : mission?.target ?? (Number(params.get("n")) || 10)));

  const queue = useRef<string[]>(
    mode === "review" || mode === "today"
      ? dueCards(useStore.getState().srs)
          .filter((c) => c.mode === "pre")
          .slice(0, mode === "review" ? 10 : 3)
          .map((c) => c.key)
      : [],
  );
  const srsKeyRef = useRef<string | null>(null);

  const weakSeats = useMemo(() => {
    const pos = useStore.getState().pos;
    return POSITIONS_6.slice()
      .sort((a, b) => (pos[a] ? recentAccuracy(pos[a]) : 0.5) - (pos[b] ? recentAccuracy(pos[b]) : 0.5))
      .slice(0, 2);
  }, []);

  /** Spot for position i in the session. Depends only on i, so it's safe to call twice. */
  const makeSpot = useCallback(
    (i: number): PreflopSpot => {
      const units = settings.units;
      const key = queue.current[i];
      srsKeyRef.current = null;
      if (key) {
        try {
          const req = parseSpotKey(key);
          srsKeyRef.current = key;
          return generateSpot({ table: req.table, kinds: [req.kind], heroPositions: [], stake, sizing: settings.sizing, units, rng: mulberry32(seedFrom(`${key}-${i}`)), request: req });
        } catch {
          srsKeyRef.current = null;
        }
      }
      const liveKinds: SpotKind[] = stake.id === "online" ? ["rfi", "vsOpen", "vs3bet"] : ["rfi", "vsOpen", "vs3bet", "vsLimp"];
      if (mode === "daily") {
        const rng: Rng = mulberry32(seedFrom(`daily-${todayKey()}-${stake.id}-${settings.table}-${i}`));
        return generateSpot({ table: settings.table, kinds: liveKinds, heroPositions: [], stake, sizing: settings.sizing, units, rng });
      }
      const rng = mulberry32(randomSeed());
      const heroes = mode === "today" && rng() < 0.5 ? weakSeats : positions;
      return generateSpot({ table: settings.table, kinds: mode === "today" ? liveKinds : kinds.length ? kinds : ["rfi"], heroPositions: heroes, stake, sizing: settings.sizing, units, rng });
    },
    [kinds, mode, positions, settings.sizing, settings.table, settings.units, stake, weakSeats],
  );

  const [spot, setSpot] = useState<PreflopSpot>(() => makeSpot(0));
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [done, setDone] = useState(0);
  const [results, setResults] = useState<SessionResult[]>([]);
  const [xpSum, setXpSum] = useState(0);
  const [finished, setFinished] = useState<{ xp: number } | null>(null);
  const [hint, setHint] = useState(false);
  const [learnMore, setLearnMore] = useState(false);

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (mode === "free" && !answer && !finished) setSpot(makeSpot(done));
  }, [makeSpot]);

  const amount = useCallback((bb: number) => fmtMoney(bb, stake, settings.units), [settings.units, stake]);
  const context = preflopContext(spot, amount);

  const act = useCallback(
    (a: PfAction) => {
      if (answer || finished) return;
      const res = gradePreflop(spot, a);
      const ex = preflopExploit(spot, arch);
      const exGrade = gradeFreq(ex.freqs[a] ?? 0, ex.freqs[ex.best] ?? 0);
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
        arch: arch.id,
        base: spot.chart.freqs[spot.hand] as Record<string, number>,
        srs: { key: spot.key, mode: "pre", label: `${spot.hand} · ${posLabel(spot.hero, spot.table)} · ${preflopContext(spot, amount)}` },
        flags: { rfi: spot.kind === "rfi", iso: spot.kind === "vsLimp", vsOpen: spot.kind === "vsOpen" },
      });
      if (srsKeyRef.current === spot.key) store.reviewSrs(spot.key, reward.correct);
      if (mission) store.recordDrill(`day-${mission.day}`, reward.correct);
      const coach = preflopCoach(spot, a, res.grade, res.best, ex, arch);
      play(res.grade === "perfect" ? "perfect" : GRADES[res.grade].correct ? "good" : "bad");
      announce(reward);
      setAnswer({ action: a, res, exploit: ex, coach, xp: reward.xp });
      setXpSum((x) => x + reward.xp);
      setDone((d) => d + 1);
      setResults((r) => [...r, { ok: reward.correct, title: `${spot.hand} · ${posLabel(spot.hero, spot.table)} · ${context}`, detail: `${coach.headline} — ${coach.lines[coach.lines.length - 1].text}` }]);
    },
    [amount, answer, arch, context, finished, mission, spot],
  );

  const next = useCallback(() => {
    if (!answer) return;
    setHint(false);
    setLearnMore(false);
    if (done >= total) {
      const score = results.filter((r) => r.ok).length;
      const marks = results.map((r) => (r.ok ? "🟩" : "🟥")).join("");
      const reward = useStore.getState().recordSession(mode === "free" && mission ? "mission" : mode, score, results.length, marks);
      announce(reward);
      if (score === results.length) useUi.getState().burst();
      setFinished({ xp: xpSum + reward.xp });
      setAnswer(null);
      return;
    }
    setAnswer(null);
    setSpot(makeSpot(done));
    play("deal");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [answer, done, makeSpot, mission, mode, results, total, xpSum]);

  const restart = () => {
    queue.current = [];
    setResults([]);
    setDone(0);
    setXpSum(0);
    setFinished(null);
    setSpot(makeSpot(0));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || learnMore || showSetup) return;
      const k = e.key.toLowerCase();
      if (answer && (k === " " || k === "enter")) {
        e.preventDefault();
        next();
        return;
      }
      if (!answer && !finished) {
        if (k === "h" && mode !== "daily") setHint(true);
        const opt = spot.options.find((o) => KEY_FOR[o.key] === k);
        if (opt) act(opt.key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [act, answer, finished, learnMore, mode, next, showSetup, spot]);

  const seats: TableSeat[] = useMemo(() => {
    const hi = spot.seats.findIndex((s) => s.status === "hero");
    const rotated = [...spot.seats.slice(hi), ...spot.seats.slice(0, hi)];
    return rotated.map((s) => ({
      key: s.pos,
      label: s.label,
      stack: fmtMoney(s.stackBB, stake, settings.units),
      bet: s.betBB > 0 ? fmtMoney(s.betBB, stake, settings.units) : undefined,
      status: s.status === "hero" ? "hero" : s.status === "folded" ? "folded" : s.status === "acted" ? "active" : "waiting",
      action: s.status === "acted" ? s.action?.split(" ")[0] : undefined,
      isButton: s.isButton,
      badge: s.isVillain ? arch.emoji : undefined,
      cards: null,
      highlight: s.isVillain,
    }));
  }, [arch.emoji, settings.units, spot, stake]);

  const title = mode === "daily" ? `Daily Challenge · ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : mode === "review" ? "Fix your mistakes" : mission ? `Day ${mission.day} practice` : mode === "today" ? "Today's session" : "Preflop practice";

  if (mode === "review" && initialDue === 0 && !finished) {
    return (
      <div>
        <SessionBar done={0} total={1} onClose={() => navigate("/")} label="Fix your mistakes" />
        <EmptyState icon={CircleCheck} title="Nothing to fix right now" body="Mistakes you make come back here at growing intervals until you get them right." action={<button className="btn-filled" onClick={() => navigate("/preflop?mode=today")}>Start today's session</button>} />
      </div>
    );
  }

  if (finished) {
    const score = results.filter((r) => r.ok).length;
    const passed = mission ? score / results.length >= mission.acc : null;
    const share =
      mode === "daily" ? `GTO Dojo Daily · ${todayKey()}\n${score}/${results.length} ${results.map((r) => (r.ok ? "🟩" : "🟥")).join("")}\nhttps://rahulramath.github.io/gto-dojo/` : undefined;
    return (
      <SessionSummary
        results={results}
        xp={finished.xp}
        onDone={() => navigate(mission ? `/lesson?day=${mission.day}` : "/")}
        doneLabel={mission ? "Back to lesson" : "Done"}
        onAgain={mode === "daily" || mode === "review" ? undefined : restart}
        share={share}
      >
        {mission && (
          <p className={`t-body mt-4 font-semibold ${passed ? "text-emerald-300" : "text-rose-300"}`}>
            {passed ? `Practice passed — ${Math.round(mission.acc * 100)}% needed.` : `Need ${Math.round(mission.acc * 100)}% to pass. Try again.`}
          </p>
        )}
      </SessionSummary>
    );
  }

  const coach = answer?.coach;
  const visual =
    coach?.visual.kind === "price" ? (
      <PriceMeter need={coach.visual.need} have={coach.visual.have} />
    ) : (
      <RangeSnippet chart={spot.chart} hand={spot.hand} caption={`${spot.chart.title}`} />
    );

  return (
    <div>
      <SessionBar done={done} total={total} onClose={() => navigate("/")} label={title} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
        <div className={answer ? "pb-[50vh] lg:pb-0" : ""}>
          <div className="flex h-12 items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="t-title truncate">{context}</div>
              <div className="t-label truncate">You're {seatPhrase(spot.hero, spot.table)}</div>
            </div>
            {mode === "free" && (
              <button className="icon-btn" onClick={() => setShowSetup(true)} aria-label="Practice settings">
                <SlidersHorizontal size={20} />
              </button>
            )}
          </div>

          <div className="mt-2">
            <PokerTable seats={seats} pot={fmtMoney(spot.potBB, stake, settings.units)} heroCards={spot.cards} />
          </div>

          {!answer && (
            <div className="mt-6 space-y-4">
              <div className={`grid gap-2 ${spot.options.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                {spot.options.map((o) => (
                  <button key={o.key} onClick={() => act(o.key)} className={`flex h-16 flex-col items-center justify-center rounded-2xl text-white transition active:scale-[0.98] ${ACTION_STYLE[o.key]}`}>
                    <span className="text-base font-semibold">{o.label}</span>
                    {o.costBB > 0 && <span className="num text-xs opacity-80">{o.key === "call" && spot.kind !== "rfi" ? amount(o.costBB) : `to ${amount(o.toBB)}`}</span>}
                  </button>
                ))}
              </div>
              {mode !== "daily" && (
                <div className="flex min-h-10 items-center justify-center">
                  {hint ? (
                    <p className="t-body animate-fadeUp rounded-xl bg-white/[0.04] px-4 py-2 text-center">💡 {preflopHint(spot)}</p>
                  ) : (
                    <button className="btn-text" onClick={() => setHint(true)}>
                      <Lightbulb size={16} /> Need a hint?
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div
          className={
            answer
              ? "fixed inset-x-0 bottom-0 z-40 max-h-[72vh] animate-sheetUp overflow-y-auto rounded-t-3xl border-t border-white/10 bg-ink-850 px-4 pb-6 pt-4 shadow-sheet lg:static lg:z-auto lg:max-h-none lg:animate-none lg:overflow-visible lg:rounded-2xl lg:border lg:border-white/[0.06] lg:p-6 lg:shadow-card"
              : "hidden lg:block"
          }
        >
          {answer && coach ? (
            <Feedback
              coach={coach}
              grade={answer.res.grade}
              xp={answer.xp}
              visual={visual}
              onLearnMore={() => setLearnMore(true)}
              onNext={next}
              nextLabel={done >= total ? "See results" : "Next hand"}
              context={
                <>
                  <PlayingCard card={spot.cards[0]} size="xs" />
                  <PlayingCard card={spot.cards[1]} size="xs" />
                  <span className="t-label truncate text-ink-100">
                    {posLabel(spot.hero, spot.table)} · {context}
                  </span>
                </>
              }
            />
          ) : (
            <div className="card-flat text-center">
              <div className="t-title">Your move</div>
              <p className="t-body mt-1 text-ink-300">Pick an action. You'll see right away why it works — or why it doesn't.</p>
              <p className="t-label mt-4">Keys: F fold · C call · R raise · H hint</p>
            </div>
          )}
        </div>
      </div>

      {answer && (
        <PreflopLearnMore open={learnMore} onClose={() => setLearnMore(false)} spot={spot} arch={arch} stake={stake} units={settings.units} exploitNote={answer.exploit.note} />
      )}

      <Sheet open={showSetup} onClose={() => setShowSetup(false)} title="Practice settings">
        <div className="space-y-6">
          <div>
            <div className="t-label mb-2">Spots</div>
            <div className="flex flex-wrap gap-2">
              {SPOT_KINDS.map((k) => {
                const on = kinds.includes(k.id);
                return (
                  <button key={k.id} className={`chip ${on ? "chip-on" : ""}`} onClick={() => setKinds(on ? kinds.filter((x) => x !== k.id) : [...kinds, k.id])}>
                    {k.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="t-label mb-2">Your seat (none = all)</div>
            <div className="flex flex-wrap gap-2">
              {positionsFor(settings.table).map((p) => {
                const on = positions.includes(p);
                return (
                  <button key={p} className={`chip ${on ? "chip-on" : ""}`} onClick={() => setPositions(on ? positions.filter((x) => x !== p) : [...positions, p])}>
                    {posLabel(p, settings.table)}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="t-label mb-2">Table</div>
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
          <button className="btn-filled btn-lg w-full" onClick={() => setShowSetup(false)}>
            Done
          </button>
        </div>
      </Sheet>
    </div>
  );
}

const SEAT_PHRASE: Record<string, string> = {
  UTG: "under the gun",
  "UTG+1": "in UTG+1",
  "UTG+2": "in UTG+2",
  LJ: "in the lojack",
  HJ: "in the hijack",
  CO: "in the cutoff",
  BTN: "on the button",
  SB: "in the small blind",
  BB: "in the big blind",
};

export const seatPhrase = (pos: PosId, table: 6 | 9) => SEAT_PHRASE[posLabel(pos, table)] ?? `in the ${posLabel(pos, table)}`;
