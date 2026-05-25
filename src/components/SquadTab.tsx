"use client";

import { useState } from "react";
import { RoomState } from "@/lib/types";
import { formatPrice, MAX_OVERSEAS, TOTAL_PURSE, MAX_SQUAD_SIZE } from "@/lib/constants";
import TeamLogo from "./TeamLogo";
import { IPL_TEAMS } from "@/data/teams";
import { shareSquadImage } from "@/lib/squadShareImage";
import { toast } from "sonner";

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
  const [sharing, setSharing] = useState(false);
  const team = roomState.teams[activeId];
  if (!team) return null;

  const allPlayers = [...team.retainedPlayers, ...team.squad];
  const overseas = allPlayers.filter((p) => p.isOverseas).length;
  const spent = TOTAL_PURSE - team.purse;
  const isMine = activeId === myTeamId;
  const retainedIds = new Set(team.retainedPlayers.map((p) => p.id));

  const soldPrices: Record<string, number> = {};
  for (const sale of roomState.auction.soldPlayers) {
    if (sale.teamId === activeId) soldPrices[sale.player.id] = sale.price;
  }
  for (const p of team.retainedPlayers) {
    soldPrices[p.id] = p.basePriceLakhs;
  }

  const grouped = ROLE_ORDER.map((role) => ({
    role,
    label: ROLE_LABELS[role],
    players: allPlayers.filter((p) => p.role === role),
  })).filter((g) => g.players.length > 0);

  const retained = team.retainedPlayers;
  const pursePct = Math.min(100, (spent / TOTAL_PURSE) * 100);

  async function handleShareSquad() {
    if (allPlayers.length === 0) {
      toast.error("Add players to your squad before sharing");
      return;
    }
    setSharing(true);
    try {
      const result = await shareSquadImage({
        teamName: team.name,
        shortName: team.shortName,
        ownerName: isMine ? (playerName || team.ownerName) : team.ownerName,
        primaryColor: team.primaryColor,
        purseLeft: team.purse,
        players: allPlayers,
        soldPrices,
        retainedIds,
      }, `${team.shortName}-ipl2026-squad.png`);
      toast.success(result === "shared" ? "Squad shared!" : "Squad image downloaded!");
    } catch {
      toast.error("Could not share squad image");
    } finally {
      setSharing(false);
    }
  }

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
              <div className="text-[10px] text-gray-400">{team.name} · IPL 2026 · {allPlayers.length}/{MAX_SQUAD_SIZE} players</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center mb-2">
            <div className="rounded-lg bg-black/30 px-2 py-1.5">
              <div className="text-[9px] text-gray-500 uppercase">Total Purse</div>
              <div className="text-sm font-bold text-white">{formatPrice(TOTAL_PURSE)}</div>
            </div>
            <div className="rounded-lg bg-black/30 px-2 py-1.5">
              <div className="text-[9px] text-gray-500 uppercase">Spent</div>
              <div className="text-sm font-bold text-[#FFD700]">{formatPrice(spent)}</div>
            </div>
            <div className="rounded-lg bg-black/30 px-2 py-1.5">
              <div className="text-[9px] text-gray-500 uppercase">Remaining</div>
              <div className="text-sm font-bold text-[#22C55E]">{formatPrice(team.purse)}</div>
            </div>
          </div>

          <div className="h-1.5 rounded-full bg-black/40 overflow-hidden mb-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#FFD700] to-orange-500 transition-all"
              style={{ width: `${pursePct}%` }}
            />
          </div>

          <div className="flex gap-3 text-[11px] mb-2">
            <span className="text-gray-400">OS: <span className="text-white font-bold">{overseas}/{MAX_OVERSEAS}</span></span>
            <span className="text-gray-400">Squad: <span className="text-white font-bold">{allPlayers.length}/{MAX_SQUAD_SIZE}</span></span>
          </div>

          {(isMine || roomState.auction.phase === "completed") && (
            <button
              type="button"
              onClick={handleShareSquad}
              disabled={sharing || allPlayers.length === 0}
              className="w-full py-2.5 rounded-xl border border-[#FFD700]/40 text-[#FFD700] text-xs font-bold disabled:opacity-40"
            >
              {sharing ? "Creating image..." : "📸 Share Squad Image"}
            </button>
          )}
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
          <p className="text-center text-gray-500 text-sm py-8">No players yet — pick your team and join the auction!</p>
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
