import { create } from "zustand";
import type { Achievement } from "../data/achievements";
import type { Belt } from "../lib/progression";
import type { Reward } from "./store";

export interface Toast {
  id: number;
  icon: string;
  title: string;
  body?: string;
  tone: "gold" | "green" | "blue";
}

export interface Celebration {
  kind: "level" | "belt" | "achievement";
  title: string;
  body: string;
  icon: string;
  belt?: Belt;
}

interface UiState {
  toasts: Toast[];
  celebration: Celebration | null;
  confetti: number;
  push: (t: Omit<Toast, "id">) => void;
  dismiss: (id: number) => void;
  celebrate: (c: Celebration) => void;
  closeCelebration: () => void;
  burst: () => void;
}

let nextId = 1;

export const useUi = create<UiState>()((set, get) => ({
  toasts: [],
  celebration: null,
  confetti: 0,
  push: (t) => {
    const id = nextId++;
    set({ toasts: [...get().toasts, { ...t, id }].slice(-4) });
    setTimeout(() => get().dismiss(id), 4200);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  celebrate: (c) => set({ celebration: c, confetti: get().confetti + 1 }),
  closeCelebration: () => set({ celebration: null }),
  burst: () => set({ confetti: get().confetti + 1 }),
}));

/** Surface level-ups, belts and achievements from a reward. */
export function announce(r: Reward): void {
  const ui = useUi.getState();
  r.achievements.forEach((a: Achievement) => ui.push({ icon: a.icon, title: `Achievement: ${a.name}`, body: `${a.desc} +${a.xp} XP`, tone: "gold" }));
  if (r.beltUp) {
    ui.celebrate({
      kind: "belt",
      title: `${r.beltUp.belt.name} Belt — ${r.beltUp.pos}`,
      body: `Your ${r.beltUp.pos} play just ranked up. Keep your accuracy high to reach the next belt.`,
      icon: "🥋",
      belt: r.beltUp.belt,
    });
  } else if (r.levelUp) {
    ui.celebrate({ kind: "level", title: `Level ${r.levelUp}!`, body: "New level unlocked. Your training is compounding.", icon: "⭐" });
  }
}
