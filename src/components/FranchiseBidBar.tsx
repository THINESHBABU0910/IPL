"use client";

import { RoomState } from "@/lib/types";
import { IPL_TEAMS } from "@/data/teams";
import TeamLogo from "./TeamLogo";

interface FranchiseBidBarProps {
  roomState: RoomState;
  currentBidder: string | null;
  myTeamId: string | null;
  compact?: boolean;
}

export default function FranchiseBidBar({ roomState, currentBidder, myTeamId, compact = true }: FranchiseBidBarProps) {
  return (
    <div className={`w-full shrink-0 ${compact ? "mt-2" : "mt-6 max-w-4xl"}`}>
      <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-thin">
        {IPL_TEAMS.map((def) => {
          const team = roomState.teams[def.id];
          const inRoom = !!team;
          const isBidding = currentBidder === def.id;
          const isMe = myTeamId === def.id;
          const size = compact ? 22 : 32;

          return (
            <div
              key={def.id}
              className={`relative shrink-0 flex flex-col items-center p-1 rounded border transition-all ${
                !inRoom ? "opacity-25 border-transparent"
                  : isBidding ? "border-ipl-gold bg-ipl-gold/15"
                  : "border-ipl-border/30 bg-ipl-dark/40"
              } ${isMe ? "ring-1 ring-white/20" : ""}`}
            >
              {inRoom ? (
                <TeamLogo teamId={def.id} logoUrl={team.logoUrl} shortName={def.shortName} size={size} />
              ) : (
                <div className="w-[22px] h-[22px] rounded-full bg-gray-800 flex items-center justify-center text-[8px] text-gray-600">{def.shortName.slice(0, 2)}</div>
              )}
              {isBidding && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-ipl-gold animate-pulse" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
