"use client";

import type { BatMode } from "@/lib/telemetry/mock";
import { useMemo, useState } from "react";

export default function ModeDial({
  mode,
  theme,
}: {
  mode: BatMode;
  theme: "base" | "alert";
}) {
  const [localMode, setLocalMode] = useState<BatMode>(mode);

  // allow click-to-cycle in mock mode; UI still displays snap.mode in header
  const displayMode = localMode;

  const ringClass = useMemo(() => {
    return theme === "alert"
      ? "shadow-[0_0_40px_rgba(255,0,0,0.25)]"
      : "shadow-[0_0_40px_rgba(0,140,255,0.18)]";
  }, [theme]);

  const modes: BatMode[] = ["WORK", "DEFENSE", "NIGHT", "DEMO"];

  function cycle() {
    const idx = modes.indexOf(localMode);
    setLocalMode(modes[(idx + 1) % modes.length]);
  }

  return (
    <button
      onClick={cycle}
      className={[
        "w-full rounded-2xl border border-neutral-800 bg-neutral-950/40 p-6 text-left transition",
        "hover:border-neutral-700",
      ].join(" ")}
    >
      <div className="flex items-center gap-6">
        <div
          className={[
            "relative grid place-items-center",
            "h-44 w-44 rounded-full border border-neutral-800 bg-neutral-950",
            ringClass,
          ].join(" ")}
        >
          <div className="absolute inset-2 rounded-full border border-neutral-800/70" />
          <div className="absolute inset-6 rounded-full border border-neutral-800/50" />

          {/* “Arc” accent */}
          <div
            className={[
              "absolute inset-0 rounded-full",
              theme === "alert"
                ? "ring-2 ring-red-600/60"
                : "ring-2 ring-blue-500/50",
              theme === "alert" ? "animate-pulse" : "",
            ].join(" ")}
          />

          <div className="text-center">
            <div className="text-xs text-neutral-500">CURRENT MODE</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight">
              {displayMode}
            </div>
          </div>
        </div>

        <div className="flex-1">
          <div className="text-sm text-neutral-300">Operational Profile</div>
          <div className="mt-2 text-xs text-neutral-500 leading-relaxed">
            {displayMode === "WORK" &&
              "Focus mode. Stable lighting. Minimal distractions. Everything logged."}
            {displayMode === "DEFENSE" &&
              "Alert posture. Visual emphasis, faster polling, and elevated diagnostics."}
            {displayMode === "NIGHT" &&
              "Low noise. Dim visuals. Quiet telemetry with only critical alerts."}
            {displayMode === "DEMO" &&
              "Scripted cinematic mode. Safe sandbox. Repeatable showcase flows."}
          </div>

          <div className="mt-4 text-xs text-neutral-500">
            Tip: In Phase 3, alerts will drive the theme + mode automatically.
          </div>
        </div>
      </div>
    </button>
  );
}
