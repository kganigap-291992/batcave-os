import type { Event, GothamBus } from "@batcave/gotham-bus";
import { RingBuffer } from "./ringBuffer";
import { JsonlStore } from "./storageJsonl";
import { SseHub } from "./sse";
import { BatElkStore } from "./batElkStore";

export class TelemetryService {
  private buffer = new RingBuffer<Event>(500);
  private store: JsonlStore<Event>;
  public sse = new SseHub<Event>();

  // ✅ NEW: BatELK in-memory indices (bigger than /events buffer)
  public batElk = new BatElkStore();

  constructor(private bus: GothamBus, jsonlPath: string) {
    this.store = new JsonlStore<Event>(jsonlPath);
  }

  start() {
    this.bus.subscribe((e: Event) => {
      this.buffer.push(e);

      // ✅ NEW: ingest for traces/errors/search/health
      this.batElk.ingest(e);

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

  // ✅ Recommended: use batElk for trace retrieval (bigger buffer)
  getTrace(traceId: string) {
    return this.batElk.getTrace(traceId);
  }
}