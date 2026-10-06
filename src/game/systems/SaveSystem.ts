
import { DAY_START, SAVE_KEY, SAVE_VERSION, START_COINS, WATER_MAX, emptyInv } from "../config";
import { INITIAL_PLOTS, PLAYER_SPAWN } from "../data/map";
import type { GameSave, PlotState } from "../types";

export function createNewSave(): GameSave {
  return {
    version: SAVE_VERSION,
    player: { x: PLAYER_SPAWN.x, y: PLAYER_SPAWN.y, facing: "down" },
    coins: START_COINS,
    water: 0,
    waterMax: WATER_MAX,
    inventory: emptyInv(),
    plots: INITIAL_PLOTS.map((p) => ({ ...p })),
    weedsCleared: [],
    pickupsTaken: [],
    quests: { active: "clear_garden", completed: [], progress: {} },
    upgrades: { smallGarden: false, forestOpen: false },
    time: { day: 1, minutes: DAY_START },
    tutorialStep: 0,
    miraIntroDone: false,
    miraCarrotsGiven: false,
  };
}

function mergePlots(defaults: PlotState[], loaded?: PlotState[]): PlotState[] {
  if (!loaded?.length) return defaults.map((p) => ({ ...p }));
  const byId = new Map(loaded.map((p) => [p.id, p]));
  return defaults.map((d) => {
    const f = byId.get(d.id);
    return f ? { ...d, ...f, unlocked: f.unlocked || d.unlocked } : { ...d };
  });
}

export function hasSave(): boolean {
  try { return Boolean(localStorage.getItem(SAVE_KEY)); } catch { return false; }
}

export function loadSave(): GameSave | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as GameSave;
    const base = createNewSave();
    return {
      ...base, ...p, version: SAVE_VERSION,
      player: { ...base.player, ...p.player },
      inventory: { ...base.inventory, ...p.inventory },
      quests: {
        active: p.quests?.active ?? base.quests.active,
        completed: p.quests?.completed ?? [],
        progress: { ...p.quests?.progress },
      },
      upgrades: { smallGarden: false, forestOpen: false, ...p.upgrades },
      time: { ...base.time, ...p.time },
      plots: mergePlots(base.plots, p.plots),
      weedsCleared: p.weedsCleared ?? [],
      pickupsTaken: p.pickupsTaken ?? [],
    };
  } catch { return null; }
}

export function writeSave(save: GameSave): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch { /* private mode */ }
}

export function clearSave(): void {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* */ }
}
