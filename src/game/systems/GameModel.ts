
import { CROP_CONFIGS, CROP_LIST, GAME_MINUTE_MS, ITEM_LABELS, QUEST_DEFS, TUTORIAL } from "../config";
import { D } from "../data/dialogues";
import type { CropId, DialogueLine, GameSave, HudSnapshot, ItemId, PlotState, QuestId } from "../types";
import { sfx } from "./AudioSystem";
import { bus } from "./events";
import { clearSave, createNewSave, hasSave, loadSave, writeSave } from "./SaveSystem";

let nid = 0;

export class GameModel {
  save: GameSave;
  selectedSeed: CropId | null = "carrot";
  notices: { id: string; text: string }[] = [];
  dialogue: DialogueLine[] = [];
  dialogueIndex = 0;
  shopOpen = false;
  inventoryOpen = false;
  menu: "main" | "none" = "main";
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

  newGame(): void {
    clearSave();
    this.save = createNewSave();
    this.selectedSeed = "carrot";
    this.notices = [];
    this.dialogue = [];
    this.shopOpen = false;
    this.inventoryOpen = false;
    this.menu = "none";
    this.playing = true;
    this.push("Boboning bog'iga xush kelibsiz.");
    this.persist();
    bus.emit("playing", true);
    bus.emit("menu", "none");
    this.emit();
  }

  continueGame(): void {
    this.save = loadSave() ?? createNewSave();
    this.menu = "none";
    this.playing = true;
    this.shopOpen = false;
    this.inventoryOpen = false;
    this.dialogue = [];
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

  till(p: PlotState): boolean {
    if (!p.unlocked || p.state !== "EMPTY") return false;
    p.state = "TILLED";
    sfx("till");
    this.push("Yer haydaldi");
    if (this.save.tutorialStep < 3) this.save.tutorialStep = 3;
    this.persist(); this.emit();
    return true;
  }

  plant(p: PlotState): boolean {
    if (!p.unlocked || p.state !== "TILLED") return false;
    const crop = this.selectedSeed;
    if (!crop) { this.push("Avval urug' tanlang"); return false; }
    const cfg = CROP_CONFIGS[crop];
    if ((this.save.inventory[cfg.seedItem] ?? 0) < 1) { this.push("Urug' yetarli emas"); return false; }
    this.addItem(cfg.seedItem, -1);
    p.state = "PLANTED"; p.cropId = crop; p.plantedAt = Date.now(); p.wateredAt = null;
    sfx("plant");
    this.push(`${cfg.nameUz} ekildi`);
    this.advanceQuest("first_seeds");
    this.persist(); this.emit();
    return true;
  }

  waterPlot(p: PlotState): boolean {
    if (!p.unlocked || p.state !== "PLANTED") return false;
    if (this.save.water <= 0) { this.push("Suv tugadi — quduqqa boring"); return false; }
    this.save.water -= 1;
    p.state = "WATERED"; p.wateredAt = Date.now();
    sfx("water");
    this.push("Sug'orildi");
    this.advanceQuest("need_water");
    this.persist(); this.emit();
    return true;
  }

  harvest(p: PlotState): boolean {
    if (!p.unlocked || p.state !== "READY" || !p.cropId) return false;
    const cfg = CROP_CONFIGS[p.cropId];
    this.addItem(cfg.harvestItem, 1);
    sfx("harvest");
    this.push(`${cfg.nameUz} yig'ildi`);
    p.state = "EMPTY"; p.cropId = null; p.plantedAt = null; p.wateredAt = null;
    this.advanceQuest("first_harvest");
    this.persist(); this.emit();
    return true;
  }

  interactPlot(p: PlotState): void {
    switch (p.state) {
      case "EMPTY": this.till(p); break;
      case "TILLED": this.plant(p); break;
      case "PLANTED": this.waterPlot(p); break;
      case "READY": this.harvest(p); break;
      default: this.push("Ekin o'smoqda...");
    }
  }

  plotHint(p: PlotState): string {
    if (!p.unlocked) return "Bu yer hali yopiq";
    switch (p.state) {
      case "EMPTY": return "E — Yerni haydash";
      case "TILLED": return "E — Urug' ekish";
      case "PLANTED": return "E — Sug'orish";
      case "WATERED":
      case "GROWING": return "Ekin o'smoqda";
      case "READY": return "E — Hosilni yig'ish";
      default: return "E — O'zaro ta'sir";
    }
  }

  pullWeed(id: string): boolean {
    if (this.save.weedsCleared.includes(id)) return false;
    this.save.weedsCleared.push(id);
    sfx("till");
    this.push("Begona o't yulindi");
    this.advanceQuest("clear_garden");
    if (this.save.tutorialStep < 2) this.save.tutorialStep = 2;
    this.persist(); this.emit();
    return true;
  }

  fillWater(): void {
    this.save.water = this.save.waterMax;
    sfx("water");
    this.push("Suv to'ldirildi");
    this.persist(); this.emit();
  }

  talkMira(): void {
    if (!this.save.miraIntroDone) {
      this.save.miraIntroDone = true;
      this.openDialogue(D.mira_intro);
      this.persist();
      return;
    }
    if (this.save.quests.active === "help_village" && !this.save.miraCarrotsGiven) {
      if ((this.save.inventory.carrot ?? 0) >= 2) {
        this.addItem("carrot", -2);
        this.save.miraCarrotsGiven = true;
        this.advanceQuest("help_village", 2);
        this.openDialogue(D.mira_receive);
        this.persist();
        return;
      }
      this.openDialogue(D.mira_want);
      return;
    }
    if (this.save.quests.active === "gather_mushrooms" || this.save.quests.active === "enter_forest") {
      this.openDialogue(D.mira_forest);
      return;
    }
    if (this.save.upgrades.smallGarden) { this.openDialogue(D.mira_after); return; }
    this.openDialogue(D.mira_idle);
  }

  talkTom(): void {
    this.openDialogue(D.tom, () => this.openShop());
  }

  openShop(): void { this.shopOpen = true; sfx("ui"); this.emit(); }
  closeShop(): void { this.shopOpen = false; this.emit(); }
  toggleInventory(): void { this.inventoryOpen = !this.inventoryOpen; sfx("ui"); this.emit(); }

  buySeed(crop: CropId): void {
    const cfg = CROP_CONFIGS[crop];
    if (this.save.coins < cfg.seedCost) { this.push("Tangalar yetarli emas"); return; }
    this.save.coins -= cfg.seedCost;
    this.addItem(cfg.seedItem, 1);
    sfx("coin");
    this.push(`${cfg.nameUz} urug'i sotib olindi`);
    this.persist(); this.emit();
  }

  sellCrop(crop: CropId): void {
    const cfg = CROP_CONFIGS[crop];
    if ((this.save.inventory[cfg.harvestItem] ?? 0) < 1) { this.push("Sotadigan hosil yo'q"); return; }
    this.addItem(cfg.harvestItem, -1);
    this.addCoins(cfg.harvestPrice);
    this.persist(); this.emit();
  }

  takePickup(id: string, item: ItemId): boolean {
    if (this.save.pickupsTaken.includes(id)) return false;
    this.save.pickupsTaken.push(id);
    this.addItem(item, 1);
    sfx("harvest");
    this.push(`${ITEM_LABELS[item]} olindi`);
    this.persist(); this.emit();
    return true;
  }

  selectSeed(crop: CropId): void { this.selectedSeed = crop; sfx("ui"); this.emit(); }
  setHint(h: string | null): void { if (this.interactHint === h) return; this.interactHint = h; this.emit(); }
  noteMoved(): void { if (this.save.tutorialStep === 0) { this.save.tutorialStep = 1; this.emit(); } }

  clock(): string {
    const t = Math.floor(this.save.time.minutes) % (24 * 60);
    const h = Math.floor(t / 60), m = t % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  tutorial(): string | null {
    if (!this.playing) return null;
    if (this.save.tutorialStep <= 2) return TUTORIAL[this.save.tutorialStep] ?? null;
    return null;
  }

  snapshot(): HudSnapshot {
    const qid = this.save.quests.active;
    const def = qid ? QUEST_DEFS[qid] : null;
    return {
      coins: this.save.coins, water: this.save.water, waterMax: this.save.waterMax,
      day: this.save.time.day, clock: this.clock(), inventory: { ...this.save.inventory },
      selectedSeed: this.selectedSeed,
      questTitle: def?.title ?? "Barcha topshiriqlar bajarildi",
      questObjective: def?.objective ?? "O'rmon va undan keyingi joylar kutilmoqda.",
      questProgress: qid ? (this.save.quests.progress[qid] ?? 0) : 1,
      questTarget: def?.target ?? 1, questReward: def?.rewardLabel ?? "",
      interactHint: this.playing ? this.interactHint : null,
      tutorial: this.tutorial(), notices: this.notices,
      dialogue: this.currentDialogue(), shopOpen: this.shopOpen, inventoryOpen: this.inventoryOpen,
      menu: this.menu, hasSave: this.hasSave(), playing: this.playing,
    };
  }
}

export { CROP_LIST };
