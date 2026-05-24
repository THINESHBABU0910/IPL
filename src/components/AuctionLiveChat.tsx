"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ChatMessage, ActivityEntry } from "@/lib/types";
import { Socket } from "socket.io-client";
import { TEAM_MAP } from "@/data/teams";

interface AuctionLiveChatProps {
  messages: ChatMessage[];
  activityFeed: ActivityEntry[];
  socket: Socket;
  disabled?: boolean;
  playerName?: string;
  compact?: boolean;
}

type FeedTone = "sold" | "unsold" | "bid" | "system";

type FeedItem =
  | { kind: "chat"; id: string; time: number; name: string; text: string; teamId?: string }
  | { kind: "event"; id: string; time: number; text: string; tone: FeedTone };

function activityTone(type: ActivityEntry["type"]): FeedTone {
  if (type === "sold") return "sold";
  if (type === "unsold") return "unsold";
  if (type === "bid") return "bid";
  return "system";
}

const TONE_CLASS: Record<FeedTone, string> = {
  sold: "text-green-400",
  unsold: "text-red-400",
  bid: "text-ipl-gold",
  system: "text-gray-400",
};

export default function AuctionLiveChat({
  messages, activityFeed, socket, disabled, playerName, compact = true,
}: AuctionLiveChatProps) {
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
      ...activityFeed.slice(-20).map((e) => ({
        kind: "event" as const, id: e.id, time: e.timestamp, text: e.text, tone: activityTone(e.type),
      })),
      ...localMessages.map((m) => ({
        kind: "chat" as const, id: m.id, time: m.timestamp, name: m.playerName, text: m.text, teamId: m.teamId,
      })),
    ];
    return items.sort((a, b) => a.time - b.time).slice(-25);
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
    <div className={`w-full ${compact ? "mt-2" : "mt-4 border-t border-ipl-border/50 pt-4"}`}>
      <div
        ref={scrollRef}
        className={`overflow-y-auto rounded-lg bg-black/40 border border-ipl-border/40 px-2 py-1 space-y-0.5 mb-1.5 ${
          compact ? "h-16" : "h-28"
        }`}
      >
        {feed.length === 0 && (
          <p className="text-gray-500 text-[10px] text-center py-3">Chat live...</p>
        )}
        {feed.map((item) =>
          item.kind === "event" ? (
            <div key={item.id} className={`text-[10px] leading-tight truncate ${TONE_CLASS[item.tone]}`}>
              {item.text}
            </div>
          ) : (
            <div key={item.id} className={`text-[10px] leading-tight truncate ${item.id.startsWith("temp-") ? "opacity-60" : ""}`}>
              <span className="text-ipl-gold font-semibold">{item.name}: </span>
              <span className="text-gray-300">{item.text}</span>
            </div>
          )
        )}
      </div>

      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && send()}
        disabled={disabled}
        placeholder={disabled ? "Spectators only" : "Type & Enter to send..."}
        maxLength={200}
        className="w-full px-3 py-2 bg-ipl-dark/80 border border-ipl-border rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-ipl-gold disabled:opacity-50"
      />
    </div>
  );
}
