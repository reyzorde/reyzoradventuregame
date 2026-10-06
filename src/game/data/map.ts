
import { MAP_COLS, MAP_ROWS, TILE } from "../config";
import type { PlotState } from "../types";

export const T = { Grass: 0, Grass2: 1, Path: 2, Dirt: 3, Soil: 4, SoilWet: 5, Water: 6, Shore: 7, Cobble: 8, Wood: 9, Flowers: 10 } as const;

export function createGrid(): number[] {
  const g = new Array(MAP_COLS * MAP_ROWS).fill(T.Grass);
  for (let i = 0; i < g.length; i++) {
    const n = (i * 1103515245 + 12345) >>> 0;
    if (n % 9 === 0) g[i] = T.Grass2;
    else if (n % 17 === 0) g[i] = T.Flowers;
  }
  const fill = (x: number, y: number, w: number, h: number, t: number) => {
    for (let row = y; row < y + h; row++)
      for (let col = x; col < x + w; col++)
        if (col >= 0 && row >= 0 && col < MAP_COLS && row < MAP_ROWS) g[row * MAP_COLS + col] = t;
  };
  fill(0, 0, MAP_COLS, 6, T.Water);
  fill(0, 6, MAP_COLS, 1, T.Shore);
  fill(34, 4, 4, 3, T.Wood);
  const path = (x0: number, y0: number, x1: number, y1: number, w = 2) => {
    let x = x0, y = y0;
    while (x !== x1 || y !== y1) {
      fill(x, y, w, w, T.Path);
      if (x !== x1) x += Math.sign(x1 - x);
      else y += Math.sign(y1 - y);
    }
    fill(x1, y1, w, w, T.Path);
  };
  path(10, 18, 36, 18, 2);
  path(36, 7, 36, 42, 3);
  path(36, 22, 46, 22, 2);
  path(14, 18, 14, 30, 2);
  path(36, 14, 56, 14, 2);
  fill(18, 16, 10, 8, T.Dirt);
  fill(6, 14, 7, 6, T.Dirt);
  fill(42, 19, 8, 8, T.Cobble);
  return g;
}

const plot = (id: string, col: number, row: number, unlocked: boolean): PlotState => ({
  id, col, row, state: "EMPTY", cropId: null, plantedAt: null, wateredAt: null, unlocked,
});

export const INITIAL_PLOTS: PlotState[] = [
  plot("p1", 19, 17, true), plot("p2", 21, 17, true), plot("p3", 23, 17, true),
  plot("p4", 19, 19, true), plot("p5", 21, 19, true), plot("p6", 23, 19, true),
  plot("p7", 25, 17, false), plot("p8", 25, 19, false), plot("p9", 21, 21, false),
];

export type ObjKind = "house" | "barn" | "well" | "shop" | "tree" | "pine" | "gate" | "weed" | "rock" | "log" | "sign" | "mushroom";

export interface WorldObj {
  id: string; kind: ObjKind; tx: number; ty: number;
  collide?: boolean; interact?: boolean; variant?: number;
  body?: { ox: number; oy: number; w: number; h: number };
}

export const OBJECTS: WorldObj[] = [
  { id: "house", kind: "house", tx: 7, ty: 12, collide: true, interact: true, body: { ox: 30, oy: 80, w: 140, h: 40 } },
  { id: "barn", kind: "barn", tx: 11, ty: 26, collide: true, interact: true, body: { ox: 28, oy: 86, w: 150, h: 40 } },
  { id: "well", kind: "well", tx: 29, ty: 16, collide: true, interact: true, body: { ox: 24, oy: 50, w: 48, h: 30 } },
  { id: "shop", kind: "shop", tx: 43, ty: 17, collide: true, interact: true, body: { ox: 20, oy: 64, w: 110, h: 36 } },
  { id: "gate", kind: "gate", tx: 56, ty: 12, collide: true, interact: true, body: { ox: 8, oy: 36, w: 80, h: 30 } },
  { id: "sign", kind: "sign", tx: 54, ty: 13, collide: true, interact: true },
];

[[4,9],[6,11],[16,8],[26,9],[48,9],[52,11],[58,10],[60,16],[62,20],[5,36],[18,40],[30,38],[50,36],[58,34]].forEach(([tx,ty],i)=>{
  OBJECTS.push({ id:`tree-${i}`, kind: i%3===0?"pine":"tree", tx, ty, collide:true, body:{ox:18,oy:60,w:28,h:18}});
});

[["w1",18,16,0],["w2",20,16,1],["w3",24,16,2],["w4",18,20,0],["w5",22,21,1],["w6",26,18,2],["w7",17,18,0],["w8",27,20,1]].forEach(([id,tx,ty,v])=>{
  OBJECTS.push({ id:String(id), kind:"weed", tx:Number(tx), ty:Number(ty), interact:true, variant:Number(v)});
});

OBJECTS.push(
  { id:"rock-1", kind:"rock", tx:32, ty:28, interact:true },
  { id:"rock-2", kind:"rock", tx:52, ty:24, interact:true },
  { id:"log-1", kind:"log", tx:8, ty:32, interact:true },
  { id:"log-2", kind:"log", tx:58, ty:28, interact:true },
);

// Forest zone (east of gate) — denser trees + mushrooms
[[57,8],[59,7],[61,9],[58,11],[60,13],[62,12],[59,15],[61,17],[57,18],[63,14],[62,19],[58,21]].forEach(([tx,ty],i)=>{
  OBJECTS.push({ id:`ftree-${i}`, kind: i%2===0?"pine":"tree", tx, ty, collide:true, body:{ox:18,oy:60,w:28,h:18}});
});
[["m1",58,10],["m2",60,12],["m3",59,16],["m4",61,15],["m5",62,18]].forEach(([id,tx,ty])=>{
  OBJECTS.push({ id:String(id), kind:"mushroom", tx:Number(tx), ty:Number(ty), interact:true });
});
OBJECTS.push({ id:"forest-sign", kind:"sign", tx:57, ty:13, collide:true, interact:true });

export const NPCS = [
  { id: "mira" as const, tx: 46, ty: 24 },
  { id: "tom" as const, tx: 45, ty: 20 },
];

export const PLAYER_SPAWN = { x: 12 * TILE + 24, y: 20 * TILE + 24 };
export const tw = (c: number, r: number) => ({ x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 });
