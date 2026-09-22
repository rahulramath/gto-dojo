import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, Lock, type LucideIcon } from "lucide-react";

export interface LadderStep {
  id: string;
  title: string;
  teaser: string;
  icon: LucideIcon;
  color: string;
  render: () => ReactNode;
}

/**
 * Progressive disclosure: each rung reveals one deeper layer of reasoning.
 * Rungs unlock in order so the learner commits to an idea before seeing the next.
 */
export function Ladder({
  steps,
  resetKey,
  onOpen,
  startOpen = [],
}: {
  steps: LadderStep[];
  resetKey: string;
  onOpen?: (id: string, openedCount: number, total: number) => void;
  startOpen?: string[];
}) {
  const [opened, setOpened] = useState<string[]>(startOpen);
  const [expanded, setExpanded] = useState<string[]>(startOpen);

  useEffect(() => {
    setOpened(startOpen);
    setExpanded(startOpen);
  }, [resetKey]);

  const open = (id: string) => {
    if (!opened.includes(id)) {
      const next = [...opened, id];
      setOpened(next);
      onOpen?.(id, next.length, steps.length);
    }
    setExpanded((e) => (e.includes(id) ? e.filter((x) => x !== id) : [...e, id]));
  };

  const openAll = () => {
    const newly = steps.filter((s) => !opened.includes(s.id));
    let count = opened.length;
    for (const s of newly) {
      count++;
      onOpen?.(s.id, count, steps.length);
    }
    setOpened(steps.map((s) => s.id));
    setExpanded(steps.map((s) => s.id));
  };

  const firstClosed = steps.findIndex((s) => !opened.includes(s.id));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="label">Reasoning ladder · {opened.length}/{steps.length}</div>
        {opened.length < steps.length && (
          <button className="text-xs font-semibold text-gold-300 hover:text-gold-200" onClick={openAll}>
            Reveal all
          </button>
        )}
      </div>
      {steps.map((s, i) => {
        const isOpen = expanded.includes(s.id);
        const wasOpened = opened.includes(s.id);
        const locked = !wasOpened && firstClosed !== -1 && i > firstClosed;
        const Icon = s.icon;
        return (
          <div key={s.id} className={`overflow-hidden rounded-xl border transition ${isOpen ? "border-white/15 bg-white/[0.035]" : "border-white/[0.07] bg-white/[0.015]"}`}>
            <button
              type="button"
              disabled={locked}
              onClick={() => open(s.id)}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-white/[0.03] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ background: `${s.color}22`, color: s.color, boxShadow: wasOpened ? `inset 0 0 0 1px ${s.color}66` : undefined }}
              >
                {locked ? <Lock size={15} /> : <Icon size={16} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm font-semibold text-white">
                  <span className="text-ink-400">{i + 1}.</span> {s.title}
                </span>
                {!isOpen && <span className="block truncate text-xs text-ink-400">{locked ? "Open the previous step first" : s.teaser}</span>}
              </span>
              {!locked && <ChevronDown size={16} className={`shrink-0 text-ink-400 transition ${isOpen ? "rotate-180" : ""}`} />}
            </button>
            {isOpen && <div className="animate-fadeUp border-t border-white/[0.06] px-3 pb-3 pt-3">{s.render()}</div>}
          </div>
        );
      })}
    </div>
  );
}
