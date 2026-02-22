import type { Request, Response } from "express";
import type { TelemetryService } from "./telemetry";
import type { Event } from "@batcave/gotham-bus";

type TraceWarning = {
  code: string;
  msg: string;
  meta?: Record<string, unknown>;
};

function isErrorEvent(e: Event) {
  const level = (e.meta as any)?.level;
  return (
    level === "error" ||
    Boolean((e.meta as any)?.error) ||
    (typeof e.type === "string" && e.type.endsWith(".ERROR"))
  );
}

function safeParseMs(ts?: string) {
  if (!ts) return null;
  const ms = Date.parse(ts);
  return Number.isFinite(ms) ? ms : null;
}

function computeTraceDiagnostics(traceId: string, events: Event[]) {
  const warnings: TraceWarning[] = [];

  if (!events || events.length === 0) {
    warnings.push({
      code: "TRACE_NOT_FOUND",
      msg: `No events found for traceId="${traceId}".`,
    });

    return {
      warnings,
      facts: {
        eventCount: 0,
        durationMs: null,
        types: [],
        firstSeq: null,
        lastSeq: null,
        hasErrors: false,
        modeSetToChangedMs: null,
      },
    };
  }

  const types = events.map((e) => e.type);
  const typeSet = Array.from(new Set(types));

  const hasRequested = types.includes("MODE.SET_REQUESTED");
  const hasChanged = types.includes("MODE.CHANGED");

  // duration (first -> last)
  const startMs = safeParseMs(events[0]?.meta?.ts);
  const endMs = safeParseMs(events[events.length - 1]?.meta?.ts);
  const durationMs =
    startMs !== null && endMs !== null ? endMs - startMs : null;

  // MODE latency: MODE.SET_REQUESTED -> MODE.CHANGED
  const requestedEvt = events.find((e) => e.type === "MODE.SET_REQUESTED");
  const changedEvt = events.find((e) => e.type === "MODE.CHANGED");
  const reqMs = safeParseMs(requestedEvt?.meta?.ts);
  const chgMs = safeParseMs(changedEvt?.meta?.ts);
  const modeSetToChangedMs =
    reqMs !== null && chgMs !== null ? chgMs - reqMs : null;

  // MODE_SLOW: mode transition took too long (threshold is Phase 1 conservative)
  const MODE_SLOW_THRESHOLD_MS = 1500;

  if (modeSetToChangedMs !== null && modeSetToChangedMs > MODE_SLOW_THRESHOLD_MS) {
    warnings.push({
      code: "MODE_SLOW",
      msg: `Mode transition latency is high: ${modeSetToChangedMs}ms (> ${MODE_SLOW_THRESHOLD_MS}ms).`,
      meta: { modeSetToChangedMs, thresholdMs: MODE_SLOW_THRESHOLD_MS },
    });
  }

  // ERROR_PRESENT
  const errorCount = events.filter(isErrorEvent).length;
  if (errorCount > 0) {
    warnings.push({
      code: "ERROR_PRESENT",
      msg: `Trace contains ${errorCount} error-like event(s).`,
      meta: { errorCount },
    });
  }

  // MODE_NO_CHANGE
  if (hasRequested && !hasChanged) {
    warnings.push({
      code: "MODE_NO_CHANGE",
      msg: "MODE.SET_REQUESTED seen but no MODE.CHANGED followed.",
    });
  }

  // MODE_FLAP: >1 MODE.CHANGED in <= 2000ms
  const modeChanged = events.filter((e) => e.type === "MODE.CHANGED");
  if (modeChanged.length > 1) {
    const t0 = safeParseMs(modeChanged[0].meta.ts);
    const tN = safeParseMs(modeChanged[modeChanged.length - 1].meta.ts);
    if (t0 !== null && tN !== null && tN - t0 <= 2000) {
      warnings.push({
        code: "MODE_FLAP",
        msg: `Multiple MODE.CHANGED events (${modeChanged.length}) occurred within ${tN - t0}ms.`,
        meta: { count: modeChanged.length, windowMs: tN - t0 },
      });
    }
  }

  // INTENT_UNROUTED: INTENT exists but no follow-up command/decision events
  const hasIntent = types.includes("INTENT");
  const hasFollowup =
    hasRequested ||
    types.includes("MODE.SET_ACCEPTED") ||
    types.includes("MODE.SET_REJECTED") ||
    hasChanged;

  if (hasIntent && !hasFollowup) {
    warnings.push({
      code: "INTENT_UNROUTED",
      msg: "INTENT seen but no downstream command/decision events followed (router/engine may not be listening).",
    });
  }

  const facts = {
    eventCount: events.length,
    durationMs,
    modeSetToChangedMs,
    types: typeSet,
    firstSeq: events[0]?.meta?.seq ?? null,
    lastSeq: events[events.length - 1]?.meta?.seq ?? null,
    hasErrors: errorCount > 0,
  };

  return { warnings, facts };
}

export function registerRoutes(app: any, telemetry: TelemetryService) {
  // --- Existing: recent events ---
  app.get("/events", (req: Request, res: Response) => {
    const limit = Number(req.query.limit ?? 200);
    res.json(telemetry.getEvents(isFinite(limit) ? limit : 200));
  });

  // --- Trace (now powered by BatELK store) ---
  app.get("/trace/:traceId", (req: Request, res: Response) => {
    res.json(telemetry.getTrace(req.params.traceId));
  });

  // ✅ Trace diagnostics (warnings + facts)
  app.get("/trace/:traceId/diagnostics", (req: Request, res: Response) => {
    const traceId = req.params.traceId;
    const events = telemetry.getTrace(traceId);
    const diag = computeTraceDiagnostics(traceId, events);
    res.json({ traceId, ...diag });
  });

  // --- SSE stream ---
  app.get("/events/stream", (req: Request, res: Response) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write("\n");
    telemetry.sse.add(res);
  });

  // =============================
  // 🦇 BatELK endpoints
  // =============================

  // Recent errors
  app.get("/errors", (_req: Request, res: Response) => {
    res.json({
      count: telemetry.batElk.errors.size(),
      items: telemetry.batElk.errors.values(),
    });
  });

  // List recent trace IDs
  app.get("/traces", (req: Request, res: Response) => {
    const limit = Number(req.query.limit ?? 50);
    res.json({
      items: telemetry.batElk.listRecentTraceIds(isFinite(limit) ? limit : 50),
    });
  });

  // Search recent events (simple substring match)
  app.get("/search", (req: Request, res: Response) => {
    const q = String(req.query.q ?? "").trim();
    if (!q) return res.json({ q: "", items: [] });

    const limit = Number(req.query.limit ?? 200);

    res.json({
      q,
      items: telemetry.batElk.search(q, isFinite(limit) ? limit : 200),
    });
  });

  // Computed health snapshot
  app.get("/health", (_req: Request, res: Response) => {
    const services = Array.from(telemetry.batElk.health.values());

    res.json({
      ok: true,
      counts: {
        recentEvents: telemetry.batElk.recent.size(),
        recentErrors: telemetry.batElk.errors.size(),
        traceCount: telemetry.batElk.traces.size,
      },
      services,
    });
  });
}