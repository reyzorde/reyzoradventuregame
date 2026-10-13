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
    const seed = CROP_CONFIGS[this.selectedSeed].seedItem;
    if ((this.save.inventory[seed] ?? 0) < 1) { this.push("Urug' yo'q"); return false; }
    this.addItem(seed, -1);
    p.state = "PLANTED";
    p.cropId = this.selectedSeed;
    p.plantedAt = Date.now();
    p.wateredAt = null;
    sfx("plant");
    this.advanceQuest("first_seeds");
    this.persist(); this.emit();
    return true;
  }

  water(p: PlotState): boolean {
    if (!p.unlocked || (p.state !== "PLANTED" && p.state !== "WATERED" && p.state !== "GROWING")) return false;
    if (this.save.water < 1) { this.push("Suv yo'q — quduqdan oling"); return false; }
    if (p.state === "PLANTED") {
      this.save.water -= 1;
      p.state = "WATERED";
      p.wateredAt = Date.now();
      sfx("water");
      this.advanceQuest("need_water");
      this.persist(); this.emit();
    }
    return true;
  }

  harvest(p: PlotState): boolean {
    if (!p.unlocked || p.state !== "READY" || !p.cropId) return false;
    const cfg = CROP_CONFIGS[p.cropId];
    this.addItem(cfg.harvestItem, 1);
    p.state = "EMPTY";
    p.cropId = null;
    p.plantedAt = null;
    p.wateredAt = null;
    sfx("harvest");
    this.advanceQuest("first_harvest");
    this.persist(); this.emit();
    return true;
  }

  interactPlot(p: PlotState): void {
    if (!p.unlocked) { this.push("Bu yer hali yopiq"); return; }
    if (p.state === "EMPTY") this.till(p);
    else if (p.state === "TILLED") this.plant(p);
    else if (p.state === "PLANTED" || p.state === "WATERED" || p.state === "GROWING") this.water(p);
    else if (p.state === "READY") this.harvest(p);
  }

  plotHint(p: PlotState): string {
    if (!p.unlocked) return "Yopiq yer";
    if (p.state === "EMPTY") return "E — Yerni haydash";
    if (p.state === "TILLED") return "E — Urug' ekish";
    if (p.state === "PLANTED") return "E — Sug'orish";
    if (p.state === "WATERED" || p.state === "GROWING") return "E — Sug'orish / kutish";
    if (p.state === "READY") return "E — Hosil yig'ish";
    return "E";
  }

  fillWater(): void {
    if (this.save.water >= this.save.waterMax) { this.push("Idish to'la"); return; }
    this.save.water = this.save.waterMax;
    sfx("water");
    this.push("Suv to'ldirildi");
    this.persist(); this.emit();
  }

  pullWeed(id: string): boolean {
    if (this.save.weedsCleared.includes(id)) return false;
    this.save.weedsCleared.push(id);
    sfx("till");
    this.advanceQuest("clear_garden");
    this.persist(); this.emit();
    return true;
  }

  talkMira(): void {
    // Mira temporarily removed from the world
    this.openDialogue([{ speaker: "", text: "Hozircha bu yerda hech kim yo'q." }]);
  }

  enterShop(): void {
    this.shopOpen = true;
    this.inventoryOpen = false;
    this.mapOpen = false;
    this.dialogue = [];
    sfx("open");
    this.emit();
  }

  talkTom(): void {
    this.enterShop();
  }

  openShop(): void {
    this.shopOpen = true;
    this.inventoryOpen = false;
    this.mapOpen = false;
    this.emit();
  }

  closeShop(): void {
    this.shopOpen = false;
    this.emit();
  }

  toggleInventory(): void {
    this.inventoryOpen = !this.inventoryOpen;
    if (this.inventoryOpen) this.shopOpen = false;
    this.emit();
  }

  toggleMap(): void {
    this.mapOpen = !this.mapOpen;
    this.emit();
  }

  toggleQuestPanel(): void {
    this.questCollapsed = !this.questCollapsed;
    this.emit();
  }

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
    if (crop === "carrot" && this.save.quests.active === "help_village") {
      this.advanceQuest("help_village", 1);
    }
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

  moveSpeed(): number {
    const lv = this.save.upgradeLevels.move_speed ?? 0;
    return upgradeValue("move_speed", lv) || PLAYER_SPEED;
  }

  boundaryNudge(): void {
    this.push("Yo'l shu tomonda emas");
    sfx("boundary");
  }

  buyUpgrade(id: UpgradeId): void {
    const lv = this.save.upgradeLevels[id] ?? 0;
    const cost = upgradeCost(id, lv);
    if (cost == null) { this.push("Maksimal daraja"); return; }
    if (this.save.coins < cost) { this.push("Tangalar yetarli emas"); return; }
    this.save.coins -= cost;
    this.save.upgradeLevels[id] = lv + 1;
    if (id === "water_cap") this.save.waterMax = upgradeValue("water_cap", lv + 1);
    sfx("coin");
    this.push(`${UPGRADE_DEFS[id].nameUz} yaxshilandi`);
    this.persist(); this.emit();
  }

  sellItem(id: ItemId): void {
    const price = SELL_PRICE[id];
    if (!price || (this.save.inventory[id] ?? 0) < 1) return;
    this.addItem(id, -1);
    this.addCoins(price);
    this.persist(); this.emit();
  }

  collectFromAnimal(_id: string): boolean {
    return false;
  }

  tryFish(_id: string): boolean {
    return false;
  }

  setVolumes(music: number, sfxV: number): void {
    this.save.audio = { music, sfx: sfxV };
    setMusicVolume(music);
    setSfxVolume(sfxV);
    this.persist();
  }

  upgradeViews(): UpgradeView[] {
    return UPGRADE_LIST.map((id) => {
      const def = UPGRADE_DEFS[id];
      const level = this.save.upgradeLevels[id] ?? 0;
      return {
        id,
        nameUz: def.nameUz,
        description: def.description,
        level,
        maxLevel: def.maxLevel,
        value: upgradeValue(id, level),
        nextCost: upgradeCost(id, level),
        unit: def.unit,
      };
    });
  }

  snapshot(): HudSnapshot {
    const qid = this.save.quests.active;
    const q = qid ? QUEST_DEFS[qid] : null;
    return {
      menu: this.menu,
      playing: this.playing,
      hasSave: this.hasSave(),
      coins: this.save.coins,
      water: this.save.water,
      waterMax: this.save.waterMax,
      day: this.save.time.day,
      clock: this.clock(),
      inventory: { ...this.save.inventory },
      selectedSeed: this.selectedSeed,
      interactHint: this.interactHint,
      notices: this.notices,
      dialogue: this.currentDialogue(),
      shopOpen: this.shopOpen,
      inventoryOpen: this.inventoryOpen,
      mapOpen: this.mapOpen,
      questCollapsed: this.questCollapsed,
      questTitle: q?.title ?? "",
      questObjective: q?.objective ?? "",
      questProgress: qid ? (this.save.quests.progress[qid] ?? 0) : 0,
      questTarget: q?.target ?? 0,
      questReward: q?.rewardLabel ?? "",
      tutorial: this.tutorial(),
      upgrades: this.upgradeViews(),
      audio: { ...this.save.audio },
    };
  }
}
