// services/gotham-bus/src/dev.ts

import crypto from "crypto";
import type { Event, Mode, ModeRejectCode } from "./events";
import { GothamBus } from "./bus";

// ✅ Test harness: run Alfred in-process so it shares the same in-memory bus
import { AlfredModeEngine } from "../../alfred-mode-engine/src/alfred";

// -----------------------------
// Helpers
// -----------------------------
function nowIso() {
  return new Date().toISOString();
}

function newRequestId() {
  return crypto.randomUUID();
}

const ALL_MODES: readonly Mode[] = ["WORK", "DEFENSE", "NIGHT", "DEMO", "SILENT"] as const;

type RequestResult =
  | { ok: true; event: Extract<Event, { type: "MODE.CHANGED" }> }
  | { ok: false; event: Extract<Event, { type: "MODE.SET_REJECTED" }> };

// Local validation: DO NOT publish on failure
function validateRequestedMode(mode: any) {
  if (!mode) {
    return { ok: false as const, reason: "Missing mode" };
  }
  if (!ALL_MODES.includes(mode)) {
    return { ok: false as const, reason: `Unknown mode: ${String(mode)}` };
  }
  return { ok: true as const };
}

function makeRejected(params: {
  requestId: string;
  requestedMode: Mode;
  reasonCode: ModeRejectCode;
  reason: string;
  currentMode?: Mode | null;
  source?: string;
}): Extract<Event, { type: "MODE.SET_REJECTED" }> {
  return {
    type: "MODE.SET_REJECTED",
    ts: nowIso(),
    source: params.source ?? "dev-runner",
    requestId: params.requestId,
    requestedMode: params.requestedMode,
    reasonCode: params.reasonCode,
    reason: params.reason,
    currentMode: params.currentMode ?? null,
  };
}

function makeRequested(params: {
  requestId: string;
  requestedMode: Mode;
  source?: string;
}): Extract<Event, { type: "MODE.SET_REQUESTED" }> {
  return {
    type: "MODE.SET_REQUESTED",
    ts: nowIso(),
    source: params.source ?? "dev-runner",
    requestId: params.requestId,
    mode: params.requestedMode,
  };
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

  // ✅ Local validation: return a rejection-like object, but DO NOT publish
  const v = validateRequestedMode(requestedMode);
  if (!v.ok) {
    const localRejected = makeRejected({
      requestId,
      requestedMode: "WORK", // fallback required by type; not used by caller much
      reasonCode: "VALIDATION_ERROR",
      reason: v.reason,
      currentMode: null,
      source: "dev-runner",
    });
    return { ok: false, event: localRejected };
  }

  const mode = requestedMode as Mode;

  return new Promise((resolve) => {
    let done = false;

    const unsubscribe = bus.subscribe((e: Event) => {
      if (done) return;

      // Wait for either CHANGED or SET_REJECTED with matching requestId
      if (e.type === "MODE.CHANGED" && e.requestId === requestId) {
        done = true;
        unsubscribe();
        resolve({ ok: true, event: e });
        return;
      }

      if (e.type === "MODE.SET_REJECTED" && e.requestId === requestId) {
        done = true;
        unsubscribe();
        resolve({ ok: false, event: e });
        return;
      }
    });

    // Publish the request
    bus.publish(makeRequested({ requestId, requestedMode: mode, source: "dev-runner" }));

    // Timeout => ENGINE_OFFLINE (published)
    setTimeout(() => {
      if (done) return;
      done = true;
      unsubscribe();

      const offline = makeRejected({
        requestId,
        requestedMode: mode,
        reasonCode: "ENGINE_OFFLINE",
        reason: `No response within ${timeoutMs}ms`,
        currentMode: null,
        source: "dev-runner",
      });

      // ✅ For offline fallback, we DO publish (by design)
      bus.publish(offline);

      resolve({ ok: false, event: offline });
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
    console.log(`[BUS] ${e.type}`, e);
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
