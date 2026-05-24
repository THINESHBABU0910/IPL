/** Structured auction events (playauctiongame-style ACTIVITY / ACTIVITY_FEED) */

export type AuctionActivityKind =
  | "PLAYER_JOINED"
  | "AUCTION_STARTED"
  | "AUCTION_PAUSED"
  | "AUCTION_RESUMED"
  | "PLAYER_UNSOLD"
  | "PLAYER_SOLD"
  | "BID_PLACED";

export interface AuctionActivity {
  id: string;
  type: AuctionActivityKind;
  timestamp: number;
  senderId?: string;
  displayName?: string;
  playerName?: string;
  teamId?: string;
  price?: number;
}

export function createActivityId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
