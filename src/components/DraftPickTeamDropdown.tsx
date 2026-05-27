"use client";

import { Socket } from "socket.io-client";
import { RoomState } from "@/lib/types";

interface DraftPickTeamDropdownProps {
  roomState: RoomState;
  myTeamId: string | null;
  socket: Socket;
}

export default function DraftPickTeamDropdown({ roomState, myTeamId, socket }: DraftPickTeamDropdownProps) {
  if (myTeamId) return null;

  const slots = roomState.draftTeamSlots || [];

  return (
    <select
      className="bg-[#FFD700] text-black text-xs font-bold rounded-lg px-2 py-1.5 max-w-[160px] truncate"
      defaultValue=""
      onChange={(e) => {
        const slotId = e.target.value;
        if (!slotId) return;
        socket.emit("pick-team", { teamId: slotId });
        e.target.value = "";
      }}
    >
      <option value="" disabled>Take over team</option>
      {slots.map((slot) => {
        const team = roomState.teams[slot.id];
        const open = !slot.ownerId || team?.isVacant;
        const label = open
          ? `${slot.shortName} (OPEN — takeover)`
          : `${slot.shortName} (taken)`;
        return (
          <option key={slot.id} value={slot.id} disabled={!open}>
            {label}
          </option>
        );
      })}
    </select>
  );
}
