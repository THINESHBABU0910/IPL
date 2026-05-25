"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RoomState } from "@/lib/types";
import { formatPrice, MAX_OVERSEAS, MAX_SQUAD_SIZE } from "@/lib/constants";
import TeamLogo from "./TeamLogo";
import {
  getTeamSoldPrices, getSortedTeamIds, getTeamPlayers, getTeamSpent,
  groupPlayersByRole, isTeamOwnerHost,
} from "@/lib/squadUtils";
import { downloadSquadShareImage, shareSquadImage } from "@/lib/squadShareImage";
import { toast } from "sonner";

interface SquadTeamAccordionProps {
  roomState: RoomState;
  myTeamId: string | null;
  playerName?: string;
  isHost?: boolean;
  defaultExpandedId?: string | null;
  showActions?: boolean;
}

export default function SquadTeamAccordion({
  roomState, myTeamId, playerName, isHost, defaultExpandedId, showActions = false,
}: SquadTeamAccordionProps) {
  const teamIds = getSortedTeamIds(roomState, myTeamId);
  const defaultId = defaultExpandedId
    ?? myTeamId
    ?? teamIds.find((id) => getTeamPlayers(id, roomState).length > 0)
    ?? teamIds[0]
    ?? null;

  const [expandedId, setExpandedId] = useState<string | null>(defaultId);
  const [busyTeam, setBusyTeam] = useState<string | null>(null);

  async function handleSave(teamId: string) {
    const team = roomState.teams[teamId];
    const allPlayers = getTeamPlayers(teamId, roomState);
    if (allPlayers.length === 0) {
      toast.error("No players in squad yet");
      return;
    }
    setBusyTeam(teamId);
    try {
      const retainedIds = new Set(team.retainedPlayers.map((p) => p.id));
      await downloadSquadShareImage({
        teamName: team.name,
        shortName: team.shortName,
        ownerName: teamId === myTeamId ? (playerName || team.ownerName) : team.ownerName,
        primaryColor: team.primaryColor,
        purseLeft: team.purse,
        players: allPlayers,
        soldPrices: getTeamSoldPrices(teamId, roomState),
        retainedIds,
      }, `${team.shortName}-ipl2026-squad.png`);
      toast.success("Squad image saved!");
    } catch {
      toast.error("Could not save squad image");
    } finally {
      setBusyTeam(null);
    }
  }

  async function handleShare(teamId: string) {
    const team = roomState.teams[teamId];
    const allPlayers = getTeamPlayers(teamId, roomState);
    if (allPlayers.length === 0) {
      toast.error("No players in squad yet");
      return;
    }
    setBusyTeam(teamId);
    try {
      const retainedIds = new Set(team.retainedPlayers.map((p) => p.id));
      const result = await shareSquadImage({
        teamName: team.name,
        shortName: team.shortName,
        ownerName: teamId === myTeamId ? (playerName || team.ownerName) : team.ownerName,
        primaryColor: team.primaryColor,
        purseLeft: team.purse,
        players: allPlayers,
        soldPrices: getTeamSoldPrices(teamId, roomState),
        retainedIds,
      }, `${team.shortName}-ipl2026-squad.png`);
      toast.success(result === "shared" ? "Squad shared!" : "Squad image saved!");
    } catch {
      toast.error("Could not share squad image");
    } finally {
      setBusyTeam(null);
    }
  }

  return (
    <div className="space-y-2">
      {teamIds.map((teamId) => {
        const team = roomState.teams[teamId];
        const allPlayers = getTeamPlayers(teamId, roomState);
        const overseas = allPlayers.filter((p) => p.isOverseas).length;
        const spent = getTeamSpent(teamId, roomState);
        const isMine = teamId === myTeamId;
        const isExpanded = expandedId === teamId;
        const ownerOnline = team.isOnline !== false && !team.isVacant;
        const teamIsHost = isTeamOwnerHost(teamId, roomState);
        const soldPrices = getTeamSoldPrices(teamId, roomState);
        const retainedIds = new Set(team.retainedPlayers.map((p) => p.id));
        const grouped = groupPlayersByRole(allPlayers);
        const canAct = allPlayers.length > 0 && (
          showActions || roomState.auction.phase === "completed" || isMine
        );
        const busy = busyTeam === teamId;

        return (
          <div key={teamId} className="ref-card overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : teamId)}
              className="w-full flex items-center gap-2 p-3 hover:bg-white/5 transition text-left"
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${ownerOnline ? "bg-green-400" : "bg-gray-600"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-sm text-white truncate">
                    {team.isVacant ? "Open slot" : (isMine ? (playerName || team.ownerName) : team.ownerName)}
                  </span>
                  {isMine && <span className="ref-pill ref-pill-gold text-[8px]">YOU</span>}
                  {teamIsHost && <span className="ref-pill ref-pill-purple text-[8px]">HOST</span>}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <TeamLogo teamId={teamId} logoUrl={team.logoUrl} shortName={team.shortName} size={18} />
                  <span className="text-[10px] text-gray-400 truncate">{team.name}</span>
                  <span className="text-[10px] text-gray-500">· {allPlayers.length} players</span>
                </div>
              </div>
              <span className={`text-gray-500 text-xs transition-transform ${isExpanded ? "rotate-180" : ""}`}>▼</span>
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-[#2A2A2A]"
                >
                  <div className="p-3 pt-2 space-y-3">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                      <span className="text-gray-400">OS: <span className="text-white font-bold">{overseas}/{MAX_OVERSEAS}</span></span>
                      <span className="text-gray-400">Purse: <span className="text-[#22C55E] font-bold">{formatPrice(team.purse)}</span></span>
                      <span className="text-gray-400">Spent: <span className="text-[#FFD700] font-bold">{formatPrice(spent)}</span></span>
                      <span className="text-gray-400">Squad: <span className="text-white font-bold">{allPlayers.length}/{MAX_SQUAD_SIZE}</span></span>
                    </div>

                    {grouped.map(({ role, label, players }) => (
                      <div key={role}>
                        <div className="text-[10px] font-bold text-[#22C55E] uppercase tracking-wider mb-1.5">
                          {label} ({players.length})
                        </div>
                        <div className="space-y-1">
                          {players.map((p) => {
                            const isRetained = retainedIds.has(p.id);
                            const price = soldPrices[p.id];
                            return (
                              <PlayerRow
                                key={p.id}
                                name={p.name}
                                price={price != null ? formatPrice(price) : p.displayPrice}
                                overseas={p.isOverseas}
                                retained={isRetained}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {allPlayers.length === 0 && (
                      <p className="text-center text-gray-500 text-xs py-4">No players yet</p>
                    )}

                    {canAct && (
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleSave(teamId)}
                          disabled={busy}
                          className="flex-1 py-2.5 rounded-xl border border-[#2A2A2A] text-white text-xs font-bold disabled:opacity-40 flex items-center justify-center gap-1"
                        >
                          {busy ? "..." : "⬇ Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleShare(teamId)}
                          disabled={busy}
                          className="flex-1 py-2.5 rounded-xl border border-[#FFD700]/40 text-[#FFD700] text-xs font-bold disabled:opacity-40 flex items-center justify-center gap-1"
                        >
                          {busy ? "..." : "↗ Share"}
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

function PlayerRow({ name, price, overseas, retained }: { name: string; price: string; overseas: boolean; retained?: boolean }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A]/80">
      <div className="flex items-center gap-2 min-w-0">
        <span className="truncate text-sm font-medium text-white">{name}</span>
        {overseas && <span className="text-purple-400 text-[10px] shrink-0" title="Overseas">🌐</span>}
        {retained && <span className="ref-pill ref-pill-gold text-[8px] shrink-0">RET</span>}
      </div>
      <span className="text-sm font-bold text-[#22C55E] shrink-0 ml-2">{price}</span>
    </div>
  );
}
