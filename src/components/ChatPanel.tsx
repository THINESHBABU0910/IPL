"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChatMessage } from "@/lib/types";
import { Socket } from "socket.io-client";
import TeamLogo from "./TeamLogo";
import { TEAM_MAP } from "@/data/teams";

interface ChatPanelProps {
  messages: ChatMessage[];
  socket: Socket;
  disabled?: boolean;
  tall?: boolean;
  onMessage?: (msg: ChatMessage) => void;
  playerName?: string;
}

export default function ChatPanel({
  messages, socket, disabled, tall, onMessage, playerName,
}: ChatPanelProps) {
  const [text, setText] = useState("");
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>(messages);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setLocalMessages(messages); }, [messages]);

  useEffect(() => {
    function onChat(msg: ChatMessage) {
      setLocalMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
      onMessage?.(msg);
    }
    socket.on("chat-message", onChat);
    return () => { socket.off("chat-message", onChat); };
  }, [socket, onMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages]);

  const send = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    const tempId = `temp-${Date.now()}`;
    setLocalMessages((prev) => [...prev, {
      id: tempId, playerName: playerName || "You", text: trimmed, timestamp: Date.now(),
    }]);
    socket.emit("send-chat", { text: trimmed });
    setText("");
    setTimeout(() => setLocalMessages((prev) => prev.filter((m) => m.id !== tempId)), 8000);
  }, [text, disabled, socket, playerName]);

  return (
    <div className={`flex flex-col min-h-0 ${tall ? "h-full panel-fill" : ""}`}>
      <div className={`overflow-y-auto p-2 space-y-2 flex-1 min-h-0 ${tall ? "" : "h-48"}`}>
        {localMessages.length === 0 && (
          <p className="text-gray-500 text-xs text-center py-8">Say hello to your friends!</p>
        )}
        {localMessages.map((m) => (
          <div key={m.id} className={`flex items-start gap-2 text-xs ${m.id.startsWith("temp-") ? "opacity-60" : ""}`}>
            {m.teamId && TEAM_MAP[m.teamId] && (
              <TeamLogo teamId={m.teamId} logoUrl={TEAM_MAP[m.teamId].logoUrl} shortName={TEAM_MAP[m.teamId].shortName} size={20} />
            )}
            <div>
              <span className="text-[#FFD700] font-semibold">{m.playerName}</span>
              <div className="text-gray-300">{m.text}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="shrink-0 flex gap-2 p-2 border-t border-[#2A2A2A]">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          disabled={disabled}
          placeholder={disabled ? "Spectators can't chat" : "Say something..."}
          maxLength={200}
          className="flex-1 pro-input py-2 text-xs"
        />
        <button
          type="button"
          onClick={send}
          disabled={disabled || !text.trim()}
          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-[#A855F7]/30 border border-[#A855F7]/40 text-[#A855F7] disabled:opacity-40"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
