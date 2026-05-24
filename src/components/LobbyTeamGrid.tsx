"use client";

import { motion } from "framer-motion";
import { IPL_TEAMS } from "@/data/teams";
import TeamLogo from "./TeamLogo";
import { Socket } from "socket.io-client";

interface LobbyTeamGridProps {
  myTeamId: string | null;
  takenTeams: Set<string>;
  playerName?: string;
  socket: Socket;
  isSpectator: boolean;
}

export default function LobbyTeamGrid({
  myTeamId, takenTeams, playerName, socket, isSpectator,
}: LobbyTeamGridProps) {
  const myTeam = myTeamId ? IPL_TEAMS.find((t) => t.id === myTeamId) : null;

  return (
    <div className="ref-card shrink-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[#FFD700]">👥</span>
          <span className="text-sm font-bold text-[#FFD700]">Pick a Team</span>
        </div>
        {myTeam && (
          <span className="ref-pill ref-pill-gold text-[9px]">{myTeam.name}</span>
        )}
      </div>

      <div className="grid grid-cols-5 gap-2">
        {IPL_TEAMS.map((team) => {
          const taken = takenTeams.has(team.id);
          const isMine = team.id === myTeamId;

          return (
            <motion.button
              key={team.id}
              whileTap={!taken || isMine ? { scale: 0.92 } : {}}
              type="button"
              onClick={() => {
                if (!taken || isMine) socket.emit("pick-team", { teamId: team.id });
              }}
              disabled={taken && !isMine}
              className={`flex flex-col items-center gap-0.5 ${(taken && !isMine) ? "opacity-30" : ""}`}
            >
              <div className={`rounded-full p-0.5 ${isMine ? "ring-2 ring-[#F97316] ring-offset-1 ring-offset-[#1A1A1A]" : ""}`}>
                <TeamLogo teamId={team.id} logoUrl={team.logoUrl} shortName={team.shortName} size={36} />
              </div>
              {isMine && playerName && (
                <span className="text-[8px] text-gray-500 truncate max-w-full">{playerName}</span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
