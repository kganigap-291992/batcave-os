export default function DebugPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Debug Console</h1>

      <div className="rounded-xl border border-neutral-800 p-4">
        <h2 className="text-sm text-neutral-400">System Health</h2>
      </div>

      <div className="rounded-xl border border-neutral-800 p-4">
        <h2 className="text-sm text-neutral-400">Errors</h2>
      </div>

      <div className="rounded-xl border border-neutral-800 p-4">
        <h2 className="text-sm text-neutral-400">Traces</h2>
      </div>

      <div className="rounded-xl border border-neutral-800 p-4">
        <h2 className="text-sm text-neutral-400">Event Stream</h2>
      </div>
    </div>
  );
}