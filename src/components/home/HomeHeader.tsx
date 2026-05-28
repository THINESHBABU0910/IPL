"use client";

import Link from "next/link";
import type { LeagueConfig } from "@/lib/leagueTypes";
import { AuctionMode } from "@/lib/types";

interface HomeHeaderProps {
  productTab: "auction" | "drafts";
  leagueConfig: LeagueConfig;
  selectedMode?: AuctionMode;
}

export default function HomeHeader({ productTab, leagueConfig, selectedMode }: HomeHeaderProps) {
  const title =
    productTab === "drafts"
      ? "SNAKE DRAFT"
      : selectedMode === "legend"
        ? "LEGEND AUCTION"
        : `${leagueConfig.shortLabel} ${leagueConfig.seasonLabel} AUCTION`;

  const subtitle =
    productTab === "drafts"
      ? "Custom teams · Search & pick"
      : selectedMode === "legend"
        ? "IPL franchises · All-time legends"
        : leagueConfig.tagline;

  return (
    <header className="app-header justify-center relative shrink-0">
      <Link
        href="/ai"
        className="absolute left-3 text-[10px] font-semibold text-ipl-gold/90 hover:text-ipl-gold border border-ipl-gold/30 rounded-lg px-2 py-1"
      >
        AI Match Sim
      </Link>
      <Link
        href="/ai/points"
        className="absolute right-3 text-[10px] font-semibold text-green-400/90 hover:text-green-400 border border-green-500/30 rounded-lg px-2 py-1"
      >
        Points Table
      </Link>
      <div className="text-center home-hero px-[5.5rem]">
        <h1 className="text-xl font-black tracking-tight">
          <span className="bg-gradient-to-r from-ipl-gold via-yellow-300 to-ipl-gold bg-clip-text text-transparent animate-shimmer bg-[length:200%_100%]">
            {title}
          </span>
        </h1>
        <p className="text-[9px] text-gray-500 tracking-[0.2em] uppercase -mt-0.5">{subtitle}</p>
      </div>
    </header>
  );
}
