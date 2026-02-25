export type BatMode = "WORK" | "DEFENSE" | "NIGHT" | "DEMO";

export type HealthBadge = {
  key: "BUS" | "TELEMETRY" | "ALFRED" | "ADAPTERS";
  status: "OK" | "WARN" | "DOWN";
  detail?: string;
};

export type SignalLevel = "INFO" | "WARN" | "ERROR";

export type SignalEvent = {
  seq: number;
  ts: string; // ISO
  traceId: string;
  level: SignalLevel;
  type: string;
  msg: string;
};

export type TelemetrySnapshot = {
  mode: BatMode;
  theme: "base" | "alert";
  health: HealthBadge[];
  signals: SignalEvent[];
};

function isoNow() {
  return new Date().toISOString();
}

function randId() {
  return Math.random().toString(16).slice(2, 10);
}

const TYPES = [
  "BUS.CONNECTED",
  "MODE.CHANGED",
  "ADAPTER.HEALTH",
  "ALERT.RAISED",
  "ALERT.RESOLVED",
  "TELEMETRY.INGEST",
];

export function makeInitialSnapshot(): TelemetrySnapshot {
  const base: TelemetrySnapshot = {
    mode: "WORK",
    theme: "base",
    health: [
      { key: "BUS", status: "OK", detail: "ws://localhost:8787" },
      { key: "TELEMETRY", status: "OK", detail: "buffer ok" },
      { key: "ALFRED", status: "WARN", detail: "idle" },
      { key: "ADAPTERS", status: "OK", detail: "mock" },
    ],
    signals: [],
  };

  // seed a few signals
  for (let i = 0; i < 20; i++) {
    base.signals.push({
      seq: i + 1,
      ts: isoNow(),
      traceId: `tr_${randId()}`,
      level: i % 9 === 0 ? "WARN" : "INFO",
      type: TYPES[i % TYPES.length],
      msg: i % 9 === 0 ? "Latency spike detected" : "Event processed",
    });
  }
  return base;
}

/**
 * Mutates snapshot to simulate live telemetry:
 * - adds a new signal every tick
 * - occasionally raises an alert (theme flips to alert briefly)
 */
export function tickSnapshot(prev: TelemetrySnapshot): TelemetrySnapshot {
  const next: TelemetrySnapshot = {
    ...prev,
    health: prev.health.map((h) => ({ ...h })),
    signals: [...prev.signals],
  };

  const seq = (next.signals[next.signals.length - 1]?.seq ?? 0) + 1;

  const roll = Math.random();
  const level: SignalLevel =
    roll > 0.93 ? "ERROR" : roll > 0.83 ? "WARN" : "INFO";

  const type =
    level === "ERROR"
      ? "ALERT.RAISED"
      : level === "WARN"
      ? "TELEMETRY.WARN"
      : "TELEMETRY.OK";

  const msg =
    level === "ERROR"
      ? "ALARM: anomaly threshold exceeded"
      : level === "WARN"
      ? "Warning: elevated p99"
      : "Tick";

  next.signals.push({
    seq,
    ts: isoNow(),
    traceId: `tr_${randId()}`,
    level,
    type,
    msg,
  });

  // keep last 200 signals
  if (next.signals.length > 200) next.signals = next.signals.slice(-200);

  // theme flip on ERROR
  if (level === "ERROR") {
    next.theme = "alert";
    next.mode = "DEFENSE";
    // health degradation simulation
    const telem = next.health.find((h) => h.key === "TELEMETRY");
    if (telem) telem.status = "WARN";
  } else {
    // slowly reset theme back to base
    if (next.theme === "alert" && Math.random() > 0.7) {
      next.theme = "base";
      next.mode = "WORK";
      const telem = next.health.find((h) => h.key === "TELEMETRY");
      if (telem) telem.status = "OK";
    }
  }

  return next;
}
