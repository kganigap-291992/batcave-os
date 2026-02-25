"use client";

import Sidebar from "./Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-transparent text-white relative z-10">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">
        <div className="min-h-full rounded-3xl border border-neutral-700/70 bg-neutral-950/50 backdrop-blur-xl p-6 shadow-[0_0_80px_rgba(0,0,0,0.8)]">
          {children}
        </div>
      </main>
    </div>
  );
}