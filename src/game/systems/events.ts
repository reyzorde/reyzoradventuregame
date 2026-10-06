export type GameEvent =
  | { type: "notice"; text: string }
  | { type: "save" }
  | { type: "quest" }
  | { type: "hud" };

type Handler = (e: GameEvent) => void;

const listeners = new Set<Handler>();

export const bus = {
  on(h: Handler): () => void {
    listeners.add(h);
    return () => listeners.delete(h);
  },
  emit(e: GameEvent): void {
    for (const h of listeners) h(e);
  },
};
