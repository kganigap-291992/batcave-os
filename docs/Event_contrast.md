# 🦇 Batcave-OS — Event Contract & Architecture Specification (v1)

This document defines the canonical event contract and architectural principles of Batcave-OS.
It is the long-term reference for why and how the system is designed.

---

## 🎯 Purpose

Batcave-OS is built as a deterministic, event-driven control platform.

This document exists to:

- Prevent contract drift between services
- Preserve architectural decisions
- Enable debugging and replay
- Support long-term maintenance

Six months from now, this document should explain *why* the system works the way it does.

---

## 🧠 Core Architecture Principles

### 1. Event-First Communication

All services communicate only through events via the Gotham Bus.
No service may directly call another service's internal APIs.

### 2. Single State Authority

The Alfred Mode Engine is the only service allowed to decide system state.
All state transitions must pass through it.

### 3. Dumb Transport

The Gotham Bus only delivers messages.
It contains no business logic.

### 4. Deterministic Control Loop

All decisions must be reproducible from the event log.
Given the same events, the system must behave the same way.

### 5. Adapter Isolation

Hardware and external systems are isolated behind adapters.
Failures at the edge must not corrupt core logic.

---

## 📦 Event Envelope (Canonical Format)

All Batcave events must follow this structure.

```json
{
  "type": "EVENT_TYPE",
  "intent": "OPTIONAL.INTENT.STRING",
  "payload": {},
  "meta": {
    "schema": "batcave.event.v1",
    "eventId": "evt_xxxx",
    "requestId": "req_xxxx",
    "source": "service-name",
    "ts": "ISO-8601"
  }
}
```

---

## 📘 Required Fields

### type

Defines the category of event.
Used for routing and governance.

### payload

Contains domain-specific data.
No metadata should live here.

### meta.schema

Current schema version.
Used for future migrations.

### meta.eventId

Globally unique ID for this event.
Used for deduplication.

### meta.requestId

Correlation ID for multi-event flows.
Used for tracing.

### meta.source

Name of emitting service.

### meta.ts

ISO-8601 timestamp.

---

## 📗 Optional Fields

### intent

Defines specific action within a type.
Preferred over creating new types.

### meta.priority

Numeric priority for arbitration.
Used only in COMMAND.INTENT.

### meta.triggerSource

Original source if event is forwarded.

---

## 🧩 Canonical Event Types (v1)

```ts
type EventType =
  | "COMMAND.INTENT"
  | "MODE.CHANGED"
  | "MODE.SET_REJECTED"
  | "DEVICE.INTENT"
  | "SYSTEM.EVENT";
```

These types are stable and must not be changed without versioning.

---

## 📊 Type Ownership Rules

| Type | Owner | Purpose |
|------|--------|---------|
| COMMAND.INTENT | Adapters / UI / Dev | Requests |
| MODE.CHANGED | Mode Engine | State Authority |
| MODE.SET_REJECTED | Mode Engine | Enforcement |
| DEVICE.INTENT | Orchestrator | Actuation |
| SYSTEM.EVENT | Any Service | Telemetry |

Any violation is considered a system bug.

---

## 🧾 COMMAND.INTENT (Input → Brain)

Used by all input sources to request actions.

### Example

```json
{
  "type": "COMMAND.INTENT",
  "intent": "MODE.SET",
  "payload": {
    "targetMode": "DEFENSE"
  },
  "meta": {
    "schema": "batcave.event.v1",
    "eventId": "evt_123",
    "requestId": "req_456",
    "source": "gesture-adapter",
    "priority": 70,
    "ts": "2026-02-18T14:01:02.120Z"
  }
}
```

---

## 🧾 MODE.CHANGED (Brain → World)

Published when a state transition is accepted.

### Example

```json
{
  "type": "MODE.CHANGED",
  "payload": {
    "previousMode": "WORK",
    "currentMode": "DEFENSE"
  },
  "meta": {
    "schema": "batcave.event.v1",
    "eventId": "evt_789",
    "requestId": "req_456",
    "decidedBy": "alfred-mode-engine",
    "triggerSource": "gesture-adapter",
    "ts": "2026-02-18T14:01:02.640Z"
  }
}
```

---

## 🧾 MODE.SET_REJECTED (Brain → World)

Published when a command is denied.

### Example

```json
{
  "type": "MODE.SET_REJECTED",
  "payload": {
    "requestedMode": "DEMO"
  },
  "meta": {
    "schema": "batcave.event.v1",
    "eventId": "evt_999",
    "requestId": "req_456",
    "source": "alfred-mode-engine",
    "triggerSource": "voice-adapter",
    "reasonCode": "LOCKOUT_ACTIVE",
    "reason": "Cooldown in effect",
    "ts": "2026-02-18T14:01:02.700Z"
  }
}
```

---

## 🧾 DEVICE.INTENT (Brain → Devices)

Used to instruct adapters to act on hardware.

### Example

```json
{
  "type": "DEVICE.INTENT",
  "intent": "LIGHT.SET_SCENE",
  "payload": {
    "scene": "work"
  },
  "meta": {
    "schema": "batcave.event.v1",
    "eventId": "evt_321",
    "requestId": "req_456",
    "source": "alfred-mode-engine",
    "ts": "2026-02-18T14:01:03.000Z"
  }
}
```

---

## 🧾 SYSTEM.EVENT (Telemetry)

Used for system-level facts.

### Example

```json
{
  "type": "SYSTEM.EVENT",
  "intent": "SERVICE.STARTED",
  "payload": {
    "service": "voice-adapter"
  },
  "meta": {
    "schema": "batcave.event.v1",
    "eventId": "evt_654",
    "requestId": "req_sys_1",
    "source": "voice-adapter",
    "ts": "2026-02-18T14:00:00.000Z"
  }
}
```

---

## ⚖️ Command Arbitration Policy (Phase 1)

### Priorities

| Source | Priority |
|--------|----------|
| voice-adapter | 90 |
| gesture-adapter | 70 |
| dev-runner | 50 |

### Conflict Window

- 500ms

### Lockout

- 1500ms after MODE.CHANGED

### Decision Order

1. Check lockout
2. Compare priority
3. Validate FSM
4. Accept or reject

---

## ❌ Standard Rejection Codes

| Code | Meaning |
|------|---------|
| FSM_BLOCKED | Illegal transition |
| UNKNOWN_MODE | Undefined mode |
| LOCKOUT_ACTIVE | Cooldown active |
| PRIORITY_LOST | Lower priority |
| DUPLICATE | Duplicate event |

---

## 🔀 State Machine (FSM)

### Supported Modes (Phase 1)

- WORK
- DEFENSE
- NIGHT
- DEMO

### Transition Rules (Example)

| From | To |
|------|----|
| WORK | DEFENSE, NIGHT |
| DEFENSE | WORK |
| NIGHT | WORK |
| DEMO | WORK |

All transitions are enforced by Alfred.

---

## 🏗️ System Flow

```text
Adapter
  ↓ COMMAND.INTENT
Bus
  ↓
Mode Engine (Arbitration + FSM)
  ↓
MODE.CHANGED / MODE.SET_REJECTED
  ↓
Bus
  ↓
Adapters / Logger / UI
```

---

## 🧪 Role of dev-runner

dev-runner is a development and simulation client.

It:
- Publishes COMMAND.INTENT
- Subscribes to system events
- Enables testing without hardware

It is not part of production runtime.

---

## 🔮 Versioning Policy

Breaking changes require:

- New schema version
- Migration notes
- Compatibility window

Example:

```
batcave.event.v2
```

---

## 📌 Design Decisions

### Why Separate INTENT vs STATE

To distinguish requests from facts.
Prevents unauthorized state mutation.

### Why Few Types

Stable routing and governance.
Avoids string explosion.

### Why Central Authority

Prevents race conditions and split-brain state.

### Why Event-Only Boundaries

Enforces service independence.
Enables replay and simulation.

---

## ✅ Compliance Rule

All services must validate outgoing events against this document.
Violations are considered architectural bugs.

---

## 📅 Document Status

Version: v1
Last Updated: 2026-02-18
Owner: Krishna Reddy GV

---

