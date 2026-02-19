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
    // Listen for voice/dev-runner style commands:
    // { type:"INTENT", intent:"MODE.SET", payload:{mode:"WORK"}, meta:{...} }
    this.bus.subscribeType("INTENT", (e) => {
      // Narrow to MODE.SET
      if (e.intent !== "MODE.SET") return;

      const rid = e.meta.requestId;
      const requested = e.payload.mode as Mode;

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
          },
          { source: "alfred-mode-engine", requestId: rid }
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
          },
          { source: "alfred-mode-engine", requestId: rid }
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
          },
          { source: "alfred-mode-engine", requestId: rid }
        );
        return;
      }

      // Apply transition
      const prev = this.mode;
      this.mode = requested;

      // Emit MODE.CHANGED (ack)
      this.bus.publish(
        {
          type: "MODE.CHANGED",
          payload: { mode: this.mode, prevMode: prev ?? null },
        },
        { source: "alfred-mode-engine", requestId: rid }
      );

      // Day 3: Emit device intents based on new mode
      this.emitModeIntents(this.mode, rid);
    });
  }

  private emitModeIntents(mode: Mode, requestId: string) {
    switch (mode) {
      case "WORK": {
        this.bus.publish(
          { type: "INTENT", intent: "LIGHT.SET", payload: { scene: "WORK", brightness: 90 } },
          { source: "alfred-mode-engine", requestId }
        );
        this.bus.publish(
          { type: "INTENT", intent: "PLUG.SET", payload: { on: true } },
          { source: "alfred-mode-engine", requestId }
        );
        return;
      }

      case "DEFENSE": {
        this.bus.publish(
          {
            type: "INTENT",
            intent: "LIGHT.SET",
            payload: { scene: "DEFENSE", color: "red", brightness: 80 },
          },
          { source: "alfred-mode-engine", requestId }
        );
        this.bus.publish(
          { type: "INTENT", intent: "PLUG.SET", payload: { on: true } },
          { source: "alfred-mode-engine", requestId }
        );
        return;
      }

      case "NIGHT":
      case "SILENT": {
        this.bus.publish(
          {
            type: "INTENT",
            intent: "LIGHT.SET",
            payload: { scene: mode, brightness: 10 },
          },
          { source: "alfred-mode-engine", requestId }
        );
        this.bus.publish(
          { type: "INTENT", intent: "PLUG.SET", payload: { on: false } },
          { source: "alfred-mode-engine", requestId }
        );
        return;
      }

      case "DEMO": {
        this.bus.publish(
          {
            type: "INTENT",
            intent: "LIGHT.SET",
            payload: { scene: "DEMO", brightness: 100 },
          },
          { source: "alfred-mode-engine", requestId }
        );
        this.bus.publish(
          { type: "INTENT", intent: "PLUG.SET", payload: { on: true } },
          { source: "alfred-mode-engine", requestId }
        );
        return;
      }
    }
  }

  getMode() {
    return this.mode;
  }
}
