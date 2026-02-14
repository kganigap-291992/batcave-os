# 🦇 BATCAVE-OS

**Author:** Krishna Reddy GV

An event-driven automation platform that turns a normal room into a
programmable command center.

Fun theme. Serious architecture.

------------------------------------------------------------------------

## 🧠 Overview

batcave-os is a locally orchestrated control system designed to
demonstrate:

-   Event-driven architecture (pub/sub)
-   Explicit state machine orchestration
-   Hardware adapter isolation
-   Real-time automation control loops

It may look like a Batcave project.


------------------------------------------------------------------------

## 🎯 Phase 1 Mission

Build a deterministic control loop capable of:

-   Switching operational modes: `WORK`, `DEFENSE`, `NIGHT`, `DEMO`
-   Triggering synthetic anomaly alerts
-   Orchestrating Govee smart lighting
-   Controlling a smart plug
-   Logging system events in real time
-   Accepting voice triggers (Alexa)
-   Accepting gesture triggers (MediaPipe hands)
-   Delivering a 5-minute cinematic demo

Phase 1 is about control and architecture discipline --- not smart-home
sprawl.

------------------------------------------------------------------------

## 🏗 Architecture

The system follows a strict event-driven pattern:

Producer\
→ Gotham Bus (WebSocket Pub/Sub Backbone)\
→ Alfred Mode Engine (State Machine Brain)\
→ Device Intent Events\
→ Integration Adapters\
→ Hardware

Every component is decoupled.\
No service talks directly to hardware APIs except integration adapters.

------------------------------------------------------------------------


## 🏙 Core Services

### Gotham Bus

Path: services/gotham-bus

WebSocket-based pub/sub backbone.\
Transports domain events across the system.\
Contains no business logic.

------------------------------------------------------------------------

### Alfred Mode Engine

Path: services/alfred-mode-engine

The brain of the Batcave.\
Maintains current operational mode.\
Consumes domain events.\
Emits device intent events.

All mode enforcement happens here.

------------------------------------------------------------------------

### Mock Anomaly Engine

Path: services/mock-anomaly-engine

Synthetic alert generator used for testing and demos.\
Emits `anomaly.trigger` events with severity metadata.

------------------------------------------------------------------------

### Gesture Watch

Path: services/gesture-watch

MediaPipe-based hand detection.\
Translates gestures into domain events such as `mode.set`.

------------------------------------------------------------------------

### Alexa Bridge

Path: services/alexa-bridge

Translates Alexa routines into system events.\
Optionally handles `speech.say` output.

------------------------------------------------------------------------

## 🔌 Integration Layer

Adapters isolate hardware from orchestration logic.

### Govee Lights Adapter

Path: integrations/govee-lights

Consumes: - `device.lights.set`

Executes Govee API calls.

------------------------------------------------------------------------

### Smart Plug Adapter

Path: integrations/smart-plug

Consumes: - `device.plug.set`

Executes smart plug API calls.

------------------------------------------------------------------------

## 🎛 Mode Definitions

### WORK

Lights: Blue\
Plug: On

### DEFENSE

Lights: Red\
Plug: On\
Speech: "Warning. Anomaly detected."

### NIGHT

Lights: Warm Dim\
Plug: Off

### DEMO

Lights: Purple\
Plug: On

Modes are enforced exclusively by Alfred Mode Engine.

------------------------------------------------------------------------

## 🧰 Tech Stack

Runtime: - Node.js - TypeScript - pnpm workspace

Messaging: - WebSocket (ws)

UI: - Next.js

Gesture: - MediaPipe

Voice: - Alexa routines

------------------------------------------------------------------------

## 🎬 Demo Flow

1.  Activate WORK mode\
2.  Trigger anomaly\
3.  System switches to DEFENSE\
4.  Lights turn red\
5.  Plug powers on\
6.  Voice alert plays\
7.  Resolve incident\
8.  Return to WORK

------------------------------------------------------------------------

