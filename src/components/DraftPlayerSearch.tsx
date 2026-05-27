"use client";

import { useMemo, useState } from "react";
import { Player, RoomState } from "@/lib/types";
import {
  getDraftPoolPlayersForGender,
  getDraftPoolSizeForGender,
  getDraftPoolLabelForGender,
} from "@/lib/draftPlayerPool";
import { DRAFT_SQUAD_MAX } from "@/lib/draftRules";
import { Socket } from "socket.io-client";

interface DraftPlayerSearchProps {
  roomState: RoomState;
  myTeamId: string | null;
  socket: Socket;
  /** When true, list shares space with embedded chat on main draft tab */
  embedded?: boolean;
}

const ROLE_FILTERS = ["ALL", "BATTER", "BOWLER", "ALL-ROUNDER", "WICKETKEEPER"] as const;

/** ~3 player rows visible before scrolling in embedded draft layout */
const EMBEDDED_LIST_MAX_HEIGHT = "max-h-[10.25rem]";

export default function DraftPlayerSearch({ roomState, myTeamId, socket, embedded }: DraftPlayerSearchProps) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<string>("ALL");

  const draft = roomState.draft;
  const isMyTurn = !!myTeamId && draft?.currentPickerId === myTeamId;
  const gender = roomState.draftGender || "mens";

  const draftedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const team of Object.values(roomState.teams)) {
      for (const p of team.squad) ids.add(p.id);
    }
    return ids;
  }, [roomState.teams]);

  const poolSize = useMemo(() => getDraftPoolSizeForGender(gender), [gender]);
  const poolLabel = useMemo(() => getDraftPoolLabelForGender(gender), [gender]);

  const pool = useMemo(() => {
    const all = getDraftPoolPlayersForGender(gender);
    const available = draft?.availablePlayerIds
      ? all.filter((p) => draft.availablePlayerIds.includes(p.id))
      : all.filter((p) => !draftedIds.has(p.id));
    const q = query.trim().toLowerCase();
    return available.filter((p) => {
      if (role !== "ALL" && p.role !== role) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.country.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q)
      );
    });
  }, [gender, draft?.availablePlayerIds, draftedIds, query, role]);

  function handleDraft(player: Player) {
    if (!isMyTurn) return;
    socket.emit("make-draft-pick", { playerId: player.id }, (res: { success?: boolean }) => {
      if (!res?.success) return;
    });
  }

  const mySquad = myTeamId ? roomState.teams[myTeamId]?.squad.length ?? 0 : 0;

  return (
    <div
      className={`flex flex-col gap-1.5 px-2 ${embedded ? "shrink-0 pt-1" : "flex-1 min-h-0"}`}
    >
      <div className="shrink-0 sticky top-0 z-10 bg-[#0A0A0A]/95 pb-1 space-y-1.5">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search player to draft..."
          autoComplete="off"
          className="w-full pro-input text-sm py-2.5 border-ipl-gold/30 focus:border-ipl-gold/60"
        />
        <p className="text-[10px] text-gray-500 text-center leading-snug">
          {pool.length} available · {poolSize} in pool · all franchise leagues (Legend excluded)
        </p>
        {!embedded && (
          <p className="text-[9px] text-gray-600 text-center">{poolLabel}</p>
        )}
        {isMyTurn && (
          <p className="text-center text-xs font-bold text-ipl-gold animate-pulse py-0.5">
            Your pick — tap Draft ({mySquad}/{DRAFT_SQUAD_MAX})
          </p>
        )}
      </div>
      <div className="shrink-0 flex gap-1 overflow-x-auto scrollbar-hide">
        {ROLE_FILTERS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={`shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold ${
              role === r ? "bg-ipl-gold/25 text-ipl-gold border border-ipl-gold/50" : "bg-ipl-card text-gray-500"
            }`}
          >
            {r === "ALL" ? "All" : r.replace("-", " ")}
          </button>
        ))}
      </div>
      <div
        className={
          embedded
            ? `shrink-0 ${EMBEDDED_LIST_MAX_HEIGHT} overflow-y-auto space-y-1 pb-1 scrollbar-hide`
            : "flex-1 min-h-0 overflow-y-auto space-y-1 pb-1"
        }
      >
        {pool.map((player) => (
          <div
            key={player.id}
            className="flex items-center gap-2 p-2 rounded-xl bg-ipl-card/60 border border-ipl-border/40 min-h-[3.125rem]"
          >
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-white truncate">{player.name}</div>
              <div className="text-[10px] text-gray-500">
                {player.role.replace("-", " ")} · {player.country}
                {player.isOverseas ? " · OS" : ""}
              </div>
            </div>
            <button
              type="button"
              disabled={!isMyTurn}
              onClick={() => handleDraft(player)}
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-black bg-ipl-gold text-black disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Draft
            </button>
          </div>
        ))}
        {pool.length === 0 && (
          <p className="text-center text-gray-500 text-sm py-8">No players match your search</p>
        )}
        {embedded && pool.length > 3 && (
          <p className="text-[9px] text-center text-gray-600 py-0.5">Scroll for more players ↓</p>
        )}
      </div>
    </div>
  );
}
