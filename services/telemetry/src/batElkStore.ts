import type { Event } from "@batcave/gotham-bus";

type HealthState = {
  service: string;
  lastHeartbeatSeq?: number;
  lastHeartbeatTs?: string;
  ready?: boolean;
  readinessReason?: string;
};

function makeRing<T>(max: number) {
  const arr: T[] = [];
  return {
    push(item: T) {
      arr.push(item);
      if (arr.length > max) arr.shift();
    },
    values() {
      return arr.slice();
    },
    size() {
      return arr.length;
    },
  };
}

export class BatElkStore {
  // keep more than the UI /events default so search/traces are useful
  recent = makeRing<Event>(5000);
  errors = makeRing<Event>(500);
  traces = new Map<string, Event[]>(); // traceId -> ordered-ish events (we’ll sort at read time)
  health = new Map<string, HealthState>();

  ingest(e: Event) {
    this.recent.push(e);

    // error heuristic: any event with meta.level=error or type ends with .ERROR or has meta.error
    const level = (e.meta as any)?.level;
    const hasError =
      level === "error" ||
      Boolean((e.meta as any)?.error) ||
      (typeof e.type === "string" && e.type.endsWith(".ERROR"));

    if (hasError) this.errors.push(e);

    const traceId = e.meta?.traceId ?? "no-trace";
    const list = this.traces.get(traceId) ?? [];
    list.push(e);
    if (list.length > 2000) list.shift();
    this.traces.set(traceId, list);

    // health signals (read from payload.*)
    if (e.type === "SERVICE.HEARTBEAT") {
      const service = String(
        (e as any).payload?.service ?? e.meta?.source ?? "unknown"
      );
      const prev = this.health.get(service) ?? { service };
      prev.lastHeartbeatSeq = e.meta?.seq;
      prev.lastHeartbeatTs = e.meta?.ts;
      this.health.set(service, prev);
    }

    if (e.type === "SERVICE.READINESS") {
      const service = String(
        (e as any).payload?.service ?? e.meta?.source ?? "unknown"
      );
      const prev = this.health.get(service) ?? { service };
      prev.ready = Boolean((e as any).payload?.ready);
      prev.readinessReason = String((e as any).payload?.reason ?? "");
      this.health.set(service, prev);
    }
  }

  getTrace(traceId: string) {
    const list = this.traces.get(traceId) ?? [];
    return list.slice().sort((a, b) => a.meta.seq - b.meta.seq);
  }

  listRecentTraceIds(limit = 50) {
    const seen = new Set<string>();
    const out: string[] = [];
    const recent = this.recent.values().slice().reverse();

    for (const e of recent) {
      const id = e.meta?.traceId ?? "no-trace";
      if (!seen.has(id)) {
        seen.add(id);
        out.push(id);
        if (out.length >= limit) break;
      }
    }
    return out;
  }

  search(q: string, limit = 200) {
    const needle = q.toLowerCase();
    const hits = this.recent
      .values()
      .filter((e) => JSON.stringify(e).toLowerCase().includes(needle));
    return hits.slice(Math.max(0, hits.length - limit));
  }
}