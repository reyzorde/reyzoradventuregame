import type { CropConfig, CropId, ItemId, QuestDefinition, QuestId } from "./types";


export const TILE = 48;
export const MAP_COLS = 64;
export const MAP_ROWS = 48;
export const WORLD_W = MAP_COLS * TILE;
export const WORLD_H = MAP_ROWS * TILE;
export const DESIGN_W = 1280;
export const DESIGN_H = 720;
export const PLAYER_SPEED = 170;
export const INTERACT_R = 56;
export const SAVE_KEY = "reyzor-adventure-save-v1";
export const SAVE_VERSION = 1;
export const WATER_MAX = 5;
export const START_COINS = 100;
export const GAME_MINUTE_MS = 2500;
export const DAY_START = 8 * 60;

export const CROP_CONFIGS: Record<CropId, CropConfig> = {
  carrot: {
    id: "carrot", nameUz: "Sabzi", seedItem: "carrot_seed", harvestItem: "carrot",
    seedCost: 10, harvestPrice: 18, growthMs: 14000, color: 0x6aa34a, readyColor: 0xe07a2f,
  },
  tomato: {
    id: "tomato", nameUz: "Pomidor", seedItem: "tomato_seed", harvestItem: "tomato",
    seedCost: 15, harvestPrice: 26, growthMs: 18000, color: 0x4f9b3a, readyColor: 0xd9443b,
  },
  strawberry: {
    id: "strawberry", nameUz: "Qulupnay", seedItem: "strawberry_seed", harvestItem: "strawberry",
    seedCost: 20, harvestPrice: 34, growthMs: 22000, color: 0x5fad4a, readyColor: 0xe84a6a,
  },
};

export const CROP_LIST: CropId[] = ["carrot", "tomato", "strawberry"];

export const ITEM_LABELS: Record<ItemId, string> = {
  carrot_seed: "Sabzi urug'i", tomato_seed: "Pomidor urug'i", strawberry_seed: "Qulupnay urug'i",
  carrot: "Sabzi", tomato: "Pomidor", strawberry: "Qulupnay", wood: "Yog'och", stone: "Tosh",
  mushroom: "Qo'ziqorin",
};

export const QUEST_DEFS: Record<QuestId, QuestDefinition> = {
  clear_garden: { id: "clear_garden", title: "Bog'ni tozalash", objective: "5 ta begona o'tni yuling", target: 5, rewardLabel: "20 tanga", next: "first_seeds" },
  first_seeds: { id: "first_seeds", title: "Birinchi urug'", objective: "3 ta ekin eking", target: 3, rewardLabel: "10 sabzi urug'i", next: "need_water" },
  need_water: { id: "need_water", title: "Suv kerak", objective: "3 ta ekinni sug'oring", target: 3, rewardLabel: "20 tanga", next: "first_harvest" },
  first_harvest: { id: "first_harvest", title: "Birinchi hosil", objective: "3 ta hosilni yig'ing", target: 3, rewardLabel: "50 tanga", next: "help_village" },
  help_village: { id: "help_village", title: "Qishloqqa yordam", objective: "Miraga 2 ta sabzi bering", target: 2, rewardLabel: "Kichik bog' yangilanishi", next: "enter_forest" },
  enter_forest: { id: "enter_forest", title: "O'rmonga kirish", objective: "Sharqdagi o'rmon darvozasini oching", target: 1, rewardLabel: "O'rmon yo'li ochildi", next: "gather_mushrooms" },
  gather_mushrooms: { id: "gather_mushrooms", title: "Qo'ziqorin yig'ish", objective: "3 ta qo'ziqorin toping", target: 3, rewardLabel: "40 tanga + 2 yog'och", next: null },
};

export const TUTORIAL = [
  "Harakat qilish uchun WASD yoki strelkalardan foydalaning.",
  "Begona o'tlarga yaqinlashib, E tugmasini bosing.",
  "Quduqdan suv oling, keyin yerni haydab urug' eking.",
];

export function emptyInv(): Record<ItemId, number> {
  return {
    carrot_seed: 3, tomato_seed: 1, strawberry_seed: 0,
    carrot: 0, tomato: 0, strawberry: 0, wood: 0, stone: 0, mushroom: 0,
  };
}
