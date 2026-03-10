export default function DebugPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-neutral-400">Batcave OS</div>
        <h1 className="text-2xl font-semibold tracking-tight">Debug Console</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Deep-dive observability for events, traces, errors, and health.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
          <h2 className="text-sm text-neutral-300">System Health</h2>
          <p className="mt-2 text-sm text-neutral-500">Telemetry health and service freshness will appear here.</p>
        </section>

        <section className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
          <h2 className="text-sm text-neutral-300">Errors</h2>
          <p className="mt-2 text-sm text-neutral-500">Warn and error events will appear here.</p>
        </section>

        <section className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
          <h2 className="text-sm text-neutral-300">Traces</h2>
          <p className="mt-2 text-sm text-neutral-500">Trace summaries and investigation tools will appear here.</p>
        </section>

        <section className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
          <h2 className="text-sm text-neutral-300">Event Stream</h2>
          <p className="mt-2 text-sm text-neutral-500">Full telemetry firehose, including heartbeat noise, will appear here.</p>
        </section>
      </div>
    </div>
  );
}