"use client";

import { RoomState } from "@/lib/types";
import { Socket } from "socket.io-client";
import DraftOrderBoard from "./DraftOrderBoard";
import DraftPlayerSearch from "./DraftPlayerSearch";
import AuctionChatTab from "./AuctionChatTab";
import SquadTab from "./SquadTab";
import ParticipantsTab from "./ParticipantsTab";
import RoomSettingsTab from "./RoomSettingsTab";
import DraftOverlays from "./DraftOverlays";

export type DraftTabId = "pick" | "chat" | "squad" | "users" | "settings";

interface DraftPhaseProps {
  roomState: RoomState;
  myTeamId: string | null;
  socket: Socket;
  isSpectator: boolean;
  playerName?: string;
  isHost?: boolean;
  activeTab: DraftTabId;
  roomId: string;
  timerSeconds: number;
  soundOn: boolean;
  onToggleSound: () => void;
}

export default function DraftPhase({
  roomState, myTeamId, socket, isSpectator, playerName, isHost,
  activeTab, roomId, timerSeconds, soundOn, onToggleSound,
}: DraftPhaseProps) {
  const draft = roomState.draft;
  const pickerId = draft?.currentPickerId;
  const picker = pickerId ? roomState.teams[pickerId] : null;

  if (activeTab === "chat") {
    return (
      <div className="panel-fill px-2 pb-1 flex flex-col min-h-0">
        <AuctionChatTab
          messages={roomState.chat}
          activityFeed={roomState.activityFeed}
          roomState={roomState}
          socket={socket}
          disabled={isSpectator && !myTeamId}
          playerName={playerName || ""}
        />
      </div>
    );
  }

  if (activeTab === "squad") {
    return <SquadTab roomState={roomState} myTeamId={myTeamId} playerName={playerName || ""} isHost={!!isHost} />;
  }

  if (activeTab === "users") {
    return (
      <ParticipantsTab
        roomState={roomState}
        myTeamId={myTeamId}
        playerName={playerName}
        isHost={isHost}
        variant="admin"
        socket={socket}
      />
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

  /* Main draft screen — search + pool on top, live chat pinned below (same pattern as auction) */
  return (
    <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
      <div className="shrink-0 mx-2 mt-1 p-2 rounded-xl bg-ipl-card/80 border border-ipl-border/50 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] text-gray-500 uppercase">On the clock</div>
          <div className="font-bold text-sm truncate" style={{ color: picker?.primaryColor }}>
            {picker?.name || "—"}
          </div>
          <div className="text-[10px] text-gray-500">
            Pick #{draft?.pickNumber ?? 0}
            {draft?.inCatchup ? " · Catch-up" : draft?.roundDirection === "reverse" ? " · Reverse leg" : " · Forward leg"}
          </div>
        </div>
        <div className={`text-2xl font-black tabular-nums ${timerSeconds <= 5 ? "text-red-400 animate-pulse" : "text-ipl-gold"}`}>
          {timerSeconds}s
        </div>
      </div>

      <DraftOrderBoard roomState={roomState} />

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <DraftPlayerSearch roomState={roomState} myTeamId={myTeamId} socket={socket} embedded />
        <div className="flex-1 min-h-[8rem] flex flex-col border-t border-ipl-border/60 bg-[#0A0A0A]/95">
          <div className="shrink-0 px-2 py-1 text-[9px] font-bold text-gray-500 uppercase tracking-wider border-b border-ipl-border/40">
            Live chat — banter while you wait
          </div>
          <AuctionChatTab
            messages={roomState.chat}
            activityFeed={roomState.activityFeed}
            roomState={roomState}
            socket={socket}
            disabled={isSpectator && !myTeamId}
            playerName={playerName || ""}
            compact
          />
        </div>
      </div>

      <DraftOverlays roomState={roomState} myTeamId={myTeamId} />
    </div>
  );
}
