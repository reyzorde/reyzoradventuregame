import Phaser from "phaser";
import { TILE } from "../config";

/** Procedural fallback textures when art assets missing */
export function generateProceduralTextures(scene: Phaser.Scene): void {
    const mk = (key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void) => {
      if (scene.textures.exists(key)) return;
      const g = scene.make.graphics({ x: 0, y: 0 });
      draw(g);
      g.generateTexture(key, w, h);
      g.destroy();
    };
    // tileset strip 11 tiles
    if (!scene.textures.exists("tileset")) {
      const g = scene.make.graphics({ x: 0, y: 0 });
      const cols = [
        0x4a7a3a, 0x3f6e34, 0xb89a6a, 0x7a5c38, 0x6b4a2a, 0x5a3c22,
        0x3d7ea8, 0xc9b48a, 0x8a8680, 0x9a7040, 0x5a8a42,
      ];
      cols.forEach((c, i) => {
        g.fillStyle(c, 1);
        g.fillRect(i * TILE, 0, TILE, TILE);
        g.fillStyle(0x000000, 0.06);
        for (let k = 0; k < 8; k++) {
          const x = i * TILE + ((k * 17 + i * 13) % (TILE - 4));
          const y = (k * 23 + i * 7) % (TILE - 4);
          g.fillRect(x, y, 2, 2);
        }
      });
      g.fillStyle(0x7ec8e3, 0.35);
      g.fillRect(6 * TILE + 8, 10, 20, 6);
      g.fillRect(6 * TILE + 18, 28, 16, 5);
      g.fillStyle(0xf0e070, 1);
      g.fillCircle(10 * TILE + 14, 16, 3);
      g.fillStyle(0xe070a0, 1);
      g.fillCircle(10 * TILE + 30, 28, 3);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(10 * TILE + 22, 36, 3);
      g.generateTexture("tileset", TILE * 11, TILE);
      if (!scene.textures.exists("tiles")) {
        g.generateTexture("tiles", TILE * 11, TILE);
      }
      g.destroy();
    }
    if (!scene.textures.exists("tiles") && scene.textures.exists("tileset")) {
      const src = scene.textures.get("tileset").getSourceImage();
      if (src instanceof HTMLCanvasElement) {
        scene.textures.addCanvas("tiles", src);
      } else if (src instanceof HTMLImageElement) {
        scene.textures.addImage("tiles", src);
      }
    }
    mk("player", 32, 48, (g) => {
      g.fillStyle(0x3d7a4a, 1); g.fillRoundedRect(6, 18, 20, 22, 4);
      g.fillStyle(0xf0c090, 1); g.fillCircle(16, 14, 9);
      g.fillStyle(0xc4a060, 1); g.fillEllipse(16, 10, 20, 8);
      g.fillStyle(0x8b5a2b, 1); g.fillRect(10, 38, 5, 8); g.fillRect(17, 38, 5, 8);
    });
    mk("mira", 32, 48, (g) => {
      g.fillStyle(0xd4a0b8, 1); g.fillRoundedRect(6, 18, 20, 22, 4);
      g.fillStyle(0xf0c090, 1); g.fillCircle(16, 14, 9);
      g.fillStyle(0x8b3a2b, 1); g.fillEllipse(16, 10, 18, 10);
      g.fillStyle(0xf0c040, 1); g.fillCircle(22, 10, 3);
    });
    mk("tom", 32, 48, (g) => {
      g.fillStyle(0x3d6a4a, 1); g.fillRoundedRect(6, 18, 20, 22, 4);
      g.fillStyle(0xf0c090, 1); g.fillCircle(16, 14, 9);
      g.fillStyle(0x5a3a20, 1); g.fillEllipse(16, 10, 16, 8);
      g.fillStyle(0x5a3a20, 1); g.fillRect(11, 18, 10, 3);
    });
    mk("house", 160, 140, (g) => {
      g.fillStyle(0xc4a06a, 1); g.fillRect(20, 50, 120, 80);
      g.fillStyle(0xb85a3a, 1); g.fillTriangle(10, 55, 80, 10, 150, 55);
      g.fillStyle(0xfff3dc, 1); g.fillRect(70, 90, 24, 40);
      g.fillStyle(0x7ec8e3, 1); g.fillRect(40, 70, 22, 18); g.fillRect(100, 70, 22, 18);
    });
    mk("barn", 170, 140, (g) => {
      g.fillStyle(0xa04a30, 1); g.fillRect(15, 45, 140, 90);
      g.fillStyle(0x6a3a20, 1); g.fillTriangle(5, 50, 85, 8, 165, 50);
      g.fillStyle(0x5a3020, 1); g.fillRect(60, 85, 50, 50);
    });
    mk("well", 72, 80, (g) => {
      g.fillStyle(0x8a8680, 1); g.fillEllipse(36, 55, 56, 28);
      g.fillStyle(0x4a80a0, 1); g.fillEllipse(36, 55, 36, 16);
      g.fillStyle(0x8b6914, 1); g.fillRect(12, 20, 8, 40); g.fillRect(52, 20, 8, 40);
      g.fillStyle(0xb8894a, 1); g.fillRect(10, 14, 52, 10);
    });
    mk("shop", 140, 120, (g) => {
      g.fillStyle(0xc4a06a, 1); g.fillRect(10, 50, 120, 60);
      g.fillStyle(0x3d7a4a, 1); g.fillRect(5, 30, 130, 24);
      g.fillStyle(0xe8a838, 1); g.fillRect(30, 70, 20, 16);
      g.fillStyle(0xd9443b, 1); g.fillRect(60, 70, 20, 16);
      g.fillStyle(0xe84a6a, 1); g.fillRect(90, 70, 20, 16);
    });
    mk("tree", 90, 120, (g) => {
      g.fillStyle(0x6b4a28, 1); g.fillRect(38, 70, 14, 45);
      g.fillStyle(0x3d8a3a, 1); g.fillCircle(45, 55, 36);
      g.fillStyle(0x4fa84a, 1); g.fillCircle(30, 45, 22); g.fillCircle(60, 42, 24);
    });
    mk("pine", 70, 120, (g) => {
      g.fillStyle(0x6b4a28, 1); g.fillRect(30, 80, 10, 35);
      g.fillStyle(0x2d6a3a, 1);
      g.fillTriangle(35, 10, 5, 55, 65, 55);
      g.fillTriangle(35, 30, 8, 75, 62, 75);
      g.fillTriangle(35, 50, 12, 95, 58, 95);
    });
    mk("gate", 100, 70, (g) => {
      g.fillStyle(0x8b6914, 1); g.fillRect(8, 10, 12, 55); g.fillRect(80, 10, 12, 55);
      g.fillStyle(0xa07a40, 1); g.fillRect(20, 20, 60, 10); g.fillRect(20, 40, 60, 10);
      g.fillStyle(0xe8a838, 1); g.fillCircle(50, 45, 6);
    });
    mk("weed", 28, 28, (g) => {
      g.fillStyle(0x5a8a3a, 1);
      g.fillTriangle(14, 4, 4, 24, 12, 22);
      g.fillTriangle(14, 4, 24, 24, 16, 22);
      g.fillStyle(0xc4a030, 1); g.fillCircle(18, 10, 3);
    });
    mk("bush", 40, 32, (g) => {
      g.fillStyle(0x3d6a32, 1); g.fillEllipse(20, 20, 36, 22);
      g.fillStyle(0x4a7a3a, 1); g.fillEllipse(12, 16, 18, 14); g.fillEllipse(28, 14, 16, 14);
      g.fillStyle(0x2d5a28, 1); g.fillEllipse(20, 22, 20, 12);
    });
    mk("rock", 36, 24, (g) => {
      g.fillStyle(0x8a8680, 1); g.fillEllipse(18, 14, 32, 18);
      g.fillStyle(0xa8a49e, 1); g.fillEllipse(14, 12, 14, 10);
    });
    mk("log", 48, 20, (g) => {
      g.fillStyle(0x8b6914, 1); g.fillRoundedRect(2, 4, 44, 12, 6);
      g.fillStyle(0xc4a06a, 1); g.fillEllipse(6, 10, 10, 12);
    });
    mk("sign", 28, 36, (g) => {
      g.fillStyle(0x8b6914, 1); g.fillRect(12, 16, 4, 18);
      g.fillStyle(0xc4a06a, 1); g.fillRoundedRect(2, 2, 24, 18, 3);
    });
    mk("mushroom", 22, 22, (g) => {
      g.fillStyle(0xc45c3e, 1); g.fillEllipse(11, 10, 18, 12);
      g.fillStyle(0xf0e0c0, 1); g.fillRect(8, 12, 6, 8);
      g.fillStyle(0xffffff, 0.7); g.fillCircle(7, 8, 2); g.fillCircle(14, 9, 1.5);
    });
    mk("crop0", 24, 24, (g) => { g.fillStyle(0x6aa34a, 1); g.fillTriangle(12, 6, 6, 20, 18, 20); });
    mk("crop1", 28, 32, (g) => { g.fillStyle(0x5a9a3a, 1); g.fillEllipse(14, 18, 20, 22); g.fillStyle(0x4a8a2a, 1); g.fillTriangle(14, 4, 8, 16, 20, 16); });
    mk("crop2", 32, 36, (g) => { g.fillStyle(0x4f9b3a, 1); g.fillEllipse(16, 20, 24, 26); g.fillStyle(0xe07a2f, 1); g.fillCircle(12, 22, 4); g.fillCircle(20, 18, 4); });
    mk("crop3", 36, 40, (g) => { g.fillStyle(0x4f9b3a, 1); g.fillEllipse(18, 22, 28, 30); g.fillStyle(0xd9443b, 1); g.fillCircle(12, 20, 5); g.fillCircle(24, 18, 5); g.fillCircle(18, 28, 5); });
    mk("droplet", 8, 8, (g) => { g.fillStyle(0x7ec8e3, 1); g.fillCircle(4, 4, 4); });
    mk("spark", 6, 6, (g) => { g.fillStyle(0xe8a838, 1); g.fillCircle(3, 3, 3); });
    mk("cow", 40, 32, (g) => {
      g.fillStyle(0xf0e8d8, 1); g.fillRoundedRect(4, 10, 28, 16, 6);
      g.fillStyle(0x2a2218, 1); g.fillCircle(28, 12, 3); g.fillCircle(10, 12, 2);
      g.fillStyle(0xe8dcc8, 1); g.fillEllipse(32, 14, 10, 10);
      g.fillStyle(0x5a4030, 1); g.fillRect(8, 24, 4, 6); g.fillRect(24, 24, 4, 6);
    });
    mk("fish", 16, 10, (g) => {
      g.fillStyle(0x5a9ec8, 1); g.fillEllipse(8, 5, 12, 8);
      g.fillStyle(0x3d7ea8, 1); g.fillTriangle(2, 5, 0, 2, 0, 8);
      g.fillStyle(0xffffff, 1); g.fillCircle(11, 4, 1.5);
    });
}
