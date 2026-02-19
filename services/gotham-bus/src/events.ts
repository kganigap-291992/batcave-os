// services/gotham-bus/src/events.ts

export type Mode = "WORK" | "DEFENSE" | "NIGHT" | "DEMO" | "SILENT";

export type ModeRejectCode =
  | "VALIDATION_ERROR"
  | "ENGINE_OFFLINE"
  | "INVALID_TRANSITION"
  | "SAME_MODE";

// ===== Canonical Envelope (v1) =====

export type EventSchema = "batcave.event.v1";

export type EventMeta = {
  schema: EventSchema;
  eventId: string;    // evt_xxx
  requestId: string;  // req_xxx
  source: string;
  ts: string;         // ISO
};

export type Envelope<TType extends string, TPayload> = {
  type: TType;
  payload: TPayload;
  meta: EventMeta;
};

// ===== Mode Payloads =====

export type ModeSetRequestedPayload = {
  mode: Mode;
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

// ===== Mode Events =====

export type ModeSetRequestedEvent =
  Envelope<"MODE.SET_REQUESTED", ModeSetRequestedPayload>;

export type ModeChangedEvent =
  Envelope<"MODE.CHANGED", ModeChangedPayload>;

export type ModeSetRejectedEvent =
  Envelope<"MODE.SET_REJECTED", ModeSetRejectedPayload>;

// ===== Intents =====

export type IntentName =
  | "MODE.SET"
  | "LIGHT.SET"
  | "PLUG.SET";

export type IntentPayloadMap = {
  "MODE.SET": { mode: Mode };
  "LIGHT.SET": { scene?: Mode; color?: string; brightness?: number };
  "PLUG.SET": { on: boolean };
};

export type IntentEvent<T extends IntentName = IntentName> =
  Envelope<"INTENT", IntentPayloadMap[T]> & { intent: T };

// ===== Final Event Union =====

export type Event =
  | ModeSetRequestedEvent
  | ModeChangedEvent
  | ModeSetRejectedEvent
  | IntentEvent;
