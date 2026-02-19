import { GothamBus, type Event, type Mode } from "@batcave/gotham-bus";
import { AlfredModeEngine } from "@batcave/alfred-mode-engine";

const bus = new GothamBus();

// 🔎 Log all events (new envelope style)
bus.subscribe((evt: Event) => {
  console.log(
    `[${evt.meta.ts}] ${evt.type} source=${evt.meta.source} requestId=${evt.meta.requestId}`,
    {
      intent: (evt as any).intent,
      payload: evt.payload,
    }
  );
});

const alfred = new AlfredModeEngine(bus);
alfred.start();

// 🧪 Test: simulate voice/dev-runner
const mode: Mode = "NIGHT";

bus.publish(
  {
    type: "INTENT",
    intent: "MODE.SET",
    payload: { mode },
  },
  { source: "dev-runner" }
);
