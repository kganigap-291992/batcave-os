// services/telemetry/src/server.ts

import express from "express";
import path from "path";
import { GothamBus } from "@batcave/gotham-bus";
import { AlfredModeEngine } from "@batcave/alfred-mode-engine";
import { TelemetryService } from "./telemetry";
import { registerRoutes } from "./routes";

const PORT = Number(process.env.TELEMETRY_PORT ?? 8790);

const ALLOWED_MODES = ["WORK", "DEFENSE", "NIGHT", "DEMO", "SILENT"] as const;

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

  app.listen(PORT, () => {
    console.log(`[telemetry] listening on http://localhost:${PORT}`);
    console.log(`[telemetry] jsonl: ${jsonlPath}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});