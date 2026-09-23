import { useMemo, useState } from "react";
import type { Archetype } from "../data/archetypes";
import type { Stake } from "../data/stakes";
import { LEGEND_BY_ID } from "../data/legends";
import { actionPercents } from "../lib/chart";
import { combosFromWeights, equityVsRange } from "../lib/equity";
import { preflopIdea, preflopMath } from "../lib/explainPreflop";
import { postflopLearn } from "../lib/explainPostflop";
import type { Units } from "../lib/format";
import type { Analysis } from "../lib/postflop";
import type { PreflopSpot } from "../lib/preflop";
import { mulberry32 } from "../lib/rng";
import { ActionLegend, RangeGrid } from "./RangeGrid";
import { MixBar, MixLegend } from "./visuals";
import { Segmented, Sheet, Switch } from "./ui";

function Rows({ rows }: { rows: { label: string; value: string; highlight?: boolean }[] }) {
  return (
    <div className="divide-y divide-white/[0.06] rounded-xl bg-white/[0.03]">
      {rows.map((r) => (
        <div key={r.label} className="flex min-h-12 items-center justify-between gap-4 px-4 py-2">
          <span className="t-body">{r.label}</span>
          <span className={`num t-body font-semibold ${r.highlight ? "text-gold-200" : "text-ink-100"}`}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

function ExploitTab({ arch, text, tips }: { arch: Archetype; text: string; tips: string[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span className="text-3xl">{arch.emoji}</span>
        <div>
          <div className="t-title">{arch.name}</div>
          <div className="t-label">{arch.blurb}</div>
        </div>
      </div>
      <p className="t-body rounded-xl bg-orange-500/10 p-4 text-orange-100">{text}</p>
      {tips.length > 0 && (
        <ul className="space-y-2">
          {tips.map((t) => (
            <li key={t} className="t-body flex gap-2">
              <span className="text-emerald-400">✓</span> {t}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Real quotes get quotation marks. Paraphrased ideas never do. */
function Legend({ id }: { id: string }) {
  const l = LEGEND_BY_ID[id];
  if (!l) return null;
  return (
    <div className="border-l-2 border-emerald-400/50 pl-4">
      {l.quote ? <p className="t-body italic text-ink-100">“{l.quote}”</p> : <p className="t-body text-ink-100">{l.idea}</p>}
      <p className="t-label mt-1">{l.quote ? l.name : `An idea from ${l.name}`}</p>
    </div>
  );
}

type Tab = "chart" | "numbers" | "exploit" | "idea" | "ranges";

export function PreflopLearnMore({ open, onClose, spot, arch, stake, units, exploitNote }: { open: boolean; onClose: () => void; spot: PreflopSpot; arch: Archetype; stake: Stake; units: Units; exploitNote: string }) {
  const [tab, setTab] = useState<Tab>("chart");
  const [mixes, setMixes] = useState(false);
  const idea = useMemo(() => preflopIdea(spot), [spot]);
  const math = useMemo(() => {
    if (!open) return null;
    const eq = spot.villainRange ? equityVsRange(spot.cards, [], combosFromWeights(spot.villainRange), 2500, mulberry32(5)).equity : null;
    return preflopMath(spot, stake, units, eq);
  }, [open, spot, stake, units]);
  const p = actionPercents(spot.chart);
  return (
    <Sheet open={open} onClose={onClose} title="Learn more" wide>
      <Segmented
        full
        value={tab}
        onChange={setTab}
        options={[
          { value: "chart", label: "Chart" },
          { value: "numbers", label: "Numbers" },
          { value: "exploit", label: "Exploit" },
          { value: "idea", label: "Idea" },
        ]}
      />
      <div className="mt-6 min-h-[320px]">
        {tab === "chart" && (
          <div className="space-y-4">
            <div>
              <div className="t-title">{spot.chart.title}</div>
              <div className="t-label">
                {spot.chart.actions
                  .filter((a) => a !== spot.chart.rest)
                  .map((a) => `${spot.chart.labels[a]} ${Math.round(p[a])}%`)
                  .join(" · ")}
              </div>
            </div>
            <RangeGrid chart={spot.chart} mode={mixes ? "freq" : "simple"} highlight={spot.hand} />
            <ActionLegend chart={spot.chart} />
            <Switch checked={mixes} onChange={setMixes} label="Show mixed hands" hint="Split squares are hands you play more than one way." />
          </div>
        )}
        {tab === "numbers" && math && (
          <div className="space-y-4">
            <Rows rows={math.rows} />
            {math.note && <p className="t-body">{math.note}</p>}
          </div>
        )}
        {tab === "exploit" && <ExploitTab arch={arch} text={exploitNote} tips={stake.pool.exploits.slice(0, 3)} />}
        {tab === "idea" && (
          <div className="space-y-4">
            <div>
              <div className="t-title">{idea.title}</div>
              <p className="t-body mt-2">{idea.body}</p>
            </div>
            <ul className="space-y-2">
              {idea.notes.map((n) => (
                <li key={n} className="t-body flex gap-2">
                  <span className="text-gold-300">•</span> {n}
                </li>
              ))}
            </ul>
            <Legend id={idea.legendId} />
          </div>
        )}
      </div>
    </Sheet>
  );
}

export function PostflopLearnMore({ open, onClose, a, arch, stake, units, heroLabel, villLabel }: { open: boolean; onClose: () => void; a: Analysis; arch: Archetype; stake: Stake; units: Units; heroLabel: string; villLabel: string }) {
  const [tab, setTab] = useState<Tab>("ranges");
  const learn = useMemo(() => postflopLearn(a, arch, stake, units), [a, arch, stake, units]);
  return (
    <Sheet open={open} onClose={onClose} title="Learn more" wide>
      <Segmented
        full
        value={tab}
        onChange={setTab}
        options={[
          { value: "ranges", label: "Ranges" },
          { value: "numbers", label: "Numbers" },
          { value: "exploit", label: "Exploit" },
          { value: "idea", label: "Idea" },
        ]}
      />
      <div className="mt-6 min-h-[320px]">
        {tab === "ranges" && (
          <div className="space-y-4">
            <MixBar mix={a.heroMix} label={`Your range (${heroLabel})`} />
            <MixBar mix={a.villMix} label={`${villLabel}'s range right now`} />
            <MixLegend />
            <p className="t-body">{learn.ranges}</p>
          </div>
        )}
        {tab === "numbers" && (
          <div className="space-y-4">
            <Rows rows={learn.rows} />
            {learn.note && <p className="t-body">{learn.note}</p>}
          </div>
        )}
        {tab === "exploit" && <ExploitTab arch={arch} text={learn.exploit.text} tips={learn.exploit.tips} />}
        {tab === "idea" && (
          <div className="space-y-4">
            <div>
              <div className="t-title">{learn.strategy.title}</div>
              <p className="t-body mt-2">{learn.strategy.body}</p>
            </div>
            <div>
              <div className="t-title">{learn.board.title}</div>
              {learn.board.note && <p className="t-body mt-2">{learn.board.note}</p>}
            </div>
            <Legend id={learn.legendId} />
          </div>
        )}
      </div>
    </Sheet>
  );
}
