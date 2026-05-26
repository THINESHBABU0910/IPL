"use client";

import { useState, useEffect, useMemo } from "react";
import { RoomState, Player } from "@/lib/types";
import { Socket } from "socket.io-client";
import { getLeagueConfig, getTeamMapForLeague } from "@/data/leagueRegistry";
import { getAllPlayers } from "@/data/playerLoader";
import {
  calculateRetentionCostForLeague,
  formatLeaguePrice,
} from "@/lib/leagueRules";
import { calculateFlexRetentionCost } from "@/lib/constants";

interface RetentionPhaseProps {
  roomState: RoomState;
  myTeamId: string | null;
  socket: Socket;
}

function mapPlayer(p: Player, league: import("@/lib/types").LeagueId): Player {
  const basePriceLakhs = p.basePrice / 100000;
  return { ...p, basePriceLakhs, displayPrice: formatLeaguePrice(basePriceLakhs, league) };
}

function defaultFlexPrice(player: Player, uncappedCost: number): number {
  if (!player.isCapped) return uncappedCost;
  return Math.max(player.basePriceLakhs, uncappedCost);
}

export default function RetentionPhase({ roomState, myTeamId, socket }: RetentionPhaseProps) {
  const league = roomState.league;
  const rules = getLeagueConfig(league).rules;
  const teamMap = getTeamMapForLeague(league);
  const isFlexMode = roomState.mode === "flex_retention";
  const maxCapped = isFlexMode ? rules.flexMaxCappedRetentions : rules.maxCappedRetentions;
  const maxUncapped = isFlexMode ? rules.flexMaxUncappedRetentions : rules.maxUncappedRetentions;
  const maxRetentions = rules.maxRetentions;
  const totalPurse = rules.totalPurse;

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [customPrices, setCustomPrices] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [timerSeconds, setTimerSeconds] = useState(roomState.retentionTimeLeft);

  useEffect(() => { setTimerSeconds(roomState.retentionTimeLeft); }, [roomState.retentionTimeLeft]);

  useEffect(() => {
    const handler = (data: { seconds: number; type?: string }) => {
      if (data.type === "retention") setTimerSeconds(data.seconds);
    };
    socket.on("timer-tick", handler);
    return () => { socket.off("timer-tick", handler); };
  }, [socket]);

  const myTeam = myTeamId ? roomState.teams[myTeamId] : null;
  const isLocked = myTeam?.retentionLocked ?? false;

  const allPlayers = useMemo(
    () => getAllPlayers(league).map((p) => mapPlayer(p, league)),
    [league],
  );

  const squadPlayers = useMemo(() => {
    if (!myTeamId) return [];
    return allPlayers.filter((p) => p.previousTeam === myTeamId);
  }, [allPlayers, myTeamId]);

  const takenByOthers = useMemo(() => {
    const ids = new Set<string>();
    for (const [tid, team] of Object.entries(roomState.teams)) {
      if (tid === myTeamId) continue;
      if (team.retentionLocked) {
        team.retainedPlayers.forEach((p) => ids.add(p.id));
      }
    }
    return ids;
  }, [roomState.teams, myTeamId]);

  const playerPool = isFlexMode ? allPlayers : squadPlayers;
  const playerMap = useMemo(() => new Map(playerPool.map((p) => [p.id, p])), [playerPool]);

  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return playerPool.filter((p) => {
      if (takenByOthers.has(p.id) && !selectedIds.includes(p.id)) return false;
      if (!q) return true;
      const teamName = p.previousTeam && teamMap[p.previousTeam] ? teamMap[p.previousTeam].name : p.previousTeam;
      return (
        p.name.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q) ||
        p.country.toLowerCase().includes(q) ||
        (teamName && teamName.toLowerCase().includes(q)) ||
        (p.previousTeam && p.previousTeam.toLowerCase().includes(q))
      );
    });
  }, [playerPool, search, takenByOthers, selectedIds]);

  const selectedPlayers = useMemo(() =>
    selectedIds.map((id) => playerMap.get(id)).filter(Boolean) as Player[],
  [selectedIds, playerMap]);

  const retentionCost = useMemo(() => {
    if (isFlexMode) return calculateFlexRetentionCost(customPrices, selectedIds);
    return calculateRetentionCostForLeague(league, selectedPlayers);
  }, [isFlexMode, customPrices, selectedIds, selectedPlayers]);

  const cappedCount = selectedPlayers.filter((p) => p.isCapped).length;
  const uncappedCount = selectedPlayers.filter((p) => !p.isCapped).length;
  const overseasCount = selectedPlayers.filter((p) => p.isOverseas).length;

  function togglePlayer(playerId: string) {
    if (isLocked) return;
    const player = playerMap.get(playerId);
    if (!player) return;
    if (takenByOthers.has(playerId)) return;

    if (selectedIds.includes(playerId)) {
      setSelectedIds(selectedIds.filter((id) => id !== playerId));
      setCustomPrices((prev) => {
        const next = { ...prev };
        delete next[playerId];
        return next;
      });
    } else {
      if (selectedIds.length >= maxRetentions) return;
      if (player.isCapped && cappedCount >= maxCapped) return;
      if (!player.isCapped && uncappedCount >= maxUncapped) return;
      setSelectedIds([...selectedIds, playerId]);
      if (isFlexMode) {
        setCustomPrices((prev) => ({ ...prev, [playerId]: defaultFlexPrice(player, rules.retentionCostUncapped) }));
      }
    }
  }

  function setPlayerPrice(playerId: string, lakhs: number) {
    if (isLocked) return;
    setCustomPrices((prev) => ({ ...prev, [playerId]: Math.max(0, lakhs) }));
  }

  function handleLock(skip = false) {
    if (skip) {
      socket.emit("lock-retentions", { playerIds: [] });
      return;
    }
    const ids = selectedIds.map((id) => String(id).trim());
    if (isFlexMode) {
      const prices: Record<string, number> = {};
      for (const id of ids) {
        prices[id] = Math.round(Number(customPrices[id]) || 0);
      }
      if (!ids.every((id) => prices[id] > 0)) return;
      socket.emit("lock-retentions", { playerIds: ids, customPrices: prices });
    } else {
      socket.emit("lock-retentions", { playerIds: ids });
    }
  }

  const minutes = Math.floor(timerSeconds / 60);
  const seconds = timerSeconds % 60;
  const purseLeft = totalPurse - retentionCost;
  const canLock = !isLocked && selectedIds.length > 0 && purseLeft >= 0 &&
    (!isFlexMode || selectedIds.every((id) => (Number(customPrices[id]) || 0) > 0));
  const canSkip = !isLocked;

  if (!myTeamId) {
    return (
      <div className="panel-fill flex items-center justify-center px-4">
        <p className="text-center text-gray-400 text-sm">
          Pick a free team above to join. Retention is closed — you bid in the auction with full purse & RTM per mode rules.
        </p>
      </div>
    );
  }

  if (isLocked && myTeam && myTeam.retainedPlayers.length === 0 && roomState.auction.phase === "retention") {
    return (
      <div className="panel-fill flex flex-col items-center justify-center px-4 gap-2">
        <p className="text-center text-gray-300 text-sm font-semibold">Retention skipped for {myTeam.shortName}</p>
        <p className="text-center text-gray-500 text-xs">Full ₹120 Cr purse · waiting for other teams to lock</p>
      </div>
    );
  }

  return (
    <div className="panel-fill flex flex-col px-2 pb-1">
      <div className="shrink-0 retention-banner rounded-xl px-3 py-2 mb-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-ipl-gold/80 font-semibold">
              {isFlexMode ? "Flex Retention" : "Official IPL Retention"}
            </div>
            <div className={`text-2xl font-mono font-black leading-none mt-0.5 ${timerSeconds <= 30 ? "text-red-400 animate-pulse" : "text-white"}`}>
              {minutes}:{seconds.toString().padStart(2, "0")}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-gray-400">Spent</div>
            <div className="text-lg font-bold text-red-400">{formatLeaguePrice(retentionCost, league)}</div>
            <div className="text-[10px] text-emerald-400">Left {formatLeaguePrice(purseLeft, league)}</div>
          </div>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-black/40 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-ipl-gold to-yellow-300 transition-all duration-300"
            style={{ width: `${Math.min(100, (retentionCost / totalPurse) * 100)}%` }}
          />
        </div>
      </div>

      {!isFlexMode && (
        <p className="shrink-0 text-[10px] text-gray-500 px-1 mb-1.5">
          Pick from your squad · Official retention slabs apply
        </p>
      )}
      {isFlexMode && (
        <p className="shrink-0 text-[10px] text-purple-300/80 px-1 mb-1.5">
          Pick any player · Set your own price (up to ₹120 Cr each) · Max {maxCapped} capped + {maxUncapped} uncapped
        </p>
      )}
      {!isFlexMode && roomState.mode === "custom_retention" && (
        <p className="shrink-0 text-[10px] text-amber-400/90 px-1 mb-1.5">
          IPL Retention: squad players only. For any player at custom prices, create a Flex Retention room.
        </p>
      )}

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={isFlexMode ? "Search name, role, country, team..." : "Search your squad..."}
        className="shrink-0 mb-1.5 pro-input text-xs"
      />

      {isFlexMode && search && (
        <p className="shrink-0 text-[10px] text-gray-500 px-1 mb-1">
          {filteredPlayers.length} player{filteredPlayers.length !== 1 ? "s" : ""} found
        </p>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5">
        {filteredPlayers.map((player) => {
          const isSelected = selectedIds.includes(player.id);
          const isTaken = takenByOthers.has(player.id);
          const canSelect = !isLocked && !isTaken && selectedIds.length < maxRetentions &&
            (player.isCapped ? cappedCount < maxCapped : uncappedCount < maxUncapped);
          const slotIdx = isSelected ? selectedIds.indexOf(player.id) : -1;
          const flexPrice = customPrices[player.id];
          const prevTeam = player.previousTeam && teamMap[player.previousTeam];

          return (
            <div
              key={player.id}
              className={`rounded-xl border transition-all ${
                isTaken ? "border-red-500/30 bg-red-900/10 opacity-60"
                  : isSelected ? "border-ipl-gold/50 bg-ipl-gold/10"
                  : "border-ipl-border/40 bg-ipl-card/30"
              }`}
            >
              <button
                type="button"
                onClick={() => togglePlayer(player.id)}
                disabled={isLocked || isTaken || (!isSelected && !canSelect)}
                className={`w-full flex items-center gap-2 px-2.5 py-2 text-left text-xs ${
                  isLocked || isTaken || (!isSelected && !canSelect) ? "opacity-50" : ""
                }`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                  isSelected ? "bg-ipl-gold text-black" : "bg-ipl-dark text-gray-500 border border-ipl-border"
                }`}>
                  {isTaken ? "✕" : isSelected ? slotIdx + 1 : "+"}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block truncate font-semibold text-white">{player.name}</span>
                  <span className="text-[9px] text-gray-500">
                    {player.role} · {player.displayPrice}
                    {prevTeam && ` · ${prevTeam.shortName}`}
                  </span>
                </span>
                <div className="flex gap-1 shrink-0">
                  {player.isOverseas && <span className="badge badge-blue">OS</span>}
                  {player.isCapped ? <span className="badge badge-blue text-[8px]">CAP</span> : <span className="badge badge-purple">UC</span>}
                </div>
              </button>

              {isFlexMode && isSelected && (
                <div className="px-2.5 pb-2 flex items-center gap-2">
                  <label className="text-[10px] text-gray-400 shrink-0">Price (L)</label>
                  <input
                    type="number"
                    min={30}
                    step={5}
                    value={flexPrice ?? ""}
                    onChange={(e) => setPlayerPrice(player.id, parseInt(e.target.value, 10) || 0)}
                    disabled={isLocked}
                    className="flex-1 pro-input py-1.5 text-xs font-mono text-ipl-gold"
                  />
                  <span className="text-[10px] text-gray-500 shrink-0">
                    {formatLeaguePrice(flexPrice ?? 0, league)}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="shrink-0 pt-2 border-t border-ipl-border/50">
        <div className="flex justify-between text-[10px] text-gray-400 mb-2 px-1">
          <span>
            {selectedPlayers.length}/{maxRetentions}
            {` · Cap ${cappedCount}/${maxCapped} · UC ${uncappedCount}/${maxUncapped}`}
            {` · OS ${overseasCount}/8`}
          </span>
          <span>RTM: {maxRetentions - selectedPlayers.length}</span>
        </div>
        {!isLocked ? (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => handleLock(false)}
              disabled={!canLock}
              className="w-full py-3 bid-btn rounded-xl text-black font-bold text-sm disabled:opacity-40"
            >
              Lock Retentions · {formatLeaguePrice(retentionCost, league)}
            </button>
            <button
              type="button"
              onClick={() => handleLock(true)}
              disabled={!canSkip}
              className="w-full py-2.5 rounded-xl border border-ipl-border/60 text-gray-400 text-xs font-semibold disabled:opacity-30"
            >
              Skip retention · keep full ₹120 Cr for auction
            </button>
          </div>
        ) : (
          <div className="text-center py-2.5 bg-emerald-600/20 border border-emerald-500/30 rounded-xl text-emerald-400 font-semibold text-sm">
            Retentions Locked ✓
          </div>
        )}
      </div>
    </div>
  );
}
