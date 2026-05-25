"use client";

import { Socket } from "socket.io-client";
import { IPL_TEAMS } from "@/data/teams";
import { RoomState } from "@/lib/types";

interface PickTeamDropdownProps {
  roomState: RoomState;
  myTeamId: string | null;
  socket: Socket;
}

export default function PickTeamDropdown({ roomState, myTeamId, socket }: PickTeamDropdownProps) {
  if (myTeamId) return null;

  function handlePick(teamId: string) {
    if (!teamId) return;
    socket.emit("pick-team", { teamId });
  }

  return (
    <select
      className="bg-[#FFD700] text-black text-xs font-bold rounded-lg px-2 py-1.5 max-w-[140px] truncate"
      defaultValue=""
      onChange={(e) => {
        handlePick(e.target.value);
        e.target.value = "";
      }}
    >
      <option value="" disabled>Pick Team</option>
      {IPL_TEAMS.map((t) => {
        const team = roomState.teams[t.id];
        const canPick = !team?.ownerId || team.isVacant;
        const label = team?.isVacant ? `${t.shortName} (OPEN)` : canPick ? t.shortName : `${t.shortName} (taken)`;
        return (
          <option key={t.id} value={t.id} disabled={!canPick}>
            {label}
          </option>
        );
      })}
    </select>
  );
}
