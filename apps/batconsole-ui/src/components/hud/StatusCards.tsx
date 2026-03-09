"use client";

type HealthBadge = {
  key: "BUS" | "TELEMETRY" | "ALFRED" | "ADAPTERS";
  status: "OK" | "WARN" | "DOWN";
  detail?: string;
};

function chip(status: HealthBadge["status"]) {
  if (status === "OK") {
    return "bg-emerald-500/10 text-emerald-200 border-emerald-500/30";
  }
  if (status === "WARN") {
    return "bg-amber-500/10 text-amber-200 border-amber-500/30";
  }
  return "bg-red-500/10 text-red-200 border-red-500/30";
}

export default function StatusCards({ health }: { health: HealthBadge[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {health.map((h) => (
        <div
          key={h.key}
          className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-3"
        >
          <div className="flex items-center justify-between">
            <div className="text-sm text-neutral-200">{h.key}</div>
            <div className={"text-[11px] px-2 py-1 rounded-full border " + chip(h.status)}>
              {h.status}
            </div>
          </div>

          <div className="mt-2 text-xs text-neutral-500 break-words">
            {h.detail ?? "—"}
          </div>
        </div>
      ))}
    </div>
  );
}