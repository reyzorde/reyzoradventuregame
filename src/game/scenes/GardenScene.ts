import { INTERACT_R } from "../config";
import { D } from "../data/dialogues";
import { OBJECTS, T, tw } from "../data/map";
import type { PlotState } from "../types";
import { sfx, unlockAudio } from "../systems/AudioSystem";
import { GardenSceneBase, type Target } from "./GardenSceneBase";

export class GardenScene extends GardenSceneBase {
  private hopCd = 0;
  private hopT = 0;
  private hopDir = { x: 0, y: 1 };
  private inForest = false;
  private leafFx: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private pollenFx: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private fireflyFx: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private playerShadow: Phaser.GameObjects.Image | null = null;
  private dustCd = 0;

  update(_t: number, delta: number): void {
    const dt = Math.min(delta, 50);
    this.model.tick(dt);
    this.refreshCrops();
    this.updateTint();
    this.move();
    this.updateHop(dt);
    this.updateForestZone();
    this.updateAmbient(dt);
    this.updateAnimals(dt);
    this.syncShadow();
    this.player.setDepth(this.player.y + (this.hopT > 0 ? 8 : 0));
    Object.values(this.npcs).forEach((n) => n.setDepth(n.y));
    this.scan();
    if (this.model.interactQueued) {
      this.model.interactQueued = false;
      this.tryInteract();
    }
    if (this.model.jumpQueued) {
      this.model.jumpQueued = false;
      this.tryHop();
    }
    if (!this.model.playing) {
      this.panT += dt * 0.00012;
      this.cameras.main.stopFollow();
      this.cameras.main.scrollX = 350 + Math.sin(this.panT) * 320;
      this.cameras.main.scrollY = 180 + Math.cos(this.panT * 0.7) * 140;
    }
  }

  /** Short dash-hop (top-down bounce) — Space / mobile jump */
  protected tryHop(): void {
    if (!this.model.playing || this.model.dialogue.length || this.model.shopOpen || this.model.inventoryOpen)
      return;
    if (this.hopCd > 0 || this.hopT > 0) return;
    this.hopT = 280;
    this.hopCd = 420;
    const body = this.player.body as Phaser.Physics.Arcade.Body | undefined;
    const vx = body?.velocity.x ?? 0;
    const vy = body?.velocity.y ?? 0;
    const len = Math.hypot(vx, vy);
    if (len > 20) {
      this.hopDir = { x: vx / len, y: vy / len };
    } else {
      const f = this.facing;
      this.hopDir =
        f === "left"
          ? { x: -1, y: 0 }
          : f === "right"
            ? { x: 1, y: 0 }
            : f === "up"
              ? { x: 0, y: -1 }
              : { x: 0, y: 1 };
    }
    sfx("walk", this.time.now);
    this.tweens.add({
      targets: this.player,
      scaleY: 1.18,
      scaleX: 0.92,
      duration: 90,
      yoyo: true,
      ease: "Quad.easeOut",
    });
    if (this.textures.exists("spark")) {
      const p = this.add.particles(this.player.x, this.player.y + 10, "spark", {
        speed: { min: 30, max: 70 },
        lifespan: 280,
        scale: { start: 0.5, end: 0 },
        quantity: 6,
        tint: 0xc4a06a,
        emitting: false,
      });
      p.explode(6);
      this.time.delayedCall(400, () => p.destroy());
    }
  }

  protected updateHop(dt: number): void {
    if (this.hopCd > 0) this.hopCd -= dt;
    if (this.hopT <= 0) return;
    this.hopT -= dt;
    const boost = 260;
    const body = this.player.body as Phaser.Physics.Arcade.Body | undefined;
    if (body) {
      body.setVelocity(this.hopDir.x * boost, this.hopDir.y * boost);
    }
    const t = 1 - Math.abs(this.hopT - 140) / 140;
    this.player.setScale(1 - t * 0.06, 1 + t * 0.12);
    if (this.hopT <= 0) {
      this.player.setScale(1, 1);
      if (this.textures.exists("spark")) {
        const p = this.add.particles(this.player.x, this.player.y + 8, "spark", {
          speed: { min: 20, max: 50 },
          lifespan: 220,
          scale: { start: 0.4, end: 0 },
          quantity: 4,
          tint: 0xb89a6a,
          emitting: false,
        });
        p.explode(4);
        this.time.delayedCall(300, () => p.destroy());
      }
    }
  }

  protected syncShadow(): void {
    if (!this.playerShadow) {
      if (!this.textures.exists("shadow")) return;
      this.playerShadow = this.add.image(this.player.x, this.player.y + 4, "shadow").setDepth(1);
    }
    const mid = this.hopT > 0 ? 1 - Math.abs(this.hopT - 140) / 140 : 0;
    const sc = 1 - mid * 0.45;
    this.playerShadow.setPosition(this.player.x, this.player.y + 6);
    this.playerShadow.setScale(sc, sc * 0.7);
    this.playerShadow.setAlpha(0.35 - mid * 0.2);
    this.playerShadow.setDepth(this.player.y - 2);
  }

  protected updateForestZone(): void {
    if (!this.model.save.upgrades.forestOpen) return;
    const inF = this.player.x > 56 * 48 - 20;
    if (inF && !this.inForest) {
      this.inForest = true;
      this.cameras.main.fadeIn(400, 20, 40, 28);
      this.spawnLeafFx();
    } else if (!inF && this.inForest) {
      this.inForest = false;
      this.cameras.main.fadeIn(350, 0, 0, 0);
      this.leafFx?.stop();
      this.leafFx = null;
    }
  }

  protected spawnLeafFx(): void {
    if (!this.textures.exists("leaf") || this.leafFx) return;
    this.leafFx = this.add.particles(this.player.x, this.player.y - 40, "leaf", {
      x: { min: -220, max: 260 },
      y: { min: -140, max: 100 },
      speedY: { min: 14, max: 40 },
      speedX: { min: -24, max: 12 },
      lifespan: 2800,
      scale: { start: 0.75, end: 0.15 },
      alpha: { start: 0.65, end: 0 },
      frequency: 160,
      quantity: 1,
      rotate: { min: 0, max: 360 },
      advance: 200,
    });
    this.leafFx.setDepth(900);
    this.time.addEvent({
      delay: 300,
      loop: true,
      callback: () => {
        if (!this.leafFx || !this.inForest) return;
        this.leafFx.setPosition(this.player.x, this.player.y - 40);
      },
    });
  }

  protected updateAmbient(dt: number): void {
    if (!this.pollenFx && this.textures.exists("pollen")) {
      this.pollenFx = this.add.particles(0, 0, "pollen", {
        x: { min: -180, max: 180 },
        y: { min: -100, max: 80 },
        speedX: { min: -8, max: 12 },
        speedY: { min: -6, max: 4 },
        lifespan: 3200,
        scale: { start: 0.55, end: 0.1 },
        alpha: { start: 0.45, end: 0 },
        frequency: 280,
        quantity: 1,
        blendMode: "ADD",
      });
      this.pollenFx.setDepth(50);
    }
    if (this.pollenFx) {
      this.pollenFx.setPosition(this.player.x, this.player.y - 20);
      this.pollenFx.setFrequency(this.inForest ? 600 : 280);
    }
    const mins = this.model.save.time.minutes % (24 * 60);
    const night = mins < 6 * 60 || mins >= 19 * 60;
    if (night && !this.fireflyFx && this.textures.exists("firefly")) {
      this.fireflyFx = this.add.particles(0, 0, "firefly", {
        x: { min: -200, max: 200 },
        y: { min: -120, max: 60 },
        speedX: { min: -18, max: 18 },
        speedY: { min: -12, max: 12 },
        lifespan: 2400,
        scale: { start: 0.7, end: 0.15 },
        alpha: { start: 0.85, end: 0 },
        frequency: 220,
        quantity: 1,
        blendMode: "ADD",
      });
      this.fireflyFx.setDepth(120);
    }
    if (this.fireflyFx) {
      this.fireflyFx.setPosition(this.player.x, this.player.y - 30);
      if (!night) {
        this.fireflyFx.stop();
        this.fireflyFx = null;
      }
    }
    this.dustCd -= dt;
    if (this.dustCd <= 0 && this.speed > 40 && this.hopT <= 0 && this.textures.exists("spark")) {
      this.dustCd = 180;
      const p = this.add.particles(this.player.x, this.player.y + 8, "spark", {
        speed: { min: 8, max: 22 },
        lifespan: 200,
        scale: { start: 0.28, end: 0 },
        quantity: 2,
        tint: 0xc4a06a,
        emitting: false,
      });
      p.explode(2);
      this.time.delayedCall(250, () => p.destroy());
    }
  }

  protected move(): void {
    if (!this.model.playing || this.model.dialogue.length || this.model.shopOpen || this.model.inventoryOpen) {
      this.player.setVelocity(0, 0);
      this.speed = 0;
      return;
    }
    if (this.hopT > 0) {
      this.speed = 260;
      return;
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
    const spd = this.model.moveSpeed();
    this.player.setVelocity(x * spd, y * spd);
    this.speed = Math.hypot(this.player.body?.velocity.x ?? 0, this.player.body?.velocity.y ?? 0);
    if (len > 0.15) {
      this.model.noteMoved();
      if (Math.abs(x) > Math.abs(y)) this.facing = x < 0 ? "left" : "right";
      else this.facing = y < 0 ? "up" : "down";
      this.model.save.player.facing = this.facing;
      sfx("walk", this.time.now);
      this.walkAcc += 1;
      if (this.walkAcc > 8) { this.walkAcc = 0; this.walkFrame = (this.walkFrame + 1) % 4; }
      const frameKey = `player_${this.facing}_${this.walkFrame}`;
      const dirKey = `player_${this.facing}`;
      if (this.textures.exists(frameKey)) { this.player.setTexture(frameKey); this.player.setFlipX(false); }
      else if (this.textures.exists(dirKey)) { this.player.setTexture(dirKey); this.player.setFlipX(false); }
      else { this.player.setFlipX(this.facing === "left"); }
    } else {
      this.walkFrame = 0; this.walkAcc = 0;
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
      consider({ kind: "well", id: "well", x: p.x, y: p.y + 20, hint: "E — Suv olish", run: () => { this.model.fillWater(); this.splash(p.x, p.y); } });
    }
    if (this.npcs.mira) consider({ kind: "npc", id: "mira", x: this.npcs.mira.x, y: this.npcs.mira.y, hint: "E — Mira bilan gaplashish", run: () => this.model.talkMira() });
    if (this.npcs.tom) consider({ kind: "npc", id: "tom", x: this.npcs.tom.x, y: this.npcs.tom.y, hint: "E — Tomning do'koni", run: () => this.model.talkTom() });
    for (const id of ["house", "barn"] as const) {
      const o = OBJECTS.find((x) => x.id === id);
      if (!o) continue;
      const p = tw(o.tx, o.ty);
      const lines = id === "house" ? D.house : D.barn;
      const hint = id === "house" ? "E — Uyga qarash" : "E — Molxonaga qarash";
      consider({ kind: id, id, x: p.x, y: p.y + 40, hint, run: () => this.model.openDialogue(lines) });
    }
    const gate = OBJECTS.find((x) => x.id === "gate");
    if (gate) {
      const p = tw(gate.tx, gate.ty);
      const open = this.model.save.upgrades.forestOpen;
      consider({ kind: "gate", id: "gate", x: p.x, y: p.y + 40, hint: open ? "E — O'rmonga kirish" : "E — Darvozani tekshirish", run: () => this.model.openForestGate() });
    }
    const fsign = OBJECTS.find((x) => x.id === "forest-sign");
    if (fsign && this.model.save.upgrades.forestOpen) {
      const p = tw(fsign.tx, fsign.ty);
      consider({ kind: "sign", id: "forest-sign", x: p.x, y: p.y + 10, hint: "E — Belgiga qarash", run: () => this.model.openDialogue(D.forest_sign) });
    }
    for (const s of this.animals) {
      const kind = s.getData("kind") as string;
      const id = s.getData("id") as string;
      if (kind === "cow") consider({ kind: "cow", id, x: s.x, y: s.y, hint: "E — Sut olish", run: () => this.model.collectFromAnimal(id) });
      else if (kind === "fish") consider({ kind: "fish", id, x: s.x, y: s.y + 40, hint: "E — Baliq ovlash", run: () => this.model.tryFish(id) });
    }
    return best;
  }

  protected tryInteract(): void {
    unlockAudio();
    if (this.model.dialogue.length) { this.model.advanceDialogue(); return; }
    if (!this.model.playing || this.model.shopOpen) return;
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
        if (o.id.startsWith("ftree-") || o.id === "forest-sign" || o.kind === "mushroom") this.place(o);
      }
      this.cameras.main.flash(500, 40, 80, 40);
      const gate = OBJECTS.find((o) => o.id === "gate");
      if (gate && this.textures.exists("leaf")) {
        const gp = tw(gate.tx, gate.ty);
        const p = this.add.particles(gp.x, gp.y, "leaf", {
          speed: { min: 40, max: 120 }, lifespan: 900, scale: { start: 1, end: 0.2 },
          quantity: 18, rotate: { min: 0, max: 360 }, emitting: false,
        });
        p.explode(18);
        this.time.delayedCall(1000, () => p.destroy());
        this.popup(gp.x, gp.y - 40, "O'rmon ochildi!");
      }
    }
  }

  protected paint(p: PlotState): void {
    if (this.layer) {
      try {
        if (!p.unlocked) this.layer.putTileAt(T.Dirt, p.col, p.row);
        else if (p.state === "WATERED" || p.state === "GROWING" || p.state === "READY") this.layer.putTileAt(T.SoilWet, p.col, p.row);
        else this.layer.putTileAt(T.Soil, p.col, p.row);
      } catch { /* tileset not ready */ }
    }
    if (!p.unlocked) { this.crops.get(p.id)?.setVisible(false); return; }
    const c = this.crops.get(p.id);
    if (!c || !c.list?.length) return;
    const phase = this.model.growthPhase(p);
    if (phase < 0 || !p.cropId) { c.setVisible(false); return; }
    const img = c.list[0] as Phaser.GameObjects.Image | undefined;
    if (!img || typeof img.setTexture !== "function") return;
    const specific = `crop_${p.cropId}_${phase}`;
    const fallback = `crop${phase}`;
    const key = this.textures.exists(specific) ? specific : this.textures.exists(fallback) ? fallback : "crop0";
    if (!this.textures.exists(key)) { c.setVisible(false); return; }
    try {
      if (img.texture?.key !== key) img.setTexture(key);
      img.setOrigin(0.5, 1);
      img.setScale(1.35);
      img.clearTint();
      if (p.state === "READY") img.setY(Math.sin(this.time.now / 280) * 2.5);
      else img.setY(0);
      c.setVisible(true);
    } catch { c.setVisible(false); }
  }

  protected updateTint(): void {
    const m = this.model.save.time.minutes % (24 * 60);
    let color = 0x1a2e4a, a = 0;
    if (m < 6 * 60) a = 0.28;
    else if (m < 8 * 60) { color = 0xc45c3e; a = 0.1; }
    else if (m < 17 * 60) a = 0;
    else if (m < 20 * 60) { color = 0xe8a838; a = 0.08; }
    else a = 0.22;
    if (this.inForest) { color = 0x1a3a28; a = Math.max(a, 0.12); }
    this.overlay.setFillStyle(color, a);
  }

  protected burst(x: number, y: number, tint: number): void {
    const p = this.add.particles(x, y, "spark", { speed: { min: 20, max: 70 }, lifespan: 420, scale: { start: 0.8, end: 0 }, quantity: 8, tint, emitting: false });
    p.explode(8);
    this.time.delayedCall(500, () => p.destroy());
  }

  protected splash(x: number, y: number): void {
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
    this.leafFx?.destroy();
    this.pollenFx?.destroy();
    this.fireflyFx?.destroy();
    this.playerShadow?.destroy();
    this.scale.off("resize", this.onResize, this);
    this.input.keyboard?.removeAllListeners();
  }
}
