"use client";

import { TeamState } from "@/lib/types";
import { formatPrice, MAX_SQUAD_SIZE, MAX_OVERSEAS } from "@/lib/constants";
import TeamLogo from "./TeamLogo";

interface TeamDashboardProps {
  teams: Record<string, TeamState>;
  myTeamId: string | null;
  currentBidder: string | null;
}

export default function TeamDashboard({ teams, myTeamId, currentBidder }: TeamDashboardProps) {
  const sortedTeams = Object.entries(teams).sort(([a], [b]) => {
    if (a === myTeamId) return -1;
    if (b === myTeamId) return 1;
    return 0;
  });

  return (
    <div>
      <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold">
        All Teams ({Object.keys(teams).length})
      </h3>
      <div className="space-y-2">
        {sortedTeams.map(([id, team]) => {
          const totalPlayers = team.squad.length + team.retainedPlayers.length;
          const overseasCount = [...team.squad, ...team.retainedPlayers].filter((p) => p.isOverseas).length;
          const isBidding = currentBidder === id;
          const isMe = id === myTeamId;

          return (
            <div
              key={id}
              className={`p-2.5 rounded-lg border transition ${
                isBidding ? "border-ipl-gold bg-ipl-gold/10"
                  : isMe ? "border-ipl-purple bg-ipl-purple/10"
                  : "border-ipl-border/50 bg-ipl-dark/30"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <TeamLogo teamId={team.id} logoUrl={team.logoUrl} shortName={team.shortName} size={24} />
                  <span className="font-bold text-sm" style={{ color: team.primaryColor }}>{team.shortName}</span>
                  {team.isOnline === false && !team.isBot && (
                    <span className="w-2 h-2 rounded-full bg-gray-500" title="Offline" />
                  )}
                  {(team.isOnline !== false || team.isBot) && (
                    <span className="w-2 h-2 rounded-full bg-green-500" title="Online" />
                  )}
                  {isBidding && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-ipl-gold/20 text-ipl-gold font-bold animate-pulse">BIDDING</span>
                  )}
                </div>
                <span className="text-sm font-bold text-ipl-gold">{formatPrice(team.purse)}</span>
              </div>
              <div className="flex gap-3 text-[11px] text-gray-400">
                <span>Players: {totalPlayers}/{MAX_SQUAD_SIZE}</span>
                <span>OS: {overseasCount}/{MAX_OVERSEAS}</span>
                {team.rtmCards > 0 && <span className="text-purple-400">RTM: {team.rtmCards}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
