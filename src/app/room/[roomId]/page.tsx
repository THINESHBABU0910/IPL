"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket";
import { RoomState, Player, ChatMessage, GameType } from "@/lib/types";
import Lobby, { LobbyTabId } from "@/components/Lobby";
import DraftLobby, { DraftLobbyTabId } from "@/components/DraftLobby";
import DraftPhase, { DraftTabId } from "@/components/DraftPhase";
import RetentionPhase from "@/components/RetentionPhase";
import AuctionComplete from "@/components/AuctionComplete";
import ChatPanel from "@/components/ChatPanel";
import NameGate from "@/components/NameGate";
import RoomBottomNav from "@/components/RoomBottomNav";
import AuctionPlayerStrip, { StickyBidBar } from "@/components/AuctionPlayerStrip";
import AuctionChatTab from "@/components/AuctionChatTab";
import SquadTab from "@/components/SquadTab";
import ParticipantsTab from "@/components/ParticipantsTab";
import RoomSettingsTab from "@/components/RoomSettingsTab";
import AuctionOverlays from "@/components/AuctionOverlays";
import UpcomingPlayersModal from "@/components/UpcomingPlayersModal";
import SpectatorBar from "@/components/SpectatorBar";
import BidToastStack, { useBidToasts } from "@/components/BidToastStack";
import { fireSoldConfetti } from "@/lib/confetti";
import { AuctionActivity } from "@/lib/auctionActivity";
import { Toaster, toast } from "sonner";
import { saveSession, getSessionForRoom } from "@/lib/session";
import { saveRoomArchive, getRoomArchive, isCompletedArchive, saveRoomProgress } from "@/lib/roomArchive";
import { getLeagueConfig } from "@/data/leagueRegistry";
import { isValidPlayerName, normalizePlayerName } from "@/lib/validateName";
import {
  playBidSound, playSoldSound, playUnsoldSound, playRTMSound, playTimerWarning, playTimerFinalBeep, isSoundEnabled, setSoundEnabled,
} from "@/lib/sounds";

function updateRecentRoomTeam(roomId: string, teamId: string, mode: string): void {
  try {
    const raw = localStorage.getItem("recentRooms");
    if (!raw) return;
    const rooms = JSON.parse(raw) as Record<string, unknown>[];
    const idx = rooms.findIndex((r) => r.roomId === roomId);
    if (idx >= 0) {
      rooms[idx].teamId = teamId;
      if (mode) rooms[idx].mode = mode;
      rooms[idx].joinedAt = Date.now();
    }
    localStorage.setItem("recentRooms", JSON.stringify(rooms.slice(0, 5)));
  } catch { /* ignore */ }
}

type AuctionTab = "chat" | "squad" | "users" | "settings";
type RetentionTab = "pick" | "chat" | "settings";
type CompletedTab = "results" | "squad" | "settings";
type RoomTab = LobbyTabId | AuctionTab | RetentionTab | CompletedTab | DraftLobbyTabId | DraftTabId;

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = (params.roomId as string).toUpperCase();
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);
  const [isSpectator, setIsSpectator] = useState(false);
  const [connectError, setConnectError] = useState("");
  const [offlineMode, setOfflineMode] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [nameConfirmed, setNameConfirmed] = useState(false);
  const [activeTab, setActiveTab] = useState<RoomTab>("players");
  const [timerSeconds, setTimerSeconds] = useState(15);
  const [poolOpen, setPoolOpen] = useState(false);
  const socketRef = useRef(getSocket());
  const myTeamIdRef = useRef<string | null>(null);
  const gameTypeRef = useRef<GameType>("auction");
  const connectedRef = useRef(false);

  const [soldInfo, setSoldInfo] = useState<{ player: Player; teamId: string; price: number } | null>(null);
  const [unsoldPlayer, setUnsoldPlayer] = useState<Player | null>(null);
  const [rtmInfo, setRtmInfo] = useState<import("@/components/AuctionOverlays").RtmOverlayInfo | null>(null);
  const { toasts: bidToasts, pushActivity: pushBidToast, dismiss: dismissBidToast } = useBidToasts();
  const pushBidToastRef = useRef(pushBidToast);
  pushBidToastRef.current = pushBidToast;

  const isHost = roomState?.hostSocketId === socketRef.current.id;

  useEffect(() => { myTeamIdRef.current = myTeamId; }, [myTeamId]);
  useEffect(() => { setSoundOn(isSoundEnabled()); }, []);

  useEffect(() => {
    const stored = getSessionForRoom(roomId);
    const fromLs = localStorage.getItem("playerName") || "";
    const name = normalizePlayerName(stored?.playerName || fromLs);
    if (isValidPlayerName(name)) {
      setPlayerName(name);
      setNameConfirmed(true);
    }
  }, [roomId]);

  const mergeRoomState = useCallback((state: RoomState) => {
    gameTypeRef.current = state.gameType || "auction";
    setRoomState({ ...state, league: state.league ?? "ipl", gameType: state.gameType || "auction" });
    setOfflineMode(false);
    const t = state.draft?.timerSeconds ?? state.auction.timerSeconds;
    setTimerSeconds(t);
    const socket = socketRef.current;
    let foundTeam = false;
    for (const [teamId, team] of Object.entries(state.teams)) {
      if (team.ownerId === socket.id) {
        setMyTeamId(teamId);
        myTeamIdRef.current = teamId;
        setIsSpectator(false);
        foundTeam = true;
        updateRecentRoomTeam(roomId, teamId, state.mode);
        break;
      }
    }
    if (!foundTeam) {
      const me = state.participants.find((p) => p.socketId === socket.id);
      if (me) setIsSpectator(me.isSpectator);
    }
    if (state.auction.phase === "completed") {
      saveRoomArchive({
        roomId: state.id,
        roomState: state,
        playerName: playerName || undefined,
        teamId: myTeamIdRef.current || undefined,
      });
    } else {
      saveRoomProgress({
        roomId: state.id,
        roomState: state,
        playerName: playerName || undefined,
        teamId: myTeamIdRef.current || undefined,
      });
    }
  }, [roomId, playerName]);

  const appendChat = useCallback((msg: ChatMessage) => {
    setRoomState((prev) => prev ? { ...prev, chat: [...prev.chat, msg] } : prev);
  }, []);

  useEffect(() => {
    if (!nameConfirmed || !playerName) return;

    const socket = socketRef.current;
    connectedRef.current = false;
    const stored = getSessionForRoom(roomId);

    function onFail(err: string) {
      const archive = getRoomArchive(roomId);
      if (archive) {
        setOfflineMode(true);
        setRoomState(archive.roomState);
        if (archive.teamId) {
          setMyTeamId(archive.teamId);
          myTeamIdRef.current = archive.teamId;
        }
        const msg = isCompletedArchive(archive)
          ? "Showing saved auction results from your device"
          : "Reconnecting from saved game on your device — server may be waking up";
        toast.message(msg);
        return;
      }
      setConnectError(err);
      toast.error(err);
      setTimeout(() => router.push("/"), 3000);
    }

    function connect() {
      if (connectedRef.current) return;
      const tryReconnect = (token?: string) => {
        socket.emit("reconnect-room", { roomId, playerName: playerName!, sessionToken: token }, (res) => {
        if (res.success) {
          connectedRef.current = true;
          if (res.teamId) setMyTeamId(res.teamId);
          if (token) saveSession({ roomId, sessionToken: token, playerName: playerName!, teamId: res.teamId, isSpectator: !res.teamId });
          if (!res.teamId) setIsSpectator(true);
          toast.success("Welcome back!");
          return;
        }
          socket.emit("join-room", { roomId, playerName: playerName!, sessionToken: token }, (res2) => {
            if (res2.success) {
              connectedRef.current = true;
              if (res2.sessionToken) {
                saveSession({ roomId, sessionToken: res2.sessionToken, playerName: playerName!, teamId: res2.teamId, isSpectator: res2.isSpectator });
              }
              if (res2.isSpectator) setIsSpectator(true);
              if (res2.teamId) setMyTeamId(res2.teamId);
            } else {
              onFail(res2.error || res.error || "Could not join room");
            }
          });
        });
      };
      tryReconnect(stored?.sessionToken);
    }

    if (socket.connected) connect();
    else socket.on("connect", connect);

    socket.on("room-state", mergeRoomState);
    socket.on("chat-message", appendChat);
    socket.on("session-restored", (data) => {
      saveSession({ roomId, sessionToken: data.sessionToken, playerName: playerName!, teamId: data.teamId, isSpectator: data.isSpectator });
      setIsSpectator(data.isSpectator);
      if (data.teamId) setMyTeamId(data.teamId);
    });
    socket.on("team-picked", ({ teamId, socketId, sessionToken }) => {
      if (socketId === socket.id) {
        setMyTeamId(teamId);
        setIsSpectator(false);
        saveSession({ roomId, sessionToken, playerName: playerName!, teamId });
        updateRecentRoomTeam(roomId, teamId, "");
      }
    });
    socket.on("team-vacated", ({ teamId, message }) => {
      if (myTeamIdRef.current === teamId) {
        setMyTeamId(null);
        myTeamIdRef.current = null;
      }
      toast.message(message, { duration: 5000 });
    });
    socket.on("bid-update", (data) => {
      setRoomState((prev) => prev ? {
        ...prev,
        auction: { ...prev.auction, currentBid: data.currentBid, currentBidder: data.currentBidder, nextBidAmount: data.nextBidAmount, timerSeconds: data.timerSeconds },
      } : prev);
      setTimerSeconds(data.timerSeconds);
      playBidSound();
    });
    socket.on("bid-rejected", ({ reason }) => toast.error(reason));
    socket.on("error", ({ message }) => toast.error(message));
    socket.on("player-sold", (data) => {
      setSoldInfo(data);
      playSoldSound();
      fireSoldConfetti();
      setTimeout(() => setSoldInfo(null), 2500);
    });
    socket.on("player-unsold", ({ player }) => { setUnsoldPlayer(player); playUnsoldSound(); setTimeout(() => setUnsoldPlayer(null), 2000); });
    socket.on("activity", (entry: AuctionActivity) => { pushBidToastRef.current(entry); });
    socket.on("rtm-tick", ({ seconds }) => setRtmInfo((p) => p ? { ...p, seconds } : null));
    socket.on("rtm-opportunity", (data) => { setRtmInfo(data); if (data.phase === "offer") playRTMSound(); });
    socket.on("rtm-used", (data) => { setRtmInfo(null); playSoldSound(); });
    socket.on("rtm-declined", () => setRtmInfo(null));
    socket.on("timer-tick", ({ seconds, type }) => {
      if (type === "auction" || !type) {
        setTimerSeconds(seconds);
        if (seconds <= 5 && seconds >= 1) playTimerWarning(seconds);
        if (seconds === 0) playTimerFinalBeep();
      }
    });
    socket.on("draft-pick", (data) => {
      playSoldSound();
      fireSoldConfetti();
      pushBidToastRef.current({
        id: `draft-${Date.now()}`,
        type: "DRAFT_PICK",
        timestamp: Date.now(),
        playerName: data.player.name,
        teamId: data.teamId,
        displayName: data.teamName,
      });
    });
    socket.on("draft-turn-changed", ({ seconds }) => setTimerSeconds(seconds));
    socket.on("draft-order-updated", () => {
      pushBidToastRef.current({
        id: `shuffle-${Date.now()}`,
        type: "ORDER_SHUFFLED",
        timestamp: Date.now(),
      });
    });
    socket.on("phase-change", ({ phase }) => {
      if (phase === "lobby") {
        setActiveTab(gameTypeRef.current === "draft" ? "teams" : "players");
        if (gameTypeRef.current !== "draft") {
          setMyTeamId(null);
          myTeamIdRef.current = null;
        }
      }
      if (phase === "retention") setActiveTab("pick");
      if (phase === "auction") setActiveTab("chat");
      if (phase === "draft" || phase === "catchup") setActiveTab("pick");
      if (phase === "completed") setActiveTab("results");
    });

    return () => {
      socket.off("connect", connect);
      socket.off("room-state", mergeRoomState);
      socket.off("chat-message", appendChat);
      socket.off("session-restored");
      socket.off("team-picked");
      socket.off("team-vacated");
      socket.off("bid-update");
      socket.off("bid-rejected");
      socket.off("error");
      socket.off("player-sold");
      socket.off("player-unsold");
      socket.off("activity");
      socket.off("rtm-opportunity");
      socket.off("rtm-tick");
      socket.off("rtm-used");
      socket.off("rtm-declined");
      socket.off("timer-tick");
      socket.off("phase-change");
      socket.off("draft-pick");
      socket.off("draft-turn-changed");
      socket.off("draft-order-updated");
    };
  }, [roomId, router, mergeRoomState, nameConfirmed, playerName, appendChat]);

  function handleNameConfirm(name: string) {
    setPlayerName(name);
    setNameConfirmed(true);
  }

  function toggleSound() {
    setSoundEnabled(!soundOn);
    setSoundOn(!soundOn);
  }

  function copyInvite() {
    navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`);
    toast.success("Invite link copied!");
  }

  function shareWhatsApp() {
    const label = getLeagueConfig(roomState?.league ?? "ipl").shortLabel;
    window.open(`https://wa.me/?text=${encodeURIComponent(`Join my ${label} Auction! ${window.location.origin}/room/${roomId}`)}`, "_blank");
  }

  function hostPauseResume() {
    if (!isHost) return;
    const paused = roomState?.auction.isPaused || roomState?.draft?.isPaused;
    const action = paused ? "resume" : "pause";
    socketRef.current.emit("host-action", { action });
  }

  if (!nameConfirmed) {
    return (
      <div className="app-shell">
        <NameGate onConfirm={handleNameConfirm} />
        <Toaster position="top-center" theme="dark" />
      </div>
    );
  }

  if (connectError) {
    return (
      <div className="app-shell items-center justify-center flex">
        <div className="text-center p-4">
          <p className="text-red-400 mb-2">{connectError}</p>
          <p className="text-gray-500 text-sm">Redirecting home...</p>
        </div>
      </div>
    );
  }

  if (!roomState) {
    return (
      <div className="app-shell items-center justify-center flex">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#FFD700] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Joining {roomId}...</p>
        </div>
        <Toaster position="top-center" theme="dark" />
      </div>
    );
  }

  const phase = roomState.auction.phase;
  const isDraftRoom = roomState.gameType === "draft";
  const participantCount = roomState.participants.length || Object.keys(roomState.teams).length;
  const joinedTeams = Object.values(roomState.teams).filter((t) => !t.isVacant && t.ownerId).length;
  const maxFr = isDraftRoom ? 2 : getLeagueConfig(roomState.league).rules.maxFranchises;
  const allTeamsIn = isDraftRoom ? joinedTeams >= 2 : joinedTeams >= getLeagueConfig(roomState.league).rules.maxFranchises;
  const canHeaderStart = phase === "lobby" && (allTeamsIn || isHost) && joinedTeams >= 2;
  const draftPaused = roomState.draft?.isPaused;
  const mySquadSize = myTeamId && roomState.teams[myTeamId]
    ? roomState.teams[myTeamId].squad.length +
      (roomState.gameType === "draft" ? 0 : roomState.teams[myTeamId].retainedPlayers.length)
    : 0;
  const chatCount = roomState.chat.length;

  let bottomTabs: { id: string; label: string; icon: string; badge?: number; variant?: "chat" | "squad" | "settings" | "default" }[] = [];

  if (phase === "draft" || phase === "catchup") {
    bottomTabs = [
      { id: "pick", label: "Draft", icon: "🎯" },
      { id: "chat", label: "Chat", icon: "💬", badge: chatCount, variant: "chat" },
      { id: "squad", label: "Squad", icon: "💼", badge: mySquadSize, variant: "squad" },
      { id: "users", label: "Users", icon: "👥", badge: participantCount },
      { id: "settings", label: "Settings", icon: "⚙️", variant: "settings" },
    ];
  } else if (phase === "auction") {
    bottomTabs = [
      { id: "chat", label: "Chat", icon: "💬", badge: chatCount, variant: "chat" },
      { id: "squad", label: "Squad", icon: "💼", badge: mySquadSize, variant: "squad" },
      { id: "users", label: "Users", icon: "👥", badge: participantCount },
      { id: "settings", label: "Settings", icon: "⚙️", variant: "settings" },
    ];
  } else if (phase === "lobby" && isDraftRoom) {
    bottomTabs = [
      { id: "teams", label: "Teams", icon: "🏏", badge: joinedTeams },
      { id: "chat", label: "Chat", icon: "💬", badge: chatCount, variant: "chat" },
      { id: "settings", label: "Settings", icon: "⚙️", variant: "settings" },
    ];
  } else if (phase === "lobby") {
    bottomTabs = [
      { id: "players", label: "Players", icon: "👥", badge: participantCount },
      { id: "chat", label: "Chat", icon: "💬", badge: chatCount, variant: "chat" },
      { id: "settings", label: "Settings", icon: "⚙️", variant: "settings" },
    ];
  } else if (phase === "retention") {
    bottomTabs = [
      { id: "pick", label: "Pick", icon: "🔒" },
      { id: "chat", label: "Chat", icon: "💬", badge: chatCount, variant: "chat" },
      { id: "settings", label: "Settings", icon: "⚙️", variant: "settings" },
    ];
  } else {
    bottomTabs = [
      { id: "results", label: "Results", icon: "🏆" },
      { id: "squad", label: "Squad", icon: "💼", badge: mySquadSize, variant: "squad" },
      { id: "settings", label: "Settings", icon: "⚙️", variant: "settings" },
    ];
  }

  return (
    <div className="app-shell">
      <Toaster position="top-center" theme="dark" richColors />

      <header className="app-header">
        <div className="flex items-center gap-2 min-w-0">
          <button type="button" onClick={() => router.push("/")} className="text-gray-400 text-sm shrink-0">←</button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-sm font-black text-[#FFD700]">{roomId}</span>
              {!offlineMode && <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />}
              {offlineMode && <span className="ref-pill ref-pill-orange text-[8px]">SAVED</span>}
              <span className="text-[10px] text-gray-400">{participantCount}/10</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button type="button" onClick={shareWhatsApp} className="ref-icon-btn text-green-400 text-xs" aria-label="WhatsApp">W</button>
          <button type="button" onClick={copyInvite} className="ref-icon-btn text-xs" aria-label="Share">↗</button>
          {(phase === "auction" || phase === "draft" || phase === "catchup") && isHost && (
            <button type="button" onClick={hostPauseResume} className="ref-icon-btn text-green-400 text-xs">
              {(roomState.auction.isPaused || draftPaused) ? "▶" : "⏸"}
            </button>
          )}
          <button type="button" onClick={toggleSound} className="ref-icon-btn text-[#FFD700] text-xs">
            {soundOn ? "🔊" : "🔇"}
          </button>
          {phase === "lobby" && canHeaderStart && (
            <button type="button" onClick={() => socketRef.current.emit("start-game")} className="ref-start-btn">
              ▶ Start
            </button>
          )}
        </div>
      </header>

      <main className="app-main flex flex-col min-h-0">
        {phase === "auction" && (
          <>
            <SpectatorBar roomState={roomState} myTeamId={myTeamId} socket={socketRef.current} />
            <AuctionPlayerStrip
              roomState={roomState}
              myTeamId={myTeamId}
              isSpectator={isSpectator}
              socket={socketRef.current}
              timerSeconds={timerSeconds}
              onOpenPool={() => setPoolOpen(true)}
            />

            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <BidToastStack
                toasts={bidToasts}
                roomState={roomState}
                onDismiss={dismissBidToast}
              />
              {activeTab === "chat" && (
                <>
                  <AuctionChatTab
                    messages={roomState.chat}
                    activityFeed={roomState.activityFeed}
                    roomState={roomState}
                    socket={socketRef.current}
                    disabled={isSpectator}
                    playerName={playerName || ""}
                  />
                  <StickyBidBar
                    roomState={roomState}
                    myTeamId={myTeamId}
                    isSpectator={isSpectator}
                    socket={socketRef.current}
                  />
                </>
              )}
              {activeTab === "squad" && (
                <SquadTab roomState={roomState} myTeamId={myTeamId} playerName={playerName || ""} isHost={!!isHost} />
              )}
              {activeTab === "users" && (
                <ParticipantsTab
                  roomState={roomState}
                  myTeamId={myTeamId}
                  playerName={playerName || ""}
                  isHost={!!isHost}
                  variant="admin"
                  socket={socketRef.current}
                />
              )}
              {activeTab === "settings" && (
                <RoomSettingsTab
                  roomState={roomState}
                  socket={socketRef.current}
                  isHost={!!isHost}
                  roomId={roomId}
                  soundOn={soundOn}
                  onToggleSound={toggleSound}
                />
              )}
            </div>

            <AuctionOverlays
              roomState={roomState}
              socket={socketRef.current}
              myTeamId={myTeamId}
              soldInfo={soldInfo}
              unsoldPlayer={unsoldPlayer}
              rtmInfo={rtmInfo}
            />
            <UpcomingPlayersModal roomState={roomState} open={poolOpen} onClose={() => setPoolOpen(false)} />
          </>
        )}

        {(phase === "draft" || phase === "catchup") && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <SpectatorBar roomState={roomState} myTeamId={myTeamId} socket={socketRef.current} />
            {(activeTab === "pick" || activeTab === "chat") && (
              <BidToastStack
                toasts={bidToasts}
                roomState={roomState}
                onDismiss={dismissBidToast}
              />
            )}
            <DraftPhase
              roomState={roomState}
              myTeamId={myTeamId}
              socket={socketRef.current}
              isSpectator={isSpectator}
              playerName={playerName || ""}
              isHost={!!isHost}
              activeTab={activeTab as DraftTabId}
              roomId={roomId}
              timerSeconds={timerSeconds}
              soundOn={soundOn}
              onToggleSound={toggleSound}
            />
          </div>
        )}

        {phase === "lobby" && isDraftRoom && (
          <DraftLobby
            roomState={roomState}
            myTeamId={myTeamId}
            socket={socketRef.current}
            isSpectator={isSpectator}
            playerName={playerName || ""}
            isHost={!!isHost}
            activeTab={activeTab as DraftLobbyTabId}
            roomId={roomId}
            soundOn={soundOn}
            onToggleSound={toggleSound}
          />
        )}

        {phase === "lobby" && !isDraftRoom && (
          <Lobby
            roomState={roomState}
            myTeamId={myTeamId}
            socket={socketRef.current}
            isSpectator={isSpectator}
            playerName={playerName || ""}
            isHost={!!isHost}
            activeTab={activeTab as LobbyTabId}
            roomId={roomId}
            soundOn={soundOn}
            onToggleSound={toggleSound}
          />
        )}

        {phase === "retention" && activeTab === "pick" && (
          <>
            <SpectatorBar roomState={roomState} myTeamId={myTeamId} socket={socketRef.current} />
            <RetentionPhase roomState={roomState} myTeamId={myTeamId} socket={socketRef.current} />
          </>
        )}
        {phase === "retention" && activeTab === "chat" && (
          <div className="panel-fill px-2 pb-1">
            <ChatPanel messages={roomState.chat} socket={socketRef.current} disabled={isSpectator} playerName={playerName || ""} tall />
          </div>
        )}
        {phase === "retention" && activeTab === "settings" && (
          <RoomSettingsTab
            roomState={roomState}
            socket={socketRef.current}
            isHost={!!isHost}
            roomId={roomId}
            soundOn={soundOn}
            onToggleSound={toggleSound}
          />
        )}

        {phase === "completed" && activeTab === "results" && (
          <div className="scroll-panel">
            <AuctionComplete roomState={roomState} socket={socketRef.current} isHost={!!isHost} myTeamId={myTeamId} playerName={playerName || ""} />
          </div>
        )}
        {phase === "completed" && activeTab === "squad" && (
          <SquadTab roomState={roomState} myTeamId={myTeamId} playerName={playerName || ""} isHost={!!isHost} />
        )}
        {phase === "completed" && activeTab === "settings" && (
          <RoomSettingsTab
            roomState={roomState}
            socket={socketRef.current}
            isHost={!!isHost}
            roomId={roomId}
            soundOn={soundOn}
            onToggleSound={toggleSound}
          />
        )}
      </main>

      <RoomBottomNav
        tabs={bottomTabs}
        active={activeTab}
        onChange={(id) => setActiveTab(id as RoomTab)}
      />
    </div>
  );
}
