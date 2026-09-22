import { useRef, useState } from "react";
import { Download, Upload, RotateCcw } from "lucide-react";
import { STAKE_LIST } from "../data/stakes";
import { ARCHETYPE_IDS, getArchetype } from "../data/archetypes";
import { useStore } from "../store/store";
import { useUi } from "../store/ui";
import { Modal, Segmented, SectionTitle, Toggle } from "../components/ui";

export function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const set = useStore((s) => s.setSettings);
  const [confirm, setConfirm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const exportData = () => {
    const raw = localStorage.getItem("gto-dojo-v1") ?? "{}";
    const blob = new Blob([raw], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `gto-dojo-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-5">
      <SectionTitle eyebrow="Settings" title="Your game" desc="Pick your stakes and how you want to be graded. Everything is stored locally in this browser." />

      <section className="panel p-4">
        <div className="label mb-3">Stakes</div>
        <div className="grid gap-3 md:grid-cols-3">
          {STAKE_LIST.map((st) => {
            const on = settings.stake === st.id;
            return (
              <button
                key={st.id}
                onClick={() => set({ stake: st.id, table: st.table, units: st.id === "online" ? "bb" : "$", sizing: st.id === "online" ? "solver" : settings.sizing })}
                className={`rounded-xl border p-4 text-left transition ${on ? "border-gold-400/70 bg-gold-400/10" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"}`}
              >
                <div className="font-display text-lg font-bold text-white">{st.label}</div>
                <div className="text-xs text-ink-400">{st.buyIn}</div>
                <p className="mt-2 text-sm text-ink-200">{st.pool.headline}</p>
                <ul className="mt-2 space-y-0.5 text-[11px] text-ink-400">
                  {st.pool.stats.slice(0, 3).map((x) => (
                    <li key={x.label}>
                      {x.label}: <span className="text-ink-200">{x.value}</span>
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-ink-400">{STAKE_LIST.find((s) => s.id === settings.stake)?.rake}</p>
      </section>

      <section className="panel grid gap-4 p-4 sm:grid-cols-2">
        <div>
          <div className="label mb-2">Table size</div>
          <Segmented value={settings.table} onChange={(v) => set({ table: v })} options={[{ value: 6, label: "6-max" }, { value: 9, label: "9-handed (live)" }]} />
        </div>
        <div>
          <div className="label mb-2">Bet sizes shown</div>
          <Segmented value={settings.sizing} onChange={(v) => set({ sizing: v })} options={[{ value: "live", label: "Live sizes" }, { value: "solver", label: "Solver sizes" }]} />
        </div>
        <div>
          <div className="label mb-2">Units</div>
          <Segmented value={settings.units} onChange={(v) => set({ units: v })} options={[{ value: "$", label: "Dollars" }, { value: "bb", label: "Big blinds" }]} />
        </div>
        <div>
          <div className="label mb-2">Grade me on</div>
          <Segmented value={settings.lens} onChange={(v) => set({ lens: v })} options={[{ value: "gto", label: "GTO baseline" }, { value: "exploit", label: "Exploit lens" }]} />
        </div>
        <div className="sm:col-span-2">
          <div className="label mb-2">Default opponent</div>
          <div className="flex flex-wrap gap-2">
            {ARCHETYPE_IDS.map((id) => {
              const a = getArchetype(id, settings.stake);
              return (
                <button key={id} className={`chip ${settings.villain === id ? "chip-on" : ""}`} onClick={() => set({ villain: id })} title={a.blurb}>
                  {a.emoji} {a.name}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="panel divide-y divide-white/[0.06] p-4">
        <Toggle checked={settings.askWhy} onChange={(v) => set({ askWhy: v })} label="Ask me why first" hint="Pick the key reason before the explanation unlocks. Slower, but it builds real understanding." />
        <Toggle checked={settings.autoNext} onChange={(v) => set({ autoNext: v })} label="Speed mode" hint="Auto-deal the next hand after a perfect answer (unless you open the ladder)." />
        <Toggle checked={settings.fourColor} onChange={(v) => set({ fourColor: v })} label="Four-color deck" hint="Blue diamonds and green clubs make suits easier to read." />
        <Toggle checked={settings.sound} onChange={(v) => set({ sound: v })} label="Sound effects" />
      </section>

      <section className="panel p-4">
        <div className="label mb-3">Your data</div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={exportData}>
            <Download size={16} /> Export progress
          </button>
          <button className="btn-ghost" onClick={() => fileRef.current?.click()}>
            <Upload size={16} /> Import progress
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const ok = useStore.getState().importState(await f.text());
              useUi.getState().push({ icon: ok ? "✅" : "⚠️", title: ok ? "Progress imported" : "Couldn't read that file", tone: ok ? "green" : "gold" });
            }}
          />
          <button className="btn-ghost !text-rose-300" onClick={() => setConfirm(true)}>
            <RotateCcw size={16} /> Reset everything
          </button>
        </div>
      </section>

      <section className="panel space-y-2 p-4 text-sm text-ink-300">
        <div className="label">How GTO Dojo knows what's right</div>
        <p>
          <span className="font-semibold text-white">Preflop baselines</span> are solver-approximated 100bb cash strategies (2.5bb opens, 3bb from the small blind, rake-aware), rounded into learnable frequencies. They're close to published solver outputs, not exact solves.
        </p>
        <p>
          <span className="font-semibold text-white">Live limper charts</span> are exploitative coaching heuristics for loose live games — solvers don't model open-limping pools.
        </p>
        <p>
          <span className="font-semibold text-white">Postflop</span> uses a solver-inspired strategy model: every combo in both ranges is classified on the board, board texture and range/nut advantage pick a betting strategy, and ranges narrow after each action. Equities, pot odds, MDF and bluff ratios are computed exactly or by Monte Carlo simulation in your browser.
        </p>
        <p>
          <span className="font-semibold text-white">Exploits</span> come from well-known live pool tendencies and opponent archetypes. Treat them as starting reads, then adjust to the players in front of you.
        </p>
      </section>

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Reset all progress?">
        <p className="text-sm text-ink-300">This clears XP, belts, achievements, lessons and your Leak Deck. Export first if you want a backup.</p>
        <div className="mt-4 flex gap-2">
          <button className="btn-ghost flex-1" onClick={() => setConfirm(false)}>
            Cancel
          </button>
          <button
            className="btn flex-1 bg-rose-600 text-white hover:bg-rose-500"
            onClick={() => {
              useStore.getState().resetAll();
              setConfirm(false);
            }}
          >
            Reset
          </button>
        </div>
      </Modal>
    </div>
  );
}
