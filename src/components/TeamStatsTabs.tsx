"use client";

import { useState } from "react";
import { RoomState } from "@/lib/types";
import { getTeamsForLeague, getTeamMapForLeague, getLeagueConfig } from "@/data/leagueRegistry";
import { formatLeaguePrice } from "@/lib/leagueRules";
import TeamLogo from "./TeamLogo";

interface TeamStatsTabsProps {
  roomState: RoomState;
  myTeamId: string | null;
  currentBidder: string | null;
}

export default function TeamStatsTabs({ roomState, myTeamId, currentBidder }: TeamStatsTabsProps) {
  const rules = getLeagueConfig(roomState.league).rules;
  const teamIds = getTeamsForLeague(roomState.league).map((t) => t.id).filter((id) => roomState.teams[id]);
  const [active, setActive] = useState(myTeamId && roomState.teams[myTeamId] ? myTeamId : teamIds[0] || teamIds[0]);

  const activeTeam = roomState.teams[active];

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex gap-1 overflow-x-auto pb-2 border-b border-ipl-border shrink-0">
        {teamIds.map((id) => {
          const t = roomState.teams[id];
          const total = t.squad.length + t.retainedPlayers.length;
          const os = [...t.squad, ...t.retainedPlayers].filter((p) => p.isOverseas).length;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActive(id)}
              className={`shrink-0 flex flex-col items-center px-2 py-1.5 rounded-lg border transition min-w-[72px] ${
                active === id ? "border-ipl-gold bg-ipl-gold/10" : "border-ipl-border/50 hover:border-gray-500"
              } ${currentBidder === id ? "ring-2 ring-ipl-gold" : ""}`}
            >
              <TeamLogo teamId={id} logoUrl={t.logoUrl} shortName={t.shortName} size={28} />
              <span className="text-[10px] font-bold mt-0.5" style={{ color: t.primaryColor }}>{t.shortName}</span>
              <span className="text-[9px] text-gray-500">{total}/{rules.maxSquadSize} · OS {os}/{rules.maxOverseas}</span>
            </button>
          );
        })}
      </div>

      {activeTeam && (
        <div className="flex-1 overflow-y-auto pt-3">
          <div className="flex items-center gap-3 mb-3">
            <TeamLogo teamId={activeTeam.id} logoUrl={activeTeam.logoUrl} shortName={activeTeam.shortName} size={44} />
            <div>
              <div className="font-bold text-lg" style={{ color: activeTeam.primaryColor }}>{activeTeam.name}</div>
              <div className="text-xs text-gray-400">Owner: {activeTeam.ownerName}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            <StatBox label="Purse Left" value={formatLeaguePrice(activeTeam.purse, roomState.league)} highlight />
            <StatBox label="Spent" value={formatLeaguePrice(rules.totalPurse - activeTeam.purse, roomState.league)} />
            <StatBox label="Players" value={`${activeTeam.squad.length + activeTeam.retainedPlayers.length}/${rules.maxSquadSize}`} />
            <StatBox label="Overseas" value={`${[...activeTeam.squad, ...activeTeam.retainedPlayers].filter((p) => p.isOverseas).length}/${rules.maxOverseas}`} />
            {activeTeam.rtmCards > 0 && <StatBox label="RTM Cards" value={String(activeTeam.rtmCards)} />}
          </div>

          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Squad</div>
          <div className="space-y-1">
            {activeTeam.retainedPlayers.map((p) => (
              <PlayerRow key={p.id} name={p.name} role={p.role} tag="Retained" overseas={p.isOverseas} />
            ))}
            {activeTeam.squad.map((p) => {
              const sale = roomState.auction.soldPlayers.find((s) => s.player.id === p.id && s.teamId === active);
              return (
                <PlayerRow
                  key={p.id}
                  name={p.name}
                  role={p.role}
                  tag={sale ? formatLeaguePrice(sale.price, roomState.league) : p.displayPrice}
                  overseas={p.isOverseas}
                />
              );
            })}
            {activeTeam.squad.length + activeTeam.retainedPlayers.length === 0 && (
              <p className="text-sm text-gray-500 py-4 text-center">No players yet</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-ipl-dark/50 rounded-lg p-2 text-center border border-ipl-border/30">
      <div className={`font-bold text-sm ${highlight ? "text-ipl-gold" : "text-white"}`}>{value}</div>
      <div className="text-[10px] text-gray-500">{label}</div>
    </div>
  );
}

function PlayerRow({ name, role, tag, overseas }: { name: string; role: string; tag: string; overseas: boolean }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-ipl-dark/30 rounded text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[10px] text-gray-500 w-16 shrink-0">{role}</span>
        <span className="truncate font-medium">{name}</span>
        {overseas && <span className="text-[9px] px-1 rounded bg-blue-500/20 text-blue-300 shrink-0">OS</span>}
      </div>
      <span className="text-xs text-ipl-gold font-semibold shrink-0 ml-2">{tag}</span>
    </div>
  );
}
