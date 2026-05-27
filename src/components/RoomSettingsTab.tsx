"use client";

import { RoomState } from "@/lib/types";
import { Socket } from "socket.io-client";
import { getLeagueConfig } from "@/data/leagueRegistry";
import { formatLeaguePrice } from "@/lib/leagueRules";
import { TIMER_BID_RESET } from "@/lib/constants";
import AdminPanel from "./AdminPanel";

const MODE_LABELS: Record<string, string> = {
  mega: "Mega Auction",
  custom_retention: "Official Retention",
  flex_retention: "Flex Retention",
};

interface RoomSettingsTabProps {
  roomState: RoomState;
  socket: Socket;
  isHost: boolean;
  roomId: string;
  soundOn: boolean;
  onToggleSound: () => void;
}

export default function RoomSettingsTab({
  roomState, socket, isHost, roomId, soundOn, onToggleSound,
}: RoomSettingsTabProps) {
  const isDraft = roomState.gameType === "draft";
  const timerOptions = [5, 10, 15, 20, 25, 30];
  const activeTimer = isDraft ? (roomState.pickTimerSeconds ?? 15) : (roomState.bidTimerSeconds ?? 15);

  function setTimer(seconds: number) {
    if (!isHost) return;
    socket.emit("host-action", { action: "set-timer", timerSeconds: seconds });
  }

  return (
    <div className="scroll-panel px-2 pb-2 space-y-3">
      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1 pt-1">Room Settings</div>

      <div className="ref-card space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">⏱</span>
            <span className="text-sm font-semibold text-white">{isDraft ? "Pick Timer" : "Bid Timer"}</span>
          </div>
          <span className="text-sm font-bold text-[#A855F7]">{activeTimer}s</span>
        </div>
        <p className="text-[10px] text-gray-500">
          {isDraft
            ? `Seconds per draft pick${isHost ? " · Host can change anytime" : ""}`
            : `Seconds per lot · +${TIMER_BID_RESET}s after each bid${isHost ? " · Host can change anytime" : ""}`}
        </p>
        <div className="flex gap-1.5 flex-wrap">
          {timerOptions.map((t) => (
            <button
              key={t}
              type="button"
              disabled={!isHost}
              onClick={() => setTimer(t)}
              className={`flex-1 min-w-[2.5rem] py-1.5 rounded-lg text-center text-xs font-bold ${
                t === activeTimer ? "bg-[#A855F7]/30 text-[#A855F7] border border-[#A855F7]/50" : "bg-[#0A0A0A] text-gray-500 border border-[#2A2A2A]"
              } ${!isHost ? "opacity-60 cursor-default" : "hover:border-[#A855F7]/40"}`}
            >
              {t}s
            </button>
          ))}
        </div>
      </div>

      <div className="ref-card space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🔨</span>
            <span className="text-sm font-semibold text-white">Auction Mode</span>
          </div>
          <span className="ref-pill ref-pill-orange text-[10px]">{MODE_LABELS[roomState.mode] || roomState.mode}</span>
        </div>
        <p className="text-[10px] text-gray-500">Cannot be changed after room creation</p>
      </div>

      <div className="ref-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">₹</span>
            <span className="text-sm font-semibold text-white">Starting Purse</span>
          </div>
          <span className="text-sm font-bold text-[#22C55E]">{formatLeaguePrice(getLeagueConfig(roomState.league).rules.totalPurse, roomState.league)}</span>
        </div>
      </div>

      <div className="ref-card space-y-2">
        <button type="button" onClick={onToggleSound} className="w-full flex items-center justify-between text-sm">
          <span className="text-white">Sound effects</span>
          <span className="text-gray-400">{soundOn ? "On 🔊" : "Off 🔇"}</span>
        </button>
        <button
          type="button"
          onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`); }}
          className="w-full flex items-center justify-between text-sm"
        >
          <span className="text-white">Copy invite link</span>
          <span className="font-mono text-[#FFD700] text-xs">{roomId}</span>
        </button>
      </div>

      {isHost && <AdminPanel roomState={roomState} socket={socket} isHost={isHost} />}
    </div>
  );
}
