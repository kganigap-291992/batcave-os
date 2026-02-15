import type { Event, Mode } from "@batcave/gotham-bus";
import { GothamBus } from "@batcave/gotham-bus";

export class AlfredModeEngine {
  private mode: Mode = "WORK";

  constructor(private bus: GothamBus) {}

  start() {
    this.bus.subscribe((e: Event) => {
      if (e.type !== "MODE.SET_REQUESTED") return;

      const prev = this.mode;
      this.mode = e.mode;

      this.bus.publish({
        type: "MODE.CHANGED",
        ts: new Date().toISOString(),
        source: "alfred-mode-engine",
        mode: this.mode,
        prevMode: prev ?? null,
      });
    });
  }

  getMode() {
    return this.mode;
  }
}
