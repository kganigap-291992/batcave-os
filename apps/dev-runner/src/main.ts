import { GothamBus, type Event, type Mode } from "@batcave/gotham-bus";
import { AlfredModeEngine } from "@batcave/alfred-mode-engine";
import express from "express";
import path from "path";
import crypto from "crypto";
import { TelemetryService, registerRoutes } from "@batcave/telemetry";

const PORT = Number(process.env.BATCONSOLE_PORT ?? 8791);

async function main() {
  const app = express();
  app.use(express.json());

  const bus = new GothamBus();

  // 🔎 Log all events
  bus.subscribe((evt: Event) => {
    console.log(
      `[${evt.meta.ts}] ${evt.type} source=${evt.meta.source} requestId=${evt.meta.requestId}`,
      {
        intent: (evt.payload as any)?.intent,
        payload: evt.payload,
      }
    );
  });

  // --- Telemetry (start early so it captures startup/readiness events) ---
  const jsonlPath = path.resolve(process.cwd(), "local/logs/events.jsonl");
  const telemetry = new TelemetryService(bus, jsonlPath);
  telemetry.start();
  registerRoutes(app, telemetry);

  // --- Alfred ---
  const alfred = new AlfredModeEngine(bus);
  alfred.start();

  // ✅ Health: pin stable traces so /traces doesn’t get spammed
  const sysTraceId = "trace_system_dev_runner";
  const alfredTraceId = "trace_system_alfred";

  // ✅ Dev-runner readiness (one-shot)
  bus.publish(
    {
      type: "SERVICE.READINESS",
      payload: { service: "dev-runner", ready: true, reason: "OK" },
    } as any,
    { source: "dev-runner", requestId: sysTraceId, traceId: sysTraceId }
  );

  // ✅ Alfred readiness (Phase 1: orchestrator emits child health)
  bus.publish(
    {
      type: "SERVICE.READINESS",
      payload: { service: "alfred-mode-engine", ready: true, reason: "OK" },
    } as any,
    { source: "dev-runner", requestId: alfredTraceId, traceId: alfredTraceId }
  );

  // ✅ Heartbeats (every 15s)
  setInterval(() => {
    bus.publish(
      {
        type: "SERVICE.HEARTBEAT",
        payload: { service: "dev-runner" },
      } as any,
      { source: "dev-runner", requestId: sysTraceId, traceId: sysTraceId }
    );

    bus.publish(
      {
        type: "SERVICE.HEARTBEAT",
        payload: { service: "alfred-mode-engine" },
      } as any,
      { source: "dev-runner", requestId: alfredTraceId, traceId: alfredTraceId }
    );
  }, 15000);

  // --- HTTP server ---
  app.listen(PORT, () => {
    console.log(`[dev-runner] listening on http://localhost:${PORT}`);
    console.log(`[dev-runner] telemetry jsonl: ${jsonlPath}`);
  });

  // 🧪 Test publish (single trace for mode change)
  const mode: Mode = "NIGHT";
  const requestId = `req_${crypto.randomUUID()}`;
  const traceId = requestId;

  bus.publish(
    {
      type: "INTENT",
      payload: { intent: "MODE.SET", mode },
    },
    { source: "dev-runner", requestId, traceId }
  );

  bus.publish(
    {
      type: "MODE.SET_REQUESTED",
      payload: { mode },
    } as any,
    { source: "dev-runner", requestId, traceId }
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});