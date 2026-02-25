# 🦇 Batcave-OS --- Architecture

This document explains Batcave-OS in plain language with diagrams. It
reflects the locked Phase 1 and Phase 2 roadmap.

Everything communicates through events. Producers publish. Consumers
react. Nobody calls each other directly.

------------------------------------------------------------------------

## 1) Mental Model --- The Room

-   Gotham Bus = the room's speaker system
-   Events = things shouted into the room
-   Services / Adapters = people who listen and react

If nobody listens, nothing happens. If many listen, they react
independently.

------------------------------------------------------------------------

## 2) High-Level Architecture

    Inputs (UI / Voice / Demo / Sensors / Vision)
                  │
                  ▼
             Gotham Bus
                  │
                  ▼
         Alfred Orchestrator
       (Modes + Alerts + FSM)
                  │
                  ▼
       Facts + Decisions Emitted
                  │
                  ▼
     UI / Adapters / Telemetry

Rules: - Bus only transports - Alfred decides - Adapters execute - UI
renders - Telemetry observes

------------------------------------------------------------------------

## 3) Core Execution Loop

    COMMAND / SENSOR / DEMO
            ↓
        Gotham Bus
            ↓
     Alfred (Decision + Alert Manager)
            ↓
     MODE.CHANGED / ALERT.* / DEVICE.*
            ↓
        Gotham Bus
            ↓
     UI / Devices / Logs

This loop is deterministic and replayable.

------------------------------------------------------------------------

## 4) Base Modes (Phase 1+)

Batcave operates on three base modes:

  Mode      Meaning
  --------- ---------------------
  STANDBY   Idle / Locked
  WORK      Active / Focus
  NIGHT     Low-power / Ambient

Only Alfred may change modes.

All transitions emit MODE.CHANGED.

------------------------------------------------------------------------

## 5) Alert Overlay System

Alerts are temporary overlays layered on top of base modes.

They are not modes.

### Trigger Sources

1)  Internal Health
    -   BUS.UNHEALTHY
    -   TELEMETRY.ERROR
    -   ADAPTER.DOWN
2)  Sensors
    -   PRESENCE.\*
    -   ENV.\*
3)  Demo Injection
    -   DEMO.EVENT

### Alert Flow

    Trigger Event
         ↓
     Alfred Alert Manager
         ↓
     ALERT.RAISED
         ↓
     UI / Devices
         ↓
     TTL expires
         ↓
     ALERT.CLEARED

Default TTL: 10 seconds (extendable).

------------------------------------------------------------------------

## 6) Component Responsibilities

### Gotham Bus (Transport)

Allowed: - publish - subscribe - order via seq

Not allowed: - decisions - hardware calls - state

------------------------------------------------------------------------

### Alfred Orchestrator (Brain)

Allowed: - FSM enforcement - command arbitration - alert management -
device intent emission

Not allowed: - direct hardware access - UI logic

------------------------------------------------------------------------

### Adapters (Hands)

Allowed: - talk to device APIs - translate intents - publish status

Not allowed: - orchestration - state authority

------------------------------------------------------------------------

### UI (Eyes)

Allowed: - render modes - render alerts - render logs - publish requests

Not allowed: - business logic - hardware control

------------------------------------------------------------------------

### Telemetry (Memory)

Allowed: - subscribe to all events - persist logs - expose APIs

Not allowed: - influence decisions

------------------------------------------------------------------------

## 7) Event Language

All components communicate using the canonical envelope.

Key categories:

-   intent
-   decision
-   device
-   vision
-   system

See: docs/event-contract-v2.md

------------------------------------------------------------------------

## 8) Runtime Model (Phase 1)

-   Single-node runtime
-   In-memory bus
-   In-process services
-   File + HTTP telemetry

This enables fast iteration and debugging.

------------------------------------------------------------------------

## 9) Phase 2 --- Gesture & Vision Layer

Phase 2 adds human interaction.

### Vision Adapter

-   Runs on iPad / phone
-   Local inference
-   Emits GESTURE.DETECTED

### Gesture Pipeline

    Camera
      ↓
    Vision Model
      ↓
    Gesture Adapter
      ↓
    Gotham Bus

### Awareness Panel

-   Optional Nest live feed (read-only)
-   Motion-linked previews
-   Security view in NIGHT

------------------------------------------------------------------------

## 10) Failure Containment

Failures are isolated by design.

  Layer       Failure           Impact
  ----------- ----------------- ------------------
  Adapter     Device API down   Local only
  UI          Crash             No system impact
  Telemetry   Down              No control loss
  Bus         Down              System halted
  Alfred      Down              System paused

No edge failure corrupts core state.

------------------------------------------------------------------------

## 11) Evolution Policy

All architectural changes must:

-   Update README
-   Update this document
-   Update event contract
-   Be logged

No undocumented evolution.

------------------------------------------------------------------------

## 12) Summary

Batcave-OS is a deterministic control platform.

Events move. Alfred decides. Adapters act. UI observes. Telemetry
remembers.

Build stable first. Add intelligence second. Automate last.

------------------------------------------------------------------------

Version: v2\
Last Updated: 2026-02-25\
Owner: Krishna Reddy GV
