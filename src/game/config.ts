import type { CropConfig, CropId, ItemId, QuestDefinition, QuestId, UpgradeDef, UpgradeId } from "./types";

export const TILE = 48;
export const MAP_COLS = 64;
export const MAP_ROWS = 48;
export const WORLD_W = MAP_COLS * TILE;
export const WORLD_H = MAP_ROWS * TILE;

export const INITIAL_COINS = 40;
export const WATER_MAX = 5;
export const INTERACT_R = 52;

export const CROP_LIST: CropId[] = ["carrot", "tomato", "strawberry"];

export const CROP_CONFIGS: Record<CropId, CropConfig> = {
  carrot: {
    id: "carrot",
    nameUz: "Sabzi",
    seedItem: "seed_carrot",
    harvestItem: "carrot",
    seedCost: 5,
    harvestPrice: 12,
    growthMs: 12000,
    waterNeeded: 1,
  },
  tomato: {
    id: "tomato",
    nameUz: "Pomidor",
    seedItem: "seed_tomato",
    harvestItem: "tomato",
    seedCost: 8,
    harvestPrice: 18,
    growthMs: 18000,
    waterNeeded: 1,
  },
  strawberry: {
    id: "strawberry",
    nameUz: "Qulupnay",
    seedItem: "seed_strawberry",
    harvestItem: "strawberry",
    seedCost: 12,
    harvestPrice: 28,
    growthMs: 24000,
    waterNeeded: 1,
  },
};

export const ITEM_LABELS: Record<ItemId, string> = {
  seed_carrot: "Sabzi urug'i",
  seed_tomato: "Pomidor urug'i",
  seed_strawberry: "Qulupnay urug'i",
  carrot: "Sabzi",
  tomato: "Pomidor",
  strawberry: "Qulupnay",
  wood: "Yog'och",
  stone: "Tosh",
  mushroom: "Qo'ziqorin",
  milk: "Sut",
  fish: "Baliq",
};

export const ITEM_DESC: Partial<Record<ItemId, string>> = {
  carrot: "Yangi sabzi",
  tomato: "Pishgan pomidor",
  strawberry: "Shirin qulupnay",
  wood: "Qurilish uchun",
  stone: "Qurilish uchun",
  mushroom: "O'rmon qo'ziqorini",
};

export const SELL_PRICE: Partial<Record<ItemId, number>> = {
  carrot: 12,
  tomato: 18,
  strawberry: 28,
  wood: 3,
  stone: 2,
  mushroom: 8,
  milk: 10,
  fish: 15,
};

export function formatGrowth(ms: number): string {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.round(s / 60)}m`;
}

export const QUEST_ORDER: QuestId[] = [
  "first_harvest",
  "help_village",
  "enter_forest",
  "gather_mushrooms",
];

export const QUEST_DEFS: Record<QuestId, QuestDefinition> = {
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
    objective: "Do'konda 2 ta sabzi sotib bering",
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

export const UPGRADE_DEFS: Record<UpgradeId, UpgradeDef> = {
  smallGarden: {
    id: "smallGarden",
    nameUz: "Kichik bog'",
    description: "Qo'shimcha ekin maydoni",
    maxLevel: 1,
    costs: [0],
    unit: "maydon",
    values: [1],
  },
  waterMax: {
    id: "waterMax",
    nameUz: "Suv idishi",
    description: "Ko'proq suv saqlash",
    maxLevel: 3,
    costs: [30, 60, 100],
    unit: "suv",
    values: [5, 7, 10, 14],
  },
  forestOpen: {
    id: "forestOpen",
    nameUz: "O'rmon yo'li",
    description: "O'rmonga kirish",
    maxLevel: 1,
    costs: [0],
    unit: "ochiq",
    values: [0, 1],
  },
};
