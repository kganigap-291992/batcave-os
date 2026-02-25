"use client";

import ModeDial from "@/components/hud/ModeDial";
import SignalLog from "@/components/hud/SignalLog";
import StatusCards from "@/components/hud/StatusCards";
import { useMockTelemetry } from "@/lib/telemetry/useMockTelemetry";

export default function HomePage() {
  const { snap } = useMockTelemetry({ intervalMs: 900 });

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-neutral-400">Batcave OS</div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Live Operations HUD
          </h2>
          <div className="mt-1 text-xs text-neutral-500">
            Mode: <span className="text-neutral-200">{snap.mode}</span> • Theme:{" "}
            <span className="text-neutral-200">{snap.theme}</span>
          </div>
        </div>

        <div className="hidden sm:block text-right">
          <div className="text-xs text-neutral-500">System Time</div>
          <div className="text-sm text-neutral-200 tabular-nums">
            {new Date().toLocaleString()}
          </div>
        </div>
      </header>

      {/* HUD GRID */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left column */}
        <section className="col-span-12 lg:col-span-5">
          <div className="rounded-2xl border border-blue-500/20 bg-neutral-950/60 backdrop-blur p-4 shadow-[0_0_60px_rgba(0,0,0,0.6)] shadow-[inset_0_0_80px_rgba(0,140,255,0.05)]">
            <div className="flex items-center justify-between">
              <div className="text-sm text-neutral-300">Mode Dial</div>
              <div className="text-xs text-neutral-500">click to cycle (mock)</div>
            </div>
            <div className="mt-4">
              <ModeDial mode={snap.mode} theme={snap.theme} />
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-950/60 backdrop-blur p-4 shadow-[inset_0_0_80px_rgba(255,255,255,0.02)]">
            <div className="mb-3 text-sm text-neutral-300">System Status</div>
            <StatusCards health={snap.health} />
          </div>
        </section>

        {/* Right column */}
        <section className="col-span-12 lg:col-span-7">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 backdrop-blur p-4 shadow-[inset_0_0_80px_rgba(255,255,255,0.02)]">
            <div className="flex items-center justify-between">
              <div className="text-sm text-neutral-300">Signal Log</div>
              <div className="text-xs text-neutral-500">
                latest 200 • ordered by seq
              </div>
            </div>
            <div className="mt-3">
              <SignalLog signals={snap.signals} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}