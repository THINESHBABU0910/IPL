"use client";

import { RoomState } from "@/lib/types";
import SquadTeamAccordion from "./SquadTeamAccordion";

interface SquadTabProps {
  roomState: RoomState;
  myTeamId: string | null;
  playerName?: string;
  isHost?: boolean;
}

export default function SquadTab({ roomState, myTeamId, playerName, isHost }: SquadTabProps) {
  return (
    <div className="panel-fill px-2 pb-1 min-h-0">
      <div className="scroll-panel">
        <SquadTeamAccordion
          roomState={roomState}
          myTeamId={myTeamId}
          playerName={playerName}
          isHost={isHost}
        />
      </div>
    </div>
  );
}
