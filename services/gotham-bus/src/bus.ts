import type { Event } from "./events";

type Handler = (e: Event) => void;

export class GothamBus {
  private handlers: Handler[] = [];

  publish(e: Event) {
    for (const h of this.handlers) h(e);
  }

  subscribe(h: Handler) {
    this.handlers.push(h);
    return () => {
      this.handlers = this.handlers.filter((x) => x !== h);
    };
  }
}
