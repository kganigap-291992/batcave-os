# 🦇 Batcave-OS --- Event Contract & Architecture Specification (v2)

This document defines the canonical event contract for Batcave-OS. It
supersedes v1 and aligns with the Phase 1 and Phase 2 roadmap.

------------------------------------------------------------------------

Version: v2\
Supersedes: v1 (2026-02-18)\
Last Updated: 2026-02-25\
Owner: Krishna Reddy GV

------------------------------------------------------------------------

## 🎯 Purpose

This document exists to:

-   Prevent contract drift
-   Preserve architectural intent
-   Enable deterministic replay
-   Support debugging and traceability
-   Ensure long-term maintainability

All services must conform to this contract.

------------------------------------------------------------------------

## 🧠 Core Architecture Principles

### 1. Event-First Communication

All services communicate only through Gotham Bus.

### 2. Single State Authority

Alfred is the only state authority.

### 3. Dumb Transport

The bus contains no business logic.

### 4. Deterministic Control

Given the same events, behavior must be reproducible.

### 5. Adapter Isolation

Edge failures must not corrupt core state.

------------------------------------------------------------------------

## 📦 Canonical Event Envelope

All Batcave events must follow this structure.

``` json
{
  "type": "EVENT_TYPE",
  "intent": "OPTIONAL.INTENT",
  "payload": {},
  "meta": {
    "schema": "batcave.event.v2",
    "eventId": "evt_xxxx",
    "seq": 1024,
    "traceId": "trace_xxxx",
    "requestId": "req_xxxx",
    "category": "intent|decision|device|vision|system",
    "severity": "debug|info|warn|error",
    "source": "service-name",
    "ts": "ISO-8601"
  }
}
```

------------------------------------------------------------------------

## 📘 Required Fields

### type

Primary routing key.

### payload

Domain data only.

### meta.schema

Schema version.

### meta.eventId

Globally unique ID.

### meta.seq

Monotonic sequence.

### meta.traceId

End-to-end correlation.

### meta.requestId

Request correlation.

### meta.category

Logical classification.

### meta.severity

Operational severity.

### meta.source

Emitter identity.

### meta.ts

Timestamp.

------------------------------------------------------------------------

## 📗 Optional Fields

### intent

Sub-action for a type.

### meta.triggerSource

Original producer.

### meta.priority

Used in arbitration.

### meta.rawText

Raw voice input (voice adapter only).

------------------------------------------------------------------------

## 🧩 Canonical Event Types (v2)

``` ts
type EventType =
  | "COMMAND.INTENT"
  | "MODE.CHANGED"
  | "MODE.SET_REJECTED"
  | "DEVICE.INTENT"

  | "ALERT.RAISED"
  | "ALERT.CLEARED"

  | "PRESENCE.EVENT"
  | "ENV.EVENT"

  | "SYSTEM.HEALTH"
  | "SYSTEM.EVENT"

  | "DEMO.EVENT"
  | "GESTURE.EVENT";
```

These types are stable and versioned.

------------------------------------------------------------------------

## 📊 Type Ownership

  Type                Owner                        Purpose
  ------------------- ---------------------------- --------------------
  COMMAND.INTENT      UI / Voice / Gesture / Dev   Requests
  MODE.CHANGED        Alfred                       State announcement
  MODE.SET_REJECTED   Alfred                       Enforcement
  DEVICE.INTENT       Alfred                       Actuation
  ALERT.\*            Alfred                       Escalation
  PRESENCE.EVENT      Sensor Adapters              Presence
  ENV.EVENT           Thermostat Adapter           Environment
  SYSTEM.HEALTH       Core Services                Health
  SYSTEM.EVENT        Any                          Telemetry
  DEMO.EVENT          Demo API                     Simulation
  GESTURE.EVENT       Vision Adapter               Interaction

------------------------------------------------------------------------

## 🧾 COMMAND.INTENT

Used by all input sources.

### Example --- Mode Change

``` json
{
  "type": "COMMAND.INTENT",
  "intent": "MODE.SET",
  "payload": {
    "targetMode": "WORK"
  },
  "meta": {
    "schema": "batcave.event.v2",
    "eventId": "evt_1",
    "seq": 200,
    "traceId": "trace_1",
    "requestId": "req_1",
    "category": "intent",
    "severity": "info",
    "source": "voice-adapter",
    "ts": "2026-02-25T10:00:00Z"
  }
}
```

------------------------------------------------------------------------

## 🧾 MODE.CHANGED

Published on accepted transitions.

``` json
{
  "type": "MODE.CHANGED",
  "payload": {
    "previousMode": "STANDBY",
    "currentMode": "WORK"
  },
  "meta": {
    "schema": "batcave.event.v2",
    "eventId": "evt_2",
    "seq": 201,
    "traceId": "trace_1",
    "requestId": "req_1",
    "category": "decision",
    "severity": "info",
    "source": "alfred",
    "ts": "2026-02-25T10:00:01Z"
  }
}
```

------------------------------------------------------------------------

## 🧾 MODE.SET_REJECTED

``` json
{
  "type": "MODE.SET_REJECTED",
  "payload": {
    "requestedMode": "NIGHT",
    "reasonCode": "LOCKOUT_ACTIVE"
  },
  "meta": {
    "schema": "batcave.event.v2",
    "eventId": "evt_3",
    "seq": 202,
    "traceId": "trace_1",
    "requestId": "req_1",
    "category": "decision",
    "severity": "warn",
    "source": "alfred",
    "ts": "2026-02-25T10:00:02Z"
  }
}
```

------------------------------------------------------------------------

## 🧾 ALERT.RAISED / ALERT.CLEARED

### Raised

``` json
{
  "type": "ALERT.RAISED",
  "payload": {
    "severity": "red",
    "reason": "Adapter unreachable",
    "ttlSeconds": 10,
    "source": "internal"
  },
  "meta": {
    "schema": "batcave.event.v2",
    "eventId": "evt_4",
    "seq": 300,
    "traceId": "trace_2",
    "requestId": "req_sys_1",
    "category": "system",
    "severity": "error",
    "source": "alfred",
    "ts": "2026-02-25T10:05:00Z"
  }
}
```

### Cleared

``` json
{
  "type": "ALERT.CLEARED",
  "payload": {},
  "meta": {
    "schema": "batcave.event.v2",
    "eventId": "evt_5",
    "seq": 310,
    "traceId": "trace_2",
    "requestId": "req_sys_1",
    "category": "system",
    "severity": "info",
    "source": "alfred",
    "ts": "2026-02-25T10:05:10Z"
  }
}
```

------------------------------------------------------------------------

## 🧾 DEVICE.INTENT

``` json
{
  "type": "DEVICE.INTENT",
  "intent": "LIGHT.SET_SCENE",
  "payload": {
    "scene": "work"
  },
  "meta": {
    "schema": "batcave.event.v2",
    "eventId": "evt_6",
    "seq": 400,
    "traceId": "trace_3",
    "requestId": "req_2",
    "category": "device",
    "severity": "info",
    "source": "alfred",
    "ts": "2026-02-25T10:10:00Z"
  }
}
```

------------------------------------------------------------------------

## 🧾 PRESENCE.EVENT

``` json
{
  "type": "PRESENCE.EVENT",
  "intent": "PERSON_DETECTED",
  "payload": {
    "location": "desk"
  },
  "meta": {
    "schema": "batcave.event.v2",
    "eventId": "evt_7",
    "seq": 500,
    "traceId": "trace_4",
    "requestId": "req_sys_2",
    "category": "vision",
    "severity": "info",
    "source": "nest-adapter",
    "ts": "2026-02-25T10:20:00Z"
  }
}
```

------------------------------------------------------------------------

## 🧾 DEMO.EVENT

``` json
{
  "type": "DEMO.EVENT",
  "intent": "ALERT_SIMULATION",
  "payload": {
    "severity": "amber",
    "reason": "Latency spike demo"
  },
  "meta": {
    "schema": "batcave.event.v2",
    "eventId": "evt_8",
    "seq": 600,
    "traceId": "trace_5",
    "requestId": "req_demo_1",
    "category": "system",
    "severity": "warn",
    "source": "demo-api",
    "ts": "2026-02-25T10:30:00Z"
  }
}
```

------------------------------------------------------------------------

## 🧾 GESTURE.EVENT (Phase 2)

``` json
{
  "type": "GESTURE.EVENT",
  "intent": "SWIPE_RIGHT",
  "payload": {},
  "meta": {
    "schema": "batcave.event.v2",
    "eventId": "evt_9",
    "seq": 700,
    "traceId": "trace_6",
    "requestId": "req_gesture_1",
    "category": "vision",
    "severity": "info",
    "source": "vision-adapter",
    "ts": "2026-02-25T10:40:00Z"
  }
}
```

------------------------------------------------------------------------

## ⚖️ Command Arbitration (Phase 1)

Priority (default):

  Source            Priority
  ----------------- ----------
  voice-adapter     90
  gesture-adapter   70
  ui                60
  dev-runner        50

Rules: 1. Lockout check 2. Priority compare 3. FSM validation 4. Accept
/ Reject

------------------------------------------------------------------------

## 🔀 FSM (Phase 1)

Supported Modes:

-   STANDBY
-   WORK
-   NIGHT

Transitions:

  From      To
  --------- ---------
  STANDBY   WORK
  WORK      NIGHT
  NIGHT     WORK
  WORK      STANDBY

Alert is not part of FSM.

------------------------------------------------------------------------

## 🔮 Versioning Policy

Breaking changes require:

-   New schema
-   Migration notes
-   Compatibility window

------------------------------------------------------------------------

## ✅ Compliance

All services must validate events against this document.

Violations are architectural bugs.

------------------------------------------------------------------------

End of specification.
