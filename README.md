# BATCAVE-OS 🦇 

**Author:** Krishna Reddy GV

An event-driven automation platform that transforms an ordinary room into a programmable command center.

The city goes quiet.
A command is issued.

⚡ An event is published.
🧠 The system awakens.
🎛 Modes shift.
💡 Lights respond.

Beneath the glow of LEDs and the hum of machines lies a disciplined architecture —
state machines enforcing order, services speaking only through events,
every transition deliberate, deterministic, controlled.

This isn’t smart-home tinkering.
It’s a control system wearing a cape.

Fun aesthetic.
Serious engineering.
Built in the shadows.

🦇 The cave listens.

------------------------------------------------------------------------

## 🧠 Overview

Batcave-OS is a locally orchestrated control system built around a
strict event-driven architecture.

It demonstrates:

-   Pub/Sub messaging discipline
-   Explicit state-machine orchestration
-   Hardware adapter isolation
-   Deterministic control loops
-   Decoupled system design

This is not a smart-home project.

It is a systems architecture project wearing a cape.

------------------------------------------------------------------------

## 🎯 Phase 1 Mission

Build a deterministic control loop capable of:

-   Switching operational modes: `WORK`, `DEFENSE`, `NIGHT`, `DEMO`, `SILENT`
-   Reacting to domain events
-   Emitting state transition events
-   Orchestrating device intent events
-   Demonstrating full event propagation across services

Phase 1 focuses on architecture discipline --- not feature sprawl.

------------------------------------------------------------------------

# 🏗 Architecture

The system follows a strict event-first design.

No direct cross-service calls.\
No business logic inside integrations.\
All state transitions emit events.

------------------------------------------------------------------------

## 🔁 Event Flow (Current Implementation)

    Producer (dev.ts)
            │
            ▼
       Gotham Bus
            │
            ▼
     Alfred Mode Engine
            │
            ▼
      MODE.CHANGED Event
            │
            ▼
      All Subscribers

### What Happens Internally

1.  `MODE.SET_REQUESTED` is published\
2.  Alfred listens to the bus\
3.  Alfred updates its internal mode\
4.  Alfred publishes `MODE.CHANGED`\
5.  Bus distributes the update to all listeners

This forms the first deterministic control loop.

------------------------------------------------------------------------

# 🧱 Core Services

## Gotham Bus

**Path:** `services/gotham-bus`

In-memory pub/sub backbone.

Responsibilities: - Event transport - Subscription management - Zero
business logic

The bus does not think.\
It only delivers.

------------------------------------------------------------------------

## Alfred Mode Engine

**Path:** `services/alfred-mode-engine`

The brain of the Batcave.

Responsibilities: - Maintains current mode - Reacts to
`MODE.SET_REQUESTED` - Emits `MODE.CHANGED` - Owns all mode state
transitions

All orchestration logic lives here.

------------------------------------------------------------------------

# 🎛 Mode Definitions

| Mode    | Purpose |
|---------|---------|
| WORK    | Default operational state |
| DEFENSE | Elevated alert mode |
| NIGHT   | Low-power / dim state |
| DEMO    | Cinematic showcase mode |
| SILENT  | The cave remains operational, but unseen and unheard |

Modes are enforced exclusively by Alfred.
Every transition emits a `MODE.CHANGED` event.


------------------------------------------------------------------------

# 📦 Project Structure

    batcave-os/
    ├─ apps/
    ├─ services/
    │   ├─ gotham-bus/
    │   └─ alfred-mode-engine/
    ├─ integrations/
    │   └─ govee-lights/
    ├─ docs/
    ├─ README.md

------------------------------------------------------------------------

# 🚀 How to Run (Current Test)

    pnpm tsx services/gotham-bus/src/dev.ts

Expected Output:

    [EVENT] MODE.SET_REQUESTED
    [EVENT] MODE.CHANGED

------------------------------------------------------------------------

# 🧭 Design Principles

-   Events are the only communication layer
-   State transitions must emit events
-   Services remain decoupled
-   Hardware logic lives only in integrations
-   Architecture grows in phases

------------------------------------------------------------------------

# 🎬 Future Expansion (Phase 2+)

-   WebSocket-based distributed bus
-   Hardware adapters reacting to `MODE.CHANGED`
-   Gesture and voice event producers
-   Persistent event logging
-   Real-time dashboard

------------------------------------------------------------------------

🦇 The cave is wired.\
The brain is awake.\
Next, the city lights up.
