"use client";

import { useEffect, useMemo } from "react";
import type { MatchHistoryEntry } from "@/lib/ai/matchHistory";
import { base64ToBlobUrl, deleteMatchFromHistory, downloadPdfFromBase64 } from "@/lib/ai/matchHistory";

interface MatchHistoryListProps {
  entries: MatchHistoryEntry[];
  onRefresh: () => void;
  onView: (entry: MatchHistoryEntry) => void;
}

export function MatchHistoryList({ entries, onRefresh, onView }: MatchHistoryListProps) {
  if (entries.length === 0) {
    return (
      <p className="text-xs text-gray-500 text-center py-4">No simulations yet</p>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-ipl-border/60 bg-ipl-card/40"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {entry.teamNames[0]} vs {entry.teamNames[1]}
            </p>
            <p className="text-[10px] text-gray-500">
              {entry.overs} ov · {entry.venue} · {new Date(entry.createdAt).toLocaleString()}
            </p>
            <p className="text-xs text-ipl-gold mt-0.5">{entry.winner} won</p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onView(entry)}
              className="text-[10px] px-2.5 py-1.5 rounded-lg bg-ipl-purple/40 border border-ipl-border/60 hover:border-ipl-gold/40"
            >
              View
            </button>
            {entry.pdfBase64 && (
              <button
                type="button"
                onClick={() => downloadPdfFromBase64(entry.pdfBase64, `IPL_${entry.id}.pdf`)}
                className="text-[10px] px-2.5 py-1.5 rounded-lg bg-ipl-gold/20 border border-ipl-gold/30 text-ipl-gold"
              >
                PDF
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                deleteMatchFromHistory(entry.id);
                onRefresh();
              }}
              className="text-[10px] px-2.5 py-1.5 rounded-lg border border-red-500/30 text-red-400"
            >
              Del
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MatchPdfPreview({ pdfBase64 }: { pdfBase64: string }) {
  const url = useMemo(() => (pdfBase64 ? base64ToBlobUrl(pdfBase64) : ""), [pdfBase64]);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  if (!url) return null;
  return (
    <iframe
      title="Match scorecard PDF"
      src={url}
      className="w-full h-[480px] rounded-xl border border-ipl-border/60 bg-white"
    />
  );
}
