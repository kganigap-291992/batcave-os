// services/alfred-mode-engine/src/alfred.ts

import type { Mode } from "@batcave/gotham-bus";
import { GothamBus } from "@batcave/gotham-bus";

type AllowedTransitions = Record<Mode, readonly Mode[]>;

// Phase 1: permissive (everything allowed), but SAME_MODE is rejected explicitly.
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
    // ✅ Option A: Alfred listens ONLY to MODE.SET_REQUESTED
    this.bus.subscribeType("MODE.SET_REQUESTED", (e) => {
      const requested = e.payload.mode as Mode | undefined;

      const requestId = e.meta.requestId;
      const traceId = e.meta.traceId;
      const source = "alfred-mode-engine";

      const current = this.mode;

      // Defensive validation
      if (!requested) {
        this.bus.publish(
          {
            type: "MODE.SET_REJECTED",
            payload: {
              requestedMode: current,
              reasonCode: "VALIDATION_ERROR",
              reason: "Missing mode in request",
              currentMode: current ?? null,
            },
            meta: { requestId, traceId, source },
          } as any
        );
        return;
      }

      // Business rule: SAME_MODE
      if (requested === current) {
        this.bus.publish(
          {
            type: "MODE.SET_REJECTED",
            payload: {
              requestedMode: requested,
              reasonCode: "SAME_MODE",
              reason: `Already in mode ${current}`,
              currentMode: current ?? null,
            },
            meta: { requestId, traceId, source },
          } as any
        );
        return;
      }

      // Business rule: allowed transitions
      const allowed = ALLOWED[current] ?? [];
      if (!allowed.includes(requested)) {
        this.bus.publish(
          {
            type: "MODE.SET_REJECTED",
            payload: {
              requestedMode: requested,
              reasonCode: "INVALID_TRANSITION",
              reason: `Transition not allowed: ${current} → ${requested}`,
              currentMode: current ?? null,
            },
            meta: { requestId, traceId, source },
          } as any
        );
        return;
      }

      // ✅ Day 1: emit accepted first
      this.bus.publish(
        {
          type: "MODE.SET_ACCEPTED",
          payload: {
            requestedMode: requested,
            currentMode: current ?? null,
          },
          meta: { requestId, traceId, source },
        } as any
      );

      // Apply transition
      const prev = this.mode;
      this.mode = requested;

      // Emit MODE.CHANGED (ack)
      this.bus.publish(
        {
          type: "MODE.CHANGED",
          payload: { mode: this.mode, prevMode: prev ?? null },
          meta: { requestId, traceId, source },
        } as any
      );

      // 🚫 Phase 1 discipline (Day 1/2): no device intents yet.
      // Day 3 will re-enable this behind a flag.
      // this.emitModeIntents(this.mode, requestId, traceId);
    });
  }

  getMode() {
    return this.mode;
  }
}