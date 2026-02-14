import { GothamBus } from "./bus";
import { AlfredModeEngine } from "../../alfred-mode-engine/src/alfred";

const bus = new GothamBus();

// Listener 1: print ALL events
bus.subscribe((e) => console.log("[EVENT]", e));

// Listener 2: Alfred (the brain)
const alfred = new AlfredModeEngine(bus);
alfred.start();

// Yell a request into the room
bus.publish({
  type: "MODE.SET_REQUESTED",
  ts: new Date().toISOString(),
  source: "dev",
  mode: "DEMO",
});
