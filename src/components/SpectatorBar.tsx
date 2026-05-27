"use client";

import { Socket } from "socket.io-client";
import PickTeamDropdown from "./PickTeamDropdown";
import DraftPickTeamDropdown from "./DraftPickTeamDropdown";
import { RoomState } from "@/lib/types";

interface SpectatorBarProps {
  roomState: RoomState;
  myTeamId: string | null;
  socket: Socket;
}

export default function SpectatorBar({ roomState, myTeamId, socket }: SpectatorBarProps) {
  if (myTeamId) return null;

  return (
    <div className="shrink-0 mx-2 mt-1 mb-0 flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-purple-900/40 border border-purple-500/30">
      <div className="flex items-center gap-2 text-purple-200 text-xs font-bold min-w-0">
        <span aria-hidden>👁</span>
        <span className="truncate">
          Spectating — pick an open team to {roomState.gameType === "draft" ? "draft" : "bid"}
        </span>
      </div>
      {roomState.gameType === "draft" ? (
        <DraftPickTeamDropdown roomState={roomState} myTeamId={myTeamId} socket={socket} />
      ) : (
        <PickTeamDropdown roomState={roomState} myTeamId={myTeamId} socket={socket} />
      )}
    </div>
  );
}
