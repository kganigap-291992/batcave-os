"use client";

import type { SignalEvent } from "@/lib/telemetry/mock";
import { useEffect, useMemo, useRef } from "react";

function levelStyles(level: SignalEvent["level"]) {
  if (level === "ERROR") return "text-red-300";
  if (level === "WARN") return "text-amber-300";
  return "text-neutral-200";
}

export default function SignalLog({ signals }: { signals: SignalEvent[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const rows = useMemo(() => {
    // already ordered, but ensure it
    return [...signals].sort((a, b) => a.seq - b.seq);
  }, [signals]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [rows.length]);

  return (
    <div
      ref={containerRef}
      className="h-[520px] overflow-auto rounded-xl border border-neutral-900 bg-black/30 p-3 font-mono text-xs"
    >
      {rows.map((e) => (
        <div
          key={e.seq}
          className="flex items-start gap-3 border-b border-neutral-900/60 py-2 last:border-b-0"
        >
          <div className="w-14 text-neutral-600 tabular-nums">#{e.seq}</div>
          <div className="w-44 text-neutral-600 tabular-nums">
            {new Date(e.ts).toLocaleTimeString()}
          </div>
          <div className="w-28 text-neutral-500">{e.traceId}</div>
          <div className={"w-16 " + levelStyles(e.level)}>{e.level}</div>
          <div className="w-40 text-neutral-300">{e.type}</div>
          <div className="flex-1 text-neutral-400">{e.msg}</div>
        </div>
      ))}
    </div>
  );
}
