// services/telemetry/src/alertManager.ts
import { randomUUID } from "crypto";

export type AlertSeverity = "INFO" | "WARN" | "ERROR" | "CRITICAL";

export type ActiveAlert = {
  id: string;
  severity: AlertSeverity;
  title: string;
  message?: string;
  traceId?: string;
  raisedAt: string;     // ISO
  expiresAt: string;    // ISO
  ttlMs: number;
  source: string;       // e.g. "telemetry"
};

type Deps = {
  emit: (evt: any) => void; // uses your telemetry/bus emit pipeline
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
    return Array.from(this.alerts.values()).sort((a, b) => a.raisedAt.localeCompare(b.raisedAt));
  }

  raise(input: Omit<ActiveAlert, "id" | "raisedAt" | "expiresAt" | "source"> & { source?: string }) {
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

    this.emit({
      type: "ALERT.RAISED",
      ts: raisedAt.toISOString(),
      source: "alert-manager",
      severity: alert.severity,
      alertId: alert.id,
      title: alert.title,
      message: alert.message,
      traceId: alert.traceId,
      ttlMs: alert.ttlMs,
      expiresAt: alert.expiresAt,
    });

    const t = setTimeout(() => this.clear(id, "TTL_EXPIRED"), input.ttlMs);
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

    this.emit({
      type: "ALERT.CLEARED",
      ts: this.now().toISOString(),
      source: "alert-manager",
      severity: alert.severity,
      alertId: alert.id,
      reason,
      traceId: alert.traceId,
    });

    return true;
  }
}