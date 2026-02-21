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
  const alfred = new AlfredModeEngine(bus);
  alfred.start();

  const jsonlPath = path.resolve(process.cwd(), "local/logs/events.jsonl");
  const telemetry = new TelemetryService(bus, jsonlPath);
  telemetry.start();

  registerRoutes(app, telemetry);

  // Debug trigger (Day 1 proof)
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

    // 1) Emit INTENT
    bus.publish(
      {
        type: "INTENT",
        payload: { intent: "MODE.SET", mode },
        meta: { requestId, traceId, source: "telemetry-debug" },
      } as any
    );

    // 2) Emit MODE.SET_REQUESTED (Option A)
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