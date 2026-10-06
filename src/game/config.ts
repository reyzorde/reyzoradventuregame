import type { CropConfig, CropId, ItemId, QuestDefinition, QuestId, UpgradeDef, UpgradeId } from "./types";

export const TILE = 48;
export const MAP_COLS = 64;
export const MAP_ROWS = 48;
export const WORLD_W = MAP_COLS * TILE;
export const WORLD_H = MAP_ROWS * TILE;
export const DESIGN_W = 1280;
export const DESIGN_H = 720;
/** Base walk speed (px/s); actual speed may be boosted by upgrades */
export const PLAYER_SPEED = 170;
export const INTERACT_R = 56;
export const SAVE_KEY = "reyzor-adventure-save-v2";
export const SAVE_VERSION = 2;
export const WATER_MAX = 5;
export const START_COINS = 100;
/** Real-world ms per in-game minute (day clock only) */
export const GAME_MINUTE_MS = 2500;
export const DAY_START = 8 * 60;

/**
 * Crop economy + growth.
 * growthMs is real wall-clock time from watering → READY (min 1 minute).
 */
export const CROP_CONFIGS: Record<CropId, CropConfig> = {
  carrot: {
    id: "carrot",
    nameUz: "Sabzi",
    seedItem: "carrot_seed",
    harvestItem: "carrot",
    seedCost: 10,
    harvestPrice: 22,
    growthMs: 90_000, // 1.5 min — oddiy
    color: 0x6aa34a,
    readyColor: 0xe07a2f,
  },
  tomato: {
    id: "tomato",
    nameUz: "Pomidor",
    seedItem: "tomato_seed",
    harvestItem: "tomato",
    seedCost: 18,
    harvestPrice: 40,
    growthMs: 180_000, // 3 min — o'rta
    color: 0x4f9b3a,
    readyColor: 0xd9443b,
  },
  strawberry: {
    id: "strawberry",
    nameUz: "Qulupnay",
    seedItem: "strawberry_seed",
    harvestItem: "strawberry",
    seedCost: 28,
    harvestPrice: 65,
    growthMs: 360_000, // 6 min — qimmat
    color: 0x5fad4a,
    readyColor: 0xe84a6a,
  },
};

export const CROP_LIST: CropId[] = ["carrot", "tomato", "strawberry"];

/** Central upgrade definitions — values[level], costs[i] = level i → i+1 */
export const UPGRADE_DEFS: Record<UpgradeId, UpgradeDef> = {
  water_cap: {
    id: "water_cap",
    nameUz: "Suv sig'imi",
    description: "Quduqdan olinadigan maksimal suv",
    maxLevel: 5,
    values: [5, 6, 7, 8, 10, 12],
    costs: [50, 75, 100, 150, 200],
    unit: "suv",
  },
  move_speed: {
    id: "move_speed",
    nameUz: "Yurish tezligi",
    description: "Personajning harakat tezligi",
    maxLevel: 2,
    values: [170, 195, 220],
    costs: [80, 140],
    unit: "px/s",
  },
};

export const UPGRADE_LIST: UpgradeId[] = ["water_cap", "move_speed"];

export const ITEM_LABELS: Record<ItemId, string> = {
  carrot_seed: "Sabzi urug'i",
  tomato_seed: "Pomidor urug'i",
  strawberry_seed: "Qulupnay urug'i",
  carrot: "Sabzi",
  tomato: "Pomidor",
  strawberry: "Qulupnay",
  wood: "Yog'och",
  stone: "Tosh",
  mushroom: "Qo'ziqorin",
  milk: "Sut",
  egg: "Tuxum",
  fish: "Baliq",
};

export const ITEM_DESC: Partial<Record<ItemId, string>> = {
  milk: "Moldan olingan yangi sut",
  egg: "Tovuq tuxumi",
  fish: "Ko'ldan tutilgan baliq",
  carrot: "Yangi yig'ilgan sabzi",
  tomato: "Yetilgan pomidor",
  strawberry: "Shirin qulupnay",
};

export const SELL_PRICE: Partial<Record<ItemId, number>> = {
  milk: 12,
  egg: 8,
  fish: 15,
  wood: 5,
  stone: 4,
  mushroom: 10,
};

/** Animal collect cooldown (ms) */
export const ANIMAL_COOLDOWN = 25_000;
export const FISH_COOLDOWN = 12_000;

export const QUEST_DEFS: Record<QuestId, QuestDefinition> = {
  clear_garden: {
    id: "clear_garden",
    title: "Bog'ni tozalash",
    objective: "5 ta begona o'tni yuling",
    target: 5,
    rewardLabel: "20 tanga",
    next: "first_seeds",
  },
  first_seeds: {
    id: "first_seeds",
    title: "Birinchi urug'",
    objective: "3 ta ekin eking",
    target: 3,
    rewardLabel: "10 sabzi urug'i",
    next: "need_water",
  },
  need_water: {
    id: "need_water",
    title: "Suv kerak",
    objective: "3 ta ekinni sug'oring",
    target: 3,
    rewardLabel: "20 tanga",
    next: "first_harvest",
  },
  first_harvest: {
    id: "first_harvest",
    title: "Birinchi hosil",
    objective: "3 ta hosilni yig'ing",
    target: 3,
    rewardLabel: "50 tanga",
    next: "help_village",
  },
  help_village: {
    id: "help_village",
    title: "Qishloqqa yordam",
    objective: "Miraga 2 ta sabzi bering",
    target: 2,
    rewardLabel: "Kichik bog' yangilanishi",
    next: "enter_forest",
  },
  enter_forest: {
    id: "enter_forest",
    title: "O'rmonga kirish",
    objective: "Sharqdagi o'rmon darvozasini oching",
    target: 1,
    rewardLabel: "O'rmon yo'li ochildi",
    next: "gather_mushrooms",
  },
  gather_mushrooms: {
    id: "gather_mushrooms",
    title: "Qo'ziqorin yig'ish",
    objective: "3 ta qo'ziqorin toping",
    target: 3,
    rewardLabel: "40 tanga + 2 yog'och",
    next: null,
  },
};

export const TUTORIAL = [
  "Harakat qilish uchun WASD yoki strelkalardan foydalaning.",
  "Begona o'tlarga yaqinlashib, E tugmasini bosing.",
  "Quduqdan suv oling, keyin yerni haydab urug' eking.",
];

export function emptyInv(): Record<ItemId, number> {
  return {
    carrot_seed: 3,
    tomato_seed: 1,
    strawberry_seed: 0,
    carrot: 0,
    tomato: 0,
    strawberry: 0,
    wood: 0,
    stone: 0,
    mushroom: 0,
    milk: 0,
    egg: 0,
    fish: 0,
  };
}

export function defaultUpgradeLevels(): Record<UpgradeId, number> {
  return { water_cap: 0, move_speed: 0 };
}

export function upgradeValue(id: UpgradeId, level: number): number {
  const def = UPGRADE_DEFS[id];
  const lv = Math.max(0, Math.min(level, def.maxLevel));
  return def.values[lv] ?? def.values[0];
}

export function upgradeCost(id: UpgradeId, level: number): number | null {
  const def = UPGRADE_DEFS[id];
  if (level >= def.maxLevel) return null;
  return def.costs[level] ?? null;
}

export function formatGrowth(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
}
