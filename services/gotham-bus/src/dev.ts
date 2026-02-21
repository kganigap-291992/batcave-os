// services/gotham-bus/src/dev.ts

import crypto from "crypto";
import type { Event, Mode, ModeRejectCode } from "./events";
import { GothamBus } from "./bus";

// ✅ Test harness: run Alfred in-process so it shares the same in-memory bus
import { AlfredModeEngine } from "../../alfred-mode-engine/src/alfred";

// -----------------------------
// Helpers
// -----------------------------
function newRequestId() {
  return `req_${crypto.randomUUID()}`;
}

const ALL_MODES: readonly Mode[] = ["WORK", "DEFENSE", "NIGHT", "DEMO", "SILENT"] as const;

type RequestResult =
  | { ok: true; event: Extract<Event, { type: "MODE.CHANGED" }> }
  | { ok: false; event: Extract<Event, { type: "MODE.SET_REJECTED" }> };

// Local validation: DO NOT publish on failure
function validateRequestedMode(mode: any) {
  if (!mode) return { ok: false as const, reason: "Missing mode" };
  if (!ALL_MODES.includes(mode)) {
    return { ok: false as const, reason: `Unknown mode: ${String(mode)}` };
  }
  return { ok: true as const };
}

// -----------------------------
// Request + wait (ack/reject/timeout)
// -----------------------------
async function requestModeChange(
  bus: GothamBus,
  requestedMode: any,
  timeoutMs = 1500
): Promise<RequestResult> {
  const requestId = newRequestId();
  const traceId = requestId; // Day 1 simple rule: traceId = requestId on chain start
  const source = "dev-runner";

  // ✅ Local validation: return a rejection-like object, but DO NOT publish
  const v = validateRequestedMode(requestedMode);
  if (!v.ok) {
    // Return a "rejection-like" event shape for caller convenience, but not published.
    // NOTE: this is NOT a real bus Event envelope; caller just prints it.
    const localRejected = {
      type: "MODE.SET_REJECTED" as const,
      payload: {
        requestedMode: "WORK" as Mode, // fallback for typing; not meaningful
        reasonCode: "VALIDATION_ERROR" as ModeRejectCode,
        reason: v.reason,
        currentMode: null as Mode | null,
      },
      meta: {
        schema: "batcave.event.v1" as const,
        eventId: `evt_local_${crypto.randomUUID()}`,
        requestId,
        traceId,
        category: "decision" as const,
        severity: "error" as const,
        source,
        ts: new Date().toISOString(),
      },
    };

    return { ok: false, event: localRejected as any };
  }

  const mode = requestedMode as Mode;

  return new Promise((resolve) => {
    let done = false;

    const unsubscribe = bus.subscribe((e: Event) => {
      if (done) return;

      // Match on requestId (all downstream events should keep the same requestId)
      if (e.meta.requestId !== requestId) return;

      if (e.type === "MODE.CHANGED") {
        done = true;
        unsubscribe();
        resolve({ ok: true, event: e as Extract<Event, { type: "MODE.CHANGED" }> });
        return;
      }

      if (e.type === "MODE.SET_REJECTED") {
        done = true;
        unsubscribe();
        resolve({ ok: false, event: e as Extract<Event, { type: "MODE.SET_REJECTED" }> });
        return;
      }
    });

    // 1) Publish INTENT (command) — shows up in logs/UI as the initiating action
    const intent = bus.publish(
      {
        type: "INTENT",
        payload: { intent: "MODE.SET", mode },
      } as any,
      { source, requestId, traceId }
    );

    // 2) Translate intent -> decision request (same requestId/traceId to keep one trace chain)
    bus.publish(
      {
        type: "MODE.SET_REQUESTED",
        payload: { mode },
        meta: {
          requestId: intent.meta.requestId,
          traceId: intent.meta.traceId,
          source: intent.meta.source,
        },
      } as any,
      { source, requestId, traceId }
    );

    // Timeout => ENGINE_OFFLINE (published)
    setTimeout(() => {
      if (done) return;
      done = true;
      unsubscribe();

      const offline = bus.publish(
        {
          type: "MODE.SET_REJECTED",
          payload: {
            requestedMode: mode,
            reasonCode: "ENGINE_OFFLINE",
            reason: `No response within ${timeoutMs}ms`,
            currentMode: null,
          },
          meta: { requestId, traceId, source },
        } as any,
        { source, requestId, traceId }
      );

      resolve({ ok: false, event: offline as Extract<Event, { type: "MODE.SET_REJECTED" }> });
    }, timeoutMs);
  });
}

// -----------------------------
// Demo runner
// -----------------------------
async function main() {
  const bus = new GothamBus();

  // ✅ Start Alfred in-process for end-to-end testing
  const alfred = new AlfredModeEngine(bus);
  alfred.start();

  // Optional: print all bus traffic so you can SEE the system in action
  bus.subscribe((e: Event) => {
    // Keep logs consistent with the new envelope
    console.log(
      `[BUS] ${e.type} ${e.meta.category}/${e.meta.severity} req=${e.meta.requestId} trace=${e.meta.traceId}`,
      e
    );
  });

  // 1) Valid change => MODE.CHANGED
  const r1 = await requestModeChange(bus, "DEFENSE");
  console.log("[RESULT]", r1.ok ? "OK" : "REJECTED", r1.event);

  // 2) Same mode => MODE.SET_REJECTED (SAME_MODE) from Alfred
  const r2 = await requestModeChange(bus, "DEFENSE");
  console.log("[RESULT]", r2.ok ? "OK" : "REJECTED", r2.event);

  // 3) Invalid input => local VALIDATION_ERROR (NO publish)
  const r3 = await requestModeChange(bus, "ATTACK");
  console.log("[RESULT]", r3.ok ? "OK" : "REJECTED", r3.event);

  // 4) Another valid change => MODE.CHANGED
  const r4 = await requestModeChange(bus, "NIGHT");
  console.log("[RESULT]", r4.ok ? "OK" : "REJECTED", r4.event);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});