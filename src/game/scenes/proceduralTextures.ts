import type Phaser from "phaser";

/** Generate fallback textures when art PNGs are missing */
export function generateProceduralTextures(scene: Phaser.Scene): void {
  const mk = (key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void) => {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0 });
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
  };

  // Tileset strip (11 tiles × 48)
  if (!scene.textures.exists("tileset") && !scene.textures.exists("tiles")) {
    const tw = 48, th = 48, cols = 11;
    const g = scene.make.graphics({ x: 0, y: 0 });
    const colors = [
      0x5a8a4a, 0x4e7a42, 0xc4a574, 0x8b6914, 0x6b5420,
      0x4a7a3a, 0x3a6a9a, 0x7a9a5a, 0x9a8a7a, 0x6a5030, 0x8a6a3a,
    ];
    for (let i = 0; i < cols; i++) {
      g.fillStyle(colors[i] ?? 0x5a8a4a, 1);
      g.fillRect(i * tw, 0, tw, th);
      if (i === 0 || i === 1) {
        g.fillStyle(0x6aaa5a, 0.3);
        for (let k = 0; k < 6; k++) g.fillCircle(i * tw + 8 + (k % 3) * 14, 10 + Math.floor(k / 3) * 20, 3);
      }
      if (i === 6) {
        g.fillStyle(0x5ab0d0, 0.4);
        g.fillRect(i * tw + 4, 8, tw - 8, th - 16);
      }
    }
    g.generateTexture("tileset", cols * tw, th);
    g.destroy();
  }

  // Player directional frames (simple body + leg bob)
  const dirs = ["down", "up", "left", "right"] as const;
  for (const d of dirs) {
    for (let f = 0; f < 4; f++) {
      const key = `player_${d}_${f}`;
      if (scene.textures.exists(key)) continue;
      mk(key, 32, 48, (g) => {
        const legOff = [0, 2, 0, -2][f];
        g.fillStyle(0x3d6b3e, 1);
        g.fillRoundedRect(8, 18, 16, 18, 4); // body
        g.fillStyle(0xf0d0a0, 1);
        g.fillCircle(16, 12, 7); // head
        g.fillStyle(0x2a4a2a, 1);
        g.fillRect(10, 36 + legOff, 5, 8);
        g.fillRect(17, 36 - legOff, 5, 8);
        if (d === "left") g.fillStyle(0x222, 1), g.fillCircle(12, 11, 1.5);
        if (d === "right") g.fillStyle(0x222, 1), g.fillCircle(20, 11, 1.5);
        if (d === "down") g.fillStyle(0x222, 1), g.fillCircle(13, 12, 1.5), g.fillCircle(19, 12, 1.5);
      });
    }
    if (!scene.textures.exists(`player_${d}`)) {
      scene.textures.addSpriteSheetFromAtlas
        ? null
        : null;
      // alias first frame
      if (scene.textures.exists(`player_${d}_0`)) {
        // already have frames
      }
    }
  }
  if (!scene.textures.exists("player")) {
    mk("player", 32, 48, (g) => {
      g.fillStyle(0x3d6b3e, 1);
      g.fillRoundedRect(8, 18, 16, 18, 4);
      g.fillStyle(0xf0d0a0, 1);
      g.fillCircle(16, 12, 7);
      g.fillStyle(0x2a4a2a, 1);
      g.fillRect(10, 36, 5, 8);
      g.fillRect(17, 36, 5, 8);
      g.fillStyle(0x222, 1);
      g.fillCircle(13, 12, 1.5);
      g.fillCircle(19, 12, 1.5);
    });
  }

  // Ambient particles
  mk("pollen", 6, 6, (g) => {
    g.fillStyle(0x9ab86a, 0.9);
    g.fillCircle(3, 3, 2.5);
  });
  mk("firefly", 6, 6, (g) => {
    g.fillStyle(0xfff2a0, 1);
    g.fillCircle(3, 3, 2);
    g.fillStyle(0xffe060, 0.4);
    g.fillCircle(3, 3, 3);
  });
  mk("leaf", 10, 10, (g) => {
    g.fillStyle(0x5a8a3a, 1);
    g.fillEllipse(5, 5, 8, 5);
    g.lineStyle(1, 0x3a6a2a, 0.8);
    g.lineBetween(2, 5, 8, 5);
  });
  mk("shadow", 24, 10, (g) => {
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(12, 5, 22, 8);
  });
  mk("spark", 6, 6, (g) => {
    g.fillStyle(0xffe8a0, 1);
    g.fillCircle(3, 3, 2);
  });
  mk("droplet", 6, 8, (g) => {
    g.fillStyle(0x6ab0e0, 0.9);
    g.fillCircle(3, 3, 2.5);
    g.fillTriangle(1, 4, 5, 4, 3, 8);
  });

  // Simple props
  mk("tree", 48, 64, (g) => {
    g.fillStyle(0x5a3a20, 1);
    g.fillRect(20, 40, 8, 22);
    g.fillStyle(0x2e6b2e, 1);
    g.fillCircle(24, 28, 18);
    g.fillCircle(16, 34, 12);
    g.fillCircle(32, 34, 12);
  });
  mk("pine", 40, 64, (g) => {
    g.fillStyle(0x5a3a20, 1);
    g.fillRect(17, 48, 6, 14);
    g.fillStyle(0x1e5a2e, 1);
    g.fillTriangle(4, 48, 20, 12, 36, 48);
    g.fillTriangle(8, 40, 20, 8, 32, 40);
  });
  mk("bush", 28, 20, (g) => {
    g.fillStyle(0x3d7a3a, 1);
    g.fillCircle(10, 12, 9);
    g.fillCircle(18, 10, 8);
    g.fillCircle(14, 14, 7);
  });
  mk("rock", 20, 14, (g) => {
    g.fillStyle(0x8a8a8a, 1);
    g.fillRoundedRect(2, 4, 16, 10, 3);
  });
  mk("log", 28, 12, (g) => {
    g.fillStyle(0x6a4a28, 1);
    g.fillRoundedRect(2, 2, 24, 8, 3);
    g.fillStyle(0x8a6a40, 1);
    g.fillCircle(4, 6, 3);
  });
  mk("mushroom", 16, 16, (g) => {
    g.fillStyle(0xc45c3e, 1);
    g.fillEllipse(8, 6, 12, 8);
    g.fillStyle(0xf0e8d0, 1);
    g.fillRect(6, 8, 4, 6);
  });
  mk("sign", 24, 28, (g) => {
    g.fillStyle(0x6a4a28, 1);
    g.fillRect(10, 14, 4, 12);
    g.fillStyle(0xc4a574, 1);
    g.fillRoundedRect(2, 2, 20, 14, 2);
  });
  mk("gate", 80, 48, (g) => {
    g.fillStyle(0x5a3a20, 1);
    g.fillRect(4, 8, 8, 36);
    g.fillRect(68, 8, 8, 36);
    g.fillRect(12, 12, 56, 6);
    g.fillRect(12, 28, 56, 6);
  });
  mk("weed", 16, 16, (g) => {
    g.fillStyle(0x4a7a3a, 1);
    g.fillTriangle(8, 2, 2, 14, 14, 14);
  });
  mk("cow", 32, 24, (g) => {
    g.fillStyle(0xf0f0f0, 1);
    g.fillRoundedRect(4, 8, 22, 12, 4);
    g.fillCircle(24, 10, 6);
    g.fillStyle(0x333, 1);
    g.fillCircle(26, 9, 1.5);
  });
  mk("fish", 20, 12, (g) => {
    g.fillStyle(0x5a9ad0, 1);
    g.fillEllipse(10, 6, 14, 8);
    g.fillTriangle(16, 6, 20, 2, 20, 10);
  });

  // Crop stages fallback
  for (let phase = 0; phase < 4; phase++) {
    const key = `crop${phase}`;
    if (scene.textures.exists(key)) continue;
    mk(key, 24, 28, (g) => {
      if (phase === 0) {
        g.fillStyle(0x6a9a4a, 1);
        g.fillCircle(12, 20, 3);
      } else if (phase === 1) {
        g.fillStyle(0x4a8a3a, 1);
        g.fillRect(10, 12, 4, 12);
        g.fillCircle(12, 10, 5);
      } else if (phase === 2) {
        g.fillStyle(0x3d7a32, 1);
        g.fillRect(10, 8, 4, 16);
        g.fillCircle(12, 8, 7);
        g.fillStyle(0xe8a838, 1);
        g.fillCircle(12, 6, 3);
      } else {
        g.fillStyle(0x3d7a32, 1);
        g.fillRect(10, 6, 4, 18);
        g.fillCircle(12, 6, 8);
        g.fillStyle(0xe07030, 1);
        g.fillCircle(12, 4, 5);
      }
    });
  }
}
