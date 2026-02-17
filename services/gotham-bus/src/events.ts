// services/gotham-bus/src/events.ts

export type Mode = "WORK" | "DEFENSE" | "NIGHT" | "DEMO" | "SILENT";

export type ModeRejectCode =
  | "VALIDATION_ERROR"
  | "ENGINE_OFFLINE"
  | "INVALID_TRANSITION"
  | "SAME_MODE";

export type Event =
  | {
      type: "MODE.SET_REQUESTED";
      ts: string; // ISO time
      source: string;
      requestId: string;
      mode: Mode;
    }
  | {
      type: "MODE.CHANGED";
      ts: string; // ISO time
      source: string;
      requestId: string;
      mode: Mode;
      prevMode: Mode | null;
    }
  | {
      type: "MODE.SET_REJECTED";
      ts: string; // ISO time
      source: string;
      requestId: string;
      requestedMode: Mode;
      reasonCode: ModeRejectCode;
      reason: string;
      currentMode: Mode | null;
    };
