# Batcave-OS — Phase Log + Rationale (Up to Phase 1.6) + Roadmap

Author: Krishna Reddy  
Repo: `batcave-os`  
Last updated: 2026-02-25

---

## 0) Executive summary (non-technical)

Batcave-OS is a **control plane** for your Batcave setup: it decides what the system should do (modes, lighting, plugs, alerts) and records everything that happened so you can debug it later.

We built it in this order on purpose:

1. **Reliable events first** (so every action is traceable)
2. **A deterministic “mode engine”** (so behavior is predictable)
3. **Telemetry + diagnostics** (so troubleshooting is easy)
4. Next: **Alert Manager** (so the system can raise/clear alarms and the HUD can react)

This is the “Batman rule”: *if you can’t observe it, you can’t trust it*.

---

## 1) The core idea

### Everything is an event
Every important thing in the system is represented as an event:
- “User requested DEFENSE mode”
- “Alfred accepted the request”
- “Mode changed”
- “Telemetry heartbeat”
- (Next) “Alert raised / alert cleared”

### Why this decision?
Because it gives us:
- **Auditability**: we can reconstruct “what happened” later.
- **Debuggability**: we can inspect a single **traceId** and see the full chain.
- **Extensibility**: we can add new services (voice, vision, adapters) without rewriting the whole system.

---

## 2) Architecture (high-level)

```
            (HTTP /debug)
                |
                v
        +----------------+
        |  Telemetry svc |  <-- runs Alfred in-process for Phase 1 deterministic E2E
        |  (Express)     |
        +----------------+
                |
                v
        +----------------+
        |   GothamBus    |  <-- assigns meta + ordering + guards contract
        +----------------+
                |
      subscribes|broadcasts
                |
     +----------+-----------+
     |                      |
     v                      v
+-----------+         +--------------+
| Alfred    |         | Telemetry    |
| ModeEngine|         | Service      |
| (state)   |         | (BatELK +    |
+-----------+         | jsonl + SSE) |
                      +--------------+
```

**Key:**
- GothamBus is the backbone.
- Alfred is the first “decision engine”.
- Telemetry is the first “observability service”.

---

## 3) Where the code lives (map of files)

### A) GothamBus + Contract (services/gotham-bus)
**Folder:** `services/gotham-bus/src`

- `events.ts`
  - Defines the **event schema** (types + payloads)
  - Defines **category/severity mapping**
  - Includes: modes, health events, alerts (future), command intents
- `bus.ts`
  - The bus implementation
  - Assigns **eventId**, **seq** (ordering), **requestId**, **traceId**, **category**, **severity**
  - Enforces guards (ex: `payload.intent` only allowed for `COMMAND.INTENT`)
- `dev.ts`
  - Optional local harness for running “bus + alfred” together

**Why this structure?**
- Keeping `events.ts` as the single “contract source” prevents drift across services.
- Keeping meta assignment inside the bus prevents producers from lying or being inconsistent.

---

### B) Alfred Mode Engine (services/alfred-mode-engine)
**File:** `services/alfred-mode-engine/src/alfred.ts`

- Subscribes to `MODE.SET_REQUESTED`
- Enforces:
  - validation
  - SAME_MODE rejection
  - allowed transitions (Phase 1 is permissive)
- Emits:
  - `MODE.SET_ACCEPTED`
  - `MODE.CHANGED`
  - or `MODE.SET_REJECTED`

**Why Alfred listens to MODE.SET_REQUESTED (not COMMAND.INTENT) in Phase 1?**
Because it keeps the pipeline explicit and testable:
- COMMAND intent is “what was asked”
- MODE.SET_REQUESTED is “what we are requesting the engine to decide”

Later we can insert a router between them, without changing Alfred.

---

### C) Telemetry Service + BatELK (services/telemetry)
**Folder:** `services/telemetry/src`

- `server.ts`
  - Runs Express
  - Creates bus
  - Starts Alfred (Phase 1: in-process)
  - Starts TelemetryService
  - Emits `SERVICE.READINESS` and recurring `SERVICE.HEARTBEAT`
  - Implements `/debug/mode/:mode` (E2E proof)
- `telemetry.ts`
  - Subscribes to bus
  - Writes to ring buffer + jsonl store
  - Broadcasts SSE
  - Ingests into BatElkStore
- `batElkStore.ts`
  - “mini-ELK in memory”
  - stores:
    - recent events buffer
    - recent errors buffer
    - trace index (traceId -> events)
    - health index (service -> last heartbeat/readiness)
  - computes service status: healthy / degraded / stale / offline
- `routes.ts`
  - HTTP endpoints: `/events`, `/trace/:id`, `/diagnostics`, `/health`, `/errors`, `/search`, `/traces`, `/events/stream`

**Why we built BatELK instead of “real ELK” right away?**
- Phase 1 goal: debug locally, fast.
- We can always ship these events to a real system later.
- The in-memory index gives 80% of the value (search/traces/errors/health) with 20% effort.

---

## 4) Phases completed (0 → 1.6) with “why”

### Phase 0 — Event foundation (DONE)
**Goal:** Create a reliable event system that cannot “lie”.

**What we implemented**
- Canonical envelope: `{ type, payload, meta }`
- Meta assigned in bus:
  - `eventId`, `seq`, `requestId`, `traceId`, `category`, `severity`, `ts`, `source`
- Deterministic ordering via `seq`

**Why this mattered**
- If events are inconsistent, every later phase becomes guesswork.
- `seq` gives deterministic UI ordering, stable trace timelines, and predictable diagnostics.

**Key files**
- `services/gotham-bus/src/events.ts`
- `services/gotham-bus/src/bus.ts`

---

### Phase 1 — Command pipeline (DONE)
**Goal:** Prove end-to-end mode change works and is traceable.

**What we implemented**
- New contract v2 command: `COMMAND.INTENT`
- Mode decision pipeline:
  - `COMMAND.INTENT` → `MODE.SET_REQUESTED` → (Alfred) → `MODE.SET_ACCEPTED` → `MODE.CHANGED`
- Debug endpoint to trigger the chain:
  - `POST /debug/mode/:MODE`

**Why this mattered**
- This is the “first vertical slice”.
- It proves the system can take a command and make a deterministic decision.
- It creates the baseline trace shape the UI will later display.

**Key files**
- `services/gotham-bus/src/events.ts` (COMMAND.INTENT)
- `services/alfred-mode-engine/src/alfred.ts`
- `services/telemetry/src/server.ts` (debug endpoint)

---

### Phase 1.5 — Health signals (DONE)
**Goal:** System should be able to answer: “Is it alive?”

**What we implemented**
- Health events:
  - `SERVICE.READINESS` (one-shot)
  - `SERVICE.HEARTBEAT` (interval)
- Telemetry emits its own readiness/heartbeats

**Why this mattered**
- Without health, the HUD can’t confidently show “systems online”.
- This becomes the backbone for future Alert Manager escalation.

**Key files**
- `services/gotham-bus/src/events.ts` (SERVICE.* payloads)
- `services/telemetry/src/server.ts` (emits readiness/heartbeat)
- `services/telemetry/src/batElkStore.ts` (ingests health)

---

### Phase 1.6 — BatELK + diagnostics (DONE)
**Goal:** Make troubleshooting fast and structured.

**What we implemented**
- BatELK indices:
  - `errors` ring, `recent` ring, `traces` index, `health` index
- Diagnostics:
  - `GET /trace/:id/diagnostics` returns warnings + facts
- Health status computation:
  - healthy / degraded / stale / offline using thresholds
  - thresholds are env-configurable
- Tiny fix: diagnostics “MODE_NO_CHANGE” only fires when **no reject** and **no changed**
  - SAME_MODE rejection is expected, so it should not generate MODE_NO_CHANGE

**Why this mattered**
- This is your “mini observability stack” for Phase 1.
- It gives you a runbook-style debug flow:
  1. get trace
  2. see warnings/facts
  3. search errors
  4. confirm health

**Key files**
- `services/telemetry/src/batElkStore.ts` (health status computation)
- `services/telemetry/src/routes.ts` (diagnostics, health endpoint)

---

## 5) Runbook — end-to-end test commands

### Start telemetry service
From repo root:
```bash
pnpm -w install
pnpm --filter @batcave/telemetry dev
```

### Check health + system trace
```bash
curl -sS "http://localhost:8790/health" | jq
curl -sS "http://localhost:8790/trace/trace_system_telemetry" | jq '.[].type'
```

### Trigger an end-to-end mode request
```bash
RESP=$(curl -sS -X POST "http://localhost:8790/debug/mode/NIGHT")
TRACE_ID=$(echo "$RESP" | jq -r '.traceId')
echo "traceId=$TRACE_ID"
curl -sS "http://localhost:8790/trace/$TRACE_ID" | jq '.[].type'
curl -sS "http://localhost:8790/trace/$TRACE_ID/diagnostics" | jq
```

### Troubleshoot “why did it reject?”
```bash
curl -sS "http://localhost:8790/trace/$TRACE_ID" | jq '.[] | {type, reasonCode:(.payload.reasonCode // null), reason:(.payload.reason // null)}'
```

---
 Phase 2 --- Alert Manager (DONE)

## Goal

Introduce explicit alarm lifecycle with deterministic TTL behavior.

## Why Alert Manager exists

Before Phase 2: - We had health - We had traces - We had diagnostics -
But no explicit "alert" system

Alert Manager introduces: - First-class alarm events - Server-owned TTL
logic - Deterministic lifecycle - UI remains dumb (render-only)

------------------------------------------------------------------------

## Architecture Addition

    GothamBus
        |
        v
    AlertManager (TTL + state)
        |
        v
    ALERT.RAISED / ALERT.CLEARED
        |
        v
    TelemetryService
        |
        v
    BatELK indices + jsonl

------------------------------------------------------------------------

## What we implemented

### 1. AlertManager module

File: `services/telemetry/src/alertManager.ts`

Responsibilities: - Maintain active alert map - Schedule TTL
expiration - Emit: - `ALERT.RAISED` - `ALERT.CLEARED` - Preserve traceId
via bus publish context

------------------------------------------------------------------------

### 2. Debug endpoint to raise alerts

    POST /debug/alert/:severity

Supported severities: - INFO - WARN - ERROR - CRITICAL

Optional body:

    {
      "ttlMs": 3000,
      "title": "Overheat",
      "message": "Temp spike",
      "traceId": "optional-custom-trace"
    }

------------------------------------------------------------------------

### 3. Query active alerts

    GET /alerts

Returns:

    {
      "ok": true,
      "alerts": [ ... ]
    }

------------------------------------------------------------------------

### 4. TTL Auto-Clear

When TTL expires: - Alert removed from memory - `ALERT.CLEARED`
emitted - No UI logic required

------------------------------------------------------------------------

## Runbook --- Verify Alert Manager

### Raise alert

    curl -sS -X POST http://localhost:8790/debug/alert/WARN   -H "Content-Type: application/json"   -d '{"ttlMs":5000,"title":"Test Warn","message":"hello"}' | jq

### Check active alerts

    curl -sS http://localhost:8790/alerts | jq

### Wait for TTL expiration

    sleep 6
    curl -sS http://localhost:8790/alerts | jq

### Verify trace linkage

    TRACE_ID=$(curl -sS -X POST http://localhost:8790/debug/alert/WARN   -H "Content-Type: application/json"   -d '{"ttlMs":5000}' | jq -r '.alert.traceId')

    curl -sS "http://localhost:8790/trace/$TRACE_ID" | jq

### Verify events feed

    curl -sS http://localhost:8790/events | jq '.[] | select(.type | test("^ALERT\."))'

### Verify jsonl persistence

    tail -n 100 local/logs/events.jsonl | grep "ALERT\."

------------------------------------------------------------------------

---
##  Roadmap: what’s next + where we stand
---

### Phase 2 — HUD wiring (after Alert Manager)
**Goal:** Show the system state visually (Batconsole UI).

**What we will build**
- Next.js UI consumes:
  - `/events` and/or `/events/stream`
  - `/health`
  - `/errors`
  - `/trace/:id`
- Home HUD elements (per your pinned spec):
  - mode dial
  - system status badges
  - threat gauge driven by alerts
  - live signal log with trace pinning

---

### Phase 3 — Device adapters
**Goal:** Real actuation (lights/plugs) behind clean adapters.

**What we will build**
- “device intent” events re-enabled
- fake adapters first (deterministic)
- real Govee adapter
- smart plug adapter
- all controlled via events

---

### Phase 4 — Voice loop
**Goal:** Alexa / voice intent ingestion into `COMMAND.INTENT`

---

### Phase 5 — Vision / gestures
**Goal:** iPad local vision → emits `GESTURE.*` / `PRESENCE.*` events (privacy-first)

---

### Phase 6 — Automation + schedules
**Goal:** rules engine (time/mode/presence) driving intents

---

### Phase 7 — Hardening + production
**Goal:** persistence, auth, rate limiting, deployment discipline, backups

---

## 7) Key design decisions (quick “why” list)

- **Bus assigns all meta**: prevents inconsistent producers; makes diagnostics trustworthy.
- **Monotonic seq**: stable ordering for UI + traces.
- **COMMAND.INTENT**: separates “ask” from “decision”; keeps extensibility.
- **MODE.SET_REQUESTED**: explicit handoff to decision engine.
- **BatELK**: fast local observability without external dependencies.
- **Health as events**: makes liveness visible and alertable.
- **Diagnostics endpoint**: converts raw events into actionable warnings.

---

## 8) Status recap

✅ Event contract v2  
✅ Bus stamping + guards  
✅ Alfred mode engine pipeline  
✅ Telemetry service + jsonl + SSE scaffold  
✅ BatELK indices: traces/errors/search/health  
✅ Health status computation (stale/offline)  
✅ Trace diagnostics warnings/facts  
✅ Next: Alert Manager (Phase 1.7)

---
