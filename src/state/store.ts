import { create } from "zustand";
import type { Difficulty, GameState } from "../sim/types";
import { advanceDay } from "../sim/engine";
import {
  acceptJob, buyEquipment, buyUpgrade, buyVan, fire, giveRaise, hire, maintainEquipment,
  newGame, promoteManager, rejectJob, resolveChoice, runOffline, setMarketing, setPrice,
  takeLoan, train, SAVE_VERSION, type OfflineSummary,
} from "../sim/actions";

const KEY = "venturebuilt.save.v1";

// ------------------------------------------------------------- persistence
export function serialize(s: GameState): string {
  return JSON.stringify(s);
}

export function migrate(raw: any): GameState | null {
  if (!raw || typeof raw !== "object") return null;
  if (typeof raw.version !== "number") return null;
  // Future migrations: if (raw.version === 1) { ...transform...; raw.version = 2 }
  if (raw.version > SAVE_VERSION) return null;
  return raw as GameState;
}

export function loadFromStorage(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return migrate(JSON.parse(raw));
  } catch {
    return null;
  }
}

function persist(s: GameState) {
  try {
    s.lastRealTime = Date.now();
    localStorage.setItem(KEY, serialize(s));
  } catch { /* storage full or blocked — ignore */ }
}

// ------------------------------------------------------------------ store
interface Store {
  game: GameState | null;
  offlineSummary: OfflineSummary | null;
  boot: () => void;
  start: (name: string, founder: string, diff: Difficulty) => void;
  reset: () => void;
  dismissOffline: () => void;
  tick: () => void;
  setSpeed: (v: 0 | 1 | 2 | 4) => void;
  act: (fn: (s: GameState) => void) => void;
  exportSave: () => string | null;
  importSave: (json: string) => boolean;
  saveNow: () => void;
}

export const useGame = create<Store>((set, get) => ({
  game: null,
  offlineSummary: null,

  boot: () => {
    const g = loadFromStorage();
    if (g) {
      g.speed = 0;
      g.toasts = [];
      const summary = runOffline(g, Date.now());
      set({ game: g, offlineSummary: summary });
      persist(g);
    }
  },

  start: (name, founder, diff) => {
    const g = newGame(name, founder, diff);
    persist(g);
    set({ game: g, offlineSummary: null });
  },

  reset: () => {
    localStorage.removeItem(KEY);
    set({ game: null, offlineSummary: null });
  },

  dismissOffline: () => set({ offlineSummary: null }),

  tick: () => {
    const g = get().game;
    if (!g || g.speed === 0 || g.pendingChoice) return;
    const next = { ...g };
    advanceDay(next);
    if (next.day % 3 === 0) persist(next);
    set({ game: next });
  },

  setSpeed: (v) => {
    const g = get().game;
    if (!g) return;
    if (g.pendingChoice && v !== 0) return;
    set({ game: { ...g, speed: v } });
  },

  act: (fn) => {
    const g = get().game;
    if (!g) return;
    const next = { ...g };
    fn(next);
    persist(next);
    set({ game: next });
  },

  exportSave: () => {
    const g = get().game;
    return g ? serialize(g) : null;
  },

  importSave: (json) => {
    try {
      const g = migrate(JSON.parse(json));
      if (!g) return false;
      g.speed = 0;
      g.toasts = [];
      persist(g);
      set({ game: g, offlineSummary: null });
      return true;
    } catch {
      return false;
    }
  },

  saveNow: () => {
    const g = get().game;
    if (g) persist(g);
  },
}));

// Convenience action wrappers used by UI components.
export const A = {
  acceptJob: (id: number) => useGame.getState().act((s) => acceptJob(s, id)),
  rejectJob: (id: number) => useGame.getState().act((s) => rejectJob(s, id)),
  setPrice: (svc: string, v: number) => useGame.getState().act((s) => setPrice(s, svc, v)),
  hire: (id: number) => useGame.getState().act((s) => hire(s, id)),
  fire: (id: number) => useGame.getState().act((s) => fire(s, id)),
  train: (id: number) => useGame.getState().act((s) => train(s, id)),
  raise: (id: number) => useGame.getState().act((s) => giveRaise(s, id)),
  promote: (id: number) => useGame.getState().act((s) => promoteManager(s, id)),
  buyEquipment: (id: string) => useGame.getState().act((s) => buyEquipment(s, id)),
  maintain: (id: string) => useGame.getState().act((s) => maintainEquipment(s, id)),
  buyVan: () => useGame.getState().act((s) => buyVan(s)),
  setMarketing: (id: string, v: number) => useGame.getState().act((s) => setMarketing(s, id, v)),
  buyUpgrade: (id: string) => useGame.getState().act((s) => buyUpgrade(s, id)),
  takeLoan: (id: string) => useGame.getState().act((s) => takeLoan(s, id)),
  resolveChoice: (opt: string) => useGame.getState().act((s) => resolveChoice(s, opt)),
  stepDay: () => useGame.getState().act((s) => advanceDay(s)),
  tutorialNext: () => useGame.getState().act((s) => { s.tutorialStep = s.tutorialStep >= 4 ? -1 : s.tutorialStep + 1; }),
  tutorialSkip: () => useGame.getState().act((s) => { s.tutorialStep = -1; }),
};
