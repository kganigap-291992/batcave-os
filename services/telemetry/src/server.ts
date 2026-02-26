// services/telemetry/src/server.ts

import express from "express";
import path from "path";
import { GothamBus } from "@batcave/gotham-bus";
import { AlfredModeEngine } from "@batcave/alfred-mode-engine";
import { TelemetryService } from "./telemetry";
import { registerRoutes } from "./routes";
import { AlertManager } from "./alertManager";

const PORT = Number(process.env.TELEMETRY_PORT ?? 8790);

const ALLOWED_MODES = ["WORK", "DEFENSE", "NIGHT", "DEMO", "SILENT"] as const;
const ALLOWED_ALERT_SEVERITIES = ["INFO", "WARN", "ERROR", "CRITICAL"] as const;

async function main() {
  const app = express();
  app.use(express.json());

  const bus = new GothamBus();

  // Phase 1: Alfred in-process for deterministic E2E testing
  const alfred = new AlfredModeEngine(bus);
  alfred.start();

  const jsonlPath = path.resolve(process.cwd(), "local/logs/events.jsonl");
  const telemetry = new TelemetryService(bus, jsonlPath);
  telemetry.start();

  // ------------------------------------------------------------
  // ✅ PHASE 2 — Alert Manager (wired after telemetry.start())
  //   IMPORTANT: publish with context so traceId/requestId stay stable
  // ------------------------------------------------------------
  const alertManager = new AlertManager({
    emit: (evt: any) => {
      const traceId =
        typeof evt?.traceId === "string" && evt.traceId.trim().length > 0
          ? evt.traceId
          : undefined;

      // Default: keep requestId aligned to traceId for tight grouping
      const requestId =
        typeof evt?.requestId === "string" && evt.requestId.trim().length > 0
          ? evt.requestId
          : traceId;

      bus.publish(evt as any, {
        source: "alert-manager",
        traceId,
        requestId,
      } as any);
    },
  });

  // Wire routes AFTER telemetry is live
  registerRoutes(app, telemetry);

  // ------------------------------------------------------------
  // ✅ PHASE 1.5 — Health signals (Readiness + Heartbeat)
  // ------------------------------------------------------------
  const sysTraceId = "trace_system_telemetry";

  // One-shot readiness
  bus.publish(
    {
      type: "SERVICE.READINESS",
      payload: { service: "telemetry", ready: true, reason: "OK" },
    } as any,
    { source: "telemetry", requestId: sysTraceId, traceId: sysTraceId }
  );

  // Heartbeat every 15s
  setInterval(() => {
    bus.publish(
      {
        type: "SERVICE.HEARTBEAT",
        payload: { service: "telemetry" },
      } as any,
      { source: "telemetry", requestId: sysTraceId, traceId: sysTraceId }
    );
  }, 15000);

  // ------------------------------------------------------------
  // Debug trigger (Day 1 proof)
  // ------------------------------------------------------------
  app.post("/debug/mode/:mode", (req, res) => {
    const mode = String(req.params.mode).toUpperCase();

    if (!ALLOWED_MODES.includes(mode as any)) {
      return res.status(400).json({
        ok: false,
        error: `Invalid mode "${mode}". Allowed: ${ALLOWED_MODES.join(", ")}`,
      });
    }

    const requestId = `req_debug_${Date.now()}`;
    const traceId = requestId;

    // 1) Emit COMMAND.INTENT (contract v2)
    bus.publish(
      {
        type: "COMMAND.INTENT",
        payload: { intent: "MODE.SET", mode },
        meta: { requestId, traceId, source: "telemetry-debug" },
      } as any
    );

    // 2) Emit MODE.SET_REQUESTED (Alfred listens to this)
    bus.publish(
      {
        type: "MODE.SET_REQUESTED",
        payload: { mode },
        meta: { requestId, traceId, source: "telemetry-debug" },
      } as any
    );

    res.json({ ok: true, requestId, traceId, mode });
  });

  // ------------------------------------------------------------
  // ✅ PHASE 2 — Demo alert trigger (optional, but accelerates UI)
  // ------------------------------------------------------------
  app.post("/debug/alert/:severity", (req, res) => {
    const severity = String(req.params.severity).toUpperCase();

    if (!ALLOWED_ALERT_SEVERITIES.includes(severity as any)) {
      return res.status(400).json({
        ok: false,
        error: `Invalid severity "${severity}". Allowed: ${ALLOWED_ALERT_SEVERITIES.join(", ")}`,
      });
    }

    const ttlMsRaw = req.body?.ttlMs;
    const ttlMs =
      typeof ttlMsRaw === "number" && Number.isFinite(ttlMsRaw) && ttlMsRaw > 0
        ? ttlMsRaw
        : 10_000;

    const title =
      typeof req.body?.title === "string" && req.body.title.trim().length > 0
        ? req.body.title.trim()
        : `Demo ${severity} alert`;

    const message =
      typeof req.body?.message === "string" && req.body.message.trim().length > 0
        ? req.body.message.trim()
        : "Triggered via /debug/alert";

    const traceId =
      typeof req.body?.traceId === "string" && req.body.traceId.trim().length > 0
        ? req.body.traceId.trim()
        : `trace_alert_${Date.now()}`;

    const alert = alertManager.raise({
      severity: severity as any,
      title,
      message,
      ttlMs,
      traceId,
      source: "telemetry-debug",
    });

    res.json({ ok: true, alert });
  });

  // ------------------------------------------------------------
  // ✅ PHASE 2.3 — Alerts endpoint (UI polls this)
  // ------------------------------------------------------------
  app.get("/alerts", (_req, res) => {
    res.json({ ok: true, alerts: alertManager.list() });
  });

  app.listen(PORT, () => {
    console.log(`[telemetry] listening on http://localhost:${PORT}`);
    console.log(`[telemetry] jsonl: ${jsonlPath}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});