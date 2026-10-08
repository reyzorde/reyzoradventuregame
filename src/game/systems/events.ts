/** Typed event bus — payload optional for void events */

type EventMap = {
  hud: void;
  notice: { text: string };
  dialogue: void;
  shop: boolean;
  inventory: boolean;
  menu: "main" | "confirm_new" | "none";
  playing: boolean;
};

type Handler<T> = (payload: T) => void;

class Bus {
  private listeners = new Map<string, Set<Handler<unknown>>>();

  on<K extends keyof EventMap>(
    event: K,
    handler: Handler<EventMap[K]>,
  ): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler as Handler<unknown>);
    return () => set!.delete(handler as Handler<unknown>);
  }

  emit<K extends keyof EventMap>(
    event: K,
    ...args: EventMap[K] extends void ? [] : [EventMap[K]]
  ): void {
    const set = this.listeners.get(event);
    if (!set) return;
    const payload = (args[0] ?? undefined) as EventMap[K];
    for (const h of set) h(payload);
  }
}

export const bus = new Bus();
