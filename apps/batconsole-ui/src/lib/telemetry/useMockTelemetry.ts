"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { makeInitialSnapshot, tickSnapshot, type TelemetrySnapshot } from "./mock";

export function useMockTelemetry(opts?: { intervalMs?: number }) {
  const intervalMs = opts?.intervalMs ?? 900;
  const [snap, setSnap] = useState<TelemetrySnapshot>(() => makeInitialSnapshot());
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    timerRef.current = window.setInterval(() => {
      setSnap((prev) => tickSnapshot(prev));
    }, intervalMs);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [intervalMs]);

  // keep html data-theme in sync
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", snap.theme);
  }, [snap.theme]);

  const lastSignal = useMemo(() => snap.signals[snap.signals.length - 1], [snap.signals]);

  return { snap, lastSignal };
}
