"use client";

import type { SignalEvent } from "@/lib/telemetry/mock";
import { useEffect, useMemo, useRef, useState } from "react";

function levelStyles(level: SignalEvent["level"]) {
  if (level === "ERROR") return "text-red-300";
  if (level === "WARN") return "text-amber-300";
  return "text-neutral-200";
}

function typeStyles(type: string) {
  if (type === "MODE.CARD") return "text-blue-200";
  if (type.startsWith("ALERT.")) return "text-amber-200";
  if (type.startsWith("SERVICE.")) return "text-neutral-300";
  return "text-neutral-300";
}

function Field({
  label,
  value,
  mono = true,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-12 gap-3 py-2 border-b border-neutral-900/60 last:border-b-0">
      <div className="col-span-3 text-xs text-neutral-500">{label}</div>
      <div className={"col-span-9 text-sm text-neutral-200 " + (mono ? "font-mono" : "")}>
        <div className="flex items-start gap-2">
          <div className="flex-1 whitespace-pre-wrap break-words">{value}</div>
          <button
            className="shrink-0 rounded-md border border-neutral-800 bg-neutral-950/60 px-2 py-1 text-[11px] text-neutral-300 hover:bg-neutral-900"
            onClick={() => navigator.clipboard.writeText(value)}
            type="button"
          >
            Copy
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SignalLog({ signals }: { signals: SignalEvent[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [selected, setSelected] = useState<SignalEvent | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [unread, setUnread] = useState(0);

  const rows = useMemo(() => {
    // already ordered, but ensure it
    return [...signals].sort((a, b) => a.seq - b.seq);
  }, [signals]);

  function scrollToBottom(smooth = true) {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  }

  function distanceFromBottom(el: HTMLDivElement) {
    return el.scrollHeight - el.scrollTop - el.clientHeight;
  }

  // Auto-scroll only if near bottom. If paused, accumulate unread.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const dist = distanceFromBottom(el);

    // If user is near bottom, keep it "live"
    if (dist < 40) {
      scrollToBottom(false);
      setIsPaused(false);
      setUnread(0);
      return;
    }

    // If user is not near bottom, we're paused; count unread
    setIsPaused(true);
    setUnread((n) => n + 1);
  }, [rows.length]);

  // Track scroll position: show button + paused badge when scrolled up
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onScroll() {
      const dist = distanceFromBottom(el);
      const pausedNow = dist > 80;

      setShowScrollButton(pausedNow);
      setIsPaused(pausedNow);

      // If user scrolls back close to bottom manually, clear unread
      if (!pausedNow) {
        setUnread(0);
      }
    }

    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Close modal on ESC
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSelected(null);
    }
    if (selected) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected]);

  const headerPill = useMemo(() => {
    if (!isPaused) return null;
    return (
      <div className="sticky top-2 z-10 flex justify-end">
        <div className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-950/80 px-3 py-1 text-[11px] text-neutral-200 backdrop-blur">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-300" />
          <span className="font-semibold tracking-wide">PAUSED</span>
          {unread > 0 && (
            <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-neutral-200 tabular-nums">
              +{unread}
            </span>
          )}
        </div>
      </div>
    );
  }, [isPaused, unread]);

  return (
    <>
      <div
        ref={containerRef}
        className="relative h-[520px] overflow-auto rounded-xl border border-neutral-900 bg-black/30 p-3 font-mono text-xs"
      >
        {headerPill}

        {rows.map((e) => {
          const isModeCard = e.type === "MODE.CARD";

          return (
            <button
              key={`${e.seq}-${e.traceId}`}
              type="button"
              onClick={() => setSelected(e)}
              className={[
                "w-full text-left",
                "flex items-center gap-3",
                "border-b border-neutral-900/60",
                "py-1.5 last:border-b-0",
                "hover:bg-white/5",
                "focus:outline-none focus:ring-1 focus:ring-blue-500/40",
                isModeCard ? "rounded-md bg-blue-500/5" : "",
              ].join(" ")}
            >
              <div className="w-14 text-neutral-600 tabular-nums">#{e.seq}</div>

              <div className="w-28 text-neutral-600 tabular-nums whitespace-nowrap">
                {new Date(e.ts).toLocaleTimeString()}
              </div>

              <div className="w-56 text-neutral-500 truncate whitespace-nowrap" title={e.traceId}>
                {e.traceId}
              </div>

              <div className={"w-16 whitespace-nowrap " + levelStyles(e.level)}>{e.level}</div>

              <div
                className={"w-36 truncate whitespace-nowrap " + typeStyles(e.type)}
                title={e.type}
              >
                {e.type}
              </div>

              <div
                className={[
                  "flex-1",
                  isModeCard
                    ? "text-neutral-200 whitespace-nowrap truncate"
                    : "text-neutral-400 break-words",
                ].join(" ")}
                title={e.msg}
              >
                {e.msg}
              </div>
            </button>
          );
        })}

        {/* Bottom scroller */}
        {showScrollButton && (
          <div className="sticky bottom-3 z-10 flex justify-end">
            <button
              onClick={() => {
                scrollToBottom(true);
                setUnread(0);
                setIsPaused(false);
              }}
              className="rounded-full border border-neutral-700 bg-neutral-900/90 px-3 py-1 text-xs text-neutral-200 shadow-lg hover:bg-neutral-800"
              type="button"
            >
              ↓ Latest{unread > 0 ? ` (+${unread})` : ""}
            </button>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* backdrop */}
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            onClick={() => setSelected(null)}
            aria-label="Close details"
          />

          {/* panel */}
          <div className="relative w-full sm:max-w-2xl mx-auto rounded-t-2xl sm:rounded-2xl border border-neutral-800 bg-neutral-950 shadow-[0_0_80px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-neutral-900">
              <div>
                <div className="text-sm text-neutral-200">
                  Signal #{selected.seq} <span className="text-neutral-500">•</span>{" "}
                  <span className={levelStyles(selected.level)}>{selected.level}</span>
                </div>
                <div className="text-xs text-neutral-500">
                  {new Date(selected.ts).toLocaleString()}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="rounded-md border border-neutral-800 bg-neutral-950/60 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-900"
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(selected, null, 2))}
                  type="button"
                >
                  Copy JSON
                </button>
                <button
                  className="rounded-md border border-neutral-800 bg-neutral-950/60 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-900"
                  onClick={() => setSelected(null)}
                  type="button"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="px-4 py-2">
              <Field label="traceId" value={selected.traceId} />
              <Field label="type" value={selected.type} />
              <Field label="message" value={selected.msg} mono={false} />
            </div>

            <div className="px-4 pb-4 text-[11px] text-neutral-500">
              Tip: press <span className="text-neutral-300">ESC</span> to close.
            </div>
          </div>
        </div>
      )}
    </>
  );
}