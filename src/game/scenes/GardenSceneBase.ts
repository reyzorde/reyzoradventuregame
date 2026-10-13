import Phaser from "phaser";
import { MAP_COLS, MAP_ROWS, TILE, WORLD_H, WORLD_W } from "../config";
import { NPCS, OBJECTS, WALKABLE, createGrid, tw, type WorldObj } from "../data/map";
import type { Facing } from "../types";
import { unlockAudio } from "../systems/AudioSystem";
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
  protected gateBlocker: Phaser.GameObjects.Zone | null = null;
  protected gateSprite: Phaser.GameObjects.Image | null = null;

  constructor() { super("garden"); }

  init(): void {
    this.crops.clear(); this.weeds.clear(); this.pickups.clear();
    this.npcs = {}; this.decor = []; this.speed = 0; this.facing = "down";
    this.lastHint = ""; this.panT = 0;
    this.gateBlocker = null; this.gateSprite = null;
    (this as unknown as { forestSpawned?: boolean }).forestSpawned = false;
  }

  create(): void {
    this.model = this.registry.get("model") as GameModel;
    generateProceduralTextures(this);
    this.buildMap();
    this.spawnWorld();
    this.spawnPlayer();
    this.spawnNpcs();
    this.spawnAnimals();
    this.spawnPlots();
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(50, 36);
    this.cameras.main.setZoom(1.18);
    this.cameras.main.roundPixels = true;
    this.scale.on("resize", this.onResize, this);
    this.onResize();
    this.setupInput();
    this.setupProbe();
    this.overlay = this.add.rectangle(0, 0, WORLD_W, WORLD_H, 0x1a2e4a, 0).setOrigin(0).setDepth(800);
    this.unsub = bus.on("playing", (on) => { if (on) this.time.delayedCall(0, () => this.scene.restart()); });
    this.events.once("shutdown", () => this.cleanup());
  }

  protected buildMap(): void {
    if (!this.textures.exists("tileset") && !this.textures.exists("tiles")) generateProceduralTextures(this);
    const flat = createGrid();
    const data: number[][] = [];
    for (let y = 0; y < MAP_ROWS; y++) data.push(flat.slice(y * MAP_COLS, (y + 1) * MAP_COLS));
    const map = this.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
    const texKey = this.textures.exists("tileset") ? "tileset" : this.textures.exists("tiles") ? "tiles" : null;
    if (!texKey) {
      console.error("[GardenScene] No tileset texture");
      this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
      return;
    }
    const ts = map.addTilesetImage(texKey, texKey, TILE, TILE, 0, 0);
    if (!ts) {
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
    if ((o.id.startsWith("ftree-") || o.id === "forest-sign") && !this.model.save.upgrades.forestOpen) return;
    const key = o.kind === "pine" ? "pine" : o.kind;
    const s = this.add.image(x, footY, key).setOrigin(0.5, 1).setDepth(footY);
    const box: Partial<Record<string, [number, number]>> = {
      shop: [240, 150], house: [210, 210], barn: [230, 230], well: [96, 96],
      gate: [120, 90], tree: [140, 180], pine: [120, 170], sign: [42, 56],
    };
    const b = box[o.kind];
    if (b && s.width > 0 && s.height > 0) s.setScale(Math.min(b[0] / s.width, b[1] / s.height));
    else if (o.kind === "house" || o.kind === "barn") s.setScale(1.1);
    s.setDepth(footY);
    if (o.kind === "gate") {
      this.gateSprite = s;
      if (this.model.save.upgrades.forestOpen) {
        s.setAlpha(0.88);
        s.setTint(0xc8e8c0);
      } else if (o.collide) {
        const bb = o.body ?? { ox: 8, oy: 32, w: 72, h: 28 };
        const z = this.add.zone(
          x - s.displayWidth / 2 + bb.ox + bb.w / 2,
          footY - s.displayHeight + bb.oy + bb.h / 2,
          bb.w, bb.h,
        );
        this.physics.add.existing(z, true);
        this.blockers.add(z);
        this.gateBlocker = z;
      }
      return;
    }
    if (o.collide) {
      const bb = o.body ?? { ox: 20, oy: 50, w: 40, h: 20 };
      const scale = s.scaleX;
      const z = this.add.zone(
        x - (s.width * scale) / 2 + bb.ox * scale + (bb.w * scale) / 2,
        footY - s.height * scale + bb.oy * scale + (bb.h * scale) / 2,
        bb.w * scale, bb.h * scale,
      );
      this.physics.add.existing(z, true);
      this.blockers.add(z);
    }
  }

  protected openGatePassage(): void {
    if (this.gateBlocker) { this.gateBlocker.destroy(); this.gateBlocker = null; }
    if (this.gateSprite) { this.gateSprite.setAlpha(0.88); this.gateSprite.setTint(0xc8e8c0); }
  }

  protected spawnPlayer(): void {
    const { x, y } = this.model.save.player;
    this.facing = this.model.save.player.facing;
    this.player = this.physics.add.sprite(x, y, "player");
    this.player.setSize(14, 12).setOffset(8, 50);
    this.player.setCollideWorldBounds(true).setDepth(y);
    this.physics.add.collider(this.player, this.layer);
    this.physics.add.collider(this.player, this.blockers);
  }

  protected spawnNpcs(): void {
    for (const n of NPCS) {
      const { x, y } = tw(n.tx, n.ty);
      const s = this.physics.add.sprite(x, y, n.id);
      if (s.height > 0) s.setScale(s.height > 90 ? 120 / s.height : 1.65);
      s.setImmovable(true).setSize(18, 14).setOffset(4, 52).setDepth(y);
      this.physics.add.collider(this.player, s);
      this.npcs[n.id] = s;
    }
  }

  protected spawnAnimals(): void {
    this.animals = [];
    // Animals temporarily disabled
  }

  protected updateAnimals(_dt: number): void {
    /* disabled */
  }

  protected spawnPlots(): void {
    for (const p of this.model.save.plots) {
      const { x, y } = tw(p.col, p.row);
      const c = this.add.container(x, y + TILE * 0.28).setDepth(y + 2).setVisible(false);
      const img = this.add.image(0, 0, "crop0").setOrigin(0.5, 1).setScale(1.35);
      c.add(img);
      this.crops.set(p.id, c);
    }
  }

  protected setupInput(): void {
    this.keys = {} as Record<string, Phaser.Input.Keyboard.Key>;
    if (!this.input.keyboard) return;
    this.keys = this.input.keyboard.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE,SHIFT,ESC,I,ONE,TWO,THREE") as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard.on("keydown-E", () => this.tryInteract());
    this.input.keyboard.on("keydown-SPACE", () => {
      if (this.model.dialogue.length) this.model.advanceDialogue();
      else this.model.jumpQueued = true;
    });
    this.input.keyboard.on("keydown-SHIFT", () => { this.model.jumpQueued = true; });
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
    this.input.on("pointerdown", () => unlockAudio());
  }

  protected setupProbe(): void {
    window.__controlsTest = {
      getYaw: () => ({ right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[this.facing]),
      getSpeed: () => this.speed,
      getPosition: () => ({ x: this.player.x, y: this.player.y }),
      setKeys: (codes: string[]) => { this.model.injectedKeys = new Set(codes); },
    };
    window.__gameModel = this.model;
  }

  protected onResize = (): void => { this.cameras.main.setZoom(1.18); };

  protected cleanup(): void {
    this.unsub?.(); this.unsub = null;
    this.scale.off("resize", this.onResize, this);
    this.input.keyboard?.removeAllListeners();
  }

  protected tryInteract(): void { /* overridden */ }
}
