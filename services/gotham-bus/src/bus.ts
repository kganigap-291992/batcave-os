import { randomUUID } from "crypto";
import type { Event, EventMeta } from "./events";
import { categoryForType, severityForType } from "./events";

type Handler = (e: Event) => void;

type PublishInput =
  | Omit<Event, "meta">
  | (Omit<Event, "meta"> & { meta?: Partial<EventMeta> });

export class GothamBus {
  private handlers: Handler[] = [];
  private seq = 0; // ✅ monotonic sequence for deterministic ordering

  publish(
    input: PublishInput,
    ctx?: { source?: string; requestId?: string; traceId?: string }
  ): Event {
    const ts = new Date().toISOString();
    const eventId = `evt_${randomUUID()}`;
    const seq = ++this.seq; // ✅ assign order at emit time

    // requestId is the "unit of work" identifier
    const requestId =
      (input as any).meta?.requestId || ctx?.requestId || `req_${randomUUID()}`;

    // traceId groups the whole chain; default to requestId on chain start
    const traceId = (input as any).meta?.traceId || ctx?.traceId || requestId;

    const source = (input as any).meta?.source || ctx?.source || "unknown";

    const type = (input as any).type as Event["type"];

    // Category/severity must be assigned before leaving the bus
    const category = (input as any).meta?.category || categoryForType(type);

    const severity = (input as any).meta?.severity || severityForType(type);

    const e: Event = {
      ...(input as any),
      meta: {
        schema: "batcave.event.v1",
        eventId,
        seq,
        traceId,
        requestId,
        category,
        severity,
        source,
        ts,
      },
    };

    // ---- Guards around intent usage (contract v2: COMMAND.INTENT) ----
    // payload.intent is allowed ONLY when type === "COMMAND.INTENT"
    const hasIntentInPayload = !!(e as any).payload?.intent;

    if (hasIntentInPayload && e.type !== "COMMAND.INTENT") {
      throw new Error(
        `Only type="COMMAND.INTENT" may include payload.intent. Got type="${e.type}"`
      );
    }
    if (e.type === "COMMAND.INTENT" && !hasIntentInPayload) {
      throw new Error(`type="COMMAND.INTENT" requires payload.intent`);
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