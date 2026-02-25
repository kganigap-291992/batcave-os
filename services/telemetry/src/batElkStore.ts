import type { Event } from "@batcave/gotham-bus";

export type ServiceStatus = "healthy" | "degraded" | "stale" | "offline";

type HealthState = {
  service: string;

  // raw signals
  lastHeartbeatSeq?: number;
  lastHeartbeatTs?: string;
  lastHeartbeatMs?: number;

  ready?: boolean;
  readinessReason?: string;

  // computed
  status?: ServiceStatus;
  staleForMs?: number;
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

function safeParseMs(ts?: string) {
  if (!ts) return null;
  const ms = Date.parse(ts);
  return Number.isFinite(ms) ? ms : null;
}

export class BatElkStore {
  // keep more than the UI /events default so search/traces are useful
  recent = makeRing<Event>(5000);
  errors = makeRing<Event>(500);
  traces = new Map<string, Event[]>(); // traceId -> events (sorted at read time)
  health = new Map<string, HealthState>();

  // ✅ Phase 1 defaults (tweakable via env)
  private heartbeatStaleMs =
    Number(process.env.BATCAVE_HEARTBEAT_STALE_MS ?? 45_000); // 45s default
  private heartbeatOfflineMs =
    Number(process.env.BATCAVE_HEARTBEAT_OFFLINE_MS ?? 120_000); // 2m default

  ingest(e: Event) {
    this.recent.push(e);

    // ✅ Canonical error heuristic: meta.severity === "error"
    const hasError =
      e.meta?.severity === "error" ||
      (typeof e.type === "string" && e.type.endsWith("_REJECTED")) ||
      (typeof e.type === "string" && e.type.endsWith("_FAILED")) ||
      (typeof e.type === "string" && e.type.endsWith(".ERROR")) ||
      (e.type === "ALERT.RAISED" &&
        String((e as any).payload?.severity ?? "").toLowerCase() === "error");

    if (hasError) this.errors.push(e);

    // traces
    const traceId = e.meta?.traceId ?? "no-trace";
    const list = this.traces.get(traceId) ?? [];
    list.push(e);
    if (list.length > 2000) list.shift();
    this.traces.set(traceId, list);

    // health signals (read from payload.*)
    if (e.type === "SERVICE.HEARTBEAT") {
      const service = String((e as any).payload?.service ?? e.meta?.source ?? "unknown");
      const prev = this.health.get(service) ?? { service };

      prev.lastHeartbeatSeq = e.meta?.seq;
      prev.lastHeartbeatTs = e.meta?.ts;
      prev.lastHeartbeatMs = safeParseMs(e.meta?.ts) ?? Date.now();

      this.health.set(service, prev);
    }

    if (e.type === "SERVICE.READINESS") {
      const service = String((e as any).payload?.service ?? e.meta?.source ?? "unknown");
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

  // ✅ NEW: computed health snapshot (HUD-ready)
  getHealthSnapshot(nowMs = Date.now()) {
    const services = Array.from(this.health.values()).map((s) => {
      const hbMs = s.lastHeartbeatMs ?? null;

      let status: ServiceStatus = "offline";
      let staleForMs: number | null = null;

      if (!hbMs) {
        status = "offline";
      } else {
        const age = Math.max(0, nowMs - hbMs);
        staleForMs = age;

        if (age >= this.heartbeatOfflineMs) status = "offline";
        else if (age >= this.heartbeatStaleMs) status = "stale";
        else status = "healthy";
      }

      // readiness can downgrade a "healthy" heartbeat into "degraded"
      if (status === "healthy" && s.ready === false) status = "degraded";

      return {
        ...s,
        status,
        staleForMs: staleForMs ?? undefined,
      };
    });

    const counts = {
      total: services.length,
      healthy: services.filter((s) => s.status === "healthy").length,
      degraded: services.filter((s) => s.status === "degraded").length,
      stale: services.filter((s) => s.status === "stale").length,
      offline: services.filter((s) => s.status === "offline").length,
    };

    // overall ok is strict: no stale/offline
    const ok = counts.stale === 0 && counts.offline === 0;

    return {
      ok,
      thresholds: {
        staleMs: this.heartbeatStaleMs,
        offlineMs: this.heartbeatOfflineMs,
      },
      counts,
      services,
    };
  }
}