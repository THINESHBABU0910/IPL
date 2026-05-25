"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ChatMessage, ActivityEntry, RoomState } from "@/lib/types";
import { Socket } from "socket.io-client";
import TeamLogo from "./TeamLogo";
import GifPicker, { gifUrlFromMessage } from "./GifPicker";

interface AuctionChatTabProps {
  messages: ChatMessage[];
  activityFeed: ActivityEntry[];
  roomState: RoomState;
  socket: Socket;
  disabled?: boolean;
  playerName?: string;
}

export default function AuctionChatTab({
  messages, activityFeed, roomState, socket, disabled, playerName,
}: AuctionChatTabProps) {
  const [text, setText] = useState("");
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>(messages);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setLocalMessages(messages); }, [messages]);

  useEffect(() => {
    function onChat(msg: ChatMessage) {
      setLocalMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
    }
    socket.on("chat-message", onChat);
    return () => { socket.off("chat-message", onChat); };
  }, [socket]);

  const feed = useMemo(() => {
    const systemLines = activityFeed
      .filter((e) => e.type === "system" || e.type === "rtm")
      .map((e) => ({ kind: "system" as const, id: e.id, time: e.timestamp, text: e.text }));

    const chats = localMessages.map((m) => ({
      kind: "chat" as const, id: m.id, time: m.timestamp, name: m.playerName, text: m.text, teamId: m.teamId,
    }));

    return [...systemLines, ...chats].sort((a, b) => a.time - b.time);
  }, [activityFeed, localMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [feed]);

  const sendText = useCallback((raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed || disabled) return;
    const tempId = `temp-${Date.now()}`;
    setLocalMessages((prev) => [...prev, {
      id: tempId, playerName: playerName || "You", text: trimmed, timestamp: Date.now(),
    }]);
    socket.emit("send-chat", { text: trimmed });
    setText("");
    setTimeout(() => setLocalMessages((prev) => prev.filter((m) => m.id !== tempId)), 8000);
  }, [disabled, socket, playerName]);

  const send = useCallback(() => sendText(text), [text, sendText]);

  return (
    <div className="panel-fill flex flex-col min-h-0 px-2 flex-1">
      <div ref={scrollRef} className="scroll-panel flex-1 space-y-2 pb-2 min-h-0">
        {feed.length === 0 && (
          <p className="text-center text-gray-500 text-xs py-8">Say hello — live bids flash above and fade away</p>
        )}
        {feed.map((item) => {
          if (item.kind === "system") {
            return (
              <div key={item.id} className="text-[10px] px-1 text-gray-400">
                <span className="mr-1">▶</span>{item.text}
              </div>
            );
          }
          const gifUrl = gifUrlFromMessage(item.text);
          const team = item.teamId ? roomState.teams[item.teamId] : null;
          return (
            <div key={item.id} className="flex items-start gap-2 text-[11px]">
              {team && (
                <TeamLogo teamId={team.id} logoUrl={team.logoUrl} shortName={team.shortName} size={20} />
              )}
              <div className="min-w-0 flex-1">
                <span className="text-[#FFD700] font-bold">{item.name}</span>
                {team && <span className="text-gray-500 ml-1">{team.shortName}</span>}
                {gifUrl ? (
                  <img src={gifUrl} alt="GIF" className="mt-1 max-w-[180px] rounded-lg border border-[#2A2A2A]" loading="lazy" />
                ) : (
                  <div className="text-gray-200 break-words">{item.text}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="shrink-0 flex gap-2 pb-1 pt-1 border-t border-[#2A2A2A]">
        <GifPicker disabled={disabled} onPick={(url) => sendText(`gif:${url}`)} />
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={disabled ? "Chat as spectator..." : "Send a message..."}
          disabled={disabled}
          maxLength={200}
          className="flex-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-500 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={send}
          disabled={disabled || !text.trim()}
          className="px-3 py-2 rounded-xl bg-[#FFD700] text-black font-bold text-sm disabled:opacity-40"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
