# 🦇 Batcave Telemetry Architecture (Phase 1 Freeze --- v2)

Author: Krishna Reddy GV\
Project: batcave-os\
Scope: Telemetry + BatELK (Observability Layer)\
Aligned With: Event Contract v2\
Status: Frozen after MODE_SLOW + Alert indexing

------------------------------------------------------------------------

# 1️⃣ Purpose of Telemetry Layer

Telemetry exists to:

-   Capture all GothamBus events
-   Persist events to disk (JSONL)
-   Maintain indexed in-memory buffers
-   Provide operational APIs
-   Provide trace diagnostics
-   Provide service health visibility
-   Index alert lifecycle events
-   Remain read-only and non-authoritative

Telemetry never influences decisions.

It observes truth. It does not create it.

------------------------------------------------------------------------

# 2️⃣ High-Level Architecture

    GothamBus (Event Source)
            ↓
    Alfred (Mode + Alert Authority)
            ↓
    TelemetryService (Observer)
            ↓
     ┌──────────────────────────────┐
     │ BatELK Store (In-Memory)     │
     │  - recent events             │
     │  - error ring                │
     │  - trace index               │
     │  - health index              │
     │  - alert index               │
     └──────────────────────────────┘
            ↓
    HTTP Endpoints + SSE Stream

Telemetry subscribes to all events defined in Event Contract v2.

------------------------------------------------------------------------

# 3️⃣ Event Contract Alignment (v2)

All indexed events conform to:

``` ts
{
  type: string,
  intent?: string,
  payload: object,
  meta: {
    schema: "batcave.event.v2",
    eventId: string,
    seq: number,
    traceId: string,
    requestId: string,
    category: "intent|decision|device|vision|system",
    severity: "debug|info|warn|error",
    source: string,
    ts: string
  }
}
```

Telemetry relies on `meta.seq` for deterministic ordering.

------------------------------------------------------------------------

# 4️⃣ Components

## A. TelemetryService

Location: services/telemetry/

Responsibilities:

-   Subscribe to GothamBus
-   Append events to JSONL file
-   Broadcast via SSE
-   Forward events to BatElkStore

Persistence: local/logs/events.jsonl

No automatic reload from disk (Phase 1 decision).

------------------------------------------------------------------------

## B. BatElkStore (Mini-ELK)

Tracks:

-   `recent` (ring buffer \~5000)
-   `errors` (error-severity events)
-   `traces` (Map\<traceId, Event\[\]\>)
-   `health` (Map\<service, health state\>)
-   `alerts` (active + historical alerts)

Alert indexing includes:

-   ALERT.RAISED
-   ALERT.CLEARED
-   severity mapping
-   TTL expiry tracking (observed, not enforced)

------------------------------------------------------------------------

# 5️⃣ Health Model (v2 Aligned)

Health signals are emitted as:

-   type: SYSTEM.HEALTH
-   intent: SERVICE.READINESS \| SERVICE.HEARTBEAT

Health snapshot includes:

-   ready
-   readinessReason
-   lastHeartbeatSeq
-   lastHeartbeatTs

Telemetry aggregates health into:

GET /health

------------------------------------------------------------------------

# 6️⃣ Diagnostics Engine

Endpoint:

/trace/:id/diagnostics

Detects:

-   TRACE_NOT_FOUND
-   ERROR_PRESENT
-   MODE_NO_CHANGE
-   MODE_FLAP
-   INTENT_UNROUTED
-   MODE_SLOW (threshold 1500ms)

Computed fields:

-   eventCount
-   durationMs
-   modeSetToChangedMs
-   firstSeq
-   lastSeq
-   hasErrors

Alerts may later consume diagnostics output (read-only).

------------------------------------------------------------------------

# 7️⃣ Indexed Event Categories

Telemetry indexes events from:

## Intent Layer

-   COMMAND.INTENT

## Decision Layer

-   MODE.CHANGED
-   MODE.SET_REJECTED

## Device Layer

-   DEVICE.INTENT

## Alert Layer

-   ALERT.RAISED
-   ALERT.CLEARED

## Vision Layer

-   PRESENCE.EVENT
-   GESTURE.EVENT

## Environment Layer

-   ENV.EVENT

## System Layer

-   SYSTEM.HEALTH
-   SYSTEM.EVENT
-   DEMO.EVENT

Telemetry does not differentiate business logic --- only indexes by
type + severity.

------------------------------------------------------------------------

# 8️⃣ Available Endpoints

## Core

-   /events
-   /trace/:id
-   /events/stream

## BatELK

-   /errors
-   /traces
-   /search?q=
-   /health
-   /trace/:id/diagnostics

------------------------------------------------------------------------

# 9️⃣ Troubleshooting

## No traces appear

-   Verify dev-runner running
-   Verify bus.publish() is called
-   Check JSONL file

## Health shows ready=false

-   Confirm SYSTEM.HEALTH intent SERVICE.READINESS emitted
-   Validate envelope structure

## TRACE_NOT_FOUND

-   Restart cleared in-memory index
-   Fetch new traceId

## MODE_SLOW firing

-   Inspect adapter/device latency
-   Compare seq and ts fields

------------------------------------------------------------------------

# 🔟 Failure Containment

Telemetry failure:

-   Does NOT affect bus
-   Does NOT affect Alfred
-   Does NOT affect adapters

It only impacts observability.

------------------------------------------------------------------------

# 1️⃣1️⃣ Freeze Statement

BatELK scope frozen at:

-   Event indexing
-   Alert indexing
-   Error indexing
-   Trace indexing
-   Health indexing
-   Diagnostics rules (including MODE_SLOW)

No feature expansion without explicit architectural decision.

------------------------------------------------------------------------

# 1️⃣2️⃣ What This Enables

Safe to add:

-   FakeLightAdapter
-   Real hardware adapters
-   Voice integration
-   Demo injection
-   Nest + thermostat signals
-   Gesture adapter (Phase 2)

Because every chain is observable and diagnosable.

------------------------------------------------------------------------

Phase Principle:

Truth → Observability → Control → Devices → Cinematic polish

------------------------------------------------------------------------

End of Telemetry Specification (v2).
