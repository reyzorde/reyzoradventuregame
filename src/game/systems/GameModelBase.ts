import {
  CROP_CONFIGS,
  INITIAL_COINS,
  INITIAL_WATER,
  INITIAL_WATER_MAX,
  PLAYER_SPEED,
  QUEST_DEFS,
  QUEST_ORDER,
  UPGRADE_DEFS,
  upgradeValue,
} from "../config";
import { INITIAL_ANIMALS, INITIAL_PLOTS, PLAYER_SPAWN } from "../data/map";
import type {
  CropId,
  DialogueLine,
  ItemId,
  Notice,
  PlotState,
  SaveData,
  UpgradeId,
} from "../types";
import { loadSave, saveSave, hasSave as hasSaveFile, clearSave } from "./SaveSystem";
import { bus } from "./events";
import { sfx } from "./AudioSystem";

export class GameModelBase {
  save: SaveData;
  playing = false;
  menu: "main" | "confirm_new" | "play" = "main";
  selectedSeed: CropId = "carrot";
  interactHint: string | null = null;
  notices: Notice[] = [];
  dialogue: DialogueLine[] = [];
  dialogueIdx = 0;
  dialogueCb: (() => void) | null = null;
  shopOpen = false;
  inventoryOpen = false;
  mapOpen = false;
  questCollapsed = false;
  interactQueued = false;
  jumpQueued = false;
  joystick = { x: 0, y: 0 };
  injectedKeys = new Set<string>();
  private subs = new Set<() => void>();
  private noticeId = 0;

  constructor() {
    this.save = loadSave() ?? this.freshSave();
    this.migrate();
  }

  private freshSave(): SaveData {
    return {
      version: 2,
      coins: INITIAL_COINS,
      water: INITIAL_WATER,
      waterMax: INITIAL_WATER_MAX,
      inventory: { carrot_seed: 3, tomato_seed: 1 },
      plots: INITIAL_PLOTS.map((p) => ({ ...p })),
      weedsCleared: [],
      pickupsTaken: [],
      animals: INITIAL_ANIMALS.map((a) => ({ ...a })),
      player: { x: PLAYER_SPAWN.x, y: PLAYER_SPAWN.y, facing: "down" },
      time: { day: 1, minutes: 8 * 60 },
      tutorialStep: 0,
      miraIntroDone: false,
      miraCarrotsGiven: false,
      quests: { active: "clear_garden", progress: {}, completed: [] },
      upgrades: { smallGarden: false, forestOpen: false },
      upgradeLevels: { water_cap: 0, move_speed: 0 },
      audio: { music: 0.35, sfx: 0.7 },
    };
  }

  private migrate(): void {
    if (!this.save.upgradeLevels) this.save.upgradeLevels = { water_cap: 0, move_speed: 0 };
    if (!this.save.audio) this.save.audio = { music: 0.35, sfx: 0.7 };
    if (!this.save.animals) this.save.animals = INITIAL_ANIMALS.map((a) => ({ ...a }));
    // purge chickens from older saves
    this.save.animals = this.save.animals.filter((a) => a.kind !== "chicken");
    const wLv = this.save.upgradeLevels.water_cap ?? 0;
    this.save.waterMax = upgradeValue("water_cap", wLv) || INITIAL_WATER_MAX;
  }

  sub(fn: () => void): () => void {
    this.subs.add(fn);
    return () => this.subs.delete(fn);
  }

  protected emit(): void {
    for (const fn of this.subs) fn();
  }

  persist(): void {
    saveSave(this.save);
  }

  hasSave(): boolean {
    return hasSaveFile();
  }

  requestNewGame(): void {
    if (this.hasSave()) this.menu = "confirm_new";
    else this.confirmNewGame();
    this.emit();
  }

  confirmNewGame(): void {
    clearSave();
    this.save = this.freshSave();
    this.playing = true;
    this.menu = "play";
    this.shopOpen = false;
    this.inventoryOpen = false;
    this.mapOpen = false;
    this.dialogue = [];
    this.persist();
    bus.emit("playing", true);
    this.emit();
  }

  cancelNewGame(): void {
    this.menu = "main";
    this.emit();
  }

  continueGame(): void {
    this.save = loadSave() ?? this.freshSave();
    this.migrate();
    this.playing = true;
    this.menu = "play";
    bus.emit("playing", true);
    this.emit();
  }

  pauseToMenu(): void {
    this.persist();
    this.playing = false;
    this.menu = "main";
    this.shopOpen = false;
    this.inventoryOpen = false;
    this.mapOpen = false;
    this.dialogue = [];
    bus.emit("playing", false);
    this.emit();
  }

  push(text: string): void {
    const id = ++this.noticeId;
    this.notices = [...this.notices.filter((n) => n.id > id - 4), { id, text }];
    this.emit();
    window.setTimeout(() => {
      this.notices = this.notices.filter((n) => n.id !== id);
      this.emit();
    }, 2800);
  }

  addItem(id: ItemId, n: number): void {
    this.save.inventory[id] = Math.max(0, (this.save.inventory[id] ?? 0) + n);
  }

  addCoins(n: number): void {
    this.save.coins += n;
    if (n > 0) sfx("coin");
  }

  openDialogue(lines: DialogueLine[], cb?: () => void): void {
    this.dialogue = lines;
    this.dialogueIdx = 0;
    this.dialogueCb = cb ?? null;
    sfx("talk");
    this.emit();
  }

  currentDialogue(): DialogueLine | null {
    return this.dialogue[this.dialogueIdx] ?? null;
  }

  advanceDialogue(): void {
    if (!this.dialogue.length) return;
    this.dialogueIdx++;
    if (this.dialogueIdx >= this.dialogue.length) {
      this.dialogue = [];
      this.dialogueIdx = 0;
      const cb = this.dialogueCb;
      this.dialogueCb = null;
      cb?.();
    }
    this.emit();
  }

  growthPhase(p: PlotState): number {
    if (!p.cropId || p.state === "EMPTY" || p.state === "TILLED") return -1;
    if (p.state === "PLANTED") return 0;
    if (p.state === "READY") return 3;
    if (p.wateredAt == null) return 0;
    const cfg = CROP_CONFIGS[p.cropId];
    const elapsed = Date.now() - p.wateredAt;
    const t = elapsed / cfg.growthMs;
    if (t >= 1) {
      if (p.state !== "READY") {
        p.state = "READY";
        this.persist();
      }
      return 3;
    }
    if (t >= 0.66) return 2;
    if (t >= 0.33) return 1;
    return 0;
  }

  tick(dt: number): void {
    if (!this.playing) return;
    this.save.time.minutes += dt / 1000 / 60 * 8; // 8x realtime day cycle
    if (this.save.time.minutes >= 24 * 60) {
      this.save.time.minutes -= 24 * 60;
      this.save.time.day += 1;
    }
    for (const p of this.save.plots) {
      if (p.state === "WATERED" || p.state === "GROWING") this.growthPhase(p);
    }
  }

  advanceQuest(id: string, amount = 1): void {
    const def = QUEST_DEFS[id];
    if (!def || this.save.quests.active !== id) return;
    const cur = (this.save.quests.progress[id] ?? 0) + amount;
    this.save.quests.progress[id] = cur;
    if (cur >= def.target) {
      this.save.quests.completed.push(id);
      sfx("quest");
      this.push(`Topshiriq: ${def.title}`);
      if (def.reward) {
        if (def.reward.coins) this.addCoins(def.reward.coins);
        if (def.reward.unlockPlots) {
          for (const pid of def.reward.unlockPlots) {
            const pl = this.save.plots.find((x) => x.id === pid);
            if (pl) pl.unlocked = true;
          }
          this.save.upgrades.smallGarden = true;
        }
        if (def.reward.forestOpen) this.save.upgrades.forestOpen = true;
      }
      const idx = QUEST_ORDER.indexOf(id as typeof QUEST_ORDER[number]);
      const next = idx >= 0 ? QUEST_ORDER[idx + 1] : undefined;
      this.save.quests.active = next ?? null;
    }
    this.persist();
    this.emit();
  }

  takeMushroom(id: string): boolean {
    if (this.save.pickupsTaken.includes(id)) return false;
    this.save.pickupsTaken.push(id);
    this.addItem("mushroom", 1);
    this.advanceQuest("gather_mushrooms");
    this.persist();
    this.emit();
    return true;
  }

  openForestGate(): void {
    if (this.save.upgrades.forestOpen) {
      this.openDialogue([{ speaker: "", text: "Darvoza ochiq. O'rmon yo'li oldinda." }]);
      this.advanceQuest("enter_forest");
      return;
    }
    this.openDialogue([{ speaker: "", text: "Bu yo'l hozircha yopiq. Avval Miraga yordam bering." }]);
  }
}
