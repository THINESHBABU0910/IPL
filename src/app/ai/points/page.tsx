"use client";

import Link from "next/link";
import PointsTablePanel from "@/components/ai/PointsTablePanel";

export default function PointsTablePage() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link href="/" className="text-xs text-gray-400 hover:text-ipl-gold shrink-0">
          ← Home
        </Link>
        <div className="text-center flex-1 px-2 min-w-0">
          <h1 className="text-sm font-black tracking-tight">
            <span className="bg-gradient-to-r from-ipl-gold via-yellow-300 to-ipl-gold bg-clip-text text-transparent">
              Points Table
            </span>
          </h1>
          <p className="text-[9px] text-gray-500 tracking-wider uppercase">NRR from scorecards</p>
        </div>
        <Link href="/ai" className="text-xs text-ipl-gold shrink-0">
          Match Sim
        </Link>
      </header>

      <main className="app-main overflow-y-auto px-3 py-3">
        <PointsTablePanel />
      </main>
    </div>
  );
}
