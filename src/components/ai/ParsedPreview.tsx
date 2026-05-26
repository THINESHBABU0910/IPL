"use client";

import type { ParsedTeam } from "@/lib/ai/matchSchema";

interface ParsedPreviewProps {
  teamA: ParsedTeam | null;
  teamB: ParsedTeam | null;
  errors: string[];
  warnings: string[];
}

export function ParsedPreview({ teamA, teamB, errors, warnings }: ParsedPreviewProps) {
  if (!teamA && !teamB) return null;

  return (
    <div className="rounded-2xl border border-ipl-border/60 bg-ipl-card/40 p-3 space-y-2">
      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
        Parsed JSON Preview
      </p>

      {errors.length > 0 && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2 space-y-1">
          {errors.map((e) => (
            <div key={e}>• {e}</div>
          ))}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 space-y-1">
          {warnings.map((w) => (
            <div key={w}>• {w}</div>
          ))}
        </div>
      )}

      <div className="grid gap-2 md:grid-cols-2">
        {teamA && (
          <pre className="text-[10px] leading-relaxed overflow-auto max-h-48 p-2 rounded-lg bg-black/40 border border-ipl-border/40 text-gray-300">
            {JSON.stringify(teamA, null, 2)}
          </pre>
        )}
        {teamB && (
          <pre className="text-[10px] leading-relaxed overflow-auto max-h-48 p-2 rounded-lg bg-black/40 border border-ipl-border/40 text-gray-300">
            {JSON.stringify(teamB, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
