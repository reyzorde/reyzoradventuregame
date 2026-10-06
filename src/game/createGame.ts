import Phaser from "phaser";
import { DESIGN_H, DESIGN_W } from "./config";
import { GardenScene } from "./scenes/GardenScene";
import { GameModel } from "./systems/GameModel";

export interface GameHandle {
  game: Phaser.Game;
  model: GameModel;
  destroy: () => void;
}

class BootScene extends Phaser.Scene {
  constructor() { super("boot"); }

  preload(): void {
    const a = "/art";
    // Characters
    this.load.image("player", `${a}/player_down.png`);
    this.load.image("player_down", `${a}/player_down.png`);
    this.load.image("player_left", `${a}/player_left.png`);
    this.load.image("player_right", `${a}/player_right.png`);
    this.load.image("player_up", `${a}/player_up.png`);
    for (const d of ["down", "left", "right", "up"] as const) {
      for (let i = 0; i < 4; i++) this.load.image(`player_${d}_${i}`, `${a}/player_${d}_${i}.png`);
    }
    this.load.image("mira", `${a}/mira.png`);
    this.load.image("tom", `${a}/tom.png`);
    // Buildings
    this.load.image("house", `${a}/house.png`);
    this.load.image("barn", `${a}/barn.png`);
    this.load.image("well", `${a}/well.png`);
    this.load.image("shop", `${a}/shop.png`);
    // Plants
    this.load.image("weed", `${a}/weed0.png`);
    this.load.image("weed0", `${a}/weed0.png`);
    this.load.image("weed1", `${a}/weed1.png`);
    this.load.image("weed2", `${a}/weed2.png`);
    this.load.image("flower_daisy", `${a}/flower_daisy.png`);
    this.load.image("flower_poppy", `${a}/flower_poppy.png`);
    this.load.image("flower_lavender", `${a}/flower_lavender.png`);
    // Crop stages
    for (const crop of ["carrot", "tomato", "strawberry"] as const) {
      for (let i = 0; i < 4; i++) this.load.image(`crop_${crop}_${i}`, `${a}/crop_${crop}_${i}.png`);
    }
    // Generic crop aliases (fallback for phase display)
    this.load.image("crop0", `${a}/crop_carrot_0.png`);
    this.load.image("crop1", `${a}/crop_carrot_1.png`);
    this.load.image("crop2", `${a}/crop_carrot_2.png`);
    this.load.image("crop3", `${a}/crop_carrot_3.png`);
  }

  create(): void {
    this.scene.start("garden");
  }
}

export function createGame(parent: HTMLElement): GameHandle {
  const model = new GameModel();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: DESIGN_W,
    height: DESIGN_H,
    backgroundColor: "#7ec8e3",
    antialias: true,
    roundPixels: true,
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: "arcade", arcade: { gravity: { x: 0, y: 0 }, debug: false } },
    scene: [BootScene, GardenScene],
    input: { keyboard: true },
  });
  game.registry.set("model", model);
  const persist = () => model.persist();
  const onHide = () => { if (document.visibilityState === "hidden") persist(); };
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", persist);
  return {
    game,
    model,
    destroy: () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", persist);
      persist();
      game.destroy(true);
    },
  };
}
