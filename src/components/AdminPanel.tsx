"use client";

import { RoomState } from "@/lib/types";
import { Socket } from "socket.io-client";

interface AdminPanelProps {
  roomState: RoomState;
  socket: Socket;
  isHost: boolean;
}

type HostAction = "add-time" | "skip-player" | "pause" | "resume" | "kick" | "start-now" | "rematch" | "force-sold";

export default function AdminPanel({ roomState, socket, isHost }: AdminPanelProps) {
  if (!isHost) return null;

  const phase = roomState.auction.phase;
  const teams = Object.entries(roomState.teams);

  function act(action: HostAction, targetTeamId?: string) {
    socket.emit("host-action", { action, targetTeamId });
  }

  return (
    <div className="glass-card p-3 mb-0 border-2 border-ipl-gold/40">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs font-bold text-ipl-gold uppercase tracking-wider">Auction Admin</div>
          <div className="text-sm text-gray-300">{roomState.hostName} · Room {roomState.id}</div>
        </div>
        <span className="text-xs px-2 py-1 rounded bg-ipl-gold/20 text-ipl-gold font-bold">HOST</span>
      </div>

      {phase === "lobby" && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400">Anyone can start from the Players tab. Pick a free team anytime.</p>
        </div>
      )}

      {phase === "auction" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <AdminBtn label="+10 Seconds" onClick={() => act("add-time")} />
            <AdminBtn label="⏸ Pause" onClick={() => act("pause")} />
            <AdminBtn label="▶ Resume" onClick={() => act("resume")} />
            <AdminBtn label="⏭ Skip (Unsold)" danger onClick={() => act("skip-player")} />
            <AdminBtn label="🔨 Force Sold" danger onClick={() => act("force-sold")} />
          </div>
          {roomState.auction.isPaused && (
            <p className="text-amber-400 text-xs font-semibold">⏸ Auction is PAUSED — bidding disabled</p>
          )}
        </div>
      )}

      {phase === "retention" && (
        <p className="text-xs text-gray-400">Retention phase — teams are picking retained players ({roomState.retentionTimeLeft}s left)</p>
      )}

      {phase === "completed" && (
        <AdminBtn label="🔄 Rematch (Same Players)" primary onClick={() => act("rematch")} />
      )}

      {(phase === "lobby" || phase === "auction") && teams.length > 0 && (
        <div className="mt-3 pt-3 border-t border-ipl-border/50">
          <div className="text-xs text-gray-500 mb-2">Remove player from room</div>
          <div className="flex flex-wrap gap-2">
            {teams.map(([id, t]) => (
              <AdminBtn key={id} label={`Kick ${t.shortName}`} danger small onClick={() => act("kick", id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminBtn({
  label, onClick, primary, danger, small,
}: {
  label: string; onClick: () => void; primary?: boolean; danger?: boolean; small?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded font-semibold transition ${
        small ? "px-2 py-1 text-[10px]" : "px-3 py-2 text-xs"
      } ${
        primary ? "bg-ipl-gold text-black hover:bg-yellow-400"
          : danger ? "bg-red-700/80 hover:bg-red-600 text-white"
          : "bg-ipl-purple/80 hover:bg-ipl-purple text-white"
      }`}
    >
      {label}
    </button>
  );
}
