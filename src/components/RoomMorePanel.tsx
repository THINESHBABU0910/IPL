"use client";

import { RoomState } from "@/lib/types";
import { Socket } from "socket.io-client";
import AdminPanel from "./AdminPanel";
import { toast } from "sonner";

interface RoomMorePanelProps {
  roomState: RoomState;
  socket: Socket;
  isHost: boolean;
  roomId: string;
  soundOn: boolean;
  onToggleSound: () => void;
}

export default function RoomMorePanel({
  roomState, socket, isHost, roomId, soundOn, onToggleSound,
}: RoomMorePanelProps) {
  return (
    <div className="scroll-panel p-3 space-y-3">
      <div className="glass-card p-3">
        <div className="text-xs font-bold text-gray-400 uppercase mb-2">Settings</div>
        <div className="space-y-2">
          <button
            type="button"
            onClick={onToggleSound}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-ipl-dark/60 text-sm"
          >
            <span>Sound effects</span>
            <span>{soundOn ? "On 🔊" : "Off 🔇"}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(roomId);
              toast.success("Room code copied!");
            }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-ipl-dark/60 text-sm"
          >
            <span>Room code</span>
            <span className="font-mono text-ipl-gold">{roomId}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`);
              toast.success("Invite link copied!");
            }}
            className="w-full px-3 py-2.5 rounded-lg bg-ipl-purple/60 text-sm font-semibold"
          >
            Copy invite link
          </button>
        </div>
      </div>

      <div className="glass-card p-3 text-xs text-gray-400 space-y-1">
        <div><span className="text-gray-500">Mode:</span> {roomState.mode}</div>
        <div><span className="text-gray-500">Host:</span> {roomState.hostName}</div>
        <div><span className="text-gray-500">Phase:</span> {roomState.auction.phase}</div>
      </div>

      {isHost && <AdminPanel roomState={roomState} socket={socket} isHost />}
    </div>
  );
}
