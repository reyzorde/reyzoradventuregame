import {
  DAY_START,
  SAVE_KEY,
  SAVE_VERSION,
  START_COINS,
  WATER_MAX,
  defaultUpgradeLevels,
  emptyInv,
  upgradeValue,
} from "../config";
import { INITIAL_ANIMALS, INITIAL_PLOTS, PLAYER_SPAWN } from "../data/map";
import type { GameSave, PlotState, UpgradeId } from "../types";

export function createNewSave(): GameSave {
  const levels = defaultUpgradeLevels();
  return {
    version: SAVE_VERSION,
    player: { x: PLAYER_SPAWN.x, y: PLAYER_SPAWN.y, facing: "down" },
    coins: START_COINS,
    water: 0,
    waterMax: upgradeValue("water_cap", levels.water_cap),
    inventory: emptyInv(),
    plots: INITIAL_PLOTS.map((p) => ({ ...p })),
    weedsCleared: [],
    pickupsTaken: [],
    quests: { active: "clear_garden", completed: [], progress: {} },
    upgrades: { smallGarden: false, forestOpen: false },
    upgradeLevels: levels,
    time: { day: 1, minutes: DAY_START },
    tutorialStep: 0,
    miraIntroDone: false,
    miraCarrotsGiven: false,
    animals: INITIAL_ANIMALS.map((a) => ({ ...a })),
    audio: { music: 0.35, sfx: 0.7 },
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

function migrateUpgradeLevels(raw: Partial<GameSave>): Record<UpgradeId, number> {
  const base = defaultUpgradeLevels();
  const from = raw.upgradeLevels;
  if (from && typeof from === "object") {
    return {
      water_cap: Math.max(0, Number(from.water_cap) || 0),
      move_speed: Math.max(0, Number(from.move_speed) || 0),
    };
  }
  const wm = Number(raw.waterMax) || WATER_MAX;
  if (wm > WATER_MAX) {
    const vals = [5, 6, 7, 8, 10, 12];
    let lv = 0;
    for (let i = 0; i < vals.length; i++) if (vals[i] <= wm) lv = i;
    base.water_cap = lv;
  }
  return base;
}

export function hasSave(): boolean {
  try {
    return Boolean(localStorage.getItem(SAVE_KEY) || localStorage.getItem("reyzor-adventure-save-v1"));
  } catch {
    return false;
  }
}

export function loadSave(): GameSave | null {
  try {
    const raw =
      localStorage.getItem(SAVE_KEY) ??
      localStorage.getItem("reyzor-adventure-save-v1");
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<GameSave>;
    const base = createNewSave();
    const levels = migrateUpgradeLevels(p);
    const waterMax = upgradeValue("water_cap", levels.water_cap);
    return {
      ...base,
      ...p,
      version: SAVE_VERSION,
      player: { ...base.player, ...p.player },
      inventory: { ...base.inventory, ...p.inventory },
      quests: {
        active: p.quests?.active ?? base.quests.active,
        completed: p.quests?.completed ?? [],
        progress: { ...p.quests?.progress },
      },
      upgrades: { smallGarden: false, forestOpen: false, ...p.upgrades },
      upgradeLevels: levels,
      waterMax,
      water: Math.min(Number(p.water) || 0, waterMax),
      time: { ...base.time, ...p.time },
      plots: mergePlots(base.plots, p.plots),
      weedsCleared: p.weedsCleared ?? [],
      pickupsTaken: p.pickupsTaken ?? [],
      animals: p.animals?.length ? p.animals : base.animals.map((a) => ({ ...a })),
      audio: { music: 0.35, sfx: 0.7, ...p.audio },
    };
  } catch {
    return null;
  }
}

export function writeSave(save: GameSave): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    localStorage.removeItem("reyzor-adventure-save-v1");
  } catch {
    /* private mode */
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem("reyzor-adventure-save-v1");
  } catch {
    /* */
  }
}
