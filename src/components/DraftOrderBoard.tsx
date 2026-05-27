"use client";

import { RoomState } from "@/lib/types";

interface DraftOrderBoardProps {
  roomState: RoomState;
  collapsed?: boolean;
}

function TeamChip({
  teamId,
  roomState,
  position,
  isCurrent,
  dimmed,
}: {
  teamId: string;
  roomState: RoomState;
  position: number;
  isCurrent: boolean;
  dimmed?: boolean;
}) {
  const team = roomState.teams[teamId];
  return (
    <div
      className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border ${
        isCurrent
          ? "border-ipl-gold bg-ipl-gold/20 text-ipl-gold scale-105"
          : dimmed
            ? "border-ipl-border/30 bg-ipl-card/30 text-gray-600 opacity-50"
            : "border-ipl-border/50 bg-ipl-card/50 text-gray-400"
      }`}
    >
      <span className="opacity-60">{position}</span>
      <span style={team ? { color: isCurrent ? undefined : team.primaryColor } : undefined}>
        {team?.shortName || teamId.slice(0, 4)}
      </span>
    </div>
  );
}

export default function DraftOrderBoard({ roomState, collapsed }: DraftOrderBoardProps) {
  const draft = roomState.draft;
  if (!draft) return null;

  const current = draft.currentPickerId;
  const order = draft.pickOrder;
  const n = order.length;

  if (draft.inCatchup) {
    const queue = draft.catchupQueue;
    const idx = draft.catchupIndex;
    return (
      <div className={`shrink-0 mx-2 ${collapsed ? "max-h-0 overflow-hidden opacity-0" : ""}`}>
        <div className="text-[9px] text-orange-400 uppercase mb-1 px-1">Catch-up picks</div>
        <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-hide">
          {queue.map((teamId, i) => (
            <TeamChip
              key={`${teamId}-${i}`}
              teamId={teamId}
              roomState={roomState}
              position={i + 1}
              isCurrent={i === idx}
            />
          ))}
        </div>
      </div>
    );
  }

  const forwardSteps = order.map((teamId, i) => ({
    teamId,
    pos: i + 1,
    isCurrent: draft.roundDirection === "forward" && draft.currentPickIndex === i,
  }));

  const reverseSteps = [...order].reverse().map((teamId, i) => {
    const origIndex = n - 1 - i;
    return {
      teamId,
      pos: n + i + 1,
      isCurrent: draft.roundDirection === "reverse" && draft.currentPickIndex === origIndex,
    };
  });

  return (
    <div className={`shrink-0 mx-2 space-y-1 ${collapsed ? "max-h-0 overflow-hidden opacity-0" : ""}`}>
      <div className="flex items-center justify-between px-1">
        <span className="text-[9px] text-gray-500 uppercase">
          Cycle {draft.cycle} · Snake draft
        </span>
        <span className="text-[9px] text-ipl-gold/80 font-bold">
          {draft.roundDirection === "forward" ? "1 → 2 → … → n" : "n → … → 2 → 1"}
        </span>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto py-0.5 scrollbar-hide">
        <span className="text-[8px] text-gray-600 shrink-0 pr-0.5">▶</span>
        {forwardSteps.map((s) => (
          <TeamChip
            key={`f-${s.teamId}`}
            teamId={s.teamId}
            roomState={roomState}
            position={s.pos}
            isCurrent={s.isCurrent}
            dimmed={draft.roundDirection === "reverse"}
          />
        ))}
      </div>

      {(draft.roundDirection === "reverse" || draft.currentPickIndex === 0) && (
        <div className="flex items-center gap-1 overflow-x-auto py-0.5 scrollbar-hide">
          <span className="text-[8px] text-gray-600 shrink-0 pr-0.5">◀</span>
          {reverseSteps.map((s) => (
            <TeamChip
              key={`r-${s.teamId}-${s.pos}`}
              teamId={s.teamId}
              roomState={roomState}
              position={s.pos}
              isCurrent={s.isCurrent}
              dimmed={draft.roundDirection === "forward"}
            />
          ))}
        </div>
      )}

      {current && (
        <p className="text-[9px] text-center text-gray-500 pb-0.5">
          On the clock: <span className="text-ipl-gold font-bold">{roomState.teams[current]?.name}</span>
          {draft.roundDirection === "reverse" && draft.currentPickIndex === n - 1 && (
            <span className="text-gray-600"> · turnaround pick</span>
          )}
        </p>
      )}
    </div>
  );
}
