export type Mode = "WORK" | "DEFENSE" | "NIGHT" | "DEMO" | "SILENT";

export type Event =
  | {
      type: "MODE.SET_REQUESTED";
      ts: string; // ISO time
      source: string;
      mode: Mode;
    }
  | {
      type: "MODE.CHANGED";
      ts: string; // ISO time
      source: string;
      mode: Mode;
      prevMode: Mode | null;
    };
