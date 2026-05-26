"use client";

import { RoomState } from "@/lib/types";
import TeamLogo from "./TeamLogo";
import { getTeamMapForLeague } from "@/data/leagueRegistry";
import { Socket } from "socket.io-client";

interface ParticipantsTabProps {
  roomState: RoomState;
  myTeamId: string | null;
  playerName?: string;
  isHost?: boolean;
  variant?: "full" | "admin";
  socket?: Socket;
}

export default function ParticipantsTab({
  roomState, myTeamId, playerName, isHost, variant = "full", socket,
}: ParticipantsTabProps) {
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

  const onlineCount = participants.filter((p) => p.isOnline).length;

  function handleKick(teamId: string) {
    if (!socket || !isHost) return;
    socket.emit("host-action", { action: "kick", targetTeamId: teamId });
  }

  return (
    <div className="panel-fill px-2 pb-1 min-h-0">
      <div className="shrink-0 mb-2 px-1">
        <div className="text-xs text-gray-400">
          {participants.length} in room · <span className="text-green-400">{onlineCount} online</span>
        </div>
        {variant === "admin" && isHost && (
          <div className="text-[10px] text-purple-400 mt-0.5">Host controls — kick opens team for takeover</div>
        )}
      </div>

      <div className="scroll-panel space-y-2">
        {participants.map((p) => {
          const team = p.teamId ? roomState.teams[p.teamId] : null;
          const teamDef = p.teamId ? getTeamMapForLeague(roomState.league)[p.teamId] : null;
          const isMe = p.playerName === playerName || p.teamId === myTeamId;

          return (
            <div key={p.socketId + p.playerName} className="ref-card flex items-center gap-3">
              {team ? (
                <TeamLogo teamId={team.id} logoUrl={team.logoUrl} shortName={team.shortName} size={32} />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#2A2A2A] flex items-center justify-center text-gray-500 text-xs">?</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${p.isOnline ? "bg-green-400" : "bg-gray-600"}`} />
                  <span className="font-bold text-sm text-white truncate">{p.playerName}</span>
                  {isMe && <span className="ref-pill ref-pill-gold text-[8px]">YOU</span>}
                  {p.isHost && <span className="ref-pill ref-pill-purple text-[8px]">HOST</span>}
                  {p.isSpectator && <span className="ref-pill ref-pill-purple text-[8px]">SPEC</span>}
                </div>
                <div className="text-[10px] text-gray-400 ml-3.5">
                  {teamDef ? teamDef.shortName : p.isSpectator ? "Spectator" : "No team"}
                </div>
              </div>
              {variant === "admin" && isHost && p.teamId && !p.isHost && socket && (
                <button
                  type="button"
                  onClick={() => handleKick(p.teamId!)}
                  className="text-[10px] px-2 py-1 rounded-lg border border-red-500/40 text-red-400 shrink-0"
                >
                  Kick
                </button>
              )}
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
