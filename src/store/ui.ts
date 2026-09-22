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

/** Surface level-ups, belts and achievements without interrupting play. */
export function announce(r: Reward): void {
  const ui = useUi.getState();
  r.achievements.slice(0, 2).forEach((a: Achievement) => ui.push({ icon: a.icon, title: a.name, body: `${a.desc} +${a.xp} XP`, tone: "gold" }));
  if (r.beltUp) {
    ui.push({ icon: "🥋", title: `${r.beltUp.belt.name} belt · ${r.beltUp.pos}`, body: "This seat just ranked up.", tone: "gold" });
    ui.burst();
  } else if (r.levelUp) {
    ui.push({ icon: "⭐", title: `Level ${r.levelUp}`, body: "Keep it going.", tone: "gold" });
    ui.burst();
  }
}
