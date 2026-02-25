// services/gotham-bus/src/events.ts

// =====================
// Domain Types
// =====================

export type Mode = "WORK" | "DEFENSE" | "NIGHT" | "DEMO" | "SILENT";

export type ModeRejectCode =
  | "VALIDATION_ERROR"
  | "ENGINE_OFFLINE"
  | "INVALID_TRANSITION"
  | "SAME_MODE";

// =====================
// Canonical Envelope (v1)
// =====================

export type EventSchema = "batcave.event.v1";

export type EventCategory = "intent" | "decision" | "device" | "vision" | "system";
export type EventSeverity = "debug" | "info" | "warn" | "error";

export type EventMeta = {
  schema: EventSchema;

  eventId: string; // evt_xxx
  seq: number; // monotonic per-process sequence (bus-assigned)

  traceId: string; // trace_xxx (or reuse requestId)
  requestId: string; // req_xxx

  category: EventCategory;
  severity: EventSeverity;

  source: string;
  ts: string; // ISO-8601
};

export type Envelope<TType extends string, TPayload> = {
  type: TType;
  payload: TPayload;
  meta: EventMeta;
};

// =====================
// Mode Payloads
// =====================

export type ModeSetRequestedPayload = {
  mode: Mode;
};

export type ModeSetAcceptedPayload = {
  requestedMode: Mode;
  currentMode: Mode | null;
};

export type ModeChangedPayload = {
  mode: Mode;
  prevMode: Mode | null;
};

export type ModeSetRejectedPayload = {
  requestedMode: Mode;
  reasonCode: ModeRejectCode;
  reason: string;
  currentMode: Mode | null;
};

// =====================
// Mode Events
// =====================

export type ModeSetRequestedEvent = Envelope<"MODE.SET_REQUESTED", ModeSetRequestedPayload>;

export type ModeSetAcceptedEvent = Envelope<"MODE.SET_ACCEPTED", ModeSetAcceptedPayload>;

export type ModeSetRejectedEvent = Envelope<"MODE.SET_REJECTED", ModeSetRejectedPayload>;

export type ModeChangedEvent = Envelope<"MODE.CHANGED", ModeChangedPayload>;

// =====================
// Service Events (Health)
// =====================

export type ServiceReadinessPayload = {
  service: string;
  ready: boolean;
  reason?: string;
};

export type ServiceHeartbeatPayload = {
  service: string;
};

export type ServiceReadinessEvent = Envelope<"SERVICE.READINESS", ServiceReadinessPayload>;

export type ServiceHeartbeatEvent = Envelope<"SERVICE.HEARTBEAT", ServiceHeartbeatPayload>;

// =====================
// Alert Events (Operational overlay)
// =====================

export type AlertSeverity = "warn" | "error";

export type AlertRaisedPayload = {
  alertId: string; // stable key so UI can dedupe/update
  title: string;
  severity: AlertSeverity;
  ttlMs: number;

  // Optional context for debugging + attribution
  sourceEventType?: string;
  details?: unknown;
};

export type AlertClearedPayload = {
  alertId: string;
  reason?: string;
};

export type AlertRaisedEvent = Envelope<"ALERT.RAISED", AlertRaisedPayload>;

export type AlertClearedEvent = Envelope<"ALERT.CLEARED", AlertClearedPayload>;

// =====================
// Intents (Commands)
// =====================

export type IntentName = "MODE.SET" | "LIGHT.SET" | "PLUG.SET";

export type IntentPayloadMap = {
  "MODE.SET": { mode: Mode };
  "LIGHT.SET": { scene?: Mode; color?: string; brightness?: number };
  "PLUG.SET": { on: boolean };
};

/**
 * Command intent payload includes the intent name + its specific payload.
 * We keep intent INSIDE payload (your decision).
 *
 * Shape:
 * { type: "COMMAND.INTENT", payload: { intent: "MODE.SET", mode: "NIGHT" }, meta: ... }
 */
export type CommandIntentEvent<T extends IntentName = IntentName> = Envelope<
  "COMMAND.INTENT",
  { intent: T } & IntentPayloadMap[T]
>;

// =====================
// Final Event Union
// =====================

export type Event =
  | ModeSetRequestedEvent
  | ModeSetAcceptedEvent
  | ModeSetRejectedEvent
  | ModeChangedEvent
  | ServiceReadinessEvent
  | ServiceHeartbeatEvent
  | AlertRaisedEvent
  | AlertClearedEvent
  | CommandIntentEvent;

// =====================
// Category + Severity Mapping (single source of truth)
// =====================

export function categoryForType(type: Event["type"] | string): EventCategory {
  // Commands
  if (type === "COMMAND.INTENT") return "intent";

  // Decisions
  if (type.startsWith("MODE.")) return "decision";

  // Device actuation
  if (type.startsWith("LIGHT.") || type.startsWith("PLUG.") || type.startsWith("ADAPTER."))
    return "device";

  // Vision / perception
  if (type.startsWith("VISION.")) return "vision";

  // System / ops (health, alerts, telemetry facts)
  if (type.startsWith("SERVICE.")) return "system";
  if (type.startsWith("ALERT.")) return "system";
  if (type.startsWith("SYSTEM.")) return "system";

  // Default safe bucket
  return "system";
}

export function severityForType(type: Event["type"] | string): EventSeverity {
  // Rejections and failures are errors by default
  if (type.endsWith("_REJECTED")) return "error";
  if (type.endsWith("_FAILED")) return "error";
  if (type.includes(".ERROR")) return "error";

  // Alerts are warnings by default (AlertManager may override by passing meta.severity)
  if (type === "ALERT.RAISED") return "warn";

  return "info";
}