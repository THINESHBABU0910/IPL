"use client";

import { RoomState, DraftTeamSlot } from "@/lib/types";
import { Socket } from "socket.io-client";
import InviteFriendsCard from "./InviteFriendsCard";
import ParticipantsTab from "./ParticipantsTab";
import ChatPanel from "./ChatPanel";
import RoomSettingsTab from "./RoomSettingsTab";
import DraftTeamEditor from "./DraftTeamEditor";
import { getDraftSubtitle, countActiveDraftTeams } from "@/lib/draftRules";

export type DraftLobbyTabId = "teams" | "chat" | "settings";

interface DraftLobbyProps {
  roomState: RoomState;
  myTeamId: string | null;
  socket: Socket;
  isSpectator: boolean;
  playerName?: string;
  isHost?: boolean;
  activeTab: DraftLobbyTabId;
  roomId: string;
  soundOn: boolean;
  onToggleSound: () => void;
}

export default function DraftLobby({
  roomState, myTeamId, socket, isSpectator, playerName, isHost,
  activeTab, roomId, soundOn, onToggleSound,
}: DraftLobbyProps) {
  const slots = roomState.draftTeamSlots || [];
  const claimed = countActiveDraftTeams(Object.values(roomState.teams));
  const gender = roomState.draftGender || "mens";

  function handleClaim(slotId: string, updates?: Partial<DraftTeamSlot>) {
    socket.emit("claim-draft-team", {
      slotId,
      name: updates?.name,
      primaryColor: updates?.primaryColor,
      secondaryColor: updates?.secondaryColor,
      logoUrl: updates?.logoUrl,
      logoEmoji: updates?.logoEmoji,
    });
  }

  function handleEdit(slotId: string, updates: Partial<DraftTeamSlot>) {
    socket.emit("edit-draft-team", { slotId, ...updates });
  }

  if (activeTab === "chat") {
    return (
      <div className="panel-fill px-2 pb-1">
        <ChatPanel messages={roomState.chat} socket={socket} disabled={isSpectator && !myTeamId} playerName={playerName} tall league={roomState.league} />
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
      <p className="text-[10px] text-gray-500 text-center">{getDraftSubtitle(gender)}</p>
      <p className="text-xs text-center text-gray-400">
        {claimed} team{claimed !== 1 ? "s" : ""} claimed · min 2 to start
      </p>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
        {slots.map((slot) => {
          const isMine = myTeamId === slot.id;
          const isOpen = !slot.ownerId;
          const canEdit = !!(isMine || (isHost && roomState.auction.phase === "lobby"));

          return (
            <div
              key={slot.id}
              className={`ref-card ${isMine ? "ring-1 ring-ipl-gold/50" : ""}`}
            >
              {slot.ownerId && !isMine ? (
                <div className="flex items-center justify-between gap-2">
                  <DraftTeamEditor slot={slot} canEdit={false} onSave={() => {}} compact />
                  <span className="text-[10px] text-gray-500 shrink-0">{slot.ownerName}</span>
                </div>
              ) : isOpen ? (
                <div className="space-y-2">
                  <DraftTeamEditor
                    slot={slot}
                    canEdit
                    compact
                    onSave={(u) => {
                      if (myTeamId && myTeamId !== slot.id) return;
                      if (!myTeamId) handleClaim(slot.id, u);
                      else handleEdit(slot.id, u);
                    }}
                  />
                  {!myTeamId && (
                    <button
                      type="button"
                      onClick={() => handleClaim(slot.id)}
                      className="w-full py-2 rounded-lg bid-btn text-black font-black text-xs"
                    >
                      Claim this team
                    </button>
                  )}
                </div>
              ) : (
                <DraftTeamEditor
                  slot={slot}
                  canEdit={canEdit}
                  compact
                  onSave={(u) => handleEdit(slot.id, u)}
                />
              )}
              {isMine && (
                <button
                  type="button"
                  onClick={() => socket.emit("release-draft-team")}
                  className="mt-2 w-full py-1 text-[10px] text-gray-500 hover:text-red-400"
                >
                  Release team
                </button>
              )}
            </div>
          );
        })}
      </div>

      {isHost && (
        <button
          type="button"
          onClick={() => socket.emit("add-draft-team-slot")}
          className="shrink-0 w-full py-2 rounded-xl border border-dashed border-ipl-border text-gray-400 text-xs font-semibold"
        >
          + Add team slot
        </button>
      )}

      <div className="shrink-0 max-h-[28vh] overflow-hidden flex flex-col">
        <ParticipantsTab roomState={roomState} myTeamId={myTeamId} playerName={playerName} isHost={isHost} />
      </div>
    </div>
  );
}
