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

/**
 * Mode derivation priority (spec-aligned):
 * 1) ERROR/CRITICAL active alerts -> DEFENSE bias
 * 2) last MODE.CHANGED event
 * 3) default WORK
 */
function pickMode(events: TelemetryEvent[], alerts: AlertsResponse["alerts"]): BatMode {
  const hasCriticalAlert = alerts.some(
    (a) => a.severity === "ERROR" || a.severity === "CRITICAL"
  );
  if (hasCriticalAlert) return "DEFENSE";

  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.type === "MODE.CHANGED") {
      const m = e.payload?.mode ?? e.payload?.currentMode ?? e.payload?.to;
      const upper = typeof m === "string" ? m.toUpperCase() : "";
      if (["WORK", "DEFENSE", "NIGHT", "DEMO", "SILENT"].includes(upper)) {
        return upper as BatMode;
      }
    }
  }

  return "WORK";
}

function buildHealthBadges(health: HealthResponse, telemUrlLabel: string): HealthBadge[] {
  const telemSvc = health.services?.find((s) => s.service === "telemetry");
  const telemStatus: HealthBadge["status"] =
    !telemSvc
      ? "DOWN"
      : telemSvc.status === "healthy"
        ? "OK"
        : telemSvc.status === "degraded" || telemSvc.status === "stale"
          ? "WARN"
          : "DOWN";

  // Phase 1 placeholders (Phase 1.2 will make these fully truthful)
  return [
    { key: "BUS", status: "WARN", detail: "in-process" },
    { key: "TELEMETRY", status: telemStatus, detail: telemUrlLabel },
    { key: "ALFRED", status: "WARN", detail: "in-process" },
    { key: "ADAPTERS", status: "OK", detail: "none" },
  ];
}

function safeParseIso(ts?: string): number | null {
  if (!ts) return null;
  const t = Date.parse(ts);
  return Number.isFinite(t) ? t : null;
}

function upperMode(x: any): string | null {
  if (typeof x !== "string") return null;
  const u = x.toUpperCase();
  return ["WORK", "DEFENSE", "NIGHT", "DEMO", "SILENT"].includes(u) ? u : null;
}

function isModeTrace(events: TelemetryEvent[]): boolean {
  const types = new Set(events.map((e) => e.type));
  const hasRequested = types.has("MODE.SET_REQUESTED");
  const hasDecision = types.has("MODE.SET_ACCEPTED") || types.has("MODE.SET_REJECTED");
  return hasRequested && hasDecision;
}

function summarizeModeTrace(traceId: string, traceEvents: TelemetryEvent[]): SignalEvent | null {
  const sorted = [...traceEvents].sort((a, b) => (a.meta?.seq ?? 0) - (b.meta?.seq ?? 0));

  const firstSeq = sorted[0]?.meta?.seq ?? 0;
  const lastSeq = sorted[sorted.length - 1]?.meta?.seq ?? firstSeq;

  const times = sorted
    .map((e) => safeParseIso(e.meta?.ts))
    .filter((t): t is number => typeof t === "number");

  const t0 = times.length ? Math.min(...times) : null;
  const t1 = times.length ? Math.max(...times) : null;
  const latencyMs = t0 !== null && t1 !== null ? Math.max(0, t1 - t0) : null;

  const eReq = sorted.find((e) => e.type === "MODE.SET_REQUESTED");
  const eAcc = sorted.find((e) => e.type === "MODE.SET_ACCEPTED");
  const eRej = sorted.find((e) => e.type === "MODE.SET_REJECTED");
  const eChg = [...sorted].reverse().find((e) => e.type === "MODE.CHANGED");

  const requestedMode =
    upperMode(eReq?.payload?.requestedMode) ??
    upperMode(eReq?.payload?.mode) ??
    upperMode(sorted.find((e) => e.type === "COMMAND.INTENT")?.payload?.intent?.mode) ??
    null;

  const toMode =
    upperMode(eChg?.payload?.mode) ??
    upperMode(eChg?.payload?.currentMode) ??
    upperMode(eChg?.payload?.to) ??
    requestedMode ??
    "UNKNOWN";

  const fromMode =
    upperMode(eChg?.payload?.prevMode) ??
    upperMode(eChg?.payload?.from) ??
    upperMode(eChg?.payload?.previousMode) ??
    "UNKNOWN";

  const accepted = Boolean(eAcc);
  const rejected = Boolean(eRej);
  const resultLabel = accepted ? "Accepted" : rejected ? "Rejected" : "Unknown";

  const reasonCode = eRej?.payload?.reasonCode ?? eRej?.payload?.code ?? null;
  const reason = eRej?.payload?.reason ?? eRej?.payload?.message ?? null;

  const level: SignalLevel = rejected ? "ERROR" : "INFO";

  const latencyLabel = latencyMs !== null ? `~${latencyMs}ms` : "~—";
  const baseMsg = `${fromMode} → ${toMode} • ${resultLabel} • ${latencyLabel}`;
  const rejMsg =
    rejected && (reasonCode || reason)
      ? `${baseMsg} • ${String(reasonCode ?? "REJECTED")}`
      : baseMsg;

  const ts = sorted[sorted.length - 1]?.meta?.ts ?? new Date().toISOString();

  return {
    seq: lastSeq,
    ts,
    traceId,
    level,
    type: "MODE.CARD",
    msg: rejMsg,
  };
}

function toSignalsWithModeCards(events: TelemetryEvent[]): SignalEvent[] {
  const byTrace = new Map<string, TelemetryEvent[]>();
  for (const e of events) {
    const traceId = e.meta?.traceId ?? "trace_unknown";
    const arr = byTrace.get(traceId) ?? [];
    arr.push(e);
    byTrace.set(traceId, arr);
  }

  const modeTraceIds = new Set<string>();
  for (const [tid, arr] of byTrace.entries()) {
    if (tid !== "trace_unknown" && isModeTrace(arr)) modeTraceIds.add(tid);
  }

  const cards: SignalEvent[] = [];
  const raws: SignalEvent[] = [];

  for (const [tid, arr] of byTrace.entries()) {
    if (modeTraceIds.has(tid)) {
      const card = summarizeModeTrace(tid, arr);
      if (card) cards.push(card);
      continue;
    }

    for (const e of arr) {
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

      raws.push({ seq, ts, traceId, level, type: e.type, msg });
    }
  }

  const combined = [...raws, ...cards].sort((a, b) => a.seq - b.seq);
  return combined.slice(-200);
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
        setEvents(data.sort((a, b) => (a.meta?.seq ?? 0) - (b.meta?.seq ?? 0)));
      } catch {
        // Keep last known; UI stays up even if backend flaps
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

  const snap = useMemo(() => {
    const mode = pickMode(events, alerts);

    // Canonical danger rule:
    // danger = DEFENSE OR alerts.some(ERROR/CRITICAL)
    const danger =
      mode === "DEFENSE" ||
      alerts.some((a) => a.severity === "ERROR" || a.severity === "CRITICAL");

    const theme = danger ? "alert" : "base";
    const signals = toSignalsWithModeCards(events);

    const healthBadges = buildHealthBadges(
      health ?? { ok: false, services: [{ service: "telemetry", status: "offline" }] },
      "http://localhost:8790"
    );

    return { mode, theme, health: healthBadges, signals };
  }, [events, alerts, health]);

  // Sync global theme to <html data-theme="...">
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", snap.theme);
  }, [snap.theme]);

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