import {

  Player, PlayerJSON, PlayersData, TeamState, AuctionState, RoomState,

  AuctionMode, ChatMessage, ActivityEntry, ParticipantInfo, TeamDef, RuntimeStatePayload,

} from "../lib/types";

import {
  TOTAL_PURSE, formatPrice,
  MAX_RETENTIONS, MAX_OVERSEAS, TIMER_INITIAL, ROUND2_DISCOUNT,
  calculateRetentionCost, validateRetentions, validateFlexRetentions,
  calculateFlexRetentionCost, getInitialRtmCards, normalizePriceLakhs,
} from "../lib/iplRules";

import { buildSetQueues, countPoolRemaining, previewBySet, flattenQueues, PoolMeta } from "../lib/auctionPool";

import { IPL_TEAMS } from "../data/teams";

import * as fs from "fs";

import * as path from "path";

import { randomBytes } from "crypto";



// ---------- Player loading ----------



let playersCache: Player[] | null = null;
let playerByIdCache: Map<string, Player> | null = null;

function loadPlayersFromDisk(): Player[] {

  if (playersCache) {
    if (!playerByIdCache) {
      playerByIdCache = new Map(playersCache.map((pl) => [pl.id, pl]));
    }
    return playersCache;
  }

  const candidates = [

    path.join(process.cwd(), "src", "data", "players.json"),

    path.join(__dirname, "..", "data", "players.json"),

    path.join(__dirname, "..", "..", "src", "data", "players.json"),

  ];

  for (const p of candidates) {

    try {

      const raw = fs.readFileSync(p, "utf-8");

      const data = JSON.parse(raw) as PlayersData;

      playersCache = data.players.map((pl: PlayerJSON) => {

        const basePriceLakhs = pl.basePrice / 100000;

        return { ...pl, basePriceLakhs, displayPrice: formatPrice(basePriceLakhs) };

      });

      playerByIdCache = new Map(playersCache.map((pl) => [pl.id, pl]));

      return playersCache;

    } catch { /* try next */ }

  }

  throw new Error("Could not load players.json");

}

function getPlayerById(id: string): Player | undefined {
  loadPlayersFromDisk();
  return playerByIdCache?.get(String(id).trim());
}

function resolvePlayersByIds(ids: string[]): { found: Player[]; missing: string[] } {
  const all = loadPlayersFromDisk();
  const found: Player[] = [];
  const missing: string[] = [];
  const uniqueIds = [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))];

  for (const id of uniqueIds) {
    const p = playerByIdCache?.get(id) ?? all.find((pl) => pl.id === id);
    if (p) found.push(p);
    else missing.push(id);
  }
  return { found, missing };
}

export function normalizeRetentionPlayerIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const ids: string[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      const id = item.trim();
      if (id) ids.push(id);
    } else if (typeof item === "number" && Number.isFinite(item)) {
      ids.push(String(item));
    } else if (item && typeof item === "object" && "id" in item) {
      const id = String((item as { id: unknown }).id).trim();
      if (id) ids.push(id);
    }
  }
  return [...new Set(ids)];
}

function normalizeCustomPrices(
  playerIds: string[],
  raw?: Record<string, unknown>,
): Record<string, number> {
  const out: Record<string, number> = {};
  if (!raw) return out;
  for (const id of playerIds) {
    if (raw[id] != null) out[id] = normalizePriceLakhs(raw[id]);
  }
  return out;
}

function isFlexRetentionMode(room: Room): boolean {
  return room.mode === "flex_retention";
}



const TEAM_MAP = new Map(IPL_TEAMS.map((t) => [t.id, t]));



// ---------- Room ----------



export interface Room {

  id: string;

  mode: AuctionMode;

  teams: Map<string, TeamState>;

  auction: AuctionState;

  connectedPlayers: Map<string, string>;

  playerNames: Map<string, string>;

  sessionTokens: Map<string, string>;

  tokenToSocket: Map<string, { socketId: string; teamId?: string; isSpectator: boolean }>;

  spectators: Set<string>;

  hostId: string;

  hostName: string;

  hostSocketId: string;

  chat: ChatMessage[];

  activityFeed: ActivityEntry[];

  auctionActivities: import("../lib/auctionActivity").AuctionActivity[];

  timerInterval: ReturnType<typeof setInterval> | null;

  rtmTimerInterval: ReturnType<typeof setInterval> | null;

  retentionTimerInterval: ReturnType<typeof setInterval> | null;

  cleanupTimer: ReturnType<typeof setTimeout> | null;

  retentionTimeLeft: number;

  minTeamsToStart: number;

  createdAt: number;

  /** IPL set-ordered pool with per-set shuffle (server-only) */
  poolMeta: PoolMeta | null;

}



const rooms = new Map<string, Room>();



export function getRoom(roomId: string): Room | undefined {

  return rooms.get(roomId.toUpperCase());

}



export function generateSessionToken(): string {

  return randomBytes(16).toString("hex");

}



export function createRoom(roomId: string, mode: AuctionMode, hostSocketId: string, hostName: string): Room {

  const token = generateSessionToken();

  const room: Room = {

    id: roomId.toUpperCase(),

    mode,

    teams: new Map(),

    auction: createEmptyAuctionState(),

    connectedPlayers: new Map(),

    playerNames: new Map(),

    sessionTokens: new Map(),

    tokenToSocket: new Map(),

    spectators: new Set(),

    hostId: hostSocketId,

    hostName,

    hostSocketId,

    chat: [],

    activityFeed: [],

    auctionActivities: [],

    timerInterval: null,

    rtmTimerInterval: null,

    retentionTimerInterval: null,

    cleanupTimer: null,

    retentionTimeLeft: 180,

    minTeamsToStart: 2,

    createdAt: Date.now(),

    poolMeta: null,

  };

  room.playerNames.set(hostSocketId, hostName);

  room.sessionTokens.set(hostSocketId, token);

  room.tokenToSocket.set(token, { socketId: hostSocketId, isSpectator: false });

  rooms.set(room.id, room);

  return room;

}



export function deleteRoom(roomId: string): void {

  const room = rooms.get(roomId.toUpperCase());

  if (!room) return;

  if (room.timerInterval) clearInterval(room.timerInterval);

  if (room.rtmTimerInterval) clearInterval(room.rtmTimerInterval);

  if (room.retentionTimerInterval) clearInterval(room.retentionTimerInterval);

  if (room.cleanupTimer) clearTimeout(room.cleanupTimer);

  rooms.delete(roomId.toUpperCase());

}



function createEmptyAuctionState(): AuctionState {

  return {

    currentPlayer: null,

    currentBid: 0,

    currentBidder: null,

    nextBidAmount: 0,

    timerSeconds: TIMER_INITIAL,

    phase: "lobby",

    soldPlayers: [],

    unsoldPlayers: [],

    remainingPool: [],

    currentSetName: "",

    isRTM: false,

    rtmTeamId: null,

    rtmTimerSeconds: 0,

    rtmPrice: 0,

    bidHistory: [],

    round: 1,

    isPaused: false,

    timerEndsAt: null,

  };

}



export function isHost(room: Room, socketId: string): boolean {

  return room.hostSocketId === socketId;

}



export function addActivity(room: Room, type: ActivityEntry["type"], text: string): ActivityEntry {

  const entry: ActivityEntry = {

    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,

    type,

    text,

    timestamp: Date.now(),

  };

  room.activityFeed.unshift(entry);

  if (room.activityFeed.length > 100) room.activityFeed.pop();

  return entry;

}



export function pushAuctionActivity(
  room: Room,
  activity: Omit<import("../lib/auctionActivity").AuctionActivity, "id" | "timestamp"> & { id?: string; timestamp?: number }
): import("../lib/auctionActivity").AuctionActivity {
  const entry: import("../lib/auctionActivity").AuctionActivity = {
    id: activity.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    timestamp: activity.timestamp ?? Date.now(),
    type: activity.type,
    senderId: activity.senderId,
    displayName: activity.displayName,
    playerName: activity.playerName,
    teamId: activity.teamId,
    price: activity.price,
  };
  room.auctionActivities.unshift(entry);
  if (room.auctionActivities.length > 100) room.auctionActivities.pop();
  return entry;
}



export function addChat(room: Room, playerName: string, text: string, teamId?: string): ChatMessage {

  const msg: ChatMessage = {

    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,

    playerName,

    teamId,

    text: text.slice(0, 200),

    timestamp: Date.now(),

  };

  room.chat.push(msg);

  if (room.chat.length > 50) room.chat.shift();

  return msg;

}



export function getParticipants(room: Room, io: { sockets: { sockets: Map<string, unknown> } }): ParticipantInfo[] {

  const list: ParticipantInfo[] = [];

  for (const [socketId, name] of room.playerNames) {

    const teamId = room.connectedPlayers.get(socketId);

    const isSpectator = room.spectators.has(socketId);

    list.push({

      socketId,

      playerName: name,

      teamId,

      isSpectator,

      isHost: socketId === room.hostSocketId,

      isOnline: io.sockets.sockets.has(socketId),

    });

  }

  return list;

}



// ---------- Team ops ----------



export function addTeam(

  room: Room, teamId: string, socketId: string, playerName: string, isBot = false

): boolean {

  if (room.teams.has(teamId)) return false;

  const def = TEAM_MAP.get(teamId);

  if (!def) return false;



  const team: TeamState = {

    ...def,

    purse: TOTAL_PURSE,

    squad: [],

    retainedPlayers: [],

    rtmCards: 0,

    ownerId: socketId,

    ownerName: playerName,

    isReady: false,

    retentionLocked: false,

    isBot,

    isOnline: true,

  };

  room.teams.set(teamId, team);

  room.connectedPlayers.set(socketId, teamId);

  room.playerNames.set(socketId, playerName);

  room.spectators.delete(socketId);

  return true;

}



export function removeTeam(room: Room, socketId: string): string | null {

  const teamId = room.connectedPlayers.get(socketId);

  if (!teamId) {

    room.playerNames.delete(socketId);

    room.spectators.delete(socketId);

    room.sessionTokens.delete(socketId);

    return null;

  }

  room.teams.delete(teamId);

  room.connectedPlayers.delete(socketId);

  room.playerNames.delete(socketId);

  const token = room.sessionTokens.get(socketId);

  if (token) room.tokenToSocket.delete(token);

  room.sessionTokens.delete(socketId);

  return teamId;

}



export function getTeamForSocket(room: Room, socketId: string): TeamState | undefined {

  const teamId = room.connectedPlayers.get(socketId);

  return teamId ? room.teams.get(teamId) : undefined;

}



export function getTeamIdForSocket(room: Room, socketId: string): string | undefined {

  return room.connectedPlayers.get(socketId);

}



export function toggleReady(room: Room, socketId: string): boolean {

  const team = getTeamForSocket(room, socketId);

  if (!team || team.isBot) return false;

  team.isReady = !team.isReady;

  return team.isReady;

}



export function allReady(room: Room): boolean {

  if (room.teams.size < room.minTeamsToStart) return false;

  for (const team of room.teams.values()) {

    if (!team.isReady) return false;

  }

  return true;

}



export function reconnectByToken(

  room: Room, token: string, newSocketId: string

): { teamId?: string; isSpectator: boolean; playerName: string } | null {

  const entry = room.tokenToSocket.get(token);

  if (!entry) return null;



  const oldSocketId = entry.socketId;
  const name = room.playerNames.get(oldSocketId) || room.hostName;

  room.playerNames.delete(oldSocketId);
  room.sessionTokens.delete(oldSocketId);
  room.connectedPlayers.delete(oldSocketId);
  room.spectators.delete(oldSocketId);

  room.playerNames.set(newSocketId, name);
  room.sessionTokens.set(newSocketId, token);
  room.tokenToSocket.set(token, { socketId: newSocketId, teamId: entry.teamId, isSpectator: entry.isSpectator });

  if (entry.isSpectator) {
    room.spectators.add(newSocketId);
    return { isSpectator: true, playerName: name };
  }

  if (entry.teamId) {
    room.connectedPlayers.set(newSocketId, entry.teamId);
    const team = room.teams.get(entry.teamId);
    if (team) {
      team.ownerId = newSocketId;
      team.isOnline = true;
    }
    return { teamId: entry.teamId, isSpectator: false, playerName: name };
  }

  return { isSpectator: false, playerName: name };

}



// ---------- Retention (uses official IPL rules from iplRules.ts) ----------

export { calculateRetentionCost, validateRetentions } from "../lib/iplRules";

export function lockRetentions(
  room: Room,
  teamId: string,
  playerIds: string[],
  customPrices?: Record<string, unknown>,
): string | null {

  const team = room.teams.get(teamId);

  if (!team) return "Team not found";

  if (team.retentionLocked) return "Already locked";

  const normalizedIds = normalizeRetentionPlayerIds(playerIds);
  const flexMode = isFlexRetentionMode(room);

  // Allow skipping retention (0 players) — full ₹120 Cr purse for auction
  if (!normalizedIds.length) {
    team.retainedPlayers = [];
    team.retentionPrices = undefined;
    team.purse = TOTAL_PURSE;
    team.rtmCards = getInitialRtmCards(room.mode, 0);
    team.retentionLocked = true;
    return null;
  }

  const allPlayers = loadPlayersFromDisk();
  let selected: Player[];

  if (flexMode) {
    const { found, missing } = resolvePlayersByIds(normalizedIds);
    if (missing.length) {
      return `Unknown player ID(s): ${missing.join(", ")}`;
    }
    selected = found;
  } else {
    const teamPlayerMap = new Map(
      allPlayers.filter((p) => p.previousTeam === teamId).map((p) => [p.id, p]),
    );
    const missing: string[] = [];
    selected = [];
    for (const id of normalizedIds) {
      const p = teamPlayerMap.get(id);
      if (p) selected.push(p);
      else missing.push(id);
    }
    if (missing.length) {
      return `Pick players from your ${team.shortName} squad only (IPL Retention mode). Unknown: ${missing.join(", ")}`;
    }
  }

  for (const [otherId, otherTeam] of room.teams) {
    if (otherId === teamId || !otherTeam.retentionLocked) continue;
    for (const p of otherTeam.retainedPlayers) {
      if (normalizedIds.includes(p.id)) {
        return `${p.name} already retained by ${otherTeam.shortName}`;
      }
    }
  }

  let cost: number;
  const prices = normalizeCustomPrices(normalizedIds, customPrices);

  if (flexMode) {
    const err = validateFlexRetentions(selected, prices);
    if (err) return err;
    cost = calculateFlexRetentionCost(prices, normalizedIds);
    team.retentionPrices = { ...prices };
    team.retainedPlayers = selected.map((p) => ({
      ...p,
      basePriceLakhs: prices[p.id],
      displayPrice: formatPrice(prices[p.id]),
    }));
  } else {
    const err = validateRetentions(selected);
    if (err) return err;
    cost = calculateRetentionCost(selected);
    team.retentionPrices = undefined;
    team.retainedPlayers = selected;
  }

  if (cost > TOTAL_PURSE) return "Retention cost exceeds purse";

  team.purse = TOTAL_PURSE - cost;
  team.rtmCards = getInitialRtmCards(room.mode, selected.length);
  team.retentionLocked = true;

  return null;

}



export function allRetentionsLocked(room: Room): boolean {

  for (const team of room.teams.values()) {

    if (!team.retentionLocked) return false;

  }

  return true;

}



// ---------- Pool ----------



export function setupAuctionPool(room: Room): void {

  const allPlayers = loadPlayersFromDisk();

  let poolPlayers: Player[];

  if (room.mode === "mega") {

    poolPlayers = allPlayers;

    for (const team of room.teams.values()) {
      team.purse = TOTAL_PURSE;
      team.rtmCards = getInitialRtmCards("mega", 0);
    }

  } else {

    const retainedIds = new Set<string>();

    for (const team of room.teams.values()) {

      for (const p of team.retainedPlayers) retainedIds.add(p.id);

    }

    poolPlayers = allPlayers.filter((p) => !retainedIds.has(p.id));

  }

  room.poolMeta = buildSetQueues(poolPlayers, `${room.id}-r${room.auction.round}-${Date.now()}`);
  room.auction.remainingPool = flattenQueues(room.poolMeta);

}



export function resetRoomForRematch(room: Room): void {

  if (room.timerInterval) clearInterval(room.timerInterval);

  if (room.rtmTimerInterval) clearInterval(room.rtmTimerInterval);

  if (room.retentionTimerInterval) clearInterval(room.retentionTimerInterval);

  room.timerInterval = null;

  room.rtmTimerInterval = null;

  room.retentionTimerInterval = null;



  room.auction = createEmptyAuctionState();

  room.poolMeta = null;

  room.chat = [];

  room.activityFeed = [];

  room.auctionActivities = [];

  room.retentionTimeLeft = 180;



  for (const team of room.teams.values()) {

    team.squad = [];

    team.retainedPlayers = [];

    team.rtmCards = 0;

    team.purse = TOTAL_PURSE;

    team.isReady = team.isBot ?? false;

    team.retentionLocked = false;

    team.retentionPrices = undefined;

  }

}



// ---------- Serialization ----------



export function serializeRoom(room: Room, io?: { sockets: { sockets: Map<string, unknown> } }): RoomState {

  const teams: Record<string, TeamState> = {};

  for (const [id, team] of room.teams) teams[id] = team;



  const participants = io ? getParticipants(room, io) : [];



  return {

    id: room.id,

    mode: room.mode,

    teams,

    auction: { ...room.auction, remainingPool: [] },

    createdAt: room.createdAt,

    hostId: room.hostId,

    hostName: room.hostName,

    hostSocketId: room.hostSocketId,

    retentionTimeLeft: room.retentionTimeLeft,

    chat: room.chat,

    activityFeed: room.activityFeed.slice(0, 50),

    auctionActivities: room.auctionActivities.slice(0, 50),

    participants,

    poolRemaining: countPoolRemaining(room.poolMeta) +

      (room.auction.round === 1 ? room.auction.unsoldPlayers.length : 0),

    minTeamsToStart: room.minTeamsToStart,

    upcomingPreviewBySet: previewBySet(room.poolMeta),

    upcomingPreview: previewBySet(room.poolMeta).flatMap((g) => g.players).slice(0, 30),

  };

}



export function importRoomFromSnapshot(raw: Record<string, unknown>): Room | null {
  try {
    const id = String(raw.id).toUpperCase();
    if (rooms.has(id)) return rooms.get(id)!;

    const auctionRaw = { ...(raw.auction as Record<string, unknown>) };
    const remainingIds = (auctionRaw.remainingPoolIds as string[]) || [];
    delete auctionRaw.remainingPoolIds;

    loadPlayersFromDisk();
    const remainingPool = remainingIds
      .map((pid) => playerByIdCache?.get(pid))
      .filter((p): p is Player => !!p);

    const room: Room = {
      id,
      mode: raw.mode as AuctionMode,
      teams: new Map(Object.entries((raw.teams as Record<string, TeamState>) || {})),
      auction: { ...(auctionRaw as unknown as AuctionState), remainingPool },
      connectedPlayers: new Map(Object.entries((raw.connectedPlayers as Record<string, string>) || {})),
      playerNames: new Map(Object.entries((raw.playerNames as Record<string, string>) || {})),
      sessionTokens: new Map(Object.entries((raw.sessionTokens as Record<string, string>) || {})),
      tokenToSocket: new Map(
        Object.entries(
          (raw.tokenToSocket as Record<string, { socketId: string; teamId?: string; isSpectator: boolean }>) || {},
        ),
      ),
      spectators: new Set((raw.spectators as string[]) || []),
      hostId: String(raw.hostId || ""),
      hostName: String(raw.hostName || "Host"),
      hostSocketId: "",
      chat: (raw.chat as ChatMessage[]) || [],
      activityFeed: (raw.activityFeed as ActivityEntry[]) || [],
      auctionActivities: [],
      timerInterval: null,
      rtmTimerInterval: null,
      retentionTimerInterval: null,
      cleanupTimer: null,
      retentionTimeLeft: Number(raw.retentionTimeLeft) || 0,
      minTeamsToStart: Number(raw.minTeamsToStart) || 2,
      createdAt: Number(raw.createdAt) || Date.now(),
      poolMeta: (raw.poolMeta as PoolMeta) || null,
    };

    for (const team of room.teams.values()) {
      team.isOnline = false;
      team.ownerId = "";
    }

    rooms.set(id, room);
    return room;
  } catch (e) {
    console.error("importRoomFromSnapshot failed:", e);
    return null;
  }
}

export type { TeamDef };

export { loadPlayersFromDisk, IPL_TEAMS as TEAM_DEFS, rooms };


