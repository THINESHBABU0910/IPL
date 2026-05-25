"use client";

import { RoomState } from "@/lib/types";
import { MAX_FRANCHISES } from "@/lib/constants";
import { Socket } from "socket.io-client";
import InviteFriendsCard from "./InviteFriendsCard";
import LobbyTeamGrid from "./LobbyTeamGrid";
import ParticipantsTab from "./ParticipantsTab";
import ChatPanel from "./ChatPanel";
import RoomSettingsTab from "./RoomSettingsTab";

export type LobbyTabId = "players" | "chat" | "settings";

interface LobbyProps {
  roomState: RoomState;
  myTeamId: string | null;
  socket: Socket;
  isSpectator: boolean;
  playerName?: string;
  isHost?: boolean;
  activeTab: LobbyTabId;
  roomId: string;
  soundOn: boolean;
  onToggleSound: () => void;
}

export default function Lobby({
  roomState, myTeamId, socket, isSpectator, playerName, isHost,
  activeTab, roomId, soundOn, onToggleSound,
}: LobbyProps) {
  const vacantTeams = new Set(
    Object.entries(roomState.teams).filter(([, t]) => t.isVacant).map(([id]) => id),
  );
  const takenTeams = new Set(
    Object.keys(roomState.teams).filter((id) => !vacantTeams.has(id)),
  );
  const totalTeams = Object.keys(roomState.teams).length - vacantTeams.size;
  const freeTeams = MAX_FRANCHISES - totalTeams;
  const allJoined = totalTeams >= MAX_FRANCHISES;
  const canStart = allJoined || !!isHost;

  if (activeTab === "chat") {
    return (
      <div className="panel-fill px-2 pb-1">
        <ChatPanel messages={roomState.chat} socket={socket} disabled={isSpectator} playerName={playerName} tall />
      </div>
    );
  }

  if (activeTab === "settings") {
    return (
      <RoomSettingsTab
        roomState={roomState}
        socket={socket}
        isHost={!!isHost}
        roomId={roomId}
        soundOn={soundOn}
        onToggleSound={onToggleSound}
      />
    );
  }

  return (
    <div className="panel-fill flex flex-col px-2 pb-1 gap-2 min-h-0">
      <InviteFriendsCard roomId={roomId} />

      <LobbyTeamGrid
        myTeamId={myTeamId}
        takenTeams={takenTeams}
        vacantTeams={vacantTeams}
        playerName={playerName}
        socket={socket}
        isSpectator={isSpectator}
      />

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <ParticipantsTab roomState={roomState} myTeamId={myTeamId} playerName={playerName} isHost={isHost} />
      </div>

      <div className="shrink-0 pt-1 border-t border-[#2A2A2A]">
        <p className="text-[10px] text-gray-500 text-center mb-1">
          {totalTeams}/{MAX_FRANCHISES} teams joined · {freeTeams} free
          {vacantTeams.size > 0 && ` · ${vacantTeams.size} open for takeover`}
        </p>
        {!allJoined && (
          <p className="text-[10px] text-amber-400/90 text-center mb-2">
            Auction starts when all {MAX_FRANCHISES} teams join{isHost ? ", or when you start as host" : ""}
          </p>
        )}
        {allJoined && (
          <p className="text-[10px] text-green-400/90 text-center mb-2">All teams joined — starting auction…</p>
        )}
        {!myTeamId && !isSpectator && (
          <p className="text-center text-gray-400 text-xs mb-2">Pick a free team above (optional before start)</p>
        )}
        <button
          type="button"
          onClick={() => socket.emit("start-game")}
          disabled={!canStart || totalTeams < 2}
          className="w-full py-3 bid-btn rounded-xl text-black font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {allJoined
            ? "▶ Start Game"
            : isHost
              ? `▶ Start Early (${totalTeams}/${MAX_FRANCHISES} teams)`
              : `Waiting (${totalTeams}/${MAX_FRANCHISES} teams)`}
        </button>
        <p className="text-[9px] text-gray-600 text-center mt-1.5">You can leave and return anytime before auction starts</p>
      </div>
    </div>
  );
}
