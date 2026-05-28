"use client";

import { useMemo, useState } from "react";
import TeamLogo from "@/components/TeamLogo";
import { IPL_TEAMS } from "@/data/leagues/ipl/teams";
import { SAMPLE_LEAGUE_SCORECARDS } from "@/data/sampleLeagueScorecards";
import {
  computeStandingsFromScorecardText,
  formatNrr,
} from "@/lib/ai/scorecardStandings";

const teamMeta = Object.fromEntries(IPL_TEAMS.map((t) => [t.id, t]));

export default function PointsTablePanel() {
  const [text, setText] = useState(SAMPLE_LEAGUE_SCORECARDS);
  const [showMatches, setShowMatches] = useState(true);

  const result = useMemo(() => computeStandingsFromScorecardText(text), [text]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setText(SAMPLE_LEAGUE_SCORECARDS)}
          className="text-[10px] px-3 py-1.5 rounded-lg border border-ipl-border/60 text-gray-400 hover:text-ipl-gold"
        >
          Load 45-match sample
        </button>
        <button
          type="button"
          onClick={() => setText("")}
          className="text-[10px] px-3 py-1.5 rounded-lg border border-ipl-border/60 text-gray-400"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => setShowMatches((s) => !s)}
          className="text-[10px] px-3 py-1.5 rounded-lg border border-ipl-gold/40 text-ipl-gold ml-auto"
        >
          {showMatches ? "Hide" : "Show"} match list
        </button>
      </div>

      <div>
        <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold block mb-1">
          Paste scorecards (one innings per line)
        </label>
        <p className="text-[9px] text-gray-600 mb-1.5">
          Format: TEAM-192/5(20overs) · 19.4 = 19 overs 4 balls · PUNJAB → PBKS · Invalid lines show errors
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          className="pro-input text-xs font-mono leading-relaxed resize-y min-h-[140px]"
          spellCheck={false}
        />
      </div>

      {result.errors.length > 0 && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[10px] text-red-200/90 space-y-0.5 max-h-28 overflow-y-auto">
          {result.errors.map((e, i) => (
            <div key={i}>{e}</div>
          ))}
        </div>
      )}

      {result.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[10px] text-amber-200/90 space-y-0.5 max-h-20 overflow-y-auto">
          {result.warnings.slice(0, 8).map((w, i) => (
            <div key={i}>{w}</div>
          ))}
          {result.warnings.length > 8 && (
            <div className="text-gray-500">+{result.warnings.length - 8} more all-out NRR adjustments</div>
          )}
        </div>
      )}

      <div
        className={`rounded-lg border px-3 py-2 text-[10px] ${
          result.validation.ok
            ? "border-green-500/30 bg-green-500/10 text-green-300/90"
            : "border-red-500/30 bg-red-500/10 text-red-200/90"
        }`}
      >
        {result.validation.checks.map((c, i) => (
          <div key={i}>{c}</div>
        ))}
      </div>

      <div className="ref-card overflow-hidden">
        <div className="px-3 py-2 border-b border-[#2A2A2A] flex items-center justify-between">
          <span className="text-xs font-bold text-ipl-gold uppercase tracking-wider">Points table</span>
          <span className="text-[10px] text-gray-500">
            {result.matches.length} matches
            {result.validation.ok ? " · verified" : ""}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-gray-500 border-b border-[#2A2A2A]">
                <th className="text-left py-2 pl-2 w-8">#</th>
                <th className="text-left py-2">Team</th>
                <th className="text-center py-2 px-1">M</th>
                <th className="text-center py-2 px-1">W</th>
                <th className="text-center py-2 px-1">L</th>
                <th className="text-center py-2 px-1 text-ipl-gold">Pts</th>
                <th className="text-right py-2 px-2">NRR</th>
              </tr>
            </thead>
            <tbody>
              {result.standings.map((row, idx) => {
                const meta = teamMeta[row.teamId];
                const q = idx < 4;
                return (
                  <tr
                    key={row.teamId}
                    className={`border-b border-[#2A2A2A]/60 ${q ? "bg-green-500/5" : ""}`}
                  >
                    <td className="py-2 pl-2 text-gray-500 font-mono">{idx + 1}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <TeamLogo
                          teamId={row.teamId}
                          logoUrl={meta.logoUrl}
                          shortName={row.shortName}
                          size={22}
                          league="ipl"
                        />
                        <span className="font-bold text-white">{row.shortName}</span>
                        {q && (
                          <span className="text-[8px] text-green-400 font-bold uppercase">Q</span>
                        )}
                      </div>
                    </td>
                    <td className="text-center text-gray-300">{row.played}</td>
                    <td className="text-center text-green-400 font-semibold">{row.won}</td>
                    <td className="text-center text-red-400/90">{row.lost}</td>
                    <td className="text-center text-ipl-gold font-black">{row.points}</td>
                    <td
                      className={`text-right pr-2 font-mono font-bold ${
                        row.nrr >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {formatNrr(row.nrr)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-3 py-2 text-[9px] text-gray-600 border-t border-[#2A2A2A] leading-relaxed">
          IPL NRR: (Runs ÷ Overs faced) − (Runs conceded ÷ Overs bowled). All-out (10 wkts) = full 20 overs
          for NRR. Win = 2 pts · Tie = 1 pt each. Sorted by Pts, then NRR.
        </div>
      </div>

      {showMatches && result.matches.length > 0 && (
        <div className="ref-card p-3 space-y-2 max-h-[40vh] overflow-y-auto">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Results</p>
          {result.matches.map((m) => {
            const [a, b] = m.innings;
            const metaA = teamMeta[a.teamId];
            const metaB = teamMeta[b.teamId];
            return (
              <div
                key={m.matchNo}
                className="text-[10px] border-b border-[#2A2A2A]/50 pb-2 last:border-0"
              >
                <div className="text-gray-500 mb-1">Match {m.matchNo}</div>
                <div className={m.winnerId === a.teamId ? "text-green-400" : "text-gray-300"}>
                  {metaA.shortName} {a.runs}/{a.wickets} ({a.overs} ov)
                  {m.winnerId === a.teamId ? " ✓" : ""}
                </div>
                <div className={m.winnerId === b.teamId ? "text-green-400" : "text-gray-300"}>
                  {metaB.shortName} {b.runs}/{b.wickets} ({b.overs} ov)
                  {m.winnerId === b.teamId ? " ✓" : ""}
                </div>
                <div className="text-ipl-gold/80 mt-0.5">{teamMeta[m.winnerId].shortName} won · {m.margin}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
