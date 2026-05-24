"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ChatMessage, ActivityEntry } from "@/lib/types";
import { Socket } from "socket.io-client";
import TeamLogo from "./TeamLogo";
import { TEAM_MAP } from "@/data/teams";

interface AuctionChatTabProps {
  messages: ChatMessage[];
  activityFeed: ActivityEntry[];
  socket: Socket;
  disabled?: boolean;
  playerName?: string;
}

type FeedItem =
  | { kind: "chat"; id: string; time: number; name: string; text: string; teamId?: string }
  | { kind: "event"; id: string; time: number; text: string; tone: "sold" | "unsold" | "bid" | "system" };

function activityTone(type: ActivityEntry["type"]): "sold" | "unsold" | "bid" | "system" {
  if (type === "sold") return "sold";
  if (type === "unsold") return "unsold";
  if (type === "bid") return "bid";
  return "system";
}

const TONE_CLASS: Record<"sold" | "unsold" | "bid" | "system", string> = {
  sold: "text-green-400",
  unsold: "text-red-400",
  bid: "text-[#FFD700]",
  system: "text-gray-400",
};

export default function AuctionChatTab({
  messages, activityFeed, socket, disabled, playerName,
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
    const items: FeedItem[] = [
      ...activityFeed.map((e) => ({
        kind: "event" as const, id: e.id, time: e.timestamp, text: e.text, tone: activityTone(e.type),
      })),
      ...localMessages.map((m) => ({
        kind: "chat" as const, id: m.id, time: m.timestamp, name: m.playerName, text: m.text, teamId: m.teamId,
      })),
    ];
    return items.sort((a, b) => a.time - b.time);
  }, [activityFeed, localMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [feed]);

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
    <div className="panel-fill flex flex-col px-2 pb-1 min-h-0">
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto rounded-xl bg-[#0A0A0A] border border-[#2A2A2A] px-2.5 py-2 space-y-2 mb-2"
      >
        {feed.length === 0 && (
          <p className="text-gray-500 text-xs text-center py-8">Auction chat is live...</p>
        )}
        {feed.map((item) =>
          item.kind === "event" ? (
            <div key={item.id} className={`text-xs leading-snug ${TONE_CLASS[item.tone]}`}>
              {item.tone === "system" && <span className="mr-1">▶</span>}
              {item.text}
            </div>
          ) : (
            <div key={item.id} className={`flex items-start gap-2 text-xs ${item.id.startsWith("temp-") ? "opacity-60" : ""}`}>
              {item.teamId && TEAM_MAP[item.teamId] && (
                <TeamLogo teamId={item.teamId} logoUrl={TEAM_MAP[item.teamId].logoUrl} shortName={TEAM_MAP[item.teamId].shortName} size={18} />
              )}
              <div className="min-w-0">
                <span className="text-[#FFD700] font-semibold">{item.name}</span>
                {item.teamId && TEAM_MAP[item.teamId] && (
                  <span className="text-gray-500 ml-1">· {TEAM_MAP[item.teamId].shortName}</span>
                )}
                <div className="text-gray-300">{item.text}</div>
              </div>
            </div>
          )
        )}
      </div>

      <div className="shrink-0 flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          disabled={disabled}
          placeholder={disabled ? "Spectators only" : "Send a message..."}
          maxLength={200}
          className="flex-1 pro-input py-2 text-xs"
        />
        <button
          type="button"
          onClick={send}
          disabled={disabled || !text.trim()}
          className="shrink-0 px-3 py-2 rounded-xl bg-[#A855F7]/30 border border-[#A855F7]/40 text-[#A855F7] font-bold text-xs disabled:opacity-40"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
