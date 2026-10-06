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
  create(): void { this.scene.start("garden"); }
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
