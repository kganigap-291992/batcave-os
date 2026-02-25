# 🦇 Batcave-OS --- Voice Adapter Specification (v2)

This document defines the responsibilities and behavior of the Voice
Adapter in Batcave-OS.

Voice is an input modality. Voice is not an authority. Voice never
bypasses Alfred.

------------------------------------------------------------------------

Version: v2\
Aligned with: Event Contract v2\
Last Updated: 2026-02-25\
Owner: Krishna Reddy GV

------------------------------------------------------------------------

## 🎯 Purpose

Translate spoken commands (Alexa / Assistant / future LLM agents) into
normalized Batcave domain events.

The Voice Adapter exists to:

-   Preserve determinism
-   Normalize natural language into intent
-   Maintain auditability
-   Prevent direct hardware or state access
-   Enforce architectural symmetry

Voice == Gesture == Script == UI

All are producers of domain intent.

------------------------------------------------------------------------

## 🧩 Position in the System

    User Speech
         ↓
    Voice Platform (Alexa / etc)
         ↓
    Voice Adapter
         ↓ COMMAND.INTENT
    Gotham Bus
         ↓
    Alfred (FSM + Alert Manager)

The Voice Adapter is a pure producer. Alfred remains the sole authority.

------------------------------------------------------------------------

## 📥 Inputs

The adapter receives:

-   Transcribed text
-   Platform metadata
-   Request/session identifiers

Example:

``` json
{
  "rawText": "enter work mode",
  "platform": "alexa",
  "sessionId": "abc123"
}
```

------------------------------------------------------------------------

## 🧠 Intent Classification

Voice input is mapped to a limited, explicit intent set.

No free-form execution is permitted.

### Phase 1 Supported Intents

  Spoken Example             Intent          Payload
  -------------------------- --------------- ---------------------------
  "work mode"                MODE.SET        { targetMode: "WORK" }
  "standby"                  MODE.SET        { targetMode: "STANDBY" }
  "night mode"               MODE.SET        { targetMode: "NIGHT" }
  "clear alert"              ALERT.CLEAR     {}
  "demo alert" (demo only)   DEMO.ALERT      {}
  "status"                   SYSTEM.STATUS   {}

Unrecognized speech is discarded with telemetry.

------------------------------------------------------------------------

## 📤 Output Event Format

All output must conform to Event Contract v2.

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
    "eventId": "evt_101",
    "seq": 1001,
    "traceId": "trace_9",
    "requestId": "req_9",
    "category": "intent",
    "severity": "info",
    "source": "voice-adapter",
    "ts": "2026-02-25T18:00:00Z",
    "rawText": "enter work mode"
  }
}
```

------------------------------------------------------------------------

## 🔐 Safety Rules

The Voice Adapter must:

-   Never publish DEVICE.INTENT
-   Never publish MODE.CHANGED
-   Never publish ALERT.RAISED
-   Never access hardware APIs
-   Never store credentials in plain text

Violations are architectural bugs.

------------------------------------------------------------------------

## ⚖️ Arbitration Integration

Voice commands participate in arbitration.

Default priority:

  Source          Priority
  --------------- ----------
  voice-adapter   90

Priority is attached in meta.priority when needed.

------------------------------------------------------------------------

## 🧪 Error Handling

### Recognition Failure

-   Emit SYSTEM.EVENT (VOICE.UNRECOGNIZED)
-   Include raw text + confidence

### Unsupported Intent

-   Emit SYSTEM.EVENT (VOICE.UNSUPPORTED)

### Platform Failure

-   Emit SYSTEM.HEALTH (VOICE.DOWN)

No failures block the bus.

------------------------------------------------------------------------

## 🔮 Phase 2 Extensions

In Phase 2, the Voice Adapter may integrate with:

-   Gesture fusion
-   Context awareness
-   LLM-based parsing (sandboxed)
-   Confirmation workflows

All extensions must preserve: - Determinism - Auditable intent mapping -
Central authority

------------------------------------------------------------------------

## 📌 Compliance

All voice adapter implementations must:

-   Validate events against Event Contract v2
-   Enforce the intent whitelist
-   Log classification decisions
-   Support replay testing

------------------------------------------------------------------------

End of specification.
