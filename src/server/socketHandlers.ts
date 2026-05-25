import { Server, Socket } from "socket.io";
import { ServerToClientEvents, ClientToServerEvents, RuntimeStatePayload } from "../lib/types";
import { RTM_TIMER, RETENTION_TIMER, TIMER_INITIAL } from "../lib/constants";
import {
  createRoom, getRoom, deleteRoom, addTeam, removeTeam,
  getTeamIdForSocket,
  lockRetentions, allRetentionsLocked, setupAuctionPool,
  serializeRoom, isHost, addActivity, addChat,
  generateSessionToken, resetRoomForRematch, reconnectByToken,
  pushAuctionActivity, normalizeRetentionPlayerIds,
  allTeamsJoined, canStartAuction, claimVacantTeam, kickTeamOwner,
} from "./gameState";
import type { Room } from "./gameState";
import {
  presentNextPlayer, processBid, sellPlayer, markUnsold,
  checkRTM, startRtmEscalation, processRtmRaise, beginRtmMatchPhase,
  completeRtmMatch, passRtmMatch, clearRtmAuctionState, getRemainingCount,
} from "./auctionEngine";
import { isValidPlayerName, normalizePlayerName } from "../lib/validateName";
import { getInitialRtmCards, isRetentionMode } from "../lib/iplRules";
import { withRoomLock } from "./roomLock";
import { saveRoomSnapshot, deleteRoomSnapshot, hydrateRoomsFromSnapshots, tryRestoreRoom } from "./roomPersistence";

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

function generateRoomCodeUtil(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function buildRuntimeState(room: Room): RuntimeStatePayload {
  const phase = room.auction.phase;
  let status: RuntimeStatePayload["status"] = "LOBBY";
  if (phase === "retention") status = "RETENTION";
  else if (phase === "completed") status = "COMPLETED";
  else if (phase === "auction") status = room.auction.isPaused ? "PAUSED" : "AUCTION";

  const teams: RuntimeStatePayload["teams"] = {};
  for (const [id, team] of room.teams) {
    teams[id] = {
      ownerId: team.ownerId || null,
      ownerName: team.ownerName || null,
      purse: team.purse,
    };
  }

  return {
    status,
    mode: room.mode,
    currentSet: room.auction.currentSetName,
    timer: room.auction.timerSeconds,
    timerEndsAt: room.auction.timerEndsAt,
    poolRemaining: getRemainingCount(room),
    soldCount: room.auction.soldPlayers.length,
    unsoldCount: room.auction.unsoldPlayers.length,
    round: room.auction.round,
    currentPlayer: room.auction.currentPlayer,
    currentBid: room.auction.currentBidder ? room.auction.currentBid : null,
    currentBidder: room.auction.currentBidder,
    teams,
  };
}

function syncAuctionTimerEndsAt(room: Room): void {
  if (room.auction.phase === "auction" && !room.auction.isPaused && room.auction.currentPlayer) {
    room.auction.timerEndsAt = Date.now() + room.auction.timerSeconds * 1000;
  } else {
    room.auction.timerEndsAt = null;
  }
}

function emitAuctionActivity(io: IOServer, room: Room, activity: Parameters<typeof pushAuctionActivity>[1]): void {
  const entry = pushAuctionActivity(room, activity);
  io.to(room.id).emit("activity", entry);
}

function broadcastState(io: IOServer, room: Room): void {
  syncAuctionTimerEndsAt(room);
  io.to(room.id).emit("room-state", serializeRoom(room, io));
  io.to(room.id).emit("room-runtime-state", buildRuntimeState(room));
  saveRoomSnapshot(room);
}

function tryStartGame(io: IOServer, room: Room, byHost: boolean, socket?: IOSocket): boolean {
  const check = canStartAuction(room, byHost);
  if (!check.ok) {
    socket?.emit("error", { message: check.reason || "Cannot start yet" });
    return false;
  }
  if (isRetentionMode(room.mode)) startRetentionPhase(io, room);
  else startAuction(io, room);
  return true;
}

function maybeAutoStart(io: IOServer, room: Room): void {
  if (room.auction.phase !== "lobby") return;
  if (allTeamsJoined(room)) tryStartGame(io, room, false);
}

function resolveRoom(roomId: string): Room | undefined {
  return getRoom(roomId) ?? tryRestoreRoom(roomId) ?? undefined;
}

function scheduleCleanup(io: IOServer, room: Room): void {
  if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
  if (room.auction.phase !== "lobby") return;
  room.cleanupTimer = setTimeout(() => {
    const r = getRoom(room.id);
    if (!r || r.auction.phase !== "lobby") return;
    let anyConnected = false;
    for (const sid of r.connectedPlayers.keys()) {
      if (io.sockets.sockets.has(sid)) { anyConnected = true; break; }
    }
    for (const sid of r.spectators) {
      if (io.sockets.sockets.has(sid)) { anyConnected = true; break; }
    }
    if (!anyConnected && r.playerNames.size === 0) {
      deleteRoom(r.id);
      deleteRoomSnapshot(r.id);
    }
  }, 1800000);
}

function isJoined(room: Room, socketId: string): boolean {
  return room.playerNames.has(socketId) || room.spectators.has(socketId);
}

export function registerHandlers(io: IOServer): void {
  hydrateRoomsFromSnapshots();

  io.on("connection", (socket: IOSocket) => {
    let currentRoomId: string | null = null;

    socket.on("create-room", (data, callback) => {
      const playerName = normalizePlayerName(data.playerName || "");
      if (!isValidPlayerName(playerName)) {
        callback({ error: "Enter a valid name (3–20 characters)" });
        return;
      }
      let roomId = generateRoomCodeUtil();
      while (getRoom(roomId)) roomId = generateRoomCodeUtil();
      const room = createRoom(roomId, data.mode, socket.id, playerName);
      currentRoomId = room.id;
      socket.join(room.id);
      const token = room.sessionTokens.get(socket.id)!;
      addActivity(room, "system", `${playerName} created the room (Host)`);
      broadcastState(io, room);
      callback({ roomId: room.id, sessionToken: token });
    });

    socket.on("join-room", (data, callback) => {
      const room = resolveRoom(data.roomId);
      if (!room) { callback({ success: false, error: "Room not found" }); return; }

      const playerName = normalizePlayerName(data.playerName || "");
      if (!data.sessionToken && !isValidPlayerName(playerName)) {
        callback({ success: false, error: "Enter a valid name (3–20 characters)" });
        return;
      }

      if (data.sessionToken) {
        const restored = reconnectByToken(room, data.sessionToken, socket.id);
        if (restored) {
          currentRoomId = room.id;
          socket.join(room.id);
          callback({ success: true, sessionToken: data.sessionToken, teamId: restored.teamId });
          socket.emit("session-restored", { teamId: restored.teamId, sessionToken: data.sessionToken, isSpectator: restored.isSpectator });
          addActivity(room, "system", `${restored.playerName} rejoined`);
          socket.emit("room-state", serializeRoom(room, io));
          socket.emit("activity-feed", [...room.auctionActivities].reverse());
          broadcastState(io, room);
          return;
        }
      }

      if (isJoined(room, socket.id)) {
        currentRoomId = room.id;
        callback({ success: true, sessionToken: room.sessionTokens.get(socket.id) });
        return;
      }

      if (room.auction.phase !== "lobby") {
        callback({ success: false, error: "Auction already started. Use rejoin with your session." });
        return;
      }

      const nameTaken = [...room.playerNames.values()].some(
        (n) => n.toLowerCase() === playerName.toLowerCase()
      );
      if (nameTaken) { callback({ success: false, error: "Name already taken in this room" }); return; }

      if (room.teams.size + room.spectators.size >= 10 && !data.spectator) {
        callback({ success: false, error: "Room is full" }); return;
      }

      currentRoomId = room.id;
      socket.join(room.id);
      const token = generateSessionToken();
      room.playerNames.set(socket.id, playerName);
      room.sessionTokens.set(socket.id, token);

      if (data.spectator) {
        room.spectators.add(socket.id);
        room.tokenToSocket.set(token, { socketId: socket.id, isSpectator: true });
      } else {
        room.tokenToSocket.set(token, { socketId: socket.id, isSpectator: false });
      }

      callback({ success: true, sessionToken: token });
      addActivity(room, "system", `${playerName} joined${data.spectator ? " as spectator" : ""}`);
      emitAuctionActivity(io, room, {
        type: "PLAYER_JOINED",
        senderId: socket.id,
        displayName: playerName,
      });
      broadcastState(io, room);
      socket.emit("activity-feed", [...room.auctionActivities].reverse());
      socket.to(room.id).emit("player-joined", {
        playerName,
        socketId: socket.id,
        isSpectator: !!data.spectator,
      });
    });

    socket.on("join-as-spectator", (data, callback) => {
      const room = resolveRoom(data.roomId);
      if (!room) { callback({ success: false, error: "Room not found" }); return; }
      const playerName = normalizePlayerName(data.playerName || "");
      if (!isValidPlayerName(playerName)) {
        callback({ success: false, error: "Enter a valid name (3–20 characters)" });
        return;
      }
      if (isJoined(room, socket.id)) {
        callback({ success: true, sessionToken: room.sessionTokens.get(socket.id) });
        return;
      }
      currentRoomId = room.id;
      socket.join(room.id);
      const token = generateSessionToken();
      room.playerNames.set(socket.id, playerName);
      room.sessionTokens.set(socket.id, token);
      room.spectators.add(socket.id);
      room.tokenToSocket.set(token, { socketId: socket.id, isSpectator: true });
      callback({ success: true, sessionToken: token });
      addActivity(room, "system", `${playerName} joined as spectator`);
      broadcastState(io, room);
    });

    socket.on("reconnect-room", (data, callback) => {
      const room = resolveRoom(data.roomId);
      if (!room) { callback({ success: false, error: "Room not found" }); return; }

      if (data.sessionToken) {
        const restored = reconnectByToken(room, data.sessionToken, socket.id);
        if (restored) {
          currentRoomId = room.id;
          socket.join(room.id);
          callback({ success: true, teamId: restored.teamId });
          socket.emit("session-restored", {
            teamId: restored.teamId,
            sessionToken: data.sessionToken,
            isSpectator: restored.isSpectator,
          });
          addActivity(room, "system", `${restored.playerName} rejoined`);
          socket.emit("room-state", serializeRoom(room, io));
          socket.emit("activity-feed", [...room.auctionActivities].reverse());
          broadcastState(io, room);
          return;
        }
      }

      if (data.playerName) {
        for (const [oldSid, name] of room.playerNames) {
          if (name === data.playerName && !io.sockets.sockets.has(oldSid)) {
            const teamId = room.connectedPlayers.get(oldSid);
            const isSpec = room.spectators.has(oldSid);
            const token = room.sessionTokens.get(oldSid) || generateSessionToken();
            room.playerNames.delete(oldSid);
            room.sessionTokens.delete(oldSid);
            room.connectedPlayers.delete(oldSid);
            room.spectators.delete(oldSid);
            room.playerNames.set(socket.id, name);
            room.sessionTokens.set(socket.id, token);
            room.tokenToSocket.set(token, { socketId: socket.id, teamId, isSpectator: isSpec });
            if (isSpec) room.spectators.add(socket.id);
            else if (teamId) {
              room.connectedPlayers.set(socket.id, teamId);
              const team = room.teams.get(teamId);
              if (team) team.ownerId = socket.id;
            }
            currentRoomId = room.id;
            socket.join(room.id);
            callback({ success: true, teamId });
            broadcastState(io, room);
            return;
          }
        }
      }

      callback({ success: false, error: "Could not restore session" });
    });

    socket.on("pick-team", (data, callback) => {
      if (!currentRoomId) return;
      const room = getRoom(currentRoomId);
      if (!room) return;

      const phase = room.auction.phase;
      if (phase === "completed") return;

      const playerName = room.playerNames.get(socket.id) || "Player";
      const existingTeamId = room.connectedPlayers.get(socket.id);
      const vacantTeam = room.teams.get(data.teamId);

      if (vacantTeam?.isVacant && !existingTeamId) {
        if (claimVacantTeam(room, data.teamId, socket.id, playerName)) {
          const token = room.sessionTokens.get(socket.id)!;
          addActivity(room, "system", `${playerName} took over ${vacantTeam.shortName} (squad & purse kept)`);
          io.to(currentRoomId).emit("team-picked", {
            teamId: data.teamId, playerName, socketId: socket.id, sessionToken: token,
          });
          broadcastState(io, room);
          callback?.({ success: true, sessionToken: token });
        } else {
          callback?.({ success: false });
        }
        return;
      }

      // After start: claim a free team only (no switching)
      if (phase === "auction" || phase === "retention") {
        if (existingTeamId) {
          callback?.({ success: false });
          return;
        }
        if (room.teams.has(data.teamId)) {
          callback?.({ success: false });
          return;
        }
        if (addTeam(room, data.teamId, socket.id, playerName)) {
          const token = room.sessionTokens.get(socket.id)!;
          room.tokenToSocket.set(token, { socketId: socket.id, teamId: data.teamId, isSpectator: false });
          io.to(currentRoomId).emit("team-picked", {
            teamId: data.teamId, playerName, socketId: socket.id, sessionToken: token,
          });
          broadcastState(io, room);
          callback?.({ success: true, sessionToken: token });
        } else {
          callback?.({ success: false });
        }
        return;
      }

      // Lobby: switch teams freely
      if (existingTeamId) {
        room.teams.delete(existingTeamId);
        room.connectedPlayers.delete(socket.id);
        io.to(currentRoomId).emit("team-unpicked", { teamId: existingTeamId });
      }

      if (addTeam(room, data.teamId, socket.id, playerName)) {
        const token = room.sessionTokens.get(socket.id)!;
        room.tokenToSocket.set(token, { socketId: socket.id, teamId: data.teamId, isSpectator: false });
        io.to(currentRoomId).emit("team-picked", {
          teamId: data.teamId, playerName, socketId: socket.id, sessionToken: token,
        });
        broadcastState(io, room);
        callback?.({ success: true, sessionToken: token });
        maybeAutoStart(io, room);
      } else {
        callback?.({ success: false });
      }
    });

    socket.on("start-game", () => {
      if (!currentRoomId) return;
      const room = getRoom(currentRoomId);
      if (!room || room.auction.phase !== "lobby") return;
      if (!isJoined(room, socket.id)) return;
      tryStartGame(io, room, isHost(room, socket.id), socket);
    });

    socket.on("lock-retentions", (data) => {
      if (!currentRoomId) return;
      withRoomLock(currentRoomId, () => {
        const room = getRoom(currentRoomId!);
        if (!room || room.auction.phase !== "retention") return;
        const teamId = getTeamIdForSocket(room, socket.id);
        if (!teamId) return;

        const playerIds = normalizeRetentionPlayerIds(data?.playerIds);

        const err = lockRetentions(room, teamId, playerIds, data.customPrices as Record<string, unknown> | undefined);
        if (err) { socket.emit("error", { message: err }); return; }

        io.to(currentRoomId!).emit("retention-locked", { teamId, count: playerIds.length });
        broadcastState(io, room);

        if (allRetentionsLocked(room)) {
          if (room.retentionTimerInterval) { clearInterval(room.retentionTimerInterval); room.retentionTimerInterval = null; }
          startAuction(io, room);
        }
      });
    });

    socket.on("place-bid", () => {
      if (!currentRoomId) return;
      withRoomLock(currentRoomId, () => {
        const room = getRoom(currentRoomId!);
        if (!room || room.auction.phase !== "auction" || room.auction.isPaused) return;
        const teamId = getTeamIdForSocket(room, socket.id);
        if (!teamId) return;

        const result = processBid(room, teamId);
        if (result.success) {
          const team = room.teams.get(teamId)!;
          const entry = addActivity(room, "bid", `${team.shortName} bid ${room.auction.currentBid}L on ${room.auction.currentPlayer?.name}`);
          emitAuctionActivity(io, room, {
            type: "BID_PLACED",
            teamId,
            playerName: room.auction.currentPlayer?.name,
            price: room.auction.currentBid,
          });
          io.to(currentRoomId!).emit("bid-update", {
            currentBid: room.auction.currentBid,
            currentBidder: teamId,
            nextBidAmount: room.auction.nextBidAmount,
            timerSeconds: room.auction.timerSeconds,
            teamName: team.shortName,
          });
          io.to(currentRoomId!).emit("activity-entry", entry);
          io.to(currentRoomId!).emit("room-state", serializeRoom(room, io));
          saveRoomSnapshot(room);
        } else {
          socket.emit("bid-rejected", { reason: result.reason || "Bid rejected" });
        }
      });
    });

    socket.on("use-rtm", () => {
      if (!currentRoomId) return;
      const room = getRoom(currentRoomId);
      if (!room || !room.auction.isRTM || !room.auction.currentPlayer) return;
      if (room.auction.rtmPhase !== "offer") return;
      const teamId = getTeamIdForSocket(room, socket.id);
      if (!teamId || teamId !== room.auction.rtmTeamId) return;

      const player = room.auction.currentPlayer;
      const escal = startRtmEscalation(room);
      if (!escal) return;

      clearRtmTimer(room);
      addActivity(room, "rtm", `${room.teams.get(teamId)?.shortName} invoked RTM — ${room.teams.get(escal.winningBidder)?.shortName} gets final raise`);
      beginRtmEscalatePhase(io, room, player);
    });

    socket.on("decline-rtm", () => {
      if (!currentRoomId) return;
      const room = getRoom(currentRoomId);
      if (!room || !room.auction.isRTM || !room.auction.currentPlayer) return;
      const teamId = getTeamIdForSocket(room, socket.id);
      if (!teamId || teamId !== room.auction.rtmTeamId) return;

      const player = room.auction.currentPlayer;
      clearRtmTimer(room);

      if (room.auction.rtmPhase === "match") {
        handleRtmPass(io, room, player);
      } else {
        handleRtmOfferDeclined(io, room, player);
      }
    });

    socket.on("rtm-raise", () => {
      if (!currentRoomId) return;
      const room = getRoom(currentRoomId);
      if (!room || room.auction.rtmPhase !== "escalate" || !room.auction.currentPlayer) return;
      const teamId = getTeamIdForSocket(room, socket.id);
      if (!teamId || teamId !== room.auction.rtmWinningBidder) return;

      const player = room.auction.currentPlayer;
      const result = processRtmRaise(room);
      if (!result.success) {
        socket.emit("bid-rejected", { reason: result.reason || "Cannot raise" });
        return;
      }

      clearRtmTimer(room);
      addActivity(room, "rtm", `${room.teams.get(teamId)?.shortName} raised to ${result.newPrice}L — RTM team must match`);
      beginRtmMatchPhaseUI(io, room, player);
    });

    socket.on("rtm-skip-raise", () => {
      if (!currentRoomId) return;
      const room = getRoom(currentRoomId);
      if (!room || room.auction.rtmPhase !== "escalate" || !room.auction.currentPlayer) return;
      const teamId = getTeamIdForSocket(room, socket.id);
      if (!teamId || teamId !== room.auction.rtmWinningBidder) return;

      const player = room.auction.currentPlayer;
      clearRtmTimer(room);
      addActivity(room, "rtm", `${room.teams.get(teamId)?.shortName} passed on final raise`);
      beginRtmMatchPhaseUI(io, room, player);
    });

    socket.on("rtm-match", () => {
      if (!currentRoomId) return;
      const room = getRoom(currentRoomId);
      if (!room || room.auction.rtmPhase !== "match" || !room.auction.currentPlayer) return;
      const teamId = getTeamIdForSocket(room, socket.id);
      if (!teamId || teamId !== room.auction.rtmTeamId) return;

      const player = room.auction.currentPlayer;
      clearRtmTimer(room);
      const result = completeRtmMatch(room, teamId);
      if (!result.success) {
        socket.emit("bid-rejected", { reason: result.reason || "Cannot match" });
        beginRtmMatchPhaseUI(io, room, player);
        return;
      }

      const price = result.price || room.auction.rtmEscalatedPrice || 0;
      clearRtmAuctionState(room);
      io.to(currentRoomId).emit("rtm-used", { player, teamId, price });
      addActivity(room, "rtm", `${room.teams.get(teamId)?.shortName} matched RTM for ${player.name} at ${price}L`);
      broadcastState(io, room);
      setTimeout(() => advanceAuction(io, room), 3000);
    });

    socket.on("send-chat", (data) => {
      if (!currentRoomId) return;
      const room = getRoom(currentRoomId);
      if (!room) return;
      const name = room.playerNames.get(socket.id);
      if (!name || !data.text?.trim()) return;
      const teamId = room.connectedPlayers.get(socket.id);
      const msg = addChat(room, name, data.text.trim(), teamId);
      io.to(currentRoomId).emit("chat-message", msg);
    });

    socket.on("host-action", (data) => {
      if (!currentRoomId) return;
      const room = getRoom(currentRoomId);
      if (!room || !isHost(room, socket.id)) return;

      switch (data.action) {
        case "add-time":
          if (room.auction.phase === "auction" && !room.auction.isPaused) {
            room.auction.timerSeconds = Math.min(room.auction.timerSeconds + 5, 90);
            io.to(room.id).emit("timer-tick", { seconds: room.auction.timerSeconds, type: "auction" });
            addActivity(room, "system", `Host +5s on timer (${room.auction.timerSeconds}s)`);
          }
          break;
        case "remove-time":
          if (room.auction.phase === "auction" && !room.auction.isPaused) {
            room.auction.timerSeconds = Math.max(1, room.auction.timerSeconds - 5);
            io.to(room.id).emit("timer-tick", { seconds: room.auction.timerSeconds, type: "auction" });
            addActivity(room, "system", `Host -5s on timer (${room.auction.timerSeconds}s)`);
          }
          break;
        case "set-timer":
          if (typeof data.timerSeconds === "number") {
            room.bidTimerSeconds = Math.max(5, Math.min(60, data.timerSeconds));
            if (room.auction.phase === "auction" && room.auction.currentPlayer && !room.auction.isPaused) {
              room.auction.timerSeconds = Math.min(room.auction.timerSeconds, room.bidTimerSeconds);
              io.to(room.id).emit("timer-tick", { seconds: room.auction.timerSeconds, type: "auction" });
            }
            addActivity(room, "system", `Host set bid timer to ${room.bidTimerSeconds}s per lot`);
          }
          break;
        case "pause":
          room.auction.isPaused = true;
          if (room.timerInterval) { clearInterval(room.timerInterval); room.timerInterval = null; }
          room.auction.timerEndsAt = null;
          addActivity(room, "system", "Host paused the auction");
          emitAuctionActivity(io, room, { type: "AUCTION_PAUSED" });
          broadcastState(io, room);
          break;
        case "resume":
          room.auction.isPaused = false;
          if (room.auction.phase === "auction" && room.auction.currentPlayer) resumeAuctionTimer(io, room);
          addActivity(room, "system", "Host resumed the auction");
          emitAuctionActivity(io, room, { type: "AUCTION_RESUMED" });
          broadcastState(io, room);
          break;
        case "skip-player":
          if (room.auction.phase === "auction" && room.auction.currentPlayer) {
            if (room.timerInterval) { clearInterval(room.timerInterval); room.timerInterval = null; }
            const p = markUnsold(room);
            if (p) {
              io.to(room.id).emit("player-unsold", { player: p });
              addActivity(room, "unsold", `Host skipped — ${p.name} unsold`);
              emitAuctionActivity(io, room, { type: "PLAYER_UNSOLD", playerName: p.name });
            }
            setTimeout(() => advanceAuction(io, room), 1500);
          }
          break;
        case "kick":
          if (data.targetTeamId) {
            const kicked = kickTeamOwner(room, data.targetTeamId);
            if (kicked) {
              const team = room.teams.get(data.targetTeamId)!;
              addActivity(room, "system", `Host removed ${kicked.ownerName} from ${team.shortName} — open for takeover`);
              io.to(room.id).emit("team-vacated", {
                teamId: data.targetTeamId,
                previousOwner: kicked.ownerName,
                message: `${team.shortName} is open — squad & purse kept. Tap team to take over.`,
              });
              if (kicked.socketId) {
                const sock = io.sockets.sockets.get(kicked.socketId);
                sock?.emit("error", { message: `You were removed from ${team.shortName}. You can take over another vacant team or spectate.` });
                sock?.emit("session-restored", {
                  teamId: undefined,
                  sessionToken: room.sessionTokens.get(kicked.socketId) || "",
                  isSpectator: true,
                });
              }
            }
          }
          break;
        case "force-sold":
          if (room.auction.phase === "auction" && room.auction.currentPlayer && room.auction.currentBidder) {
            if (room.timerInterval) { clearInterval(room.timerInterval); room.timerInterval = null; }
            withRoomLock(room.id, () => finalizeLot(io, room));
            addActivity(room, "system", "Host forced sale");
          }
          break;
        case "start-now":
          if (room.auction.phase === "lobby") {
            tryStartGame(io, room, true, socket);
          }
          break;
        case "rematch":
          resetRoomForRematch(room);
          addActivity(room, "system", "Host started a rematch!");
          broadcastState(io, room);
          break;
      }
      io.to(room.id).emit("host-action", { action: data.action, message: `Host: ${data.action}` });
      broadcastState(io, room);
    });

    socket.on("disconnect", () => {
      if (!currentRoomId) return;
      const room = getRoom(currentRoomId);
      if (!room) return;

      const playerName = room.playerNames.get(socket.id);
      const teamId = room.connectedPlayers.get(socket.id);

      if (teamId) {
        const team = room.teams.get(teamId);
        if (team) {
          team.isOnline = false;
          team.ownerId = "";
        }
      }

      if (playerName && room.auction.phase !== "lobby") {
        addActivity(room, "system", `${playerName} went offline — auction continues`);
      }

      if (room.hostSocketId === socket.id) {
        for (const sid of room.playerNames.keys()) {
          if (sid !== socket.id && io.sockets.sockets.has(sid)) {
            room.hostSocketId = sid;
            room.hostId = sid;
            room.hostName = room.playerNames.get(sid) || room.hostName;
            addActivity(room, "system", `${room.hostName} is now the host`);
            break;
          }
        }
      }

      scheduleCleanup(io, room);
      broadcastState(io, room);
    });
  });
}

function startRetentionPhase(io: IOServer, room: Room): void {
  if (room.auction.phase !== "lobby") return;
  room.auction.phase = "retention";
  room.retentionTimeLeft = RETENTION_TIMER;
  io.to(room.id).emit("phase-change", { phase: "retention" });
  broadcastState(io, room);

  room.retentionTimerInterval = setInterval(() => {
    room.retentionTimeLeft--;
    io.to(room.id).emit("timer-tick", { seconds: room.retentionTimeLeft, type: "retention" });
    if (room.retentionTimeLeft <= 0) {
      clearInterval(room.retentionTimerInterval!);
      room.retentionTimerInterval = null;
      for (const team of room.teams.values()) {
        if (!team.retentionLocked) {
          team.retentionLocked = true;
          team.rtmCards = getInitialRtmCards(room.mode, 0);
        }
      }
      startAuction(io, room);
    }
  }, 1000);
}

function startAuction(io: IOServer, room: Room): void {
  if (room.auction.phase !== "lobby" && room.auction.phase !== "retention") return;
  if (room.retentionTimerInterval) { clearInterval(room.retentionTimerInterval); room.retentionTimerInterval = null; }
  setupAuctionPool(room);
  room.auction.phase = "auction";
  room.auction.round = 1;
  io.to(room.id).emit("phase-change", { phase: "auction" });
  io.to(room.id).emit("auction-start");
  addActivity(room, "system", "Auction started!");
  emitAuctionActivity(io, room, { type: "AUCTION_STARTED" });
  broadcastState(io, room);
  advanceAuction(io, room);
}

function resumeAuctionTimer(io: IOServer, room: Room): void {
  if (room.timerInterval) clearInterval(room.timerInterval);
  room.timerInterval = setInterval(() => tickAuction(io, room), 1000);
}

function tickAuction(io: IOServer, room: Room): void {
  if (room.auction.isPaused || room.auction.isRTM) return;
  room.auction.timerSeconds--;
  syncAuctionTimerEndsAt(room);
  io.to(room.id).emit("timer-tick", { seconds: room.auction.timerSeconds, type: "auction" });
  io.to(room.id).emit("room-runtime-state", buildRuntimeState(room));

  if (room.auction.timerSeconds <= 0) {
    if (room.timerInterval) { clearInterval(room.timerInterval); room.timerInterval = null; }
    withRoomLock(room.id, () => finalizeLot(io, room));
  }
}

function finalizeLot(io: IOServer, room: Room): void {
  if (room.auction.currentBidder) {
    const result = sellPlayer(room);
    if (result) {
      io.to(room.id).emit("player-sold", result);
      addActivity(room, "sold", `${room.teams.get(result.teamId)?.shortName} bought ${result.player.name} for ${result.price}L`);
      emitAuctionActivity(io, room, {
        type: "PLAYER_SOLD",
        playerName: result.player.name,
        teamId: result.teamId,
        price: result.price,
      });
      broadcastState(io, room);
      const rtmTeam = checkRTM(room, result.player, result.teamId, result.price);
      if (rtmTeam) startRTMPhase(io, room, result.player, rtmTeam, result.price);
      else setTimeout(() => advanceAuction(io, room), 2500);
    }
  } else {
    const player = markUnsold(room);
    if (player) {
      io.to(room.id).emit("player-unsold", { player });
      addActivity(room, "unsold", `${player.name} went unsold`);
      emitAuctionActivity(io, room, { type: "PLAYER_UNSOLD", playerName: player.name });
      broadcastState(io, room);
      setTimeout(() => advanceAuction(io, room), 2000);
    }
  }
}

function advanceAuction(io: IOServer, room: Room): void {
  if (room.timerInterval) { clearInterval(room.timerInterval); room.timerInterval = null; }

  const player = presentNextPlayer(room);
  if (!player) {
    room.auction.phase = "completed";
    const teams: Record<string, unknown> = {};
    for (const [id, team] of room.teams) teams[id] = team;
    io.to(room.id).emit("auction-complete", { teams: teams as Record<string, import("../lib/types").TeamState> });
    io.to(room.id).emit("phase-change", { phase: "completed" });
    addActivity(room, "system", "Auction complete!");
    broadcastState(io, room);
    return;
  }

  io.to(room.id).emit("new-player", { player, setName: player.set, remaining: getRemainingCount(room) });
  addActivity(room, "system", `Up for auction: ${player.name} (${player.set})`);
  broadcastState(io, room);

  room.auction.timerSeconds = room.bidTimerSeconds;
  syncAuctionTimerEndsAt(room);
  room.timerInterval = setInterval(() => tickAuction(io, room), 1000);
}

function clearRtmTimer(room: Room): void {
  if (room.rtmTimerInterval) {
    clearInterval(room.rtmTimerInterval);
    room.rtmTimerInterval = null;
  }
}

function rtmEmitPhase(phase: Room["auction"]["rtmPhase"]): "offer" | "escalate" | "match" {
  if (phase === "escalate" || phase === "match") return phase;
  return "offer";
}

function emitRtmOpportunity(io: IOServer, room: Room, player: import("../lib/types").Player): void {
  const { auction } = room;
  io.to(room.id).emit("rtm-opportunity", {
    player,
    teamId: auction.rtmTeamId!,
    price: auction.rtmEscalatedPrice || auction.rtmPrice || 0,
    seconds: auction.rtmTimerSeconds,
    phase: rtmEmitPhase(auction.rtmPhase),
    winningBidder: auction.rtmWinningBidder || undefined,
    escalatedPrice: auction.rtmEscalatedPrice || undefined,
    raiseUsed: auction.rtmRaiseUsed,
  });
}

function startRtmCountdown(io: IOServer, room: Room, player: import("../lib/types").Player, onExpire: () => void): void {
  clearRtmTimer(room);
  room.auction.rtmTimerSeconds = RTM_TIMER;
  emitRtmOpportunity(io, room, player);
  room.rtmTimerInterval = setInterval(() => {
    room.auction.rtmTimerSeconds--;
    io.to(room.id).emit("rtm-tick", { seconds: room.auction.rtmTimerSeconds });
    if (room.auction.rtmTimerSeconds <= 0) {
      clearRtmTimer(room);
      onExpire();
    }
  }, 1000);
}

function handleRtmOfferDeclined(io: IOServer, room: Room, player: import("../lib/types").Player): void {
  addActivity(room, "rtm", `${room.teams.get(room.auction.rtmTeamId!)?.shortName} declined RTM — sale stands`);
  clearRtmAuctionState(room);
  io.to(room.id).emit("rtm-declined", { player });
  broadcastState(io, room);
  setTimeout(() => advanceAuction(io, room), 2000);
}

function handleRtmPass(io: IOServer, room: Room, player: import("../lib/types").Player): void {
  const pass = passRtmMatch(room);
  const buyer = pass ? room.teams.get(pass.winningBidder)?.shortName : "buyer";
  addActivity(room, "rtm", `${room.teams.get(room.auction.rtmTeamId!)?.shortName} passed on match — ${buyer} keeps player (RTM card restored)`);
  clearRtmAuctionState(room);
  io.to(room.id).emit("rtm-declined", { player });
  broadcastState(io, room);
  setTimeout(() => advanceAuction(io, room), 2000);
}

function beginRtmEscalatePhase(io: IOServer, room: Room, player: import("../lib/types").Player): void {
  startRtmCountdown(io, room, player, () => {
    beginRtmMatchPhase(room);
    addActivity(room, "rtm", "Raise window expired — RTM team must match current price");
    beginRtmMatchPhaseUI(io, room, player);
  });
}

function beginRtmMatchPhaseUI(io: IOServer, room: Room, player: import("../lib/types").Player): void {
  beginRtmMatchPhase(room);
  const price = room.auction.rtmEscalatedPrice || room.auction.rtmPrice || 0;
  addActivity(room, "rtm", `${room.teams.get(room.auction.rtmTeamId!)?.shortName} must match ${price}L or pass`);
  startRtmCountdown(io, room, player, () => handleRtmPass(io, room, player));
}

function startRTMPhase(io: IOServer, room: Room, player: import("../lib/types").Player, rtmTeamId: string, price: number): void {
  room.auction.isRTM = true;
  room.auction.rtmTeamId = rtmTeamId;
  room.auction.rtmPrice = price;
  room.auction.rtmPhase = "offer";
  room.auction.rtmWinningBidder = null;
  room.auction.rtmEscalatedPrice = price;
  room.auction.rtmRaiseUsed = false;
  room.auction.currentBid = price;
  room.auction.isPaused = true;
  room.auction.currentPlayer = player;

  if (room.timerInterval) { clearInterval(room.timerInterval); room.timerInterval = null; }

  addActivity(room, "rtm", `${room.teams.get(rtmTeamId)?.shortName} can RTM ${player.name} at ${price}L`);
  startRtmCountdown(io, room, player, () => handleRtmOfferDeclined(io, room, player));
}
