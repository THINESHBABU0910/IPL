"use client";

import { useState } from "react";
import { RoomState } from "@/lib/types";
import { formatPrice, MAX_OVERSEAS, TOTAL_PURSE } from "@/lib/constants";
import TeamLogo from "./TeamLogo";
import { IPL_TEAMS } from "@/data/teams";

interface SquadTabProps {
  roomState: RoomState;
  myTeamId: string | null;
  playerName?: string;
  isHost?: boolean;
}

const ROLE_ORDER = ["WICKETKEEPER", "BATTER", "ALL-ROUNDER", "BOWLER"] as const;
const ROLE_LABELS: Record<string, string> = {
  WICKETKEEPER: "WICKET-KEEPER",
  BATTER: "BATTER",
  "ALL-ROUNDER": "ALL-ROUNDER",
  BOWLER: "BOWLER",
};

export default function SquadTab({ roomState, myTeamId, playerName, isHost }: SquadTabProps) {
  const teamIds = IPL_TEAMS.map((t) => t.id).filter((id) => roomState.teams[id]);
  const [activeId, setActiveId] = useState(myTeamId && roomState.teams[myTeamId] ? myTeamId : teamIds[0] || "CSK");
  const team = roomState.teams[activeId];
  if (!team) return null;

  const allPlayers = [...team.retainedPlayers, ...team.squad];
  const overseas = allPlayers.filter((p) => p.isOverseas).length;
  const spent = TOTAL_PURSE - team.purse;
  const isMine = activeId === myTeamId;

  const grouped = ROLE_ORDER.map((role) => ({
    role,
    label: ROLE_LABELS[role],
    players: allPlayers.filter((p) => p.role === role),
  })).filter((g) => g.players.length > 0);

  const retained = team.retainedPlayers;

  return (
    <div className="panel-fill px-2 pb-1 min-h-0">
      <div className="shrink-0 flex gap-1 overflow-x-auto pb-2 mb-1">
        {teamIds.map((id) => {
          const t = roomState.teams[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveId(id)}
              className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold ${
                activeId === id ? "border-[#22C55E] bg-green-900/20 text-[#22C55E]" : "border-[#2A2A2A] text-gray-400"
              }`}
            >
              <TeamLogo teamId={id} logoUrl={t.logoUrl} shortName={t.shortName} size={16} />
              {t.shortName}
            </button>
          );
        })}
      </div>

      <div className="scroll-panel space-y-3">
        <div className="ref-card">
          <div className="flex items-center gap-2 mb-2">
            <TeamLogo teamId={team.id} logoUrl={team.logoUrl} shortName={team.shortName} size={32} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-sm text-white truncate">{isMine ? (playerName || team.ownerName) : team.ownerName}</span>
                {isMine && <span className="ref-pill ref-pill-gold text-[8px]">YOU</span>}
                {isMine && isHost && <span className="ref-pill ref-pill-purple text-[8px]">HOST</span>}
              </div>
              <div className="text-[10px] text-gray-400">{team.name} · {allPlayers.length} players</div>
            </div>
          </div>
          <div className="flex gap-3 text-[11px]">
            <span className="text-gray-400">OS: <span className="text-white font-bold">{overseas}/{MAX_OVERSEAS}</span></span>
            <span className="text-gray-400">Purse: <span className="text-[#22C55E] font-bold">{formatPrice(team.purse)}</span></span>
            <span className="text-gray-400">Spent: <span className="text-[#FFD700] font-bold">{formatPrice(spent)}</span></span>
          </div>
        </div>

        {retained.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-[#FFD700] uppercase tracking-wider mb-1.5">
              Retained ({retained.length})
            </div>
            <div className="space-y-1">
              {retained.map((p) => (
                <PlayerRow key={p.id} name={p.name} price={p.displayPrice} overseas={p.isOverseas} />
              ))}
            </div>
          </div>
        )}

        {grouped.map(({ role, label, players }) => {
          const auctioned = players.filter((p) => !team.retainedPlayers.some((r) => r.id === p.id));
          if (auctioned.length === 0) return null;
          return (
            <div key={role}>
              <div className="text-[10px] font-bold text-[#FFD700] uppercase tracking-wider mb-1.5">
                {label} ({auctioned.length})
              </div>
              <div className="space-y-1">
                {auctioned.map((p) => {
                  const sale = roomState.auction.soldPlayers.find((s) => s.player.id === p.id && s.teamId === activeId);
                  return (
                    <PlayerRow
                      key={p.id}
                      name={p.name}
                      price={sale ? formatPrice(sale.price) : p.displayPrice}
                      overseas={p.isOverseas}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        {allPlayers.length === 0 && (
          <p className="text-center text-gray-500 text-sm py-8">No players yet</p>
        )}
      </div>
    </div>
  );
}

function PlayerRow({ name, price, overseas }: { name: string; price: string; overseas: boolean }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A]/80">
      <div className="flex items-center gap-2 min-w-0">
        <span className="truncate text-sm font-medium text-white">{name}</span>
        {overseas && <span className="ref-pill ref-pill-purple text-[8px] shrink-0">OS</span>}
      </div>
      <span className="text-sm font-bold text-[#FFD700] shrink-0 ml-2">{price}</span>
    </div>
  );
}
