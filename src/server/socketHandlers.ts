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
} from "./gameState";
import type { Room } from "./gameState";
import {
  presentNextPlayer, processBid, sellPlayer, markUnsold,
  checkRTM, executeRTM, getRemainingCount,
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

function resolveRoom(roomId: string): Room | undefined {
  return getRoom(roomId) ?? tryRestoreRoom(roomId) ?? undefined;
}

function scheduleCleanup(io: IOServer, room: Room): void {
  if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
  if (room.auction.phase === "completed") return;
  room.cleanupTimer = setTimeout(() => {
    const r = getRoom(room.id);
    if (!r || r.auction.phase === "completed") return;
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
          callback({ success: true, sessionToken: data.sessionToken });
          socket.emit("session-restored", { teamId: restored.teamId, sessionToken: data.sessionToken, isSpectator: restored.isSpectator });
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
      } else {
        callback?.({ success: false });
      }
    });

    socket.on("start-game", () => {
      if (!currentRoomId) return;
      const room = getRoom(currentRoomId);
      if (!room || room.auction.phase !== "lobby") return;
      if (!isJoined(room, socket.id)) return;

      if (isRetentionMode(room.mode)) startRetentionPhase(io, room);
      else startAuction(io, room);
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
      const teamId = getTeamIdForSocket(room, socket.id);
      if (!teamId || teamId !== room.auction.rtmTeamId) return;

      if (room.rtmTimerInterval) { clearInterval(room.rtmTimerInterval); room.rtmTimerInterval = null; }

      const player = room.auction.currentPlayer;
      const price = room.auction.rtmPrice || room.auction.currentBid;

      if (executeRTM(room, teamId, price)) {
        room.auction.isRTM = false;
        room.auction.rtmTeamId = null;
        room.auction.isPaused = false;
        room.auction.currentPlayer = null;
        io.to(currentRoomId).emit("rtm-used", { player, teamId, price });
        addActivity(room, "rtm", `${room.teams.get(teamId)?.shortName} used RTM for ${player.name} at ${price}L`);
        broadcastState(io, room);
        setTimeout(() => advanceAuction(io, room), 3000);
      }
    });

    socket.on("decline-rtm", () => {
      if (!currentRoomId) return;
      const room = getRoom(currentRoomId);
      if (!room || !room.auction.isRTM || !room.auction.currentPlayer) return;
      const teamId = getTeamIdForSocket(room, socket.id);
      if (!teamId || teamId !== room.auction.rtmTeamId) return;

      if (room.rtmTimerInterval) { clearInterval(room.rtmTimerInterval); room.rtmTimerInterval = null; }

      const player = room.auction.currentPlayer;
      room.auction.isRTM = false;
      room.auction.rtmTeamId = null;
      room.auction.isPaused = false;
      room.auction.currentPlayer = null;

      io.to(currentRoomId).emit("rtm-declined", { player });
      broadcastState(io, room);
      setTimeout(() => advanceAuction(io, room), 2000);
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
            room.auction.timerSeconds = Math.min(room.auction.timerSeconds + 10, 30);
            io.to(room.id).emit("timer-tick", { seconds: room.auction.timerSeconds, type: "auction" });
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
            for (const [sid, tid] of room.connectedPlayers) {
              if (tid === data.targetTeamId) {
                io.sockets.sockets.get(sid)?.emit("error", { message: "You were removed by the host" });
                io.sockets.sockets.get(sid)?.disconnect(true);
                break;
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
            if (isRetentionMode(room.mode)) startRetentionPhase(io, room);
            else startAuction(io, room);
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

      if (room.auction.phase === "lobby") {
        const teamId = removeTeam(room, socket.id);
        if (teamId) {
          io.to(currentRoomId).emit("player-left", { teamId, playerName: "" });
          broadcastState(io, room);
        } else {
          room.playerNames.delete(socket.id);
          room.spectators.delete(socket.id);
          room.sessionTokens.delete(socket.id);
        }
      } else {
        const teamId = room.connectedPlayers.get(socket.id);
        if (teamId) {
          const team = room.teams.get(teamId);
          if (team) team.isOnline = false;
        }
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

  room.auction.timerSeconds = TIMER_INITIAL;
  syncAuctionTimerEndsAt(room);
  room.timerInterval = setInterval(() => tickAuction(io, room), 1000);
}

function startRTMPhase(io: IOServer, room: Room, player: import("../lib/types").Player, rtmTeamId: string, price: number): void {
  room.auction.isRTM = true;
  room.auction.rtmTeamId = rtmTeamId;
  room.auction.rtmTimerSeconds = RTM_TIMER;
  room.auction.rtmPrice = price;
  room.auction.currentBid = price;
  room.auction.isPaused = true;
  room.auction.currentPlayer = player;

  if (room.timerInterval) { clearInterval(room.timerInterval); room.timerInterval = null; }

  io.to(room.id).emit("rtm-opportunity", { player, teamId: rtmTeamId, price, seconds: RTM_TIMER });
  addActivity(room, "rtm", `${room.teams.get(rtmTeamId)?.shortName} can RTM ${player.name} at ${price}L`);

  room.rtmTimerInterval = setInterval(() => {
    room.auction.rtmTimerSeconds--;
    io.to(room.id).emit("rtm-tick", { seconds: room.auction.rtmTimerSeconds });
    if (room.auction.rtmTimerSeconds <= 0) {
      clearInterval(room.rtmTimerInterval!);
      room.rtmTimerInterval = null;
      room.auction.isRTM = false;
      room.auction.rtmTeamId = null;
      room.auction.isPaused = false;
      room.auction.currentPlayer = null;
      io.to(room.id).emit("rtm-declined", { player });
      broadcastState(io, room);
      setTimeout(() => advanceAuction(io, room), 2000);
    }
  }, 1000);
}
