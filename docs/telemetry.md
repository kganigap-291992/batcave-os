# 🦇 Batcave Telemetry Architecture (Phase 1 Freeze Point)

**Author:** Krishna Reddy GV\
**Project:** batcave-os\
**Scope:** Telemetry + BatELK (Observability Layer)\
**State:** Frozen after MODE_SLOW rule addition

------------------------------------------------------------------------

# 1️⃣ Purpose of Telemetry Layer

Telemetry exists to:

-   Capture **all GothamBus events**
-   Persist events to disk (JSONL)
-   Keep indexed in-memory buffers for fast inspection
-   Provide operational endpoints
-   Provide trace diagnostics
-   Provide service health visibility

This layer enables deterministic debugging before adding hardware,
voice, or gestures.

------------------------------------------------------------------------

# 2️⃣ High-Level Architecture

    GothamBus (Event Source)
            ↓
    Alfred Mode Engine (Orchestrator)
            ↓
    TelemetryService
            ↓
     ┌──────────────────────────────┐
     │ BatELK Store (In-Memory)     │
     │  - recent events             │
     │  - error ring                │
     │  - trace index               │
     │  - health index              │
     └──────────────────────────────┘
            ↓
    HTTP Endpoints + SSE Stream

------------------------------------------------------------------------

# 3️⃣ Components Added Today

## A. TelemetryService

Location:

    services/telemetry/src/telemetry.ts

Responsibilities:

-   Subscribes to GothamBus
-   Maintains in-memory ring buffer (recent events)
-   Persists events to JSONL
-   Broadcasts events via SSE
-   Delegates indexing to BatElkStore

Persistence file:

    local/logs/events.jsonl

------------------------------------------------------------------------

## B. BatElkStore (Mini-ELK)

Location:

    services/telemetry/src/batElkStore.ts

Tracks:

-   `recent` (5000 events)
-   `errors` (ring of error-like events)
-   `traces` (Map\<traceId, Event\[\]\>)
-   `health` (Map\<service, health state\>)

Health fields: - ready - readinessReason - lastHeartbeatSeq -
lastHeartbeatTs

This is a purpose-built in-memory observability index.

------------------------------------------------------------------------

## C. Service Health Model

Events introduced:

-   `SERVICE.READINESS`
-   `SERVICE.HEARTBEAT`

System traces: - `trace_system_dev_runner` - `trace_system_alfred`

Health endpoint aggregates readiness + heartbeat into a live snapshot.

------------------------------------------------------------------------

## D. Diagnostics Engine

Endpoint:

    /trace/:id/diagnostics

Detects:

-   TRACE_NOT_FOUND
-   ERROR_PRESENT
-   MODE_NO_CHANGE
-   MODE_FLAP
-   INTENT_UNROUTED
-   MODE_SLOW (threshold 1500ms)

Computed facts:

-   eventCount
-   durationMs
-   modeSetToChangedMs
-   types
-   firstSeq
-   lastSeq
-   hasErrors

This transforms traces from logs into diagnosable execution chains.

------------------------------------------------------------------------

# 4️⃣ Available Endpoints

## Core

-   `/events`
-   `/trace/:id`
-   `/events/stream`

## BatELK

-   `/errors`
-   `/traces`
-   `/search?q=`
-   `/health`
-   `/trace/:id/diagnostics`

------------------------------------------------------------------------

# 5️⃣ Quick Troubleshooting Commands

## 1. Check service health

    curl -s http://localhost:8791/health

Expect: - ok: true - services list populated

## 2. List recent traces

    curl -s http://localhost:8791/traces

## 3. Inspect a trace

    TRACE_ID="paste_here"
    curl -s "http://localhost:8791/trace/${TRACE_ID}"

## 4. Run diagnostics

    curl -s "http://localhost:8791/trace/${TRACE_ID}/diagnostics"

## 5. Search for errors

    curl -s "http://localhost:8791/search?q=ERROR"

## 6. Check for port conflicts

    lsof -nP -iTCP:8791 -sTCP:LISTEN
    kill -9 <PID>

------------------------------------------------------------------------

# 6️⃣ If Something Breaks

## No traces appear

-   Verify dev-runner is running
-   Verify bus.publish() is being called
-   Check JSONL file for new lines

## Health shows ready=false

-   Ensure SERVICE.READINESS was emitted
-   Verify payload shape uses `payload`, not `data`

## TRACE_NOT_FOUND

-   Likely restart cleared memory
-   Fetch new traceId via `/traces`

## MODE_SLOW firing

-   Check adapter or device latency
-   Inspect timestamps in trace

------------------------------------------------------------------------

# 7️⃣ Design Decisions

-   Deterministic envelope enforced at bus layer
-   In-memory indexing (fast, simple, controlled)
-   JSONL for durable local persistence
-   Fixed traceIds for system services
-   No automatic reload from disk (Phase 1 decision)
-   Observability frozen at this feature set

------------------------------------------------------------------------

# 8️⃣ What This Enables Next

Safe to add:

-   FakeLightAdapter
-   Real device adapters
-   Voice integration
-   Gesture input

Because now every chain is traceable and diagnosable.

------------------------------------------------------------------------

# 9️⃣ Freeze Statement

BatELK scope is frozen at:

-   Event indexing
-   Error indexing
-   Trace indexing
-   Health indexing
-   Diagnostics rules (including MODE_SLOW)

No additional telemetry features without explicit unfreeze.

------------------------------------------------------------------------

