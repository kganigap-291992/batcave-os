"use client";

import { useEffect, useMemo, useState } from "react";
import ModeDial from "@/components/hud/ModeDial";
import SignalLog from "@/components/hud/SignalLog";
import StatusCards from "@/components/hud/StatusCards";

type BatMode = "WORK" | "DEFENSE" | "NIGHT" | "DEMO" | "SILENT";

type HealthBadge = {
  key: "BUS" | "TELEMETRY" | "ALFRED" | "ADAPTERS";
  status: "OK" | "WARN" | "DOWN";
  detail?: string;
};

type SignalLevel = "INFO" | "WARN" | "ERROR";

type SignalEvent = {
  seq: number;
  ts: string; // ISO
  traceId: string;
  level: SignalLevel;
  type: string;
  msg: string;
};

type TelemetryEvent = {
  type: string;
  payload?: any;
  meta?: {
    seq?: number;
    ts?: string;
    traceId?: string;
    requestId?: string;
    category?: string;
    severity?: string;
    source?: string;
  };
};

type AlertsResponse = {
  ok: boolean;
  alerts: Array<{
    id: string;
    severity: "INFO" | "WARN" | "ERROR" | "CRITICAL";
    title: string;
    message?: string;
    traceId?: string;
    ttlMs: number;
    raisedAt: string;
    expiresAt: string;
    source: string;
  }>;
};

type HealthResponse = {
  ok: boolean;
  services?: Array<{
    service: string;
    status: "healthy" | "degraded" | "stale" | "offline";
    ready?: boolean;
    readinessReason?: string;
    lastHeartbeatSeq?: number;
    lastHeartbeatTs?: string;
    staleForMs?: number;
  }>;
  counts?: {
    recentEvents?: number;
    recentErrors?: number;
    traceCount?: number;
  };
};

function severityToLevel(sev?: string): SignalLevel {
  const s = (sev ?? "").toLowerCase();
  if (s === "error") return "ERROR";
  if (s === "warn" || s === "warning") return "WARN";
  return "INFO";
}

function pickMode(events: TelemetryEvent[], alerts: AlertsResponse["alerts"]): BatMode {
  // If any active alerts, bias toward DEFENSE (cinematic + useful)
  if (alerts.length > 0) return "DEFENSE";

  // Otherwise try to infer from MODE.CHANGED events
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.type === "MODE.CHANGED") {
      const m = e.payload?.mode ?? e.payload?.currentMode ?? e.payload?.to;
      const upper = typeof m === "string" ? m.toUpperCase() : "";
      if (["WORK", "DEFENSE", "NIGHT", "DEMO", "SILENT"].includes(upper)) return upper as BatMode;
    }
  }
  return "WORK";
}

function buildHealthBadges(health: HealthResponse, telemUrlLabel: string): HealthBadge[] {
  const telemSvc = health.services?.find((s) => s.service === "telemetry");
  const telemStatus: HealthBadge["status"] =
    !telemSvc ? "DOWN" : telemSvc.status === "healthy" ? "OK" : telemSvc.status === "degraded" || telemSvc.status === "stale" ? "WARN" : "DOWN";

  // BUS/ALFRED/ADAPTERS will become real later; keep placeholders for now.
  return [
    { key: "BUS", status: "WARN", detail: "in-process" }, // Phase 1: in-process bus
    { key: "TELEMETRY", status: telemStatus, detail: telemUrlLabel },
    { key: "ALFRED", status: "WARN", detail: "in-process" },
    { key: "ADAPTERS", status: "OK", detail: "none" },
  ];
}

function toSignals(events: TelemetryEvent[]): SignalEvent[] {
  const mapped = events
    .map((e) => {
      const seq = e.meta?.seq ?? 0;
      const ts = e.meta?.ts ?? new Date().toISOString();
      const traceId = e.meta?.traceId ?? "trace_unknown";
      const level = severityToLevel(e.meta?.severity);
      const msg =
        e.type === "ALERT.RAISED"
          ? `${e.payload?.severity ?? "WARN"}: ${e.payload?.title ?? "Alert"}`
          : e.type === "ALERT.CLEARED"
          ? `Alert cleared: ${e.payload?.reason ?? "UNKNOWN"}`
          : e.type === "SERVICE.HEARTBEAT"
          ? `Heartbeat: ${e.payload?.service ?? "service"}`
          : e.type === "SERVICE.READINESS"
          ? `Readiness: ${e.payload?.service ?? "service"} = ${String(e.payload?.ready)}`
          : e.type;

      return { seq, ts, traceId, level, type: e.type, msg };
    })
    .sort((a, b) => a.seq - b.seq);

  // Keep last 200 signals
  return mapped.slice(-200);
}

export default function HomePage() {
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [alerts, setAlerts] = useState<AlertsResponse["alerts"]>([]);
  const [now, setNow] = useState<Date>(() => new Date());

  // system time tick (so it updates)
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Poll events (fast)
  useEffect(() => {
    let alive = true;

    async function tick() {
      try {
        const r = await fetch("/api/telemetry/events?limit=200", { cache: "no-store" });
        if (!r.ok) throw new Error(`events ${r.status}`);
        const data = (await r.json()) as TelemetryEvent[];

        if (!alive) return;
        // guarantee stable ordering
        setEvents(data.sort((a, b) => (a.meta?.seq ?? 0) - (b.meta?.seq ?? 0)));
      } catch {
        // keep last known; UI stays up even if backend flaps
      }
    }

    tick();
    const t = setInterval(tick, 1200);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  // Poll health (slower)
  useEffect(() => {
    let alive = true;

    async function tick() {
      try {
        const r = await fetch("/api/telemetry/health", { cache: "no-store" });
        if (!r.ok) throw new Error(`health ${r.status}`);
        const data = (await r.json()) as HealthResponse;
        if (!alive) return;
        setHealth(data);
      } catch {
        // ignore
      }
    }

    tick();
    const t = setInterval(tick, 3500);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  // Poll alerts (for theme + overlay later)
  useEffect(() => {
    let alive = true;

    async function tick() {
      try {
        const r = await fetch("/api/telemetry/alerts", { cache: "no-store" });
        if (!r.ok) throw new Error(`alerts ${r.status}`);
        const data = (await r.json()) as AlertsResponse;
        if (!alive) return;
        setAlerts(Array.isArray(data.alerts) ? data.alerts : []);
      } catch {
        // ignore
      }
    }

    tick();
    const t = setInterval(tick, 1200);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const theme = alerts.length > 0 ? "alert" : "base";

  const snap = useMemo(() => {
    const mode = pickMode(events, alerts);
    const signals = toSignals(events);
    const healthBadges = buildHealthBadges(
      health ?? { ok: false, services: [{ service: "telemetry", status: "offline" }] },
      "http://localhost:8790"
    );

    return { mode, theme, health: healthBadges, signals };
  }, [events, alerts, health, theme]);

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-neutral-400">Batcave OS</div>
          <h2 className="text-2xl font-semibold tracking-tight">Live Operations HUD</h2>
          <div className="mt-1 text-xs text-neutral-500">
            Mode: <span className="text-neutral-200">{snap.mode}</span> • Theme:{" "}
            <span className="text-neutral-200">{snap.theme}</span>
          </div>
        </div>

        <div className="hidden sm:block text-right">
          <div className="text-xs text-neutral-500">System Time</div>
          <div className="text-sm text-neutral-200 tabular-nums">{now.toLocaleString()}</div>
        </div>
      </header>

      {/* HUD GRID */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left column */}
        <section className="col-span-12 lg:col-span-5">
          <div className="rounded-2xl border border-blue-500/20 bg-neutral-950/60 backdrop-blur p-4 shadow-[0_0_60px_rgba(0,0,0,0.6)] shadow-[inset_0_0_80px_rgba(0,140,255,0.05)]">
            <div className="flex items-center justify-between">
              <div className="text-sm text-neutral-300">Mode Dial</div>
              <div className="text-xs text-neutral-500">live (derived from events)</div>
            </div>
            <div className="mt-4">
              <ModeDial mode={snap.mode} theme={snap.theme} />
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-950/60 backdrop-blur p-4 shadow-[inset_0_0_80px_rgba(255,255,255,0.02)]">
            <div className="mb-3 text-sm text-neutral-300">System Status</div>
            <StatusCards health={snap.health} />
          </div>
        </section>

        {/* Right column */}
        <section className="col-span-12 lg:col-span-7">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 backdrop-blur p-4 shadow-[inset_0_0_80px_rgba(255,255,255,0.02)]">
            <div className="flex items-center justify-between">
              <div className="text-sm text-neutral-300">Signal Log</div>
              <div className="text-xs text-neutral-500">latest 200 • ordered by seq</div>
            </div>
            <div className="mt-3">
              <SignalLog signals={snap.signals} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}