// services/alfred-mode-engine/src/alfred.ts

import type { Event, Mode } from "@batcave/gotham-bus";
import { GothamBus } from "@batcave/gotham-bus";

type AllowedTransitions = Record<Mode, readonly Mode[]>;

// Phase 1: keep permissive (everything allowed) except SAME_MODE.
// You can tighten this later without touching publishers.
const ALLOWED: AllowedTransitions = {
  WORK: ["WORK", "DEFENSE", "NIGHT", "DEMO", "SILENT"],
  DEFENSE: ["WORK", "DEFENSE", "NIGHT", "DEMO", "SILENT"],
  NIGHT: ["WORK", "DEFENSE", "NIGHT", "DEMO", "SILENT"],
  DEMO: ["WORK", "DEFENSE", "NIGHT", "DEMO", "SILENT"],
  SILENT: ["WORK", "DEFENSE", "NIGHT", "DEMO", "SILENT"],
};

export class AlfredModeEngine {
  private mode: Mode = "WORK";

  constructor(private bus: GothamBus) {}

  start() {
    this.bus.subscribe((e: Event) => {
      if (e.type !== "MODE.SET_REQUESTED") return;

      // Defensive validation (consumer-side truth)
      if (!e.requestId) {
        // If requestId is missing, we can’t correlate — reject with a dummy id
        this.bus.publish({
          type: "MODE.SET_REJECTED",
          ts: new Date().toISOString(),
          source: "alfred-mode-engine",
          requestId: "missing_request_id",
          requestedMode: e.mode,
          reasonCode: "VALIDATION_ERROR",
          reason: "Missing requestId",
          currentMode: this.mode ?? null,
        });
        return;
      }

      const requested = e.mode;
      const current = this.mode;

      if (!requested) {
        this.bus.publish({
          type: "MODE.SET_REJECTED",
          ts: new Date().toISOString(),
          source: "alfred-mode-engine",
          requestId: e.requestId,
          requestedMode: current, // fallback
          reasonCode: "VALIDATION_ERROR",
          reason: "Missing mode in request",
          currentMode: current ?? null,
        });
        return;
      }

      // Business rule: SAME_MODE
      if (requested === current) {
        this.bus.publish({
          type: "MODE.SET_REJECTED",
          ts: new Date().toISOString(),
          source: "alfred-mode-engine",
          requestId: e.requestId,
          requestedMode: requested,
          reasonCode: "SAME_MODE",
          reason: `Already in mode ${current}`,
          currentMode: current ?? null,
        });
        return;
      }

      // Business rule: allowed transitions (Phase 1 permissive, but wired)
      const allowed = ALLOWED[current] ?? [];
      if (!allowed.includes(requested)) {
        this.bus.publish({
          type: "MODE.SET_REJECTED",
          ts: new Date().toISOString(),
          source: "alfred-mode-engine",
          requestId: e.requestId,
          requestedMode: requested,
          reasonCode: "INVALID_TRANSITION",
          reason: `Transition not allowed: ${current} → ${requested}`,
          currentMode: current ?? null,
        });
        return;
      }

      // Apply transition
      const prev = this.mode;
      this.mode = requested;

      // Emit MODE.CHANGED (ack)
      this.bus.publish({
        type: "MODE.CHANGED",
        ts: new Date().toISOString(),
        source: "alfred-mode-engine",
        requestId: e.requestId,
        mode: this.mode,
        prevMode: prev ?? null,
      });
    });
  }

  getMode() {
    return this.mode;
  }
}
