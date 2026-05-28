"use client";

import { useRouter } from "next/navigation";
import { LeagueId, GameType, DraftGender } from "@/lib/types";
import { getTeamMapForLeague, parseLeagueId } from "@/data/leagueRegistry";
import { listRoomArchives, isCompletedArchive } from "@/lib/roomArchive";
import { MODE_LABELS } from "./homeConstants";

const LEAGUE_LABELS: Record<LeagueId, string> = {
  ipl: "IPL",
  wpl: "WPL",
  hundred: "The Hundred",
  sa20: "SA20",
  bbl: "BBL",
  wbbl: "WBBL",
};

export interface RecentRoom {
  roomId: string;
  teamId: string;
  playerName: string;
  mode: string;
  league?: LeagueId;
  gameType?: GameType;
  draftGender?: DraftGender;
  joinedAt: number;
}

interface RecentRoomsListProps {
  rooms: RecentRoom[];
}

export default function RecentRoomsList({ rooms }: RecentRoomsListProps) {
  const router = useRouter();

  if (rooms.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="text-4xl opacity-40">🕐</span>
        <p className="text-gray-500 text-sm mt-3">No recent rooms</p>
      </div>
    );
  }

  return (
    <>
      {rooms.map((room) => {
        const league = parseLeagueId(room.league);
        const teamDef = room.teamId ? getTeamMapForLeague(league)[room.teamId] : null;
        const archive = listRoomArchives().find((a) => a.roomId === room.roomId);
        const completed = archive ? isCompletedArchive(archive) : false;
        return (
          <button
            key={room.roomId}
            type="button"
            onClick={() => {
              localStorage.setItem("playerName", room.playerName);
              router.push(`/room/${room.roomId}`);
            }}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-ipl-border/60 bg-ipl-card/50 text-left hover:border-ipl-gold/40 transition"
          >
            <span className="font-mono text-base font-bold text-ipl-gold">{room.roomId}</span>
            {room.gameType === "draft" ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-300">
                Draft {room.draftGender === "womens" ? "Womens" : "Mens"}
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-ipl-purple/30 text-gray-300">
                {LEAGUE_LABELS[league]}
              </span>
            )}
            {completed && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-900/40 text-green-300">
                Completed
              </span>
            )}
            {room.mode && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-ipl-purple/40 text-gray-300">
                {MODE_LABELS[room.mode] || room.mode}
              </span>
            )}
            {teamDef && (
              <span className="text-xs font-semibold" style={{ color: teamDef.primaryColor }}>
                {teamDef.shortName}
              </span>
            )}
            <span className="ml-auto text-xs text-ipl-gold font-semibold">Rejoin →</span>
          </button>
        );
      })}
    </>
  );
}
