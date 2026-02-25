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
  const traceId = requestId; // Day 1 rule: traceId = requestId on chain start
  const source = "dev-runner";

  // ✅ Local validation: return a rejection-like object, but DO NOT publish
  const v = validateRequestedMode(requestedMode);
  if (!v.ok) {
    // NOTE: This is NOT a real bus event envelope (no seq, not bus-stamped).
    // It's only for printing in this harness.
    const localRejected = {
      type: "MODE.SET_REJECTED" as const,
      payload: {
        requestedMode: "WORK" as Mode, // typing fallback; not meaningful
        reasonCode: "VALIDATION_ERROR" as ModeRejectCode,
        reason: v.reason,
        currentMode: null as Mode | null,
      },
      meta: {
        schema: "batcave.event.v1" as const,
        eventId: `evt_local_${crypto.randomUUID()}`,
        seq: -1, // sentinel: not bus-assigned
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

    // 1) Publish COMMAND.INTENT — initiating action (v2)
    const intentEvt = bus.publish(
      {
        type: "COMMAND.INTENT",
        payload: { intent: "MODE.SET", mode },
      } as any,
      { source, requestId, traceId }
    );

    // 2) Translate intent -> decision request (same requestId/traceId)
    bus.publish(
      {
        type: "MODE.SET_REQUESTED",
        payload: { mode },
        meta: {
          requestId: intentEvt.meta.requestId,
          traceId: intentEvt.meta.traceId,
          source: intentEvt.meta.source,
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

      resolve({
        ok: false,
        event: offline as Extract<Event, { type: "MODE.SET_REJECTED" }>,
      });
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

  // Print all bus traffic
  bus.subscribe((e: Event) => {
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