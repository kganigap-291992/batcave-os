"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { name: "Home", href: "/" },
  { name: "Debug", href: "/debug" },
  { name: "Adapters", href: "/adapters" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen bg-neutral-950 border-r border-neutral-800 text-white p-4">
      <div className="mb-6">
        <div className="text-lg font-semibold">🦇 Batconsole</div>
        <div className="text-xs text-neutral-400">Live Operations HUD</div>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "block rounded-md px-3 py-2 text-sm transition",
                active
                  ? "bg-blue-600 text-white"
                  : "text-neutral-300 hover:bg-neutral-900 hover:text-white",
              ].join(" ")}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
