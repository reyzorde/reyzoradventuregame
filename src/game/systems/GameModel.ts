import { ANIMAL_COOLDOWN, CROP_CONFIGS, CROP_LIST, FISH_COOLDOWN, ITEM_LABELS, QUEST_DEFS, SELL_PRICE, TUTORIAL } from "../config";
import { D } from "../data/dialogues";
import type { CropId, HudSnapshot, ItemId, PlotState } from "../types";
import { setMusicVolume, setSfxVolume, sfx } from "./AudioSystem";
import { GameModelBase } from "./GameModelBase";

export class GameModel extends GameModelBase {
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
  toggleInventory(): void { this.inventoryOpen = !this.inventoryOpen; if (this.inventoryOpen) this.mapOpen = false; sfx("open"); this.emit(); }

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

  toggleMap(): void {
    this.mapOpen = !this.mapOpen;
    if (this.mapOpen) { this.inventoryOpen = false; this.shopOpen = false; }
    sfx("open");
    this.emit();
  }

  toggleQuestPanel(): void {
    this.questCollapsed = !this.questCollapsed;
    sfx("ui");
    this.emit();
  }

  setVolumes(music: number, sfxV: number): void {
    this.save.audio.music = music;
    this.save.audio.sfx = sfxV;
    setMusicVolume(music);
    setSfxVolume(sfxV);
    this.persist();
    this.emit();
  }

  collectFromAnimal(id: string): boolean {
    const a = this.save.animals.find((x) => x.id === id);
    if (!a || a.kind !== "cow") return false;
    const now = Date.now();
    const cd = ANIMAL_COOLDOWN;
    if (now - a.lastCollect < cd) {
      const left = Math.ceil((cd - (now - a.lastCollect)) / 1000);
      this.push(`Hali erta (${left}s)`);
      return false;
    }
    a.lastCollect = now;
    this.addItem("milk", 1);
    sfx("milk");
    this.push("Sut olindi");
    this.persist();
    this.emit();
    return true;
  }

  tryFish(id: string): boolean {
    const a = this.save.animals.find((x) => x.id === id && x.kind === "fish");
    if (!a) return false;
    const now = Date.now();
    if (now - a.lastCollect < FISH_COOLDOWN) {
      this.push("Baliqlar hali yaqinlashmagan...");
      return false;
    }
    a.lastCollect = now;
    this.addItem("fish", 1);
    sfx("fish");
    this.push("Baliq tutildi!");
    this.persist();
    this.emit();
    return true;
  }

  sellItem(id: ItemId): void {
    const price = SELL_PRICE[id] ?? 0;
    if (price <= 0) { this.push("Bu narsani sotib bo'lmaydi"); return; }
    if ((this.save.inventory[id] ?? 0) < 1) { this.push("Sotadigan narsa yo'q"); return; }
    this.addItem(id, -1);
    this.addCoins(price);
    this.persist();
    this.emit();
  }

  boundaryNudge(): void {
    this.push("Bu hududdan tashqariga chiqib bo'lmaydi");
    sfx("boundary");
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
      mapOpen: this.mapOpen, questCollapsed: this.questCollapsed,
      playerX: this.save.player.x, playerY: this.save.player.y,
      musicVol: this.save.audio?.music ?? 0.35, sfxVol: this.save.audio?.sfx ?? 0.7,
      upgrades: this.getUpgradeViews?.() ?? [],
    };
  }
}

export { CROP_LIST };
