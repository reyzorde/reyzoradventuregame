
type Map = {
  hud: void;
  notice: { text: string };
  dialogue: void;
  shop: boolean;
  inventory: boolean;
  menu: "main" | "none";
  playing: boolean;
};

type H<T> = (p: T) => void;

class Bus {
  private l = new Map<string, Set<H<unknown>>>();
  on<K extends keyof Map>(e: K, h: H<Map[K]>): () => void {
    let s = this.l.get(e);
    if (!s) { s = new Set(); this.l.set(e, s); }
    s.add(h as H<unknown>);
    return () => s!.delete(h as H<unknown>);
  }
  emit<K extends keyof Map>(e: K, ...args: Map[K] extends void ? [] : [Map[K]]): void {
    const s = this.l.get(e);
    if (!s) return;
    const p = args[0] as Map[K];
    for (const h of s) h(p);
  }
}

export const bus = new Bus();
