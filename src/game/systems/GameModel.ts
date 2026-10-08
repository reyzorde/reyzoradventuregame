import {
  ANIMAL_COOLDOWN,
  CROP_CONFIGS,
  CROP_LIST,
  FISH_COOLDOWN,
  ITEM_LABELS,
  PLAYER_SPEED,
  QUEST_DEFS,
  SELL_PRICE,
  TUTORIAL,
  UPGRADE_DEFS,
  UPGRADE_LIST,
  formatGrowth,
  upgradeCost,
  upgradeValue,
} from "../config";
import { D } from "../data/dialogues";
import type { CropId, HudSnapshot, ItemId, PlotState, UpgradeId, UpgradeView } from "../types";
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
      case "GROWING": {
        if (p.cropId && p.wateredAt != null) {
          const cfg = CROP_CONFIGS[p.cropId];
          const left = Math.max(0, cfg.growthMs - (Date.now() - p.wateredAt));
          return `O'smoqda… ${formatGrowth(left)}`;
        }
        return "Ekin o'smoqda";
      }
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
  /** @deprecated alias */
  collectWeed(id: string): boolean { return this.pullWeed(id); }

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
  /** @deprecated alias */
  collectPickup(id: string, item: ItemId): boolean { return this.takePickup(id, item); }

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
    if (this.save.tutorialStep >= TUTORIAL.length) return null;
    return TUTORIAL[this.save.tutorialStep] ?? null;
  }

  toggleMap(): void {
    this.mapOpen = !this.mapOpen;
    if (this.mapOpen) this.inventoryOpen = false;
    sfx("open");
    this.emit();
  }

  toggleQuestPanel(): void {
    this.questCollapsed = !this.questCollapsed;
    sfx("ui");
    this.emit();
  }

  setVolumes(music: number, sfxV: number): void {
    if (!this.save.audio) this.save.audio = { music: 0.35, sfx: 0.7 };
    this.save.audio.music = music;
    this.save.audio.sfx = sfxV;
    setMusicVolume(music);
    setSfxVolume(sfxV);
    this.persist();
  }

  collectFromAnimal(id: string): boolean {
    const a = this.save.animals.find((x) => x.id === id && x.kind === "cow");
    if (!a) return false;
    const now = Date.now();
    if (now - a.lastCollect < ANIMAL_COOLDOWN) {
      const left = Math.ceil((ANIMAL_COOLDOWN - (now - a.lastCollect)) / 1000);
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

  moveSpeed(): number {
    const lv = this.save.upgradeLevels?.move_speed ?? 0;
    return upgradeValue("move_speed", lv) || PLAYER_SPEED;
  }

  upgradeViews(): UpgradeView[] {
    return UPGRADE_LIST.map((id) => {
      const def = UPGRADE_DEFS[id];
      const level = this.save.upgradeLevels?.[id] ?? 0;
      const cost = upgradeCost(id, level);
      const atMax = level >= def.maxLevel;
      return {
        id,
        nameUz: def.nameUz,
        description: def.description,
        level,
        maxLevel: def.maxLevel,
        currentValue: upgradeValue(id, level),
        nextValue: atMax ? null : upgradeValue(id, level + 1),
        cost,
        unit: def.unit,
        canAfford: cost != null && this.save.coins >= cost,
        atMax,
      };
    });
  }

  buyUpgrade(id: UpgradeId): boolean {
    const def = UPGRADE_DEFS[id];
    if (!def) return false;
    if (!this.save.upgradeLevels) this.save.upgradeLevels = { water_cap: 0, move_speed: 0 };
    const level = this.save.upgradeLevels[id] ?? 0;
    if (level >= def.maxLevel) {
      this.push("Maksimal daraja");
      return false;
    }
    const cost = upgradeCost(id, level);
    if (cost == null) return false;
    if (this.save.coins < cost) {
      this.push(`Tangalar yetarli emas (${cost}🪙 kerak)`);
      sfx("ui");
      return false;
    }
    this.save.coins -= cost;
    this.save.upgradeLevels[id] = level + 1;
    if (id === "water_cap") {
      const next = upgradeValue("water_cap", level + 1);
      const prev = this.save.waterMax;
      this.save.waterMax = next;
      this.save.water = Math.min(this.save.water + (next - prev), next);
    }
    sfx("quest");
    this.push(`${def.nameUz} → daraja ${level + 1}`);
    this.persist();
    this.emit();
    return true;
  }

  snapshot(): HudSnapshot {
    const qid = this.save.quests.active;
    const def = qid ? QUEST_DEFS[qid] : null;
    const wLv = this.save.upgradeLevels?.water_cap ?? 0;
    this.save.waterMax = upgradeValue("water_cap", wLv);
    return {
      coins: this.save.coins,
      water: this.save.water,
      waterMax: this.save.waterMax,
      day: this.save.time.day,
      clock: this.clock(),
      inventory: { ...this.save.inventory },
      selectedSeed: this.selectedSeed,
      questTitle: def?.title ?? "Barcha topshiriqlar bajarildi",
      questObjective: def?.objective ?? "O'rmon va undan keyingi joylar kutilmoqda.",
      questProgress: qid ? (this.save.quests.progress[qid] ?? 0) : 1,
      questTarget: def?.target ?? 1,
      questReward: def?.rewardLabel ?? "",
      interactHint: this.playing ? this.interactHint : null,
      tutorial: this.tutorial(),
      notices: this.notices,
      dialogue: this.currentDialogue(),
      shopOpen: this.shopOpen,
      inventoryOpen: this.inventoryOpen,
      menu: this.menu,
      hasSave: this.hasSave(),
      playing: this.playing,
      mapOpen: this.mapOpen,
      questCollapsed: this.questCollapsed,
      playerX: this.save.player.x,
      playerY: this.save.player.y,
      musicVol: this.save.audio?.music ?? 0.35,
      sfxVol: this.save.audio?.sfx ?? 0.7,
      upgrades: this.upgradeViews(),
    };
  }
}

export { CROP_LIST };
