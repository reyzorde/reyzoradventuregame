export type CropId = "carrot" | "tomato" | "strawberry";
export type CropState = "EMPTY" | "TILLED" | "PLANTED" | "WATERED" | "GROWING" | "READY";
export type ItemId =
  | "carrot_seed" | "tomato_seed" | "strawberry_seed"
  | "carrot" | "tomato" | "strawberry" | "wood" | "stone" | "mushroom"
  | "milk" | "egg" | "fish";
export type Facing = "down" | "left" | "right" | "up";
export type QuestId =
  | "clear_garden" | "first_seeds" | "need_water" | "first_harvest" | "help_village"
  | "enter_forest" | "gather_mushrooms";

export interface CropConfig {
  id: CropId; nameUz: string; seedItem: ItemId; harvestItem: ItemId;
  seedCost: number; harvestPrice: number; growthMs: number; color: number; readyColor: number;
}
export interface PlotState {
  id: string; col: number; row: number; state: CropState; cropId: CropId | null;
  plantedAt: number | null; wateredAt: number | null; unlocked: boolean;
}
export interface QuestDefinition {
  id: QuestId; title: string; objective: string; target: number; rewardLabel: string; next: QuestId | null;
}
export interface DialogueLine {
  speaker: string;
  text: string;
  portrait?: string;
}

export type AnimalKind = "cow" | "chicken" | "fish";
export interface AnimalSave {
  id: string;
  kind: AnimalKind;
  x: number;
  y: number;
  lastCollect: number;
}

export interface GameSave {
  version: number;
  player: { x: number; y: number; facing: Facing };
  coins: number; water: number; waterMax: number;
  inventory: Record<ItemId, number>;
  plots: PlotState[];
  weedsCleared: string[];
  pickupsTaken: string[];
  quests: { active: QuestId | null; completed: QuestId[]; progress: Partial<Record<QuestId, number>> };
  upgrades: { smallGarden: boolean; forestOpen: boolean };
  time: { day: number; minutes: number };
  tutorialStep: number;
  miraIntroDone: boolean;
  miraCarrotsGiven: boolean;
  animals: AnimalSave[];
  audio: { music: number; sfx: number };
}

export interface HudSnapshot {
  coins: number; water: number; waterMax: number; day: number; clock: string;
  inventory: Record<ItemId, number>; selectedSeed: CropId | null;
  questTitle: string; questObjective: string; questProgress: number; questTarget: number; questReward: string;
  interactHint: string | null; tutorial: string | null;
  notices: { id: string; text: string }[];
  dialogue: DialogueLine | null;
  shopOpen: boolean; inventoryOpen: boolean; mapOpen: boolean;
  questCollapsed: boolean;
  menu: "main" | "confirm_new" | "none";
  hasSave: boolean;
  playing: boolean;
  playerX: number; playerY: number;
  musicVol: number; sfxVol: number;
}

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      getPosition: () => { x: number; y: number };
      setKeys?: (codes: string[]) => void;
    };
    __gameModel?: unknown;
  }
}
export {};
