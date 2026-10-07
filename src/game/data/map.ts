import { MAP_COLS, MAP_ROWS, TILE } from "../config";
import type { AnimalSave, PlotState } from "../types";

/** Tile indices — keep in sync with GardenScene tileset strip */
export const T = {
  Grass: 0,
  Grass2: 1,
  Path: 2,
  Dirt: 3,
  Soil: 4,
  SoilWet: 5,
  Water: 6,
  Shore: 7,
  Cobble: 8,
  Wood: 9,
  Flowers: 10,
} as const;

/** Player may stand on these tiles only (paths, farm, village, shore) */
export const WALKABLE = new Set<number>([
  T.Path,
  T.Dirt,
  T.Soil,
  T.SoilWet,
  T.Cobble,
  T.Shore,
  T.Wood,
]);

export function isWalkableTile(t: number): boolean {
  return WALKABLE.has(t);
}

export function createGrid(): number[] {
  const g = new Array(MAP_COLS * MAP_ROWS).fill(T.Grass);

  // Soft grass variation + sparse wildflowers (natural, not noisy)
  for (let i = 0; i < g.length; i++) {
    const n = (i * 1103515245 + 12345) >>> 0;
    if (n % 7 === 0) g[i] = T.Grass2;
    else if (n % 23 === 0) g[i] = T.Flowers;
  }

  const fill = (x: number, y: number, w: number, h: number, t: number) => {
    for (let row = y; row < y + h; row++) {
      for (let col = x; col < x + w; col++) {
        if (col >= 0 && row >= 0 && col < MAP_COLS && row < MAP_ROWS) {
          g[row * MAP_COLS + col] = t;
        }
      }
    }
  };

  // Northern water + shore band
  fill(0, 0, MAP_COLS, 6, T.Water);
  fill(0, 6, MAP_COLS, 1, T.Shore);
  // Small pier
  fill(34, 4, 4, 3, T.Wood);

  // Path painter — width in tiles
  const path = (x0: number, y0: number, x1: number, y1: number, w = 2) => {
    let x = x0;
    let y = y0;
    const half = Math.floor(w / 2);
    while (x !== x1 || y !== y1) {
      fill(x - half, y - half, w, w, T.Path);
      if (x !== x1) x += Math.sign(x1 - x);
      else y += Math.sign(y1 - y);
    }
    fill(x1 - half, y1 - half, w, w, T.Path);
  };

  // === Road network (connects all hubs) ===
  // Main east–west spine (farm / village artery)
  path(8, 20, 56, 20, 2);
  // House spur (west)
  path(8, 14, 8, 20, 2);
  path(8, 14, 12, 14, 2);
  // Farm access loop — left edge → top → right edge → spine
  path(17, 20, 17, 15, 2);
  path(17, 15, 27, 15, 2);
  path(27, 15, 27, 20, 2);
  // Well spur (east of farm)
  path(27, 16, 30, 16, 2);
  // Barn approach — south-west of farm, clear frontage on spine
  path(14, 20, 14, 22, 2);
  path(14, 22, 15, 22, 2);
  // Vertical artery toward south
  path(36, 8, 36, 40, 3);
  // Village square approach
  path(36, 20, 46, 20, 2);
  path(46, 20, 46, 24, 2);
  // Gate / forest road
  path(36, 14, 56, 14, 2);
  path(56, 14, 56, 12, 2);
  // Soft side trails (gameplay shortcuts, not noise)
  path(20, 20, 20, 24, 2);
  path(20, 24, 24, 24, 2);
  path(42, 20, 42, 16, 2);
  path(48, 24, 52, 24, 2);
  path(52, 24, 52, 20, 2);

  // === Farm soil pad — single coherent rectangle (walkable dirt) ===
  // Cols 18–26, rows 16–19 → 3 plot rows with side walk space
  fill(18, 16, 9, 4, T.Dirt);
  // House yard
  fill(6, 13, 7, 5, T.Dirt);
  // Village cobble plaza
  fill(42, 18, 9, 8, T.Cobble);

  return g;
}

const plot = (id: string, col: number, row: number, unlocked: boolean): PlotState => ({
  id,
  col,
  row,
  state: "EMPTY",
  cropId: null,
  plantedAt: null,
  wateredAt: null,
  unlocked,
});

/**
 * Farm plots — neat 3×3 grid on the dirt pad.
 * Columns 19 / 21 / 23 (1-tile walk lanes between), rows 16 / 17 / 19.
 * Front 6 unlocked; back-right 3 locked for smallGarden upgrade.
 */
export const INITIAL_PLOTS: PlotState[] = [
  // Row north (closest to top path)
  plot("p1", 19, 16, true),
  plot("p2", 21, 16, true),
  plot("p3", 23, 16, true),
  // Middle row
  plot("p4", 19, 17, true),
  plot("p5", 21, 17, true),
  plot("p6", 23, 17, true),
  // South / expansion (locked until smallGarden)
  plot("p7", 19, 19, false),
  plot("p8", 21, 19, false),
  plot("p9", 23, 19, false),
];

export type ObjKind =
  | "house"
  | "barn"
  | "well"
  | "shop"
  | "tree"
  | "pine"
  | "gate"
  | "weed"
  | "rock"
  | "log"
  | "sign"
  | "mushroom"
  | "bush";

export interface WorldObj {
  id: string;
  kind: ObjKind;
  tx: number;
  ty: number;
  collide?: boolean;
  interact?: boolean;
  variant?: number;
  body?: { ox: number; oy: number; w: number; h: number };
}

export const OBJECTS: WorldObj[] = [
  {
    id: "house",
    kind: "house",
    tx: 9,
    ty: 11,
    collide: true,
    interact: true,
    body: { ox: 24, oy: 70, w: 100, h: 36 },
  },
  {
    // South-west of farm pad — clear front on path (14,22), does not block crop rows
    id: "barn",
    kind: "barn",
    tx: 14,
    ty: 22,
    collide: true,
    interact: true,
    body: { ox: 22, oy: 90, w: 100, h: 30 },
  },
  {
    id: "well",
    kind: "well",
    tx: 30,
    ty: 15,
    collide: true,
    interact: true,
    body: { ox: 16, oy: 48, w: 36, h: 24 },
  },
  {
    id: "shop",
    kind: "shop",
    tx: 44,
    ty: 17,
    collide: true,
    interact: true,
    body: { ox: 18, oy: 56, w: 96, h: 32 },
  },
  {
    id: "gate",
    kind: "gate",
    tx: 56,
    ty: 11,
    collide: true,
    interact: true,
    body: { ox: 8, oy: 32, w: 72, h: 28 },
  },
  { id: "sign", kind: "sign", tx: 54, ty: 13, collide: true, interact: true },
];

// Scattered canopy trees (off-path, natural clusters)
const TREE_SPOTS: [number, number][] = [
  [3, 9], [5, 12], [15, 8], [18, 9], [22, 8], [27, 9],
  [40, 8], [48, 8], [52, 10], [60, 16], [62, 22],
  [4, 32], [7, 36], [16, 38], [24, 40], [32, 38],
  [48, 34], [54, 32], [60, 30], [14, 32], [28, 34],
  // Keep clear of barn front (14,22) and farm pad
  [10, 26], [22, 28], [40, 28], [50, 28],
];
TREE_SPOTS.forEach(([tx, ty], i) => {
  OBJECTS.push({
    id: `tree-${i}`,
    kind: i % 3 === 0 ? "pine" : "tree",
    tx,
    ty,
    collide: true,
    body: { ox: 16, oy: 52, w: 24, h: 16 },
  });
});

// Bushes — kept off farm pad, barn front, and main paths
const BUSH_SPOTS: [number, number][] = [
  [5, 17], [11, 24], [26, 23], [33, 18], [38, 24],
  [41, 12], [49, 16], [53, 22], [11, 30], [20, 36],
  [35, 32], [45, 30], [8, 25], [29, 28],
];
BUSH_SPOTS.forEach(([tx, ty], i) => {
  OBJECTS.push({
    id: `bush-${i}`,
    kind: "bush",
    tx,
    ty,
    collide: true,
    variant: i % 3,
    body: { ox: 8, oy: 16, w: 20, h: 12 },
  });
});

// Weeds on farm edges only (not on plot tiles) — clear while working fields
(
  [
    ["w1", 18, 16, 0],
    ["w2", 20, 15, 1],
    ["w3", 24, 15, 2],
    ["w4", 26, 16, 0],
    ["w5", 18, 19, 1],
    ["w6", 26, 19, 2],
    ["w7", 22, 15, 0],
    ["w8", 25, 18, 1],
  ] as const
).forEach(([id, tx, ty, v]) => {
  OBJECTS.push({
    id: String(id),
    kind: "weed",
    tx: Number(tx),
    ty: Number(ty),
    interact: true,
    variant: Number(v),
  });
});

OBJECTS.push(
  { id: "rock-1", kind: "rock", tx: 32, ty: 28, interact: true },
  { id: "rock-2", kind: "rock", tx: 52, ty: 24, interact: true },
  { id: "rock-3", kind: "rock", tx: 14, ty: 34, interact: true },
  { id: "log-1", kind: "log", tx: 8, ty: 32, interact: true },
  { id: "log-2", kind: "log", tx: 58, ty: 28, interact: true },
  { id: "log-3", kind: "log", tx: 26, ty: 36, interact: true },
);

// Forest zone east of gate
(
  [
    [57, 8],
    [59, 7],
    [61, 9],
    [58, 11],
    [60, 13],
    [62, 12],
    [59, 15],
    [61, 17],
    [57, 18],
    [63, 14],
    [62, 19],
    [58, 21],
  ] as const
).forEach(([tx, ty], i) => {
  OBJECTS.push({
    id: `ftree-${i}`,
    kind: i % 2 === 0 ? "pine" : "tree",
    tx,
    ty,
    collide: true,
    body: { ox: 16, oy: 52, w: 24, h: 16 },
  });
});

(
  [
    ["m1", 58, 10],
    ["m2", 60, 12],
    ["m3", 59, 16],
    ["m4", 61, 15],
    ["m5", 62, 18],
  ] as const
).forEach(([id, tx, ty]) => {
  OBJECTS.push({
    id: String(id),
    kind: "mushroom",
    tx: Number(tx),
    ty: Number(ty),
    interact: true,
  });
});

OBJECTS.push({ id: "forest-sign", kind: "sign", tx: 57, ty: 13, collide: true, interact: true });

export const NPCS = [
  // Mira near village plaza
  { id: "mira" as const, tx: 47, ty: 23 },
  // Tom stands in front of the shop (shop tile 44,17)
  { id: "tom" as const, tx: 44, ty: 19 },
];

/** Spawn on path near house */
export const PLAYER_SPAWN = { x: 10 * TILE + 24, y: 20 * TILE + 24 };

export const tw = (c: number, r: number) => ({
  x: c * TILE + TILE / 2,
  y: r * TILE + TILE / 2,
});

/** Default animals — Level 1: cows (pasture) + fish (pond). No chickens. */
export const INITIAL_ANIMALS: AnimalSave[] = [
  { id: "cow-1", kind: "cow", x: 22 * TILE + 24, y: 30 * TILE + 24, lastCollect: 0 },
  { id: "cow-2", kind: "cow", x: 26 * TILE + 24, y: 32 * TILE + 24, lastCollect: 0 },
  { id: "fish-1", kind: "fish", x: 20 * TILE + 24, y: 3 * TILE + 24, lastCollect: 0 },
  { id: "fish-2", kind: "fish", x: 28 * TILE + 24, y: 2 * TILE + 24, lastCollect: 0 },
  { id: "fish-3", kind: "fish", x: 40 * TILE + 24, y: 3 * TILE + 24, lastCollect: 0 },
];

/** Map landmark labels (tile coords) for minimap */
export const MAP_LANDMARKS = [
  { id: "house", label: "Uy", tx: 9, ty: 11 },
  { id: "farm", label: "Ferma", tx: 21, ty: 17 },
  { id: "barn", label: "Molxona", tx: 14, ty: 22 },
  { id: "well", label: "Quduq", tx: 30, ty: 15 },
  { id: "shop", label: "Do'kon", tx: 44, ty: 17 },
  { id: "gate", label: "Darvoza", tx: 56, ty: 11 },
  { id: "water", label: "Suv", tx: 32, ty: 3 },
  { id: "pasture", label: "Yaylov", tx: 24, ty: 31 },
];
