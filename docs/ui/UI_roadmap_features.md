# 🦇 Batcave OS --- Batconsole UI

> Live Operations HUD --- Command Center Interface\
> Repo: `batcave-os`\
> App: `apps/batconsole-ui`\
> Last Updated: 2026-03-01

------------------------------------------------------------------------

# 🎯 UI Vision

The Batconsole UI is designed as a **cinematic command center** that
provides:

-   Immediate system awareness (10-second glance)
-   Real-time signal visibility
-   Alert-driven visual transformation (blue → red)
-   Adapter + smart home status summary
-   Drill-down observability for debugging

Home = High-Level Command Center\
Other Pages = Deep Diagnostics

------------------------------------------------------------------------

# 🏗 CURRENT IMPLEMENTED FEATURES (Phase 0)

## 1️⃣ Home HUD Layout

-   Mode Dial (derived from MODE.CHANGED events)
-   System Status cards (health summary)
-   Signal Log (last 200 events, ordered by seq)
-   Alert-based theme switching (base vs alert)

## 2️⃣ Signal Log v2

-   Compact rows
-   MODE.CARD rendering for mode transitions
-   Clickable rows → event detail modal
-   Auto-scroll
-   Pause when scrolled up
-   "Jump to Latest" button
-   Unread counter badge
-   Error/Warn/Info color coding

## 3️⃣ Telemetry Integration

Polling endpoints: - `/api/telemetry/events` - `/api/telemetry/health` -
`/api/telemetry/alerts`

UI remains resilient if backend temporarily fails.

------------------------------------------------------------------------

# 🚧 PHASED UI ROADMAP

------------------------------------------------------------------------

# 🟦 PHASE 1 --- Cinematic Frame + Navigation

## Goals

-   Sidebar auto-hide (hover to reveal)
-   Sticky top bar
-   Solid day + system time display
-   Clean spacing + panel hierarchy

## UI Additions

-   Hover-based sliding sidebar
-   Global system state badge (OK / WARN / DANGER)
-   Mode badge in header

No backend changes required.

------------------------------------------------------------------------

# 🟩 PHASE 2 --- Truthful Health + Adapter Summary

## Goals

Home must answer instantly: - What is alive? - What is degraded? - What
is offline?

## UI Additions

-   Real service health badges (no placeholders)
-   Adapter summary tiles:
    -   Alexa status
    -   Govee light state
    -   Smart Plug state
-   Global status strip (blue/amber/red)

## Backend Requirements

-   Complete `/health` service list
-   Adapter status events or endpoint

------------------------------------------------------------------------

# 🟨 PHASE 3 --- Pinned Trace + Drill Down

## Goals

Turn Home into a lightweight observability tool.

## UI Additions

-   Click log row → Pin traceId
-   Right-side Pinned Trace panel
-   Ordered timeline view
-   Quick links to:
    -   Logs
    -   Errors
    -   Traces

## Backend

-   `/trace/:id`
-   Optional `/search`
-   Optional `/errors`

------------------------------------------------------------------------

# 🟥 PHASE 4 --- Alert Manager + Red Takeover

## Goals

Critical alerts transform the entire HUD.

## UI Additions

-   Alert overlay banner
-   Threat gauge (0--3)
-   Red theme takeover
-   Mode Dial pulsing in DEFENSE
-   Alert drawer

## Danger Rule

Danger mode triggers when: - Mode = DEFENSE - OR active ALERT with
severity ERROR/CRITICAL

Backend owns TTL state.

------------------------------------------------------------------------

# 🟪 PHASE 5 --- Gesture + Presence + Nest

## Goals

Add smart environment awareness.

## UI Additions

-   Gesture toggle + status
-   Last gesture display
-   Presence detected chip
-   Nest thermostat summary
-   Camera online + last motion (no autoplay)
-   Tap-to-view camera

## Privacy Rule

Camera processing happens on-device (iPad).\
Only derived events are sent to Batcave OS.

------------------------------------------------------------------------

# 🟧 PHASE 6 --- Real-Time Streaming + Demo Mode

## Goals

Make the console feel alive.

## UI Additions

-   Optional SSE streaming (replace polling)
-   Scenario buttons (demo runner)
-   Auto-pin trace during demo
-   Alert simulation triggers

## Backend

-   `/events/stream` (SSE)
-   `DEMO_MODE` event publishers

------------------------------------------------------------------------

# 🧠 Design Principles

-   UI renders truth from backend signals only
-   Home page is high-level only
-   Deep debugging lives in dedicated pages
-   Red takeover must be unmissable
-   No fake "OK" states
-   Privacy-first architecture

------------------------------------------------------------------------

# 📌 Command Center Layout Summary

Top Bar: - System Time + Day - Mode - Global Status - Gotham Bus - Quick
status chips

Left: - Mode Dial (cinematic)

Center: - System Status / Adapter Summary

Right: - Threat Gauge / Pinned Trace

Bottom: - Signal Log (live)

------------------------------------------------------------------------

# 🚀 Long-Term Vision

A full cinematic command center where:

-   Mode changes drive environment
-   Alerts transform the interface
-   Presence triggers defense logic
-   Gesture controls interact with system
-   Smart devices report live state
-   Demo mode showcases full orchestration

------------------------------------------------------------------------

**End of UI Roadmap**
