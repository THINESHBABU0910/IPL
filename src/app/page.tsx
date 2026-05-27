"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSocket } from "@/lib/socket";
import { AuctionMode, LeagueId, GameType, DraftGender } from "@/lib/types";
import { DRAFT_GENDER_TABS, getDraftSubtitle } from "@/lib/draftRules";
import { getTeamMapForLeague, getLeagueConfig, LEAGUE_TABS, parseLeagueId } from "@/data/leagueRegistry";
import { getModeSubtitle } from "@/lib/leagueRules";
import { saveSession, getSessionForRoom } from "@/lib/session";
import { listRoomArchives, isCompletedArchive } from "@/lib/roomArchive";
import { isValidPlayerName, normalizePlayerName } from "@/lib/validateName";

interface RecentRoom {
  roomId: string;
  teamId: string;
  playerName: string;
  mode: string;
  league?: LeagueId;
  gameType?: GameType;
  draftGender?: DraftGender;
  joinedAt: number;
}

const MODES: {
  id: AuctionMode;
  title: string;
  icon: string;
  accent: string;
}[] = [
  { id: "mega", title: "Mega Auction", icon: "🏟️", accent: "from-amber-500/20 to-orange-600/10" },
  { id: "custom_retention", title: "Official Retention", icon: "🔒", accent: "from-blue-500/20 to-indigo-600/10" },
  { id: "flex_retention", title: "Flex Retention", icon: "💰", accent: "from-emerald-500/20 to-teal-600/10" },
];

const MODE_LABELS: Record<string, string> = {
  mega: "Mega",
  custom_retention: "Retention",
  flex_retention: "Flex",
};

const LEAGUE_LABELS: Record<LeagueId, string> = {
  ipl: "IPL",
  wpl: "WPL",
  hundred: "The Hundred",
  sa20: "SA20",
  bbl: "BBL",
  wbbl: "WBBL",
};

const PREFERRED_LEAGUE_KEY = "preferredLeague";

function getRecentRooms(): RecentRoom[] {
  try {
    const raw = localStorage.getItem("recentRooms");
    if (!raw) return [];
    return JSON.parse(raw) as RecentRoom[];
  } catch { return []; }
}

function saveRecentRoom(entry: RecentRoom): void {
  const rooms = getRecentRooms().filter((r) => r.roomId !== entry.roomId);
  rooms.unshift(entry);
  localStorage.setItem("recentRooms", JSON.stringify(rooms.slice(0, 5)));
}

export default function HomePage() {
  const router = useRouter();
  const [screenTab, setScreenTab] = useState<"play" | "recent">("play");
  const [productTab, setProductTab] = useState<"auction" | "drafts">("auction");
  const [actionTab, setActionTab] = useState<"create" | "join">("create");
  const [selectedLeague, setSelectedLeague] = useState<LeagueId>("ipl");
  const [draftGender, setDraftGender] = useState<DraftGender>("mens");
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [selectedMode, setSelectedMode] = useState<AuctionMode>("mega");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);

  const leagueConfig = getLeagueConfig(selectedLeague);

  useEffect(() => {
    const saved = localStorage.getItem("playerName");
    if (saved) setName(saved);
    const savedLeague = localStorage.getItem(PREFERRED_LEAGUE_KEY);
    if (savedLeague) setSelectedLeague(parseLeagueId(savedLeague));
    setRecentRooms(getRecentRooms());
  }, []);

  useEffect(() => {
    localStorage.setItem(PREFERRED_LEAGUE_KEY, selectedLeague);
  }, [selectedLeague]);

  const handleCreate = useCallback(() => {
    const trimmed = normalizePlayerName(name);
    if (!isValidPlayerName(trimmed)) { setError("Name: 3–20 characters"); return; }
    setLoading(true);
    setError("");
    const payload = productTab === "drafts"
      ? { gameType: "draft" as const, draftGender, playerName: trimmed }
      : { mode: selectedMode, league: selectedLeague, gameType: "auction" as const, playerName: trimmed };
    getSocket().emit("create-room", payload, (res) => {
      setLoading(false);
      if (res.roomId && res.sessionToken) {
        localStorage.setItem("playerName", trimmed);
        saveSession({ roomId: res.roomId, sessionToken: res.sessionToken, playerName: trimmed });
        saveRecentRoom({
          roomId: res.roomId, teamId: "", playerName: trimmed,
          mode: productTab === "drafts" ? "draft" : selectedMode,
          league: productTab === "drafts" ? (draftGender === "womens" ? "wpl" : "ipl") : selectedLeague,
          gameType: productTab === "drafts" ? "draft" : "auction",
          draftGender: productTab === "drafts" ? draftGender : undefined,
          joinedAt: Date.now(),
        });
        router.push(`/room/${res.roomId}`);
      } else setError(res.error || "Failed");
    });
  }, [name, selectedMode, selectedLeague, productTab, draftGender, router]);

  const handleJoin = useCallback(() => {
    const trimmed = normalizePlayerName(name);
    if (!isValidPlayerName(trimmed)) { setError("Name: 3–20 characters"); return; }
    if (!joinCode.trim() || joinCode.trim().length < 4) { setError("Enter room code"); return; }
    setLoading(true);
    setError("");
    const code = joinCode.trim().toUpperCase();
    const stored = getSessionForRoom(code);
    getSocket().emit("join-room", {
      roomId: code,
      playerName: trimmed,
      sessionToken: stored?.sessionToken,
    }, (res) => {
      setLoading(false);
      if (res.success) {
        localStorage.setItem("playerName", trimmed);
        if (res.sessionToken) {
          saveSession({
            roomId: code,
            sessionToken: res.sessionToken,
            playerName: trimmed,
            teamId: res.teamId,
          });
        }
        saveRecentRoom({
          roomId: code,
          teamId: res.teamId || stored?.teamId || "",
          playerName: trimmed,
          mode: "",
          joinedAt: Date.now(),
        });
        router.push(`/room/${code}`);
      } else setError(res.error || "Failed");
    });
  }, [name, joinCode, router]);

  return (
    <div className="app-shell">
      <header className="app-header justify-center relative">
        <Link
          href="/ai"
          className="absolute left-3 text-[10px] font-semibold text-ipl-gold/90 hover:text-ipl-gold border border-ipl-gold/30 rounded-lg px-2 py-1"
        >
          AI Match Sim
        </Link>
        <div className="text-center">
          <h1 className="text-xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-ipl-gold via-yellow-300 to-ipl-gold bg-clip-text text-transparent animate-shimmer bg-[length:200%_100%]">
              {productTab === "drafts" ? "SNAKE DRAFT" : `${leagueConfig.shortLabel} ${leagueConfig.seasonLabel} AUCTION`}
            </span>
          </h1>
          <p className="text-[9px] text-gray-500 tracking-[0.25em] uppercase -mt-0.5">
            {productTab === "drafts" ? "Custom teams · Search & pick" : leagueConfig.tagline}
          </p>
        </div>
      </header>

      <main className="app-main px-3 py-2">
        {screenTab === "play" ? (
          <div className="panel-fill flex flex-col gap-2.5">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name..."
              maxLength={20}
              className="shrink-0 pro-input"
            />

            <div className="shrink-0 flex gap-1 p-1 rounded-2xl bg-ipl-card/50 border border-ipl-border/50">
              <button
                type="button"
                onClick={() => setProductTab("auction")}
                className={`action-pill flex-1 text-[11px] ${productTab === "auction" ? "action-pill-active" : "action-pill-inactive"}`}
              >
                Auction
              </button>
              <button
                type="button"
                onClick={() => setProductTab("drafts")}
                className={`action-pill flex-1 text-[11px] ${productTab === "drafts" ? "action-pill-active" : "action-pill-inactive"}`}
              >
                Drafts
              </button>
            </div>

            {productTab === "auction" ? (
            <div className="shrink-0 flex gap-1 p-1 rounded-2xl bg-ipl-card/50 border border-ipl-border/50">
              {LEAGUE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedLeague(tab.id)}
                  className={`action-pill flex-1 text-[11px] ${selectedLeague === tab.id ? "action-pill-active" : "action-pill-inactive"}`}
                >
                  <span className="mr-1">{tab.emoji}</span>{tab.label}
                </button>
              ))}
            </div>
            ) : (
            <div className="shrink-0 flex gap-1 p-1 rounded-2xl bg-ipl-card/50 border border-ipl-border/50">
              {DRAFT_GENDER_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDraftGender(tab.id)}
                  className={`action-pill flex-1 text-[11px] ${draftGender === tab.id ? "action-pill-active" : "action-pill-inactive"}`}
                >
                  <span className="mr-1">{tab.emoji}</span>{tab.label}
                </button>
              ))}
            </div>
            )}

            <div className="shrink-0 flex gap-1.5 p-1 rounded-2xl bg-ipl-card/50 border border-ipl-border/50">
              <button type="button" onClick={() => setActionTab("create")}
                className={`action-pill ${actionTab === "create" ? "action-pill-active" : "action-pill-inactive"}`}>
                Create Room
              </button>
              <button type="button" onClick={() => setActionTab("join")}
                className={`action-pill ${actionTab === "join" ? "action-pill-active" : "action-pill-inactive"}`}>
                Join Room
              </button>
            </div>

            {actionTab === "create" ? (
              <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto">
                {productTab === "auction" ? (
                <>
                <p className="shrink-0 text-[10px] text-gray-500 uppercase tracking-wider font-semibold px-1">
                  Choose auction mode · {leagueConfig.teams.length} teams
                </p>
                {MODES.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setSelectedMode(mode.id)}
                    className={`mode-card shrink-0 ${selectedMode === mode.id ? "mode-card-selected" : "mode-card-unselected"}`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${mode.accent} opacity-60 pointer-events-none`} />
                    <div className="relative flex items-start gap-3">
                      <span className="text-2xl animate-float">{mode.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className={`font-bold text-sm ${selectedMode === mode.id ? "text-ipl-gold" : "text-white"}`}>
                          {mode.title}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5 leading-snug">
                          {getModeSubtitle(mode.id, selectedLeague)}
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center ${
                        selectedMode === mode.id ? "border-ipl-gold bg-ipl-gold" : "border-ipl-border"
                      }`}>
                        {selectedMode === mode.id && <span className="text-black text-[10px] font-black">✓</span>}
                      </div>
                    </div>
                  </button>
                ))}
                <button type="button" onClick={handleCreate} disabled={loading}
                  className="shrink-0 w-full py-3.5 mt-auto bid-btn rounded-2xl text-black font-black text-sm disabled:opacity-50">
                  {loading ? "Creating..." : `Create ${leagueConfig.shortLabel} Room →`}
                </button>
                </>
                ) : (
                <>
                <p className="shrink-0 text-[10px] text-gray-500 uppercase tracking-wider font-semibold px-1">
                  Snake draft · custom teams · 18–25 squad
                </p>
                <div className="ref-card shrink-0 p-4">
                  <div className="text-2xl mb-2">🐍</div>
                  <div className="font-bold text-ipl-gold text-sm">Multiplayer Snake Draft</div>
                  <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                    {getDraftSubtitle(draftGender)}
                  </p>
                  <ul className="text-[10px] text-gray-500 mt-3 space-y-1 list-disc list-inside">
                    <li>10 fantasy team slots — rename, recolor, emoji logos</li>
                    <li>No overseas cap · no auction prices</li>
                    <li>Re-shuffled snake order each cycle</li>
                  </ul>
                </div>
                <button type="button" onClick={handleCreate} disabled={loading}
                  className="shrink-0 w-full py-3.5 mt-auto bid-btn rounded-2xl text-black font-black text-sm disabled:opacity-50">
                  {loading ? "Creating..." : `Create ${draftGender === "womens" ? "Womens" : "Mens"} Draft →`}
                </button>
                </>
                )}
              </div>
            ) : (
              <div className="flex-1 min-h-0 flex flex-col gap-3 justify-center">
                <div className="text-center mb-1">
                  <span className="text-3xl">🎫</span>
                  <p className="text-xs text-gray-400 mt-1">Enter the 6-character room code</p>
                </div>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={6}
                  className="shrink-0 pro-input text-center text-2xl tracking-[0.5em] font-mono uppercase py-4"
                />
                <button type="button" onClick={handleJoin} disabled={loading}
                  className="shrink-0 w-full py-3.5 bid-btn rounded-2xl text-black font-black text-sm disabled:opacity-50">
                  {loading ? "Joining..." : "Join Auction →"}
                </button>
              </div>
            )}

            {error && (
              <p className="shrink-0 text-red-400 text-xs text-center bg-red-500/10 border border-red-500/20 rounded-lg py-2 px-3">
                {error}
              </p>
            )}
          </div>
        ) : (
          <div className="scroll-panel space-y-2">
            {recentRooms.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-4xl opacity-40">🕐</span>
                <p className="text-gray-500 text-sm mt-3">No recent rooms</p>
              </div>
            ) : (
              recentRooms.map((room) => {
                const league = parseLeagueId(room.league);
                const teamDef = room.teamId ? getTeamMapForLeague(league)[room.teamId] : null;
                const archive = listRoomArchives().find((a) => a.roomId === room.roomId);
                const completed = archive ? isCompletedArchive(archive) : false;
                return (
                  <button
                    key={room.roomId}
                    type="button"
                    onClick={() => { localStorage.setItem("playerName", room.playerName); router.push(`/room/${room.roomId}`); }}
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
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-900/40 text-green-300">Completed</span>
                    )}
                    {room.mode && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-ipl-purple/40 text-gray-300">
                        {MODE_LABELS[room.mode] || room.mode}
                      </span>
                    )}
                    {teamDef && <span className="text-xs font-semibold" style={{ color: teamDef.primaryColor }}>{teamDef.shortName}</span>}
                    <span className="ml-auto text-xs text-ipl-gold font-semibold">Rejoin →</span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </main>

      <nav className="app-tabbar">
        <button type="button" onClick={() => setScreenTab("play")}
          className={`app-tab ${screenTab === "play" ? "app-tab-active" : ""}`}>
          <span className="text-lg">🎮</span><span>Play</span>
        </button>
        <button type="button" onClick={() => setScreenTab("recent")}
          className={`app-tab ${screenTab === "recent" ? "app-tab-active" : ""}`}>
          <span className="text-lg">🕐</span><span>Recent</span>
        </button>
      </nav>
    </div>
  );
}
