import { CROP_CONFIGS, GAME_MINUTE_MS, QUEST_DEFS } from "../config";
import { D } from "../data/dialogues";
import type { CropId, DialogueLine, GameSave, ItemId, PlotState, QuestId } from "../types";
import { sfx, startMusic } from "./AudioSystem";
import { bus } from "./events";
import { clearSave, createNewSave, hasSave, loadSave, writeSave } from "./SaveSystem";

let nid = 0;

export class GameModelBase {
  save: GameSave;
  selectedSeed: CropId | null = "carrot";
  notices: { id: string; text: string }[] = [];
  dialogue: DialogueLine[] = [];
  dialogueIndex = 0;
  shopOpen = false;
  inventoryOpen = false;
  mapOpen = false;
  questCollapsed = false;
  menu: "main" | "confirm_new" | "none" = "main";
  playing = false;
  interactHint: string | null = null;
  injectedKeys = new Set<string>();
  joystick = { x: 0, y: 0 };
  lastSaveAt = 0;
  afterDialogue: (() => void) | null = null;
  interactQueued = false;
  listeners = new Set<() => void>();

  constructor() {
    this.save = loadSave() ?? createNewSave();
  }

  sub(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(): void {
    for (const fn of this.listeners) fn();
    bus.emit("hud");
  }

  hasSave(): boolean { return hasSave(); }

  requestNewGame(): void {
    if (hasSave()) {
      this.menu = "confirm_new";
      this.emit();
      return;
    }
    this.startFreshGame();
  }

  cancelNewGame(): void {
    this.menu = "main";
    this.emit();
  }

  confirmNewGame(): void {
    this.startFreshGame();
  }

  protected startFreshGame(): void {
    clearSave();
    this.save = createNewSave();
    this.selectedSeed = "carrot";
    this.notices = [];
    this.dialogue = [];
    this.dialogueIndex = 0;
    this.afterDialogue = null;
    this.shopOpen = false;
    this.inventoryOpen = false;
    this.menu = "none";
    this.playing = true;
    startMusic();
    this.push("Boboning bog'iga xush kelibsiz.");
    this.persist();
    bus.emit("playing", true);
    bus.emit("menu", "none");
    this.emit();
  }

  newGame(): void {
    this.requestNewGame();
  }

  continueGame(): void {
    const loaded = loadSave();
    if (!loaded) {
      this.startFreshGame();
      return;
    }
    this.save = loaded;
    this.menu = "none";
    this.playing = true;
    this.shopOpen = false;
    this.inventoryOpen = false;
    this.mapOpen = false;
    this.dialogue = [];
    this.dialogueIndex = 0;
    startMusic();
    bus.emit("playing", true);
    bus.emit("menu", "none");
    this.emit();
  }

  pauseToMenu(): void {
    this.persist();
    this.playing = false;
    this.menu = "main";
    bus.emit("playing", false);
    bus.emit("menu", "main");
    this.emit();
  }

  persist(): void {
    writeSave(this.save);
    this.lastSaveAt = performance.now();
  }

  tick(dt: number): void {
    if (!this.playing) return;
    this.save.time.minutes += dt / GAME_MINUTE_MS;
    while (this.save.time.minutes >= 24 * 60) {
      this.save.time.minutes -= 24 * 60;
      this.save.time.day += 1;
    }
    this.updateCrops();
    if (performance.now() - this.lastSaveAt > 4000) this.persist();
  }

  updateCrops(): void {
    const now = Date.now();
    for (const p of this.save.plots) {
      if (!p.unlocked || !p.cropId || p.wateredAt == null || p.state === "READY") continue;
      const cfg = CROP_CONFIGS[p.cropId];
      const e = now - p.wateredAt;
      if (e >= cfg.growthMs) p.state = "READY";
      else if (e >= cfg.growthMs * 0.35) p.state = "GROWING";
      else p.state = "WATERED";
    }
  }

  growthPhase(p: PlotState): number {
    if (!p.cropId || p.plantedAt == null) return -1;
    if (p.state === "PLANTED" || p.state === "WATERED") return 0;
    if (p.state === "READY") return 3;
    if (p.state === "GROWING" && p.wateredAt != null) {
      const t = (Date.now() - p.wateredAt) / CROP_CONFIGS[p.cropId].growthMs;
      return t > 0.7 ? 2 : 1;
    }
    return 0;
  }

  addItem(id: ItemId, n: number): void {
    this.save.inventory[id] = Math.max(0, (this.save.inventory[id] ?? 0) + n);
  }

  addCoins(n: number): void {
    this.save.coins = Math.max(0, this.save.coins + n);
    if (n > 0) { this.push(`+${n} tanga`); sfx("coin"); }
  }

  push(text: string): void {
    const id = `n${++nid}`;
    this.notices = [...this.notices.slice(-4), { id, text }];
    bus.emit("notice", { text });
    window.setTimeout(() => {
      this.notices = this.notices.filter((n) => n.id !== id);
      this.emit();
    }, 2600);
    this.emit();
  }

  openDialogue(lines: DialogueLine[], after?: () => void): void {
    this.dialogue = lines;
    this.dialogueIndex = 0;
    this.afterDialogue = after ?? null;
    this.shopOpen = false;
    sfx("talk");
    this.emit();
  }

  currentDialogue(): DialogueLine | null {
    return this.dialogue[this.dialogueIndex] ?? null;
  }

  advanceDialogue(): void {
    if (!this.dialogue.length) return;
    this.dialogueIndex += 1;
    if (this.dialogueIndex >= this.dialogue.length) {
      this.dialogue = [];
      const a = this.afterDialogue;
      this.afterDialogue = null;
      a?.();
    }
    this.emit();
  }

  advanceQuest(id: QuestId, amount = 1): void {
    if (this.save.quests.active !== id || this.save.quests.completed.includes(id)) return;
    const def = QUEST_DEFS[id];
    this.save.quests.progress[id] = Math.min(def.target, (this.save.quests.progress[id] ?? 0) + amount);
    if ((this.save.quests.progress[id] ?? 0) >= def.target) this.completeQuest(id);
    this.emit();
  }

  completeQuest(id: QuestId): void {
    if (this.save.quests.completed.includes(id)) return;
    this.save.quests.completed.push(id);
    const def = QUEST_DEFS[id];
    if (id === "clear_garden" || id === "need_water") this.addCoins(20);
    if (id === "first_seeds") { this.addItem("carrot_seed", 10); this.push("10 sabzi urug'i olindi"); }
    if (id === "first_harvest") this.addCoins(50);
    if (id === "help_village") this.applyUpgrade();
    if (id === "enter_forest") {
      this.save.upgrades.forestOpen = true;
      this.push("O'rmon yo'li ochildi!");
    }
    if (id === "gather_mushrooms") {
      this.addCoins(40);
      this.addItem("wood", 2);
      this.push("2 ta yog'och olindi");
    }
    sfx("quest");
    this.push(`Topshiriq bajarildi: ${def.title}`);
    this.save.quests.active = def.next;
    this.persist();
  }

  applyUpgrade(): void {
    this.save.upgrades.smallGarden = true;
    for (const p of this.save.plots) p.unlocked = true;
    this.push("Kichik bog' yangilandi — 3 ta yangi yer ochildi!");
  }

  openForestGate(): void {
    if (this.save.upgrades.forestOpen) {
      this.openDialogue(D.gate_open);
      return;
    }
    if (this.save.upgrades.smallGarden) {
      this.save.upgrades.forestOpen = true;
      this.advanceQuest("enter_forest");
      this.openDialogue(D.gate_open, () => {
        this.push("Darvoza ochildi — sharqqa boring");
      });
      this.persist();
      return;
    }
    this.openDialogue(D.gate_locked);
  }

  takeMushroom(id: string): boolean {
    if (this.save.pickupsTaken.includes(id)) return false;
    this.save.pickupsTaken.push(id);
    this.addItem("mushroom", 1);
    sfx("harvest");
    this.push("Qo'ziqorin olindi");
    this.advanceQuest("gather_mushrooms");
    this.persist();
    this.emit();
    return true;
  }
}
