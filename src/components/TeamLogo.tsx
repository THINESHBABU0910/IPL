"use client";

import { useState } from "react";
import Image from "next/image";
import { getTeamMapForLeague } from "@/data/leagueRegistry";
import type { LeagueId } from "@/lib/types";

interface TeamLogoProps {
  teamId: string;
  logoUrl: string;
  shortName: string;
  size?: number;
  className?: string;
  league?: LeagueId;
}

function altLogoUrl(url: string): string | null {
  if (url.endsWith(".png")) return url.replace(/\.png$/, ".svg");
  if (url.endsWith(".svg")) return url.replace(/\.svg$/, ".png");
  return null;
}

export default function TeamLogo({ teamId, logoUrl, shortName, size = 40, className = "", league = "ipl" }: TeamLogoProps) {
  const [src, setSrc] = useState(logoUrl);
  const [failed, setFailed] = useState(false);
  const team = getTeamMapForLeague(league)[teamId];

  if (failed || !src) {
    return (
      <div
        className={`rounded-full flex items-center justify-center font-black shrink-0 ${className}`}
        style={{
          width: size,
          height: size,
          backgroundColor: (team?.primaryColor || "#333") + "40",
          color: team?.primaryColor || "#fff",
          fontSize: size * 0.35,
        }}
      >
        {shortName.slice(0, 3)}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={`${shortName} logo`}
      width={size}
      height={size}
      className={`object-contain shrink-0 ${className}`}
      onError={() => {
        const alt = altLogoUrl(src);
        if (alt && alt !== src) setSrc(alt);
        else setFailed(true);
      }}
      unoptimized
    />
  );
}
