# BATCAVE-OS 🦇

**Author:** Krishna Reddy GV

An event-driven automation platform that transforms an ordinary room
into a programmable command center.

The city goes quiet. A command is issued.

⚡ An event is published. 🧠 The system awakens. 🎛 Modes shift. 💡
Lights respond.

Beneath the glow of LEDs and the hum of machines lies a disciplined
architecture --- state machines enforcing order, services speaking only
through events, every transition deliberate, deterministic, controlled.

This isn't smart-home tinkering. It's a control system wearing a cape.

Fun aesthetic. Serious engineering. Built in the shadows.

🦇 The cave listens.

------------------------------------------------------------------------

## 🧠 Overview

Batcave-OS is a locally orchestrated control system built around a
strict event-driven architecture.

It demonstrates:

-   Pub/Sub messaging discipline
-   Explicit state-machine orchestration
-   Deterministic control loops + replayable decisions
-   Hardware adapter isolation
-   UI-ready structured telemetry (truth → observability → control)

**This is not a smart-home project.**\
It is a systems architecture project wearing a cape.

------------------------------------------------------------------------

## 🎯 Non-Negotiable Architecture Rules

-   Events are the only communication layer
-   No direct cross-service calls
-   Gotham Bus is dumb transport (deliver only)
-   Alfred is the single state authority
-   Adapters touch hardware; adapters do not decide
-   UI renders events; UI does not contain orchestration logic
-   Given the same events, behavior must be reproducible

------------------------------------------------------------------------

## 🧩 The Core Loop (Mental Model)

    Producer publishes requests
            ↓
         Gotham Bus
            ↓
     Alfred (decides + orchestrates)
            ↓
     Facts emitted back to the bus
            ↓
     UI / Adapters / Logs react independently

🦇 The cave listens.\
🧠 Alfred decides.\
💡 Adapters act.

------------------------------------------------------------------------

## 📦 Canonical Event Envelope (Contract)

``` ts
{
  type: string,
  intent?: string,
  payload: object,
  meta: {
    schema: "batcave.event.v1",
    eventId: string,
    seq: number,
    traceId: string,
    requestId: string,
    category: "intent" | "decision" | "device" | "vision" | "system",
    severity: "debug" | "info" | "warn" | "error",
    source: string,
    ts: string
  }
}
```

------------------------------------------------------------------------

## 🎛 Base Modes (Phase 1+)

  Mode      Purpose
  --------- ---------------------------------
  STANDBY   Idle / Locked / Passive
  WORK      Active / Focus / Development
  NIGHT     Low-power / Ambient / Wind-down

### 🚨 Alert Overlay (Not a Mode)

Alerts are a temporary overlay layered on top of any base mode.

------------------------------------------------------------------------

## 🚨 Alert Sources (Phase 1 Locked)

### Internal Health

-   BUS.UNHEALTHY
-   TELEMETRY.ERROR
-   ADAPTER.DOWN
-   ADAPTER.ERROR_BURST

### Sensors

-   PRESENCE.MOTION_DETECTED
-   PRESENCE.PERSON_DETECTED
-   ENV.TEMP_ANOMALY
-   ENV.HVAC_FAULT

### Demo (DEMO_MODE)

-   POST /api/demo/alert
-   POST /api/demo/clear

------------------------------------------------------------------------

## 🧱 Core Components

### Gotham Bus

In-memory pub/sub backbone.

### Alfred

Mode + Alert authority.

### Telemetry

Read-only observer.

------------------------------------------------------------------------

## 🔌 Integrations (Phase 1)

-   Govee
-   Plugs
-   Thermostat
-   Nest

------------------------------------------------------------------------

## ✅ Roadmap

### Phase 1

-   Stable events
-   Alert overlay
-   Sensors
-   Demo injection
-   HUD

### Phase 2

-   On-device vision
-   Gestures
-   Optional live feed

------------------------------------------------------------------------

## 📦 Structure

    batcave-os/
    ├─ apps/
    ├─ services/
    ├─ integrations/
    ├─ docs/
    └─ README.md

------------------------------------------------------------------------

🦇 The cave is wired.\
The brain is awake.\
Next, the city lights up.
