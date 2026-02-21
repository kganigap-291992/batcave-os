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

  eventId: string;    // evt_xxx
  seq: number;        // monotonic per-process sequence (bus-assigned)
  
  traceId: string;    // trace_xxx (or reuse requestId)
  requestId: string;  // req_xxx

  category: EventCategory;
  severity: EventSeverity;

  source: string;
  ts: string;         // ISO-8601
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

export type ModeSetRequestedEvent =
  Envelope<"MODE.SET_REQUESTED", ModeSetRequestedPayload>;

export type ModeSetAcceptedEvent =
  Envelope<"MODE.SET_ACCEPTED", ModeSetAcceptedPayload>;

export type ModeSetRejectedEvent =
  Envelope<"MODE.SET_REJECTED", ModeSetRejectedPayload>;

export type ModeChangedEvent =
  Envelope<"MODE.CHANGED", ModeChangedPayload>;

// =====================
// Intents
// =====================

export type IntentName =
  | "MODE.SET"
  | "LIGHT.SET"
  | "PLUG.SET";

export type IntentPayloadMap = {
  "MODE.SET": { mode: Mode };
  "LIGHT.SET": { scene?: Mode; color?: string; brightness?: number };
  "PLUG.SET": { on: boolean };
};

/**
 * IntentEvent payload includes the intent name + its specific payload.
 * This keeps the event shape consistent:
 * { type, payload, meta } with no extra top-level fields.
 */
export type IntentEvent<T extends IntentName = IntentName> =
  Envelope<"INTENT", { intent: T } & IntentPayloadMap[T]>;

// =====================
// Final Event Union
// =====================

export type Event =
  | ModeSetRequestedEvent
  | ModeSetAcceptedEvent
  | ModeSetRejectedEvent
  | ModeChangedEvent
  | IntentEvent;

// =====================
// Category + Severity Mapping (single source of truth)
// =====================

export function categoryForType(type: Event["type"] | string): EventCategory {
  // NOTE: We currently represent intents as type === "INTENT"
  if (type === "INTENT") return "intent";

  if (type.startsWith("MODE.")) return "decision";
  if (type.startsWith("LIGHT.") || type.startsWith("PLUG.") || type.startsWith("ADAPTER."))
    return "device";
  if (type.startsWith("VISION.")) return "vision";
  if (type.startsWith("SYSTEM.")) return "system";

  // Default safe bucket
  return "system";
}

export function severityForType(type: Event["type"] | string): EventSeverity {
  // Rejections and failures are errors by default
  if (type.endsWith("_REJECTED")) return "error";
  if (type.endsWith("_FAILED")) return "error";
  if (type.includes(".ERROR")) return "error";

  return "info";
}