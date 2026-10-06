export type CropId = "carrot" | "tomato" | "strawberry";
export type ItemId =
  | "carrot_seed" | "tomato_seed" | "strawberry_seed"
  | "carrot" | "tomato" | "strawberry"
  | "wood" | "stone" | "mushroom" | "milk" | "egg" | "fish";
export type QuestId =
  | "clear_garden" | "first_seeds" | "need_water" | "first_harvest"
  | "help_village" | "enter_forest" | "gather_mushrooms";
export type Facing = "up" | "down" | "left" | "right";
export type PlotStateKind = "EMPTY" | "TILLED" | "PLANTED" | "WATERED" | "GROWING" | "READY";

export interface CropConfig {
  id: CropId; nameUz: string; seedItem: ItemId; harvestItem: ItemId;
  seedCost: number; harvestPrice: number; growthMs: number;
  color: number; readyColor: number;
}

export interface QuestDefinition {
  id: QuestId; title: string; objective: string; target: number;
  rewardLabel: string; next: QuestId | null;
}

export interface PlotState {
  id: string; col: number; row: number;
  state: PlotStateKind; cropId: CropId | null;
  plantedAt: number | null; wateredAt: number | null; unlocked: boolean;
}

export interface AnimalSave {
  id: string; kind: "cow" | "chicken" | "fish";
  x: number; y: number; lastCollect: number;
}

export interface GameSave {
  version: number;
  player: { x: number; y: number; facing: Facing };
  coins: number; water: number;
  inventory: Record<ItemId, number>;
  plots: PlotState[];
  weedsCleared: string[];
  pickupsTaken: string[];
  questId: QuestId;
  questProgress: number;
  tutorialStep: number;
  upgrades: { smallGarden: boolean; forestOpen: boolean };
  time: { day: number; minutes: number };
  animals: AnimalSave[];
  musicVol: number; sfxVol: number;
}

export interface DialogueLine { speaker: string; text: string }

export interface HudSnapshot {
  coins: number; water: number; waterMax: number; day: number; clock: string;
  inventory: Record<ItemId, number>; selectedSeed: CropId | null;
  notices: { id: string; text: string }[];
  dialogue: DialogueLine | null;
  shopOpen: boolean; inventoryOpen: boolean; mapOpen: boolean;
  questTitle: string; questObjective: string; questProgress: number; questTarget: number;
  questReward: string; questCollapsed: boolean;
  interactHint: string | null; tutorial: string | null;
  menu: "main" | "confirm_new" | "play";
  hasSave: boolean; playing: boolean;
  playerX: number; playerY: number;
  musicVol: number; sfxVol: number;
}
