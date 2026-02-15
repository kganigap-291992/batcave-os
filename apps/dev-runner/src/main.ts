import { GothamBus, type Event, type Mode } from "@batcave/gotham-bus";
import { AlfredModeEngine } from "@batcave/alfred-mode-engine";

const bus = new GothamBus();

bus.subscribe((evt: Event) => {
  console.log(`[${evt.ts}] ${evt.type} source=${evt.source}`, evt);
});

const alfred = new AlfredModeEngine(bus);
alfred.start(); // ✅ THIS WAS MISSING

const mode: Mode = "WORK";

bus.publish({
  type: "MODE.SET_REQUESTED",
  ts: new Date().toISOString(),
  source: "dev-runner",
  mode,
});
