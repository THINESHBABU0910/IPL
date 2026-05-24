"use client";

import { ActivityEntry } from "@/lib/types";

interface ActivityFeedProps {
  entries: ActivityEntry[];
}

const TYPE_COLORS: Record<string, string> = {
  bid: "text-yellow-400",
  sold: "text-green-400",
  unsold: "text-red-400",
  system: "text-gray-400",
  rtm: "text-purple-400",
};

export default function ActivityFeed({ entries }: ActivityFeedProps) {
  return (
    <div className="bg-ipl-card/60 border border-ipl-border rounded-lg p-2 max-h-48 overflow-y-auto">
      <div className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Live Feed</div>
      <div className="space-y-1">
        {entries.slice(0, 30).map((e) => (
          <div key={e.id} className={`text-xs ${TYPE_COLORS[e.type] || "text-gray-300"}`}>
            {e.text}
          </div>
        ))}
        {entries.length === 0 && (
          <p className="text-xs text-gray-500">Auction activity will appear here</p>
        )}
      </div>
    </div>
  );
}
