"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket";
import { AuctionMode, LeagueId, GameType, DraftGender } from "@/lib/types";
import { isLegendMode } from "@/lib/constants";
import { getLeagueConfig, parseLeagueId } from "@/data/leagueRegistry";
import { saveSession, getSessionForRoom } from "@/lib/session";
import { isValidPlayerName, normalizePlayerName } from "@/lib/validateName";
import HomeHeader from "@/components/home/HomeHeader";
import ProductTabs from "@/components/home/ProductTabs";
import LeaguePicker from "@/components/home/LeaguePicker";
import AuctionModeGrid from "@/components/home/AuctionModeGrid";
import DraftPanel from "@/components/home/DraftPanel";
import CreateJoinTabs from "@/components/home/CreateJoinTabs";
import RecentRoomsList, { type RecentRoom } from "@/components/home/RecentRoomsList";
import HomeTabBar from "@/components/home/HomeTabBar";

const PREFERRED_LEAGUE_KEY = "preferredLeague";

function getRecentRooms(): RecentRoom[] {
  try {
    const raw = localStorage.getItem("recentRooms");
    if (!raw) return [];
    return JSON.parse(raw) as RecentRoom[];
  } catch {
    return [];
  }
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

  const handleSelectLeague = useCallback((id: LeagueId) => {
    setSelectedLeague(id);
    if (isLegendMode(selectedMode) && id !== "ipl") {
      setSelectedMode("mega");
    }
  }, [selectedMode]);

  const handleSelectMode = useCallback((mode: AuctionMode) => {
    setSelectedMode(mode);
    if (isLegendMode(mode)) {
      setSelectedLeague("ipl");
    }
  }, []);

  const handleCreate = useCallback(() => {
    const trimmed = normalizePlayerName(name);
    if (!isValidPlayerName(trimmed)) {
      setError("Name: 3–20 characters");
      return;
    }
    setLoading(true);
    setError("");
    const payload =
      productTab === "drafts"
        ? { gameType: "draft" as const, draftGender, playerName: trimmed }
        : {
            mode: selectedMode,
            league: selectedLeague,
            gameType: "auction" as const,
            playerName: trimmed,
          };
    getSocket().emit("create-room", payload, (res) => {
      setLoading(false);
      if (res.roomId && res.sessionToken) {
        localStorage.setItem("playerName", trimmed);
        saveSession({
          roomId: res.roomId,
          sessionToken: res.sessionToken,
          playerName: trimmed,
        });
        saveRecentRoom({
          roomId: res.roomId,
          teamId: "",
          playerName: trimmed,
          mode: productTab === "drafts" ? "draft" : selectedMode,
          league:
            productTab === "drafts"
              ? draftGender === "womens"
                ? "wpl"
                : "ipl"
              : selectedLeague,
          gameType: productTab === "drafts" ? "draft" : "auction",
          draftGender: productTab === "drafts" ? draftGender : undefined,
          joinedAt: Date.now(),
        });
        router.push(`/room/${res.roomId}`);
      } else {
        setError(res.error || "Failed");
      }
    });
  }, [name, selectedMode, selectedLeague, productTab, draftGender, router]);

  const handleJoin = useCallback(() => {
    const trimmed = normalizePlayerName(name);
    if (!isValidPlayerName(trimmed)) {
      setError("Name: 3–20 characters");
      return;
    }
    if (!joinCode.trim() || joinCode.trim().length < 4) {
      setError("Enter room code");
      return;
    }
    setLoading(true);
    setError("");
    const code = joinCode.trim().toUpperCase();
    const stored = getSessionForRoom(code);
    getSocket().emit(
      "join-room",
      {
        roomId: code,
        playerName: trimmed,
        sessionToken: stored?.sessionToken,
      },
      (res) => {
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
        } else {
          setError(res.error || "Failed");
        }
      },
    );
  }, [name, joinCode, router]);

  const createLabel =
    productTab === "drafts"
      ? `Create ${draftGender === "womens" ? "Womens" : "Mens"} Draft →`
      : isLegendMode(selectedMode)
        ? "Create Legend Auction →"
        : `Create ${leagueConfig.shortLabel} Room →`;

  return (
    <div className="app-shell">
      <HomeHeader
        productTab={productTab}
        leagueConfig={leagueConfig}
        selectedMode={productTab === "auction" ? selectedMode : undefined}
      />

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

            <ProductTabs value={productTab} onChange={setProductTab} />
            <CreateJoinTabs value={actionTab} onChange={setActionTab} />

            {actionTab === "create" ? (
              <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
                {productTab === "auction" ? (
                  <>
                    <LeaguePicker
                      selectedLeague={selectedLeague}
                      selectedMode={selectedMode}
                      onSelectLeague={handleSelectLeague}
                    />
                    <AuctionModeGrid
                      selectedLeague={selectedLeague}
                      selectedMode={selectedMode}
                      onSelectMode={handleSelectMode}
                    />
                  </>
                ) : (
                  <DraftPanel draftGender={draftGender} onSelectGender={setDraftGender} />
                )}
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={loading}
                  className="shrink-0 w-full py-3.5 mt-auto bid-btn rounded-2xl text-black font-black text-sm disabled:opacity-50"
                >
                  {loading ? "Creating..." : createLabel}
                </button>
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
                <button
                  type="button"
                  onClick={handleJoin}
                  disabled={loading}
                  className="shrink-0 w-full py-3.5 bid-btn rounded-2xl text-black font-black text-sm disabled:opacity-50"
                >
                  {loading ? "Joining..." : "Join Room →"}
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
            <RecentRoomsList rooms={recentRooms} />
          </div>
        )}
      </main>

      <HomeTabBar screenTab={screenTab} onChange={setScreenTab} />
    </div>
  );
}
