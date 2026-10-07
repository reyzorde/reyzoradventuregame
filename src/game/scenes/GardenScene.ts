import { INTERACT_R } from "../config";
import { OBJECTS, T, tw } from "../data/map";
import type { PlotState } from "../types";
import { sfx, unlockAudio } from "../systems/AudioSystem";
import { GardenSceneBase, type Target } from "./GardenSceneBase";

export class GardenScene extends GardenSceneBase {
  update(_t: number, delta: number): void {
    const dt = Math.min(delta, 50);
    this.model.tick(dt);
    this.refreshCrops();
    this.updateTint();
    this.move();
    this.updateAnimals(dt);
    this.player.setDepth(this.player.y);
    Object.values(this.npcs).forEach((n) => n.setDepth(n.y));
    this.scan();
    if (this.model.interactQueued) { this.model.interactQueued = false; this.tryInteract(); }
    if (!this.model.playing) {
      this.panT += dt * 0.00012;
      this.cameras.main.stopFollow();
      this.cameras.main.scrollX = 350 + Math.sin(this.panT) * 320;
      this.cameras.main.scrollY = 180 + Math.cos(this.panT * 0.7) * 140;
    }
  }

  protected move(): void {
    if (!this.model.playing || this.model.dialogue.length || this.model.shopOpen || this.model.inventoryOpen) {
      this.player.setVelocity(0, 0); this.speed = 0; return;
    }
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    let x = 0, y = 0;
    const inj = this.model.injectedKeys;
    const down = (code: string, k?: Phaser.Input.Keyboard.Key) => inj.has(code) || Boolean(k?.isDown);
    if (down("KeyA", this.keys.A) || down("ArrowLeft", this.keys.LEFT)) x -= 1;
    if (down("KeyD", this.keys.D) || down("ArrowRight", this.keys.RIGHT)) x += 1;
    if (down("KeyW", this.keys.W) || down("ArrowUp", this.keys.UP)) y -= 1;
    if (down("KeyS", this.keys.S) || down("ArrowDown", this.keys.DOWN)) y += 1;
    x += this.model.joystick.x; y += this.model.joystick.y;
    const len = Math.hypot(x, y);
    if (len > 0.15) { x /= len; y /= len; } else { x = 0; y = 0; }
    const spd = typeof this.model.moveSpeed === "function" ? this.model.moveSpeed() : 170;
    this.player.setVelocity(x * spd, y * spd);
    this.speed = Math.hypot(this.player.body?.velocity.x ?? 0, this.player.body?.velocity.y ?? 0);
    if (len > 0.15) {
      this.model.noteMoved();
      if (Math.abs(x) > Math.abs(y)) this.facing = x < 0 ? "left" : "right";
      else this.facing = y < 0 ? "up" : "down";
      this.model.save.player.facing = this.facing;
      sfx("walk", this.time.now);
      this.walkAcc += 1;
      if (this.walkAcc > 8) {
        this.walkAcc = 0;
        this.walkFrame = (this.walkFrame + 1) % 4;
      }
      const frameKey = `player_${this.facing}_${this.walkFrame}`;
      const dirKey = `player_${this.facing}`;
      if (this.textures.exists(frameKey)) {
        this.player.setTexture(frameKey);
        this.player.setFlipX(false);
      } else if (this.textures.exists(dirKey)) {
        this.player.setTexture(dirKey);
        this.player.setFlipX(false);
      } else {
        this.player.setFlipX(this.facing === "left");
      }
    } else {
      this.walkFrame = 0;
      this.walkAcc = 0;
      const idle = `player_${this.facing}`;
      if (this.textures.exists(idle)) this.player.setTexture(idle);
    }
    this.model.save.player.x = this.player.x;
    this.model.save.player.y = this.player.y;
    const b = this.player.body as Phaser.Physics.Arcade.Body | undefined;
    if (b && (b.blocked.left || b.blocked.right || b.blocked.up || b.blocked.down)) {
      if (this.time.now - this.boundCd > 2000 && this.speed > 10) {
        this.boundCd = this.time.now;
        this.model.boundaryNudge();
      }
    }
  }

  protected scan(): void {
    if (!this.model.playing || this.model.dialogue.length || this.model.shopOpen) {
      this.model.setHint(null); return;
    }
    const t = this.nearest();
    const h = t?.hint ?? null;
    if (h !== this.lastHint) { this.lastHint = h ?? ""; this.model.setHint(h); }
  }

  protected nearest(): Target | null {
    const px = this.player.x, py = this.player.y;
    let best: Target | null = null, bestD = INTERACT_R;
    const consider = (t: Target) => {
      const d = Math.hypot(t.x - px, t.y - py);
      if (d < bestD) { bestD = d; best = t; }
    };
    for (const p of this.model.save.plots) {
      const pos = tw(p.col, p.row);
      consider({ kind: "plot", id: p.id, x: pos.x, y: pos.y, hint: this.model.plotHint(p), run: () => this.onPlot(p) });
    }
    this.weeds.forEach((s, id) => {
      consider({ kind: "weed", id, x: s.x, y: s.y, hint: "E — Begona o'tni yulish", run: () => {
        if (this.model.pullWeed(id)) { s.destroy(); this.weeds.delete(id); this.burst(s.x, s.y, 0x6aa34a); }
      }});
    });
    this.pickups.forEach((s, id) => {
      if (id.startsWith("m")) {
        consider({ kind: "pickup", id, x: s.x, y: s.y, hint: "E — Qo'ziqorin olish", run: () => {
          if (this.model.takeMushroom(id)) { s.destroy(); this.pickups.delete(id); this.popup(s.x, s.y, "+1"); this.burst(s.x, s.y, 0xc45c3e); }
        }});
        return;
      }
      const item = id.startsWith("rock") ? "stone" as const : "wood" as const;
      consider({ kind: "pickup", id, x: s.x, y: s.y, hint: item === "stone" ? "E — Tosh olish" : "E — Yog'och olish", run: () => {
        if (this.model.takePickup(id, item)) { s.destroy(); this.pickups.delete(id); this.popup(s.x, s.y, "+1"); }
      }});
    });
    const well = OBJECTS.find((o) => o.id === "well");
    if (well) {
      const p = tw(well.tx, well.ty);
      consider({ kind: "well", id: "well", x: p.x, y: p.y, hint: "E — Suv olish", run: () => this.model.fillWater() });
    }
    for (const id of ["house", "barn", "shop"] as const) {
      const o = OBJECTS.find((x) => x.id === id);
      if (!o) continue;
      const p = tw(o.tx, o.ty);
      const hint = id === "shop" ? "E — Do'konga kirish" : id === "barn" ? "E — Molxonaga qarash" : "E — Uyga qarash";
      consider({ kind: id, id, x: p.x, y: p.y + 20, hint, run: () => {
        if (id === "shop") this.model.talkTom();
        else if (id === "barn" || id === "house") {
          this.model.openDialogue([
            { speaker: id === "barn" ? "Molxona" : "Uy", text: id === "barn" ? "Eski molxona. Keyinroq hayvonlar uchun foydali bo'ladi." : "Boboning uyi. Issiq va xotirjam." },
          ]);
        }
      }});
    }
    const gate = OBJECTS.find((x) => x.id === "gate");
    if (gate) {
      const p = tw(gate.tx, gate.ty);
      consider({ kind: "gate", id: "gate", x: p.x, y: p.y, hint: this.model.save.upgrades.forestOpen ? "E — O'rmonga kirish" : "E — Darvoza (yopiq)", run: () => this.model.openForestGate() });
    }
    for (const [id, s] of Object.entries(this.npcs)) {
      consider({ kind: "npc", id, x: s.x, y: s.y, hint: id === "mira" ? "E — Mira bilan gaplashish" : "E — Tom bilan gaplashish", run: () => {
        if (id === "mira") this.model.talkMira();
        else this.model.talkTom();
      }});
    }
    for (const s of this.animals) {
      const kind = s.getData("kind") as string;
      const id = s.getData("id") as string;
      if (kind === "cow") {
        consider({ kind: "cow", id, x: s.x, y: s.y, hint: "E — Sut olish", run: () => this.model.collectFromAnimal(id) });
      } else if (kind === "fish") {
        consider({ kind: "fish", id, x: s.x, y: s.y + 40, hint: "E — Baliq ovlash", run: () => this.model.tryFish(id) });
      }
    }
    return best;
  }

  protected tryInteract(): void {
    unlockAudio();
    if (!this.model.playing) return;
    if (this.model.dialogue.length) { this.model.advanceDialogue(); return; }
    this.nearest()?.run();
  }

  protected onPlot(p: PlotState): void {
    const before = p.state;
    this.model.interactPlot(p);
    const { x, y } = tw(p.col, p.row);
    if (p.state === "TILLED" && before === "EMPTY") this.burst(x, y, 0x8b6914);
    if (p.state === "PLANTED") this.popup(x, y - 16, "✦");
    if (p.state === "WATERED") this.splash(x, y);
    if (before === "READY" && p.state === "EMPTY") { this.popup(x, y - 20, "+1"); this.burst(x, y, 0xe8a838); }
    this.paint(p);
  }

  protected refreshCrops(): void {
    for (const p of this.model.save.plots) this.paint(p);
    if (this.model.save.upgrades.smallGarden && this.decor.length === 0) {
      const pos = tw(24, 15);
      this.decor.push(this.add.image(pos.x, pos.y, "sign").setDepth(pos.y));
      this.popup(pos.x, pos.y - 30, "Bog' yangilandi!");
    }
    if (this.model.save.upgrades.forestOpen && !(this as unknown as { forestSpawned?: boolean }).forestSpawned) {
      (this as unknown as { forestSpawned?: boolean }).forestSpawned = true;
      for (const o of OBJECTS) {
        if (o.id.startsWith("ftree-") || o.id === "forest-sign" || o.kind === "mushroom") {
          this.place(o);
        }
      }
    }
  }

  protected paint(p: PlotState): void {
    if (this.layer) {
      try {
        if (!p.unlocked) this.layer.putTileAt(T.Dirt, p.col, p.row);
        else if (p.state === "EMPTY") this.layer.putTileAt(T.Dirt, p.col, p.row);
        else if (p.state === "TILLED" || p.state === "PLANTED") this.layer.putTileAt(T.Soil, p.col, p.row);
        else this.layer.putTileAt(T.SoilWet, p.col, p.row);
      } catch { /* tileset not ready */ }
    }
    if (!p.unlocked) {
      this.crops.get(p.id)?.setVisible(false);
      return;
    }
    const c = this.crops.get(p.id);
    if (!c || !c.list?.length) return;
    const phase = this.model.growthPhase(p);
    if (phase < 0 || !p.cropId) {
      c.setVisible(false);
      return;
    }
    const img = c.list[0] as Phaser.GameObjects.Image | undefined;
    if (!img || typeof img.setTexture !== "function") return;
    const specific = `crop_${p.cropId}_${phase}`;
    const fallback = `crop${phase}`;
    const key = this.textures.exists(specific)
      ? specific
      : this.textures.exists(fallback)
        ? fallback
        : this.textures.exists("crop0")
          ? "crop0"
          : null;
    if (!key) {
      c.setVisible(false);
      return;
    }
    try {
      if (img.texture?.key !== key) img.setTexture(key);
      img.setOrigin(0.5, 1);
      img.setScale(1.35);
      img.clearTint();
      if (p.state === "READY") img.setY(Math.sin(this.time.now / 280) * 2);
      else img.setY(0);
      c.setVisible(true);
    } catch {
      c.setVisible(false);
    }
  }

  protected updateTint(): void {
    if (!this.overlay) return;
    const m = this.model.save.time.minutes % (24 * 60);
    let color = 0x1a2e4a, a = 0;
    if (m < 6 * 60) a = 0.28;
    else if (m < 8 * 60) { color = 0xc45c3e; a = 0.1; }
    else if (m < 17 * 60) a = 0;
    else if (m < 20 * 60) { color = 0xe8a838; a = 0.08; }
    else a = 0.22;
    this.overlay.setFillStyle(color, a);
  }

  protected burst(x: number, y: number, tint: number): void {
    if (!this.textures.exists("spark")) return;
    const p = this.add.particles(x, y, "spark", { speed: { min: 20, max: 70 }, lifespan: 420, scale: { start: 0.8, end: 0 }, quantity: 8, tint, emitting: false });
    p.explode(8);
    this.time.delayedCall(500, () => p.destroy());
  }

  protected splash(x: number, y: number): void {
    if (!this.textures.exists("droplet")) return;
    const p = this.add.particles(x, y, "droplet", { speed: { min: 30, max: 80 }, lifespan: 500, scale: { start: 0.9, end: 0.1 }, gravityY: 120, quantity: 10, emitting: false });
    p.explode(10);
    this.time.delayedCall(600, () => p.destroy());
  }

  protected popup(x: number, y: number, text: string): void {
    const t = this.add.text(x, y, text, { fontFamily: "Nunito,sans-serif", fontSize: "16px", color: "#fff8ee", stroke: "#2c2416", strokeThickness: 4 }).setOrigin(0.5).setDepth(2000);
    this.tweens.add({ targets: t, y: y - 28, alpha: 0, duration: 700, ease: "Quad.easeOut", onComplete: () => t.destroy() });
  }

  protected cleanup(): void {
    this.unsub?.(); this.unsub = null;
    this.scale.off("resize", this.onResize, this);
    this.input.keyboard?.removeAllListeners();
  }
}
