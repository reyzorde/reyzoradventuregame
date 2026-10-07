
import Phaser from "phaser";
import { CROP_CONFIGS, INTERACT_R, MAP_COLS, MAP_ROWS, PLAYER_SPEED, TILE, WORLD_H, WORLD_W } from "../config";
import { D } from "../data/dialogues";
import { INITIAL_ANIMALS, NPCS, OBJECTS, T, WALKABLE, createGrid, tw, type WorldObj } from "../data/map";
import type { Facing, PlotState } from "../types";
import { sfx, unlockAudio } from "../systems/AudioSystem";
import { bus } from "../systems/events";
import type { GameModel } from "../systems/GameModel";
import { generateProceduralTextures } from "./proceduralTextures";

export interface Target { kind: string; id: string; x: number; y: number; hint: string; run: () => void }

export class GardenSceneBase extends Phaser.Scene {
  protected model!: GameModel;
  protected player!: Phaser.Physics.Arcade.Sprite;
  protected keys!: Record<string, Phaser.Input.Keyboard.Key>;
  protected facing: Facing = "down";
  protected speed = 0;
  protected walkFrame = 0;
  protected walkAcc = 0;
  protected layer!: Phaser.Tilemaps.TilemapLayer;
  protected crops = new Map<string, Phaser.GameObjects.Container>();
  protected weeds = new Map<string, Phaser.GameObjects.Image>();
  protected pickups = new Map<string, Phaser.GameObjects.Image>();
  protected overlay!: Phaser.GameObjects.Rectangle;
  protected lastHint = "";
  protected panT = 0;
  protected blockers!: Phaser.Physics.Arcade.StaticGroup;
  protected npcs: Record<string, Phaser.Physics.Arcade.Sprite> = {};
  protected unsub: (() => void) | null = null;
  protected decor: Phaser.GameObjects.GameObject[] = [];
  protected animals: Phaser.Physics.Arcade.Sprite[] = [];
  protected waterFx: Phaser.GameObjects.TileSprite | null = null;
  protected boundCd = 0;

  constructor() { super("garden"); }

  init(): void {
    this.crops.clear(); this.weeds.clear(); this.pickups.clear();
    this.npcs = {}; this.decor = []; this.speed = 0; this.facing = "down";
    this.lastHint = ""; this.panT = 0;
    (this as unknown as { forestSpawned?: boolean }).forestSpawned = false;
  }

  create(): void {
    this.model = this.registry.get("model") as GameModel;
    generateProceduralTextures(this);
    this.buildMap();
    this.spawnWorld();
    this.spawnPlots();
    this.spawnPlayer();
    this.spawnNpcs();
    this.spawnAnimals();
    this.setupInput();
    this.setupProbe();
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(50, 36);
    this.cameras.main.setZoom(1.18);
    this.cameras.main.roundPixels = true;
    this.scale.on("resize", this.onResize, this);
    this.overlay = this.add.rectangle(0, 0, WORLD_W, WORLD_H, 0x1a2e4a, 0).setOrigin(0).setDepth(800);
    this.input.on("pointerdown", () => unlockAudio());
    this.events.once("shutdown", () => this.cleanup());
  }

  protected buildMap(): void {
    if (!this.textures.exists("tileset") && !this.textures.exists("tiles")) {
      generateProceduralTextures(this);
    }
    const flat = createGrid();
    const data: number[][] = [];
    for (let y = 0; y < MAP_ROWS; y++) data.push(flat.slice(y * MAP_COLS, (y + 1) * MAP_COLS));
    const map = this.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
    const texKey = this.textures.exists("tileset")
      ? "tileset"
      : this.textures.exists("tiles")
        ? "tiles"
        : null;
    if (!texKey) {
      console.error("[GardenScene] No tileset texture");
      this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
      return;
    }
    const ts = map.addTilesetImage(texKey, texKey, TILE, TILE, 0, 0);
    if (!ts) {
      console.error("[GardenScene] addTilesetImage failed", texKey);
      this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
      return;
    }
    this.layer = map.createLayer(0, ts, 0, 0)!;
    this.layer.setCollisionByExclusion(Array.from(WALKABLE));
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
  }

  protected spawnWorld(): void {
    this.blockers = this.physics.add.staticGroup();
    for (const o of OBJECTS) this.place(o);
  }

  protected place(o: WorldObj): void {
    const { x, y } = tw(o.tx, o.ty);
    const footY = y + TILE * 0.35;
    if (o.kind === "weed") {
      if (this.model.save.weedsCleared.includes(o.id)) return;
      const s = this.add.image(x, footY, "weed").setOrigin(0.5, 1).setDepth(footY);
      this.weeds.set(o.id, s);
      return;
    }
    if (o.kind === "bush") {
      const key = this.textures.exists("bush") ? "bush" : (this.textures.exists("weed") ? "weed" : "rock");
      const s = this.add.image(x, footY, key).setOrigin(0.5, 1).setDepth(footY);
      if (o.collide) {
        const b = o.body ?? { ox: 8, oy: 16, w: 20, h: 12 };
        const z = this.add.zone(x - s.displayWidth / 2 + b.ox + b.w / 2, footY - s.displayHeight + b.oy + b.h / 2, b.w, b.h);
        this.physics.add.existing(z, true);
        this.blockers.add(z);
      }
      return;
    }
    if (o.kind === "rock" || o.kind === "log" || o.kind === "mushroom") {
      if (this.model.save.pickupsTaken.includes(o.id)) return;
      if (o.kind === "mushroom" && !this.model.save.upgrades.forestOpen) return;
      const s = this.add.image(x, footY, o.kind).setOrigin(0.5, 1).setDepth(footY);
      this.pickups.set(o.id, s);
      return;
    }
    if ((o.id.startsWith("ftree-") || o.id === "forest-sign") && !this.model.save.upgrades.forestOpen) {
      return;
    }
    const key = o.kind === "pine" ? "pine" : o.kind;
    const s = this.add.image(x, footY, key).setOrigin(0.5, 1).setDepth(footY);
    if (o.kind === "shop") s.setScale(1.35);
    if (o.kind === "house" || o.kind === "barn") s.setScale(1.1);
    if (o.collide) {
      const b = o.body ?? { ox: 20, oy: 50, w: 40, h: 20 };
      const sc = s.scaleX;
      const z = this.add.zone(
        x - (s.width * sc) / 2 + b.ox * sc + (b.w * sc) / 2,
        footY - s.height * sc + b.oy * sc + (b.h * sc) / 2,
        b.w * sc,
        b.h * sc,
      );
      this.physics.add.existing(z, true);
      this.blockers.add(z);
    }
  }

  protected spawnPlayer(): void {
    const { x, y } = this.model.save.player;
    this.facing = this.model.save.player.facing;
    this.player = this.physics.add.sprite(x, y, "player");
    this.player.setSize(14, 12).setOffset(8, 50);
    this.player.setCollideWorldBounds(true).setDepth(y);
    if (this.layer) this.physics.add.collider(this.player, this.layer);
    this.physics.add.collider(this.player, this.blockers);
  }

  protected spawnNpcs(): void {
    for (const n of NPCS) {
      const { x, y } = tw(n.tx, n.ty);
      const s = this.physics.add.sprite(x, y, n.id);
      s.setScale(1.65);
      s.setImmovable(true).setSize(18, 14).setOffset(4, 52).setDepth(y);
      this.physics.add.collider(this.player, s);
      this.npcs[n.id] = s;
    }
  }

  protected spawnAnimals(): void {
    this.animals = [];
    for (const a of this.model.save.animals) {
      const key = a.kind === "cow" ? "cow" : "fish";
      const s = this.physics.add.sprite(a.x, a.y, key);
      s.setData("id", a.id);
      s.setData("kind", a.kind);
      s.setData("state", "idle");
      s.setData("timer", 500 + Math.random() * 1500);
      s.setData("vx", 0);
      s.setData("vy", 0);
      if (a.kind === "fish") {
        s.setDepth(2);
        s.setAlpha(0.9);
      } else {
        s.setDepth(a.y);
        s.setSize(16, 10).setOffset(8, 18);
        this.physics.add.collider(s, this.blockers);
        if (this.layer) this.physics.add.collider(s, this.layer);
      }
      this.animals.push(s);
    }
  }

  protected updateAnimals(dt: number): void {
    for (const s of this.animals) {
      const kind = s.getData("kind") as string;
      let timer = (s.getData("timer") as number) - dt;
      let state = s.getData("state") as string;
      if (timer <= 0) {
        if (state === "idle") {
          state = "walk";
          timer = 800 + Math.random() * 1200;
          const a = Math.random() * Math.PI * 2;
          const sp = kind === "cow" ? 28 : 36;
          s.setData("vx", Math.cos(a) * sp);
          s.setData("vy", Math.sin(a) * sp);
        } else {
          state = "idle";
          timer = 600 + Math.random() * 1400;
          s.setData("vx", 0);
          s.setData("vy", 0);
        }
        s.setData("state", state);
      }
      s.setData("timer", timer);
      const vx = s.getData("vx") as number;
      const vy = s.getData("vy") as number;
      if (kind === "fish") {
        let nx = s.x + vx * (dt / 1000);
        let ny = s.y + vy * (dt / 1000);
        if (ny < 20 || ny > 5.5 * 48) { s.setData("vy", -vy); ny = s.y; }
        if (nx < 40 || nx > WORLD_W - 40) { s.setData("vx", -vx); nx = s.x; }
        s.setPosition(nx, ny);
      } else {
        s.setVelocity(vx, vy);
        s.setDepth(s.y);
      }
      const id = s.getData("id") as string;
      const a = this.model.save.animals.find((x) => x.id === id);
      if (a) { a.x = s.x; a.y = s.y; }
    }
  }

  protected spawnPlots(): void {
    for (const p of this.model.save.plots) {
      const { x, y } = tw(p.col, p.row);
      const c = this.add.container(x, y + TILE * 0.28).setDepth(y + 2).setVisible(false);
      const cropKey = this.textures.exists("crop0") ? "crop0" : "weed";
      const img = this.add.image(0, 0, cropKey).setOrigin(0.5, 1).setScale(1.35);
      c.add(img);
      this.crops.set(p.id, c);
    }
  }

  protected setupInput(): void {
    this.keys = {} as Record<string, Phaser.Input.Keyboard.Key>;
    if (!this.input.keyboard) return;
    this.keys = this.input.keyboard.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE,ESC,I,ONE,TWO,THREE") as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard.on("keydown-E", () => this.tryInteract());
    this.input.keyboard.on("keydown-SPACE", () => { if (this.model.dialogue.length) this.model.advanceDialogue(); else this.tryInteract(); });
    this.input.keyboard.on("keydown-ESC", () => {
      if (this.model.shopOpen) this.model.closeShop();
      else if (this.model.dialogue.length) this.model.advanceDialogue();
      else if (this.model.playing) this.model.pauseToMenu();
    });
    this.input.keyboard.on("keydown-I", () => { if (this.model.playing && !this.model.dialogue.length) this.model.toggleInventory(); });
    this.input.keyboard.on("keydown-M", () => { if (this.model.playing && !this.model.dialogue.length) this.model.toggleMap(); });
    this.input.keyboard.on("keydown-ONE", () => this.model.selectSeed("carrot"));
    this.input.keyboard.on("keydown-TWO", () => this.model.selectSeed("tomato"));
    this.input.keyboard.on("keydown-THREE", () => this.model.selectSeed("strawberry"));
  }

  protected setupProbe(): void {
    (window as unknown as { __controlsTest?: unknown; __gameModel?: GameModel }).__controlsTest = {
      getYaw: () => ({ right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[this.facing]),
      getSpeed: () => this.speed,
      getPosition: () => ({ x: this.player.x, y: this.player.y }),
      setKeys: (codes: string[]) => { this.model.injectedKeys = new Set(codes); },
    };
    (window as unknown as { __gameModel?: GameModel }).__gameModel = this.model;
  }

  protected onResize = (): void => {
    this.cameras.main.setZoom(1.18);
  };

  protected cleanup(): void {
    this.unsub?.(); this.unsub = null;
    this.scale.off("resize", this.onResize, this);
    this.input.keyboard?.removeAllListeners();
  }

  protected tryInteract(): void { /* overridden in GardenScene */ }
}
