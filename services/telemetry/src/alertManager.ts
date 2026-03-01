// services/telemetry/src/alertManager.ts
import { randomUUID } from "crypto";

export type AlertSeverity = "INFO" | "WARN" | "ERROR" | "CRITICAL";

export type ActiveAlert = {
  id: string;
  severity: AlertSeverity;
  title: string;
  message?: string;
  traceId?: string;
  raisedAt: string; // ISO
  expiresAt: string; // ISO
  ttlMs: number;
  source: string; // e.g. "telemetry" | "telemetry-debug"
};

type AlertRaisedPayload = {
  alertId: string;
  severity: AlertSeverity;
  title: string;
  message?: string;
  traceId?: string;
  ttlMs: number;
  expiresAt: string; // ISO
};

type AlertClearedPayload = {
  alertId: string;
  severity: AlertSeverity;
  reason: string;
  traceId?: string;
};

type Deps = {
  emit: (evt: { type: string; payload: any }) => void; // envelope-style emit
  now?: () => Date;
};

export class AlertManager {
  private alerts = new Map<string, ActiveAlert>();
  private timers = new Map<string, NodeJS.Timeout>();
  private emit: Deps["emit"];
  private now: () => Date;

  constructor(deps: Deps) {
    this.emit = deps.emit;
    this.now = deps.now ?? (() => new Date());
  }

  list(): ActiveAlert[] {
    // newest first for HUD
    return Array.from(this.alerts.values()).sort((a, b) =>
      b.raisedAt.localeCompare(a.raisedAt)
    );
  }

  raise(
    input: Omit<ActiveAlert, "id" | "raisedAt" | "expiresAt" | "source"> & {
      source?: string;
    }
  ) {
    const id = randomUUID();
    const raisedAt = this.now();
    const expiresAt = new Date(raisedAt.getTime() + input.ttlMs);

    const alert: ActiveAlert = {
      id,
      severity: input.severity,
      title: input.title,
      message: input.message,
      traceId: input.traceId,
      ttlMs: input.ttlMs,
      raisedAt: raisedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      source: input.source ?? "telemetry",
    };

    this.alerts.set(id, alert);

    const payload: AlertRaisedPayload = {
      alertId: alert.id,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      traceId: alert.traceId,
      ttlMs: alert.ttlMs,
      expiresAt: alert.expiresAt,
    };

    this.emit({ type: "ALERT.RAISED", payload });

    const t = setTimeout(() => this.clear(id, "TTL_EXPIRED"), input.ttlMs);
    // Optional: don't keep node alive only because of timers (nice for tests/dev)
    (t as any).unref?.();
    this.timers.set(id, t);

    return alert;
  }

  clear(alertId: string, reason: string = "MANUAL") {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    const t = this.timers.get(alertId);
    if (t) clearTimeout(t);
    this.timers.delete(alertId);

    this.alerts.delete(alertId);

    const payload: AlertClearedPayload = {
      alertId: alert.id,
      severity: alert.severity,
      reason,
      traceId: alert.traceId,
    };

    this.emit({ type: "ALERT.CLEARED", payload });

    return true;
  }
}