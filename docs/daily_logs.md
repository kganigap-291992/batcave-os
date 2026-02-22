# 🦇 Batcave-OS – Engineering Log

This document tracks architectural evolution and daily progress.

---

# 📅 2026-02-15 — Foundation Setup

## Objective
Initialize event-driven backbone and dev runner.

## Implemented
- Created GothamBus (in-memory pub/sub)
- Established services/apps structure
- Added dev runner entry point
- Enforced no direct service coupling

## Outcome
System boots and events flow through a central bus.

---

# 📅 2026-02-16 — Alfred Mode Engine

## Objective
Introduce deterministic state authority.

## Implemented
- Added Mode type (WORK, DEFENSE, NIGHT, DEMO, SILENT)
- Created AlfredModeEngine
- Subscribed to MODE.SET_REQUESTED
- Emit MODE.CHANGED on success
- Added AllowedTransitions structure (permissive for now)

## Outcome
Mode transitions now handled by central authority.

---

# 📅 2026-02-17 — Request/Ack Pattern

## Objective
Eliminate blind state mutation and introduce correlation.

## Implemented
- Added requestId to mode events
- Introduced MODE.SET_REJECTED
- Implemented reason codes:
  - VALIDATION_ERROR
  - SAME_MODE
  - INVALID_TRANSITION
  - ENGINE_OFFLINE
- Dev runner now:
  - Performs local validation (no publish)
  - Waits for CHANGED or REJECTED
  - Times out with ENGINE_OFFLINE
- Alfred now enforces deterministic evaluation order

## Verified
- Valid transition → MODE.CHANGED
- Same mode → MODE.SET_REJECTED (SAME_MODE)
- Invalid input → local VALIDATION_ERROR
- Engine offline → ENGINE_OFFLINE

## Architectural Shift
System evolved from:

    Blind state mutation

To:

    MODE.SET_REQUESTED
        → MODE.CHANGED
        → MODE.SET_REJECTED

Foundation for trace logging established.


# 🦇 Batcave-OS
## 📅 2026-02-18 — Event Contract Freeze + Intent Architecture (Day 3)

---

## 🎯 Objective

Refactor the event system to support a canonical envelope and introduce an `INTENT` layer before connecting adapters.

Today’s goals:

- Freeze the event contract
- Implement automatic metadata stamping in Gotham Bus
- Introduce a voice-ready `INTENT` abstraction
- Refactor Alfred mode engine to consume `INTENT`
- Emit device intents on successful mode transitions
- Verify full requestId propagation

---

## 🧠 Why This Refactor Was Necessary

Previously:

- Events were flat (`ts`, `source`, `requestId` at top level)
- Dev-runner published `MODE.SET_REQUESTED`
- Mode engine manually stamped metadata
- No abstraction for voice/gesture inputs
- No stable contract for adapters

This would not scale once:

- Voice adapter is introduced
- Gesture control is added
- Fake adapters are connected
- Real hardware adapters are implemented

We needed:

- A canonical envelope
- Automatic meta stamping
- A decoupled command language
- Deterministic request tracing

---

## 🏗 Canonical Event Envelope (v1)

All events now follow this structure:

```ts
{
  type: string,
  payload: object,
  meta: {
    schema: "batcave.event.v1",
    eventId: string,
    requestId: string,
    source: string,
    ts: ISO-8601 string
  }
}
```

**Date:** February 21, 2026
**Phase:** Phase 1 --- Deterministic Control + Observability Spine

# 🎯 Objective of Today

Lock the **Backend Truth Layer** and build a proper **Telemetry
foundation** before building any UI or hardware integrations.

No animations.\
No device adapters.\
No UI polish.\
Only deterministic structured events + persistence.

------------------------------------------------------------------------

# ✅ Completed

## 1️⃣ Canonical Event Envelope (v1)

All events now conform to:

``` ts
{
  type: string,
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
    ts: ISO-8601 string
  }
}
```

### Why this matters

-   Deterministic ordering
-   Trace correlation
-   UI-ready structured logs
-   Persistable event truth

------------------------------------------------------------------------

## 2️⃣ Deterministic Ordering via `meta.seq`

Problem: Console logs appeared out of order due to identical timestamps.

Solution: Added monotonic `seq` counter inside `GothamBus.publish()`.

Result: All traces can be sorted deterministically using `meta.seq`.

------------------------------------------------------------------------

## 3️⃣ Alfred Engine (Decision Engine) Refactor

Old issue: Alfred was listening to `INTENT`, causing race ordering
issues.

New architecture (Option A locked):

-   `INTENT` → Command visibility
-   `MODE.SET_REQUESTED` → Decision input
-   Alfred listens ONLY to `MODE.SET_REQUESTED`

Alfred now emits: - `MODE.SET_ACCEPTED` - `MODE.SET_REJECTED` -
`MODE.CHANGED`

All preserve: - `traceId` - `requestId` - correct `category` - correct
`severity`

------------------------------------------------------------------------

## 4️⃣ Telemetry Service Built

Created:

    services/telemetry/

Capabilities:

-   Subscribes to all bus events
-   Ring buffer (size 500)
-   JSONL persistence
-   HTTP API

### Endpoints

-   `GET /events?limit=...`
-   `GET /trace/:traceId`
-   `GET /events/stream` (SSE-ready)

### Verified

-   Telemetry runs at `http://localhost:8790`
-   `/events` returns sorted events
-   `/trace/:id` returns deterministic chain
-   JSONL file appends correctly

------------------------------------------------------------------------

## 5️⃣ Temporary Debug Trigger

Added:

    POST /debug/mode/:mode

Publishes: - `INTENT` - `MODE.SET_REQUESTED`

Used to validate full pipeline before UI exists.

------------------------------------------------------------------------

# 🧠 Current System State

## Working

-   Structured event observability
-   Persistent event logging
-   Service health monitoring
-   Trace diagnostics with latency tracking
-   Mini-ELK style indexing
-   Deterministic debugging surface

This is the operational backbone of Batcave Phase 1.
------------------------------------------------------------------------

# 🔜 Next Steps

## Phase 1 --- Day 1 Step 4

### Build `apps/batconsole-ui`

Goals: - Fetch `/events?limit=200` - Render structured rows - Color by
category - Highlight severity = error - Polling first (SSE later) - No
animations yet

------------------------------------------------------------------------

## Telemetry Wiring Plan

Current state: Telemetry runs in-process with its own bus.

Next improvement (after UI works): - Unify bus instance across
services - Remove debug endpoint - Connect real producers (dev-runner /
voice / gesture) - Keep telemetry as read-only observer

------------------------------------------------------------------------

## When to Connect Adapters

Adapters come AFTER:

1.  UI log panel works
2.  Trace drawer works (Day 2)
3.  Health indicators implemented

Order:

1️⃣ FakeLightAdapter\
2️⃣ Real Govee Adapter\
3️⃣ Voice Adapter (Alexa)\
4️⃣ Gesture Adapter\
5️⃣ Reactor visuals refinement

Adapters should never be connected before observability is stable.

------------------------------------------------------------------------

# 🏁 Definition of Phase 1 Completion

-   Deterministic event system
-   Live structured logs UI
-   Clickable trace debugging
-   Health diagnostics
-   FakeLight + Real Govee integration
-   Voice integration
-   Stable demo flow

------------------------------------------------------------------------

**Phase 1 Principle:**\
Truth → Observability → Control → Devices → Cinematic polish