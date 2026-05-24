"use client";

import { RoomState } from "@/lib/types";
import { Socket } from "socket.io-client";
import { TOTAL_PURSE, TIMER_INITIAL, TIMER_BID_RESET, formatPrice } from "@/lib/constants";
import AdminPanel from "./AdminPanel";

const MODE_LABELS: Record<string, string> = {
  mega: "Mega Auction",
  custom_retention: "IPL Retention",
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
  const timerOptions = [5, 10, 15, 20, 25];
  const activeTimer = TIMER_INITIAL;

  return (
    <div className="scroll-panel px-2 pb-2 space-y-3">
      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1 pt-1">Room Settings</div>

      <div className="ref-card space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">⏱</span>
            <span className="text-sm font-semibold text-white">Bid Timer</span>
          </div>
          <span className="text-sm font-bold text-[#A855F7]">{activeTimer}s</span>
        </div>
        <p className="text-[10px] text-gray-500">Time allowed for each bid round · resets to {TIMER_BID_RESET}s after bid</p>
        <div className="flex gap-1.5">
          {timerOptions.map((t) => (
            <div
              key={t}
              className={`flex-1 py-1.5 rounded-lg text-center text-xs font-bold ${
                t === activeTimer ? "bg-[#A855F7]/30 text-[#A855F7] border border-[#A855F7]/50" : "bg-[#0A0A0A] text-gray-500 border border-[#2A2A2A]"
              }`}
            >
              {t}s
            </div>
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
          <span className="text-sm font-bold text-[#22C55E]">{formatPrice(TOTAL_PURSE)}</span>
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
