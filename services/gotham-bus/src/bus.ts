import { randomUUID } from "crypto";
import type { Event, EventMeta } from "./events";

type Handler = (e: Event) => void;

type PublishInput =
  | Omit<Event, "meta">
  | (Omit<Event, "meta"> & { meta?: Partial<EventMeta> });

export class GothamBus {
  private handlers: Handler[] = [];

  publish(input: PublishInput, ctx?: { source?: string; requestId?: string }): Event {
    const ts = new Date().toISOString();
    const eventId = `evt_${randomUUID()}`;

    const requestId =
      (input as any).meta?.requestId ||
      ctx?.requestId ||
      `req_${randomUUID()}`;

    const source =
      (input as any).meta?.source ||
      ctx?.source ||
      "unknown";

    const e: Event = {
      ...(input as any),
      meta: {
        schema: "batcave.event.v1",
        eventId,
        requestId,
        source,
        ts,
      },
    };

    // Guards around intent usage
    if ((e as any).intent && e.type !== "INTENT") {
      throw new Error(`Only type="INTENT" may include intent. Got type="${e.type}"`);
    }
    if (e.type === "INTENT" && !(e as any).intent) {
      throw new Error(`type="INTENT" requires an intent field`);
    }

    for (const h of this.handlers) h(e);
    return e;
  }

  subscribe(h: Handler) {
    this.handlers.push(h);
    return () => {
      this.handlers = this.handlers.filter((x) => x !== h);
    };
  }

  subscribeType<T extends Event["type"]>(
    type: T,
    h: (e: Extract<Event, { type: T }>) => void
  ) {
    const wrapped: Handler = (e) => {
      if (e.type === type) h(e as Extract<Event, { type: T }>);
    };
    return this.subscribe(wrapped);
  }
}
