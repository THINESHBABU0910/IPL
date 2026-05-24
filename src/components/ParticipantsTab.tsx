"use client";

import { RoomState } from "@/lib/types";
import TeamLogo from "./TeamLogo";
import { TEAM_MAP } from "@/data/teams";

interface ParticipantsTabProps {
  roomState: RoomState;
  myTeamId: string | null;
  playerName?: string;
  isHost?: boolean;
}

export default function ParticipantsTab({ roomState, myTeamId, playerName, isHost }: ParticipantsTabProps) {
  const participants = roomState.participants.length > 0
    ? roomState.participants
    : Object.values(roomState.teams).map((t) => ({
        socketId: t.ownerId,
        playerName: t.ownerName,
        teamId: t.id,
        isSpectator: false,
        isHost: t.ownerId === roomState.hostSocketId,
        isOnline: t.isOnline !== false,
      }));

  return (
    <div className="panel-fill px-2 pb-1 min-h-0">
      <div className="scroll-panel space-y-2">
        {participants.map((p) => {
          const team = p.teamId ? roomState.teams[p.teamId] : null;
          const teamDef = p.teamId ? TEAM_MAP[p.teamId] : null;
          const isMe = p.playerName === playerName || p.teamId === myTeamId;

          return (
            <div key={p.socketId + p.playerName} className="ref-card flex items-center gap-3">
              {team ? (
                <TeamLogo teamId={team.id} logoUrl={team.logoUrl} shortName={team.shortName} size={36} />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#2A2A2A] flex items-center justify-center text-gray-500 text-xs">?</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-sm text-white truncate">{p.playerName}</span>
                  {isMe && <span className="ref-pill ref-pill-gold text-[8px]">YOU</span>}
                  {p.isHost && <span className="text-[10px]">👑</span>}
                  {p.isSpectator && <span className="ref-pill ref-pill-purple text-[8px]">SPEC</span>}
                </div>
                <div className="text-[10px] text-gray-400">
                  {teamDef ? teamDef.name : p.isSpectator ? "Spectator" : "No team"}
                </div>
              </div>
              <span className={`w-2 h-2 rounded-full shrink-0 ${p.isOnline ? "bg-green-400" : "bg-gray-600"}`} />
            </div>
          );
        })}

        {participants.length === 0 && (
          <p className="text-center text-gray-500 text-sm py-8">No players in room yet</p>
        )}
      </div>
    </div>
  );
}
