import type { AuctionActivity as AuctionActivityType } from "./auctionActivity";

export interface PlayerJSON {
  id: string;
  name: string;
  country: string;
  role: "BATTER" | "BOWLER" | "ALL-ROUNDER" | "WICKETKEEPER";
  battingStyle: "RHB" | "LHB";
  bowlingStyle?: string;
  basePrice: number;
  isOverseas: boolean;
  previousTeam: string;
  category: string;
  set: string;
  age: number;
  isCapped: boolean;
}

export interface Player extends PlayerJSON {
  basePriceLakhs: number;
  displayPrice: string;
}

export interface CategoryDef {
  id: string;
  name: string;
  sets: string[];
}

export interface PlayersData {
  categories: CategoryDef[];
  players: PlayerJSON[];
}

export interface TeamDef {
  id: string;
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  logo: string;
  logoUrl: string;
}

export interface TeamState {
  id: string;
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  logo: string;
  logoUrl: string;
  purse: number;
  squad: Player[];
  retainedPlayers: Player[];
  rtmCards: number;
  ownerId: string;
  ownerName: string;
  isReady: boolean;
  retentionLocked: boolean;
  /** Flex retention: playerId → price in lakhs */
  retentionPrices?: Record<string, number>;
  isBot?: boolean;
  isOnline?: boolean;
  /** Players acquired via RTM (counts toward retention+RTM cap limits) */
  rtmAcquisitions?: Player[];
  isVacant?: boolean;
}

export interface BidEntry {
  teamId: string;
  amount: number;
  timestamp: number;
}

export interface SoldEntry {
  player: Player;
  teamId: string;
  price: number;
}

export interface ChatMessage {
  id: string;
  playerName: string;
  teamId?: string;
  text: string;
  timestamp: number;
}

export interface ActivityEntry {
  id: string;
  type: "bid" | "sold" | "unsold" | "system" | "rtm";
  text: string;
  timestamp: number;
}

export type {
  AuctionActivityKind,
  AuctionActivity,
} from "./auctionActivity";

export interface ParticipantInfo {
  socketId: string;
  playerName: string;
  teamId?: string;
  isSpectator: boolean;
  isHost: boolean;
  isOnline: boolean;
}

export type GamePhase = "lobby" | "retention" | "auction" | "completed";
export type AuctionMode = "mega" | "custom_retention" | "flex_retention";
export type LeagueId = "ipl" | "wpl" | "hundred";

export interface AuctionState {
  currentPlayer: Player | null;
  currentBid: number;
  currentBidder: string | null;
  nextBidAmount: number;
  timerSeconds: number;
  phase: GamePhase;
  soldPlayers: SoldEntry[];
  unsoldPlayers: Player[];
  remainingPool: Player[];
  currentSetName: string;
  isRTM: boolean;
  rtmTeamId: string | null;
  rtmTimerSeconds: number;
  rtmPrice?: number;
  /** IPL 2026 RTM: offer → escalate (bidder raises once) → match (RTM team matches or passes) */
  rtmPhase?: "none" | "offer" | "escalate" | "match";
  rtmWinningBidder?: string | null;
  rtmEscalatedPrice?: number;
  rtmRaiseUsed?: boolean;
  bidHistory: BidEntry[];
  round: number;
  isPaused: boolean;
  timerEndsAt: number | null;
}

/** Per-set upcoming pool preview (IPL set order, shuffled within set) */
export interface SetPreviewGroup {
  setName: string;
  players: Player[];
}

export interface RuntimeStatePayload {
  status: "LOBBY" | "RETENTION" | "AUCTION" | "PAUSED" | "COMPLETED";
  mode: AuctionMode;
  currentSet: string;
  timer: number;
  timerEndsAt: number | null;
  poolRemaining: number;
  soldCount: number;
  unsoldCount: number;
  round: number;
  currentPlayer: Player | null;
  currentBid: number | null;
  currentBidder: string | null;
  teams: Record<string, { ownerId: string | null; ownerName: string | null; purse: number }>;
}

export interface RoomState {
  id: string;
  league: LeagueId;
  mode: AuctionMode;
  teams: Record<string, TeamState>;
  auction: AuctionState;
  createdAt: number;
  hostId: string;
  hostName: string;
  hostSocketId: string;
  retentionTimeLeft: number;
  chat: ChatMessage[];
  activityFeed: ActivityEntry[];
  auctionActivities?: AuctionActivityType[];
  participants: ParticipantInfo[];
  poolRemaining: number;
  minTeamsToStart: number;
  bidTimerSeconds: number;
  upcomingPreview?: Player[];
  upcomingPreviewBySet?: SetPreviewGroup[];
}

export interface BidResult {
  success: boolean;
  reason?: string;
}

export interface CreateRoomPayload {
  mode: AuctionMode;
  league?: LeagueId;
  playerName: string;
}

export interface JoinRoomPayload {
  roomId: string;
  playerName: string;
  spectator?: boolean;
  sessionToken?: string;
}

export interface PickTeamPayload {
  teamId: string;
}

export interface LockRetentionsPayload {
  playerIds: string[];
  /** Required for flex_retention — price in lakhs per player */
  customPrices?: Record<string, number>;
}

export interface ChatPayload {
  text: string;
}

export interface HostActionPayload {
  action: "add-time" | "remove-time" | "set-timer" | "skip-player" | "pause" | "resume" | "kick" | "start-now" | "rematch" | "force-sold";
  targetTeamId?: string;
  timerSeconds?: number;
}

export interface ServerToClientEvents {
  "room-state": (state: RoomState) => void;
  "room-created": (data: { roomId: string; sessionToken: string }) => void;
  "player-joined": (data: { playerName: string; socketId: string; isSpectator: boolean }) => void;
  "player-left": (data: { teamId?: string; playerName: string }) => void;
  "team-picked": (data: { teamId: string; playerName: string; socketId: string; sessionToken: string }) => void;
  "team-unpicked": (data: { teamId: string }) => void;
  "team-vacated": (data: { teamId: string; previousOwner: string; message: string }) => void;
  "player-ready": (data: { teamId: string; isReady: boolean }) => void;
  "phase-change": (data: { phase: GamePhase }) => void;
  "retention-locked": (data: { teamId: string; count: number }) => void;
  "auction-start": () => void;
  "new-player": (data: { player: Player; setName: string; remaining: number }) => void;
  "bid-update": (data: { currentBid: number; currentBidder: string; nextBidAmount: number; timerSeconds: number; teamName: string }) => void;
  "bid-rejected": (data: { reason: string }) => void;
  "timer-tick": (data: { seconds: number; type?: "auction" | "retention" | "rtm" }) => void;
  "player-sold": (data: { player: Player; teamId: string; price: number }) => void;
  "player-unsold": (data: { player: Player }) => void;
  "rtm-opportunity": (data: {
    player: Player;
    teamId: string;
    price: number;
    seconds: number;
    phase: "offer" | "escalate" | "match";
    winningBidder?: string;
    escalatedPrice?: number;
    raiseUsed?: boolean;
  }) => void;
  "rtm-used": (data: { player: Player; teamId: string; price: number }) => void;
  "rtm-declined": (data: { player: Player }) => void;
  "rtm-tick": (data: { seconds: number }) => void;
  "auction-complete": (data: { teams: Record<string, TeamState> }) => void;
  "chat-message": (msg: ChatMessage) => void;
  "activity-entry": (entry: ActivityEntry) => void;
  "activity": (entry: AuctionActivityType) => void;
  "activity-feed": (entries: AuctionActivityType[]) => void;
  "session-restored": (data: { teamId?: string; sessionToken: string; isSpectator: boolean }) => void;
  "host-action": (data: { action: string; message: string }) => void;
  "room-runtime-state": (state: RuntimeStatePayload) => void;
  "error": (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  "create-room": (data: CreateRoomPayload, callback: (res: { roomId?: string; sessionToken?: string; error?: string }) => void) => void;
  "join-room": (data: JoinRoomPayload, callback: (res: { success: boolean; sessionToken?: string; teamId?: string; isSpectator?: boolean; error?: string }) => void) => void;
  "pick-team": (data: PickTeamPayload, callback?: (res: { success: boolean; sessionToken?: string }) => void) => void;
  "player-ready": () => void;
  "lock-retentions": (data: LockRetentionsPayload) => void;
  "place-bid": () => void;
  "use-rtm": () => void;
  "decline-rtm": () => void;
  "rtm-raise": () => void;
  "rtm-skip-raise": () => void;
  "rtm-match": () => void;
  "reconnect-room": (data: { roomId: string; playerName?: string; sessionToken?: string }, callback: (res: { success: boolean; teamId?: string; error?: string }) => void) => void;
  "send-chat": (data: ChatPayload) => void;
  "host-action": (data: HostActionPayload) => void;
  "start-game": () => void;
  "join-as-spectator": (data: { roomId: string; playerName: string }, callback: (res: { success: boolean; sessionToken?: string; error?: string }) => void) => void;
}
