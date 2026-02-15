# 🗣 Voice Adapter Specification

Batcave-OS treats voice as an **input modality**, not a control authority.

Voice does not control devices.
Voice does not mutate state.
Voice does not bypass Alfred.

Voice only speaks one language:

> **Domain events.**

------------------------------------------------------------------------

## 🎯 Purpose

Translate user voice commands (via Alexa or any assistant) into normalized
Batcave domain events and publish them onto the Gotham Bus.

This preserves:

- Deterministic behavior
- Architectural symmetry (voice == gesture == script)
- Auditability (everything is an event)
- Isolation (no smart-home logic leaks into the system)

------------------------------------------------------------------------

## 🧩 Position in the System

    Voice Interface (Alexa / Assistant)
            │
            ▼
      Voice Adapter (Producer)
            │
            ▼
   MODE.SET_REQUESTED Event
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

The Voice Adapter is a **Producer**.
Alfred remains the only authority over mode.

------------------------------------------------------------------------

## ✅ Inputs

The adapter accepts a small, explicit command set.

### Supported Commands (v1)

- `BAT`      → activate cinematic dark mode
- `FOCUS`    → work / clean lighting
- `ALERT`    → red alert / night ops
- `OFF`      → stand down / shutdown

Commands are case-insensitive and may include filler words.

Examples that should map correctly:

- "BAT"
- "Enter bat mode"
- "Focus mode"
- "Night ops"
- "Stand down"

------------------------------------------------------------------------

## 📤 Output Events

### MODE.SET_REQUESTED

Published whenever a valid command is recognized.

Example payload:

```json
{
  "type": "MODE.SET_REQUESTED",
  "source": "voice",
  "mode": "BAT",
  "ts": "2026-02-15T20:15:00Z",
  "meta": {
    "rawText": "enter bat mode"
  }
}
