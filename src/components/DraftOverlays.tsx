"use client";

import { RoomState } from "@/lib/types";

interface DraftOverlaysProps {
  roomState: RoomState;
  myTeamId: string | null;
}

export default function DraftOverlays({ roomState, myTeamId }: DraftOverlaysProps) {
  const draft = roomState.draft;
  if (!draft?.currentPickerId) return null;

  const isMyTurn = myTeamId === draft.currentPickerId;
  const picker = roomState.teams[draft.currentPickerId];

  if (isMyTurn) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-20 z-40 flex justify-center px-4">
        <div className="px-4 py-2 rounded-2xl bg-ipl-gold/90 text-black font-black text-sm shadow-lg animate-pulse">
          Your pick!
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-30 flex justify-center px-4">
      <div
        className="px-3 py-1.5 rounded-xl text-xs font-bold text-white/90 border border-white/20 backdrop-blur"
        style={{ background: `${picker?.primaryColor || "#333"}99` }}
      >
        {picker?.name || "Team"} is picking…
      </div>
    </div>
  );
}
