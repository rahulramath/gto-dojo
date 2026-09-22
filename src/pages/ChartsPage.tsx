import { useMemo, useState } from "react";
import { Brush, Eraser, Eye, GitCompare, Layers, Paintbrush, Play, RotateCcw } from "lucide-react";
import { chartList, CHARTS, ACTION_COLORS } from "../data/charts";
import type { Chart, ChartKind, PfAction } from "../lib/chart";
import { actionPercents, primaryAction } from "../lib/chart";
import { ALL_HANDS, comboCount, handName, type HandClass } from "../lib/cards";
import { features } from "../lib/handStats";
import { RangeGrid, ActionLegend, type GridMode } from "../components/RangeGrid";
import { Segmented, SectionTitle } from "../components/ui";
import { navigate, useRoute } from "../lib/router";
import { useStore } from "../store/store";
import { announce } from "../store/ui";
import { play } from "../lib/sound";
import { pct } from "../lib/format";

const KINDS: { id: ChartKind; label: string }[] = [
  { id: "rfi", label: "Opens (RFI)" },
  { id: "vsOpen", label: "vs Open" },
  { id: "vs3bet", label: "vs 3-Bet" },
  { id: "vs4bet", label: "vs 4-Bet" },
  { id: "vsLimp", label: "Live: Limpers" },
];

function drillLink(c: Chart): { url: string; table?: 6 | 9 } {
  const table = c.format === "9max" ? 9 : undefined;
  if (c.kind === "rfi") return { url: `/preflop?kinds=rfi&pos=${c.hero}`, table };
  if (c.kind === "vsOpen") return { url: `/preflop?kinds=vsOpen${["IP", "SB", "BB"].includes(c.hero) && c.villain === "EP" ? "" : `&pos=${c.hero}`}`, table };
  if (c.kind === "vs3bet") return { url: `/preflop?kinds=vs3bet${c.hero === "EP" ? "" : `&pos=${c.hero}`}`, table };
  if (c.kind === "vs4bet") return { url: `/preflop?kinds=vs4bet` };
  return { url: `/preflop?kinds=vsLimp` };
}

function handNotes(chart: Chart, h: HandClass): string[] {
  const f = chart.freqs[h];
  const main = primaryAction(chart, h);
  const mf = f[main] ?? 0;
  const feat = features(h);
  const out: string[] = [];
  const label = (a: PfAction) => chart.labels[a] ?? a;
  if (mf >= 0.95) out.push(main === chart.rest ? `Always ${label(main).toLowerCase()}s here.` : `Always ${label(main).toLowerCase()} — a core part of this range.`);
  else {
    const parts = chart.actions.filter((a) => (f[a] ?? 0) > 0.02).map((a) => `${label(a)} ${pct(f[a] ?? 0)}`);
    out.push(`Mixed strategy (${parts.join(", ")}). Hands on the edge of a range are close in EV, so solvers randomize to stay unpredictable.`);
  }
  if (feat.category === "premium") out.push("Premium: wants a big pot.");
  if (feat.wheelAce && feat.suited) out.push("Suited wheel ace — a favorite bluff/blocker hand: blocks AA/AK, makes nut flushes and wheels.");
  if (feat.suitedConnector) out.push("Suited connector — plays well postflop and makes disguised straights and flushes.");
  if (feat.smallPair) out.push("Small pair — mostly about flopping a set (1 in 8.5).");
  if (feat.dominated) out.push("Offsuit with a weak kicker — often dominated by better kickers.");
  out.push(`${feat.equity.toFixed(1)}% vs a random hand · top ${feat.top < 1 ? feat.top.toFixed(1) : Math.round(feat.top)}% of hands · ${comboCount(h)} combos.`);
  return out;
}

export function ChartsPage() {
  const { params } = useRoute();
  const initial = CHARTS[params.get("id") ?? ""] ?? CHARTS.rfi_BTN;
  const [kind, setKind] = useState<ChartKind>(initial.kind);
  const [chartId, setChartId] = useState(initial.id);
  const [mode, setMode] = useState<"explore" | "compare" | "paint">("explore");
  const [grid, setGrid] = useState<GridMode>("simple");
  const [selected, setSelected] = useState<HandClass | null>(null);
  const [compareId, setCompareId] = useState<string>("rfi_CO");
  const setSettings = useStore((s) => s.setSettings);

  const list = useMemo(() => chartList().filter((c) => c.kind === kind), [kind]);
  const chart = CHARTS[chartId] ?? list[0];
  const percents = actionPercents(chart);

  const [paint, setPaint] = useState<Record<HandClass, PfAction>>({});
  const [brush, setBrush] = useState<PfAction>("raise");
  const [checked, setChecked] = useState<null | { score: number; diff: Record<HandClass, "ok" | "miss" | "extra"> }>(null);

  const pickChart = (id: string) => {
    setChartId(id);
    setSelected(null);
    setPaint({});
    setChecked(null);
    const c = CHARTS[id];
    setBrush(c.actions.find((a) => a !== c.rest) ?? "raise");
  };

  const compare = CHARTS[compareId];
  const compareDiff = useMemo(() => {
    if (mode !== "compare" || !compare) return undefined;
    const d: Record<HandClass, "ok" | "miss" | "extra"> = {};
    for (const h of ALL_HANDS) {
      const inA = primaryAction(chart, h) !== chart.rest;
      const inB = primaryAction(compare, h) !== compare.rest;
      if (inA && !inB) d[h] = "miss";
      else if (!inA && inB) d[h] = "extra";
    }
    return d;
  }, [chart, compare, mode]);

  const checkPaint = () => {
    const diff: Record<HandClass, "ok" | "miss" | "extra"> = {};
    let union = 0;
    let ok = 0;
    for (const h of ALL_HANDS) {
      const target = primaryAction(chart, h);
      const painted = paint[h] ?? chart.rest;
      const relevant = target !== chart.rest || painted !== chart.rest;
      if (!relevant) continue;
      const n = comboCount(h);
      union += n;
      const accept = painted === target || (chart.freqs[h][painted] ?? 0) >= 0.3;
      if (accept) {
        ok += n;
        diff[h] = "ok";
      } else diff[h] = target !== chart.rest && painted === chart.rest ? "miss" : "extra";
    }
    const score = union ? Math.round((ok / union) * 100) : 0;
    setChecked({ score, diff });
    const r = useStore.getState().recordPaint(chart.id, score);
    announce(r);
    play(score >= 80 ? "perfect" : score >= 60 ? "good" : "bad");
  };

  return (
    <div>
      <SectionTitle
        eyebrow="Chart explorer"
        title="Every seat. Every spot."
        desc="Start with the simple picture, reveal the exact frequencies, then tap any hand to see why it's played that way. Compare seats, or paint a range from memory."
        right={
          <Segmented
            value={mode}
            onChange={(m) => {
              setMode(m);
              setChecked(null);
            }}
            options={[
              { value: "explore", label: <span className="inline-flex items-center gap-1"><Eye size={14} /> Explore</span> },
              { value: "compare", label: <span className="inline-flex items-center gap-1"><GitCompare size={14} /> Compare</span> },
              { value: "paint", label: <span className="inline-flex items-center gap-1"><Paintbrush size={14} /> Paint</span> },
            ]}
          />
        }
      />

      <div className="panel mb-4 space-y-3 p-3">
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {KINDS.map((k) => (
            <button
              key={k.id}
              className={`chip shrink-0 ${kind === k.id ? "chip-on" : ""}`}
              onClick={() => {
                setKind(k.id);
                const first = chartList().find((c) => c.kind === k.id);
                if (first) pickChart(first.id);
              }}
            >
              {k.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {list.map((c) => (
            <button
              key={c.id}
              onClick={() => pickChart(c.id)}
              className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                c.id === chart.id ? "border-sky-400/60 bg-sky-500/15 text-sky-100" : "border-white/10 text-ink-300 hover:bg-white/5"
              }`}
            >
              {c.short}
              {c.format === "9max" && <span className="ml-1 text-[9px] text-amber-300">9-max</span>}
              {c.source === "live" && <span className="ml-1 text-[9px] text-amber-300">live</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="panel p-3 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-display text-lg font-bold text-white">{chart.title}</div>
              <ActionLegend chart={chart} />
            </div>
            {mode === "explore" && (
              <Segmented
                size="sm"
                value={grid}
                onChange={setGrid}
                options={[
                  { value: "simple", label: <span className="inline-flex items-center gap-1"><Layers size={12} /> 1 · Simple</span> },
                  { value: "freq", label: "2 · Frequencies" },
                ]}
              />
            )}
          </div>

          {mode === "paint" ? (
            <>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {chart.actions
                  .filter((a) => a !== chart.rest)
                  .map((a) => (
                    <button key={a} onClick={() => setBrush(a)} className={`chip ${brush === a ? "chip-on" : ""}`}>
                      <Brush size={12} style={{ color: ACTION_COLORS[a] }} /> {chart.labels[a]}
                    </button>
                  ))}
                <button onClick={() => setBrush(chart.rest)} className={`chip ${brush === chart.rest ? "chip-on" : ""}`}>
                  <Eraser size={12} /> Erase
                </button>
                <button
                  className="chip"
                  onClick={() => {
                    setPaint({});
                    setChecked(null);
                  }}
                >
                  <RotateCcw size={12} /> Clear
                </button>
              </div>
              <RangeGrid chart={chart} paint={paint} onPaint={(h) => !checked && setPaint((p) => ({ ...p, [h]: brush }))} diff={checked?.diff} />
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {!checked ? (
                  <button className="btn-primary" onClick={checkPaint}>
                    Check my range
                  </button>
                ) : (
                  <>
                    <div className="font-display text-2xl font-bold text-gold-300">{checked.score}%</div>
                    <div className="text-xs text-ink-300">
                      Blue outline = missed, striped = shouldn't be there. Mixed hands count if the chart plays your action 30%+.
                    </div>
                    <button
                      className="btn-ghost"
                      onClick={() => {
                        setPaint({});
                        setChecked(null);
                      }}
                    >
                      Try again
                    </button>
                  </>
                )}
              </div>
            </>
          ) : mode === "compare" ? (
            <>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-ink-300">
                Compare with
                <select
                  value={compareId}
                  onChange={(e) => setCompareId(e.target.value)}
                  className="rounded-lg border border-white/10 bg-ink-800 px-2 py-1 text-xs text-white"
                >
                  {chartList()
                    .filter((c) => c.kind === chart.kind && c.id !== chart.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.short}
                      </option>
                    ))}
                </select>
              </div>
              <RangeGrid chart={chart} mode="simple" diff={compareDiff} onSelect={setSelected} selected={selected} />
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-ink-300">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm ring-2 ring-inset ring-sky-300" /> Only in {chart.short}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.5)_0_2px,transparent_2px_5px)]" /> Only in {compare?.short}
                </span>
              </div>
            </>
          ) : (
            <RangeGrid chart={chart} mode={grid} onSelect={setSelected} selected={selected} />
          )}
        </div>

        <div className="space-y-3">
          <div className="panel p-4">
            <div className="label mb-2">Range size</div>
            <div className="flex flex-wrap gap-2">
              {chart.actions.map((a) => (
                <div key={a} className="rounded-lg bg-black/25 px-3 py-2">
                  <div className="text-[11px] text-ink-400">{chart.labels[a]}</div>
                  <div className="num text-lg font-bold" style={{ color: a === chart.rest ? "#cbd5e1" : ACTION_COLORS[a] }}>
                    {percents[a].toFixed(1)}%
                  </div>
                  <div className="num text-[10px] text-ink-400">{Math.round((percents[a] / 100) * 1326)} combos</div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-[11px] text-ink-400">
              {chart.source === "live" ? "Live exploit chart — coaching heuristics for loose live games, not solver output." : "Solver-approximated 100bb baseline, rounded to learnable frequencies."}
            </div>
          </div>

          <div className="panel p-4">
            <div className="label mb-2">3 · Why — {selected ? handName(selected) : "tap a hand"}</div>
            {selected ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {chart.actions.map((a) => (
                    <span key={a} className="rounded-md px-2 py-1 text-xs font-semibold text-white" style={{ background: a === chart.rest ? "#334155" : `${ACTION_COLORS[a]}cc` }}>
                      {chart.labels[a]} {pct(chart.freqs[selected][a] ?? 0)}
                    </span>
                  ))}
                </div>
                <ul className="space-y-1 text-xs text-ink-200">
                  {handNotes(chart, selected).map((n) => (
                    <li key={n}>• {n}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-ink-400">Select any cell to see its frequencies and the reasoning behind them.</p>
            )}
          </div>

          <div className="panel p-4">
            <div className="label mb-2">Key takeaways</div>
            <ul className="space-y-1.5 text-sm text-ink-200">
              {(chart.notes ?? []).map((n) => (
                <li key={n}>• {n}</li>
              ))}
            </ul>
            <button
              className="btn-primary mt-3 w-full"
              onClick={() => {
                const l = drillLink(chart);
                if (l.table) setSettings({ table: l.table });
                navigate(l.url);
              }}
            >
              <Play size={16} /> Drill this chart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
