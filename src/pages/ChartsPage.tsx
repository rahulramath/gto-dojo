import { useMemo, useState } from "react";
import { Eraser, Play, RotateCcw } from "lucide-react";
import { chartList, CHARTS, ACTION_COLORS } from "../data/charts";
import type { Chart, ChartKind, PfAction } from "../lib/chart";
import { actionPercents, primaryAction } from "../lib/chart";
import { ALL_HANDS, comboCount, handName, type HandClass } from "../lib/cards";
import { features } from "../lib/handStats";
import { ActionLegend, RangeGrid } from "../components/RangeGrid";
import { FreqBar, PageHeader, Segmented, Switch } from "../components/ui";
import { navigate, useRoute } from "../lib/router";
import { useStore } from "../store/store";
import { announce } from "../store/ui";
import { play } from "../lib/sound";

const KINDS: { id: ChartKind; label: string }[] = [
  { id: "rfi", label: "Opening" },
  { id: "vsOpen", label: "Facing a raise" },
  { id: "vs3bet", label: "Facing a 3-bet" },
  { id: "vs4bet", label: "Facing a 4-bet" },
  { id: "vsLimp", label: "Limpers" },
];

function drillLink(c: Chart): { url: string; table?: 6 | 9 } {
  const table = c.format === "9max" ? 9 : undefined;
  const pos = ["IP", "EP", "3-bettor", "EP-HJ", "CO-BTN", "Any non-blind"].includes(c.hero) ? "" : `&pos=${c.hero}`;
  const kinds: Record<ChartKind, string> = { rfi: "rfi", vsOpen: "vsOpen", vs3bet: "vs3bet", vs4bet: "vs4bet", vsLimp: "vsLimp" };
  return { url: `/preflop?kinds=${kinds[c.kind]}${c.kind === "vs4bet" || c.kind === "vsLimp" ? "" : pos}`, table };
}

function handLine(chart: Chart, h: HandClass): string {
  const f = features(h);
  const main = primaryAction(chart, h);
  const mf = chart.freqs[h][main] ?? 0;
  const label = (chart.labels[main] ?? main).toLowerCase();
  if (mf < 0.95) return "It's on the edge of the range, so you play it more than one way.";
  if (main === chart.rest) return f.dominated ? `You always ${label} this. Better kickers dominate it.` : `You always ${label} this. It's outside the range.`;
  return f.category === "premium" ? `You always ${label} this. It's one of the best hands.` : `You always ${label} this. It's well inside the range.`;
}

export function ChartsPage() {
  const { params } = useRoute();
  const initial = CHARTS[params.get("id") ?? ""] ?? CHARTS.rfi_BTN;
  const [kind, setKind] = useState<ChartKind>(initial.kind);
  const [chartId, setChartId] = useState(initial.id);
  const [mode, setMode] = useState<"view" | "compare" | "quiz">("view");
  const [mixes, setMixes] = useState(false);
  const [selected, setSelected] = useState<HandClass | null>(null);
  const [compareId, setCompareId] = useState<string>("rfi_CO");
  const [paint, setPaint] = useState<Record<HandClass, PfAction>>({});
  const [brush, setBrush] = useState<PfAction>("raise");
  const [checked, setChecked] = useState<null | { score: number; diff: Record<HandClass, "ok" | "miss" | "extra"> }>(null);
  const setSettings = useStore((s) => s.setSettings);

  const list = useMemo(() => chartList().filter((c) => c.kind === kind), [kind]);
  const chart = CHARTS[chartId] ?? list[0];
  const p = actionPercents(chart);
  const compareList = chartList().filter((c) => c.kind === chart.kind && c.id !== chart.id);
  const compare = CHARTS[compareId] && CHARTS[compareId].kind === chart.kind && compareId !== chart.id ? CHARTS[compareId] : compareList[0];

  const pick = (id: string) => {
    setChartId(id);
    setSelected(null);
    setPaint({});
    setChecked(null);
    const c = CHARTS[id];
    setBrush(c.actions.find((a) => a !== c.rest) ?? "raise");
  };

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

  const check = () => {
    const diff: Record<HandClass, "ok" | "miss" | "extra"> = {};
    let union = 0;
    let ok = 0;
    for (const h of ALL_HANDS) {
      const target = primaryAction(chart, h);
      const painted = paint[h] ?? chart.rest;
      if (target === chart.rest && painted === chart.rest) continue;
      const n = comboCount(h);
      union += n;
      if (painted === target || (chart.freqs[h][painted] ?? 0) >= 0.3) {
        ok += n;
        diff[h] = "ok";
      } else diff[h] = target !== chart.rest && painted === chart.rest ? "miss" : "extra";
    }
    const score = union ? Math.round((ok / union) * 100) : 0;
    setChecked({ score, diff });
    announce(useStore.getState().recordPaint(chart.id, score));
    play(score >= 80 ? "perfect" : score >= 60 ? "good" : "bad");
  };

  const summary = chart.actions
    .filter((a) => a !== chart.rest)
    .map((a) => `${chart.labels[a]} ${Math.round(p[a])}%`)
    .join(" · ");

  return (
    <div className="space-y-6">
      <PageHeader title="Charts" subtitle="Every range at a glance. Tap a hand to see why." />

      <div className="space-y-2">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {KINDS.map((k) => (
            <button
              key={k.id}
              className={`chip shrink-0 ${kind === k.id ? "chip-on" : ""}`}
              onClick={() => {
                setKind(k.id);
                const first = chartList().find((c) => c.kind === k.id);
                if (first) pick(first.id);
              }}
            >
              {k.label}
            </button>
          ))}
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {list.map((c) => (
            <button key={c.id} onClick={() => pick(c.id)} className={`chip shrink-0 ${c.id === chart.id ? "border-sky-400/60 bg-sky-500/15 text-sky-100" : ""}`}>
              {c.short}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
        <div className="card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="t-title">{chart.title}</h2>
              <div className="t-label">{summary}</div>
            </div>
            <Segmented
              value={mode}
              onChange={(m) => {
                setMode(m);
                setChecked(null);
              }}
              options={[
                { value: "view", label: "View" },
                { value: "compare", label: "Compare" },
                { value: "quiz", label: "Quiz me" },
              ]}
            />
          </div>

          {mode === "quiz" ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {chart.actions
                  .filter((a) => a !== chart.rest)
                  .map((a) => (
                    <button key={a} onClick={() => setBrush(a)} className={`chip ${brush === a ? "chip-on" : ""}`}>
                      <span className="h-2 w-2 rounded-full" style={{ background: ACTION_COLORS[a] }} /> {chart.labels[a]}
                    </button>
                  ))}
                <button onClick={() => setBrush(chart.rest)} className={`chip ${brush === chart.rest ? "chip-on" : ""}`}>
                  <Eraser size={16} /> Erase
                </button>
                <button
                  className="chip"
                  onClick={() => {
                    setPaint({});
                    setChecked(null);
                  }}
                >
                  <RotateCcw size={16} /> Clear
                </button>
              </div>
              <p className="t-label">Paint the range from memory, then check it.</p>
              <RangeGrid chart={chart} paint={paint} onPaint={(h) => !checked && setPaint((x) => ({ ...x, [h]: brush }))} diff={checked?.diff} />
              {checked ? (
                <div className="flex flex-wrap items-center gap-4">
                  <span className="num text-2xl font-bold text-gold-300">{checked.score}%</span>
                  <span className="t-label flex-1">Blue outline means you missed it. Stripes mean it shouldn't be there.</span>
                  <button
                    className="btn-outline"
                    onClick={() => {
                      setPaint({});
                      setChecked(null);
                    }}
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <button className="btn-filled" onClick={check}>
                  Check my range
                </button>
              )}
            </>
          ) : mode === "compare" ? (
            <>
              <div className="no-scrollbar -mx-2 flex gap-2 overflow-x-auto px-2">
                <span className="t-label flex shrink-0 items-center">vs</span>
                {compareList.map((c) => (
                  <button key={c.id} onClick={() => setCompareId(c.id)} className={`chip shrink-0 ${compare?.id === c.id ? "chip-on" : ""}`}>
                    {c.short}
                  </button>
                ))}
              </div>
              <RangeGrid chart={chart} mode="simple" diff={compareDiff} />
              <div className="flex flex-wrap gap-4">
                <span className="t-label inline-flex items-center gap-2">
                  <span className="h-4 w-4 rounded ring-2 ring-inset ring-sky-300" /> Only in {chart.short}
                </span>
                <span className="t-label inline-flex items-center gap-2">
                  <span className="h-4 w-4 rounded bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.5)_0_2px,transparent_2px_5px)]" /> Only in {compare?.short}
                </span>
              </div>
            </>
          ) : (
            <>
              <RangeGrid chart={chart} mode={mixes ? "freq" : "simple"} onSelect={setSelected} selected={selected} />
              <div className="flex flex-wrap items-center justify-between gap-4">
                <ActionLegend chart={chart} />
              </div>
              <div className="border-t border-white/[0.06] pt-2">
                <Switch checked={mixes} onChange={setMixes} label="Show mixed hands" hint="Split squares are hands you play more than one way." />
              </div>
            </>
          )}
        </div>

        <div className="space-y-4">
          <div className="card">
            {selected && mode === "view" ? (
              <div className="space-y-4">
                <div>
                  <div className="t-title">{selected}</div>
                  <div className="t-label">{handName(selected)}</div>
                </div>
                <FreqBar parts={chart.actions.map((a) => ({ label: chart.labels[a] ?? a, value: chart.freqs[selected][a] ?? 0, color: a === chart.rest ? "#475569" : ACTION_COLORS[a] }))} />
                <p className="t-body">{handLine(chart, selected)}</p>
              </div>
            ) : (
              <div>
                <div className="t-title">Key idea</div>
                <p className="t-body mt-2">{chart.notes?.[0] ?? "Tap any hand to see how often you play it."}</p>
                {chart.source === "live" && <p className="t-label mt-2 text-amber-200">Built for loose live games rather than from a solver.</p>}
              </div>
            )}
          </div>
          <button
            className="btn-filled btn-lg w-full"
            onClick={() => {
              const l = drillLink(chart);
              if (l.table) setSettings({ table: l.table });
              navigate(l.url);
            }}
          >
            <Play size={16} /> Practice this spot
          </button>
        </div>
      </div>
    </div>
  );
}
