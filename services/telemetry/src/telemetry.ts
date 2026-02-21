import type { Event, GothamBus } from "@batcave/gotham-bus";
import { RingBuffer } from "./ringBuffer";
import { JsonlStore } from "./storageJsonl";
import { SseHub } from "./sse";

export class TelemetryService {
  private buffer = new RingBuffer<Event>(500);
  private store: JsonlStore<Event>;
  public sse = new SseHub<Event>();

  constructor(private bus: GothamBus, jsonlPath: string) {
    this.store = new JsonlStore<Event>(jsonlPath);
  }

  start() {
    this.bus.subscribe((e: Event) => {
      this.buffer.push(e);
      this.store.append(e);
      this.sse.broadcast(e);
    });
  }

  getEvents(limit = 200) {
    return this.buffer
      .list(limit)
      .slice()
      .sort((a, b) => a.meta.seq - b.meta.seq);
  }

  getTrace(traceId: string) {
    const all = this.buffer.list();
    return all
      .filter((e) => e.meta.traceId === traceId)
      .sort((a, b) => a.meta.seq - b.meta.seq);
  }
}