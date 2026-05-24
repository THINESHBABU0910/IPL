import type { Room } from "./gameState";
import { addTeam } from "./gameState";

const BOT_NAMES = [
  "AuctionBot Alpha", "AuctionBot Beta", "AuctionBot Gamma", "AuctionBot Delta",
  "AuctionBot Epsilon", "AuctionBot Zeta", "AuctionBot Eta", "AuctionBot Theta",
];

export function addBotTeams(room: Room, count: number): number {
  const taken = new Set(room.teams.keys());
  const available = ["CSK", "MI", "RCB", "DC", "KKR", "SRH", "PBKS", "RR", "GT", "LSG"].filter((id) => !taken.has(id));
  let added = 0;
  for (let i = 0; i < Math.min(count, available.length); i++) {
    const teamId = available[i];
    const botSocketId = `bot-${teamId}-${room.id}`;
    const botName = BOT_NAMES[i] || `Bot ${i + 1}`;
    if (addTeam(room, teamId, botSocketId, botName, true)) {
      const team = room.teams.get(teamId);
      if (team) {
        team.isReady = true;
        team.isBot = true;
        team.isOnline = true;
      }
      room.playerNames.set(botSocketId, botName);
      added++;
    }
  }
  return added;
}

/** Simple bot bid: bid if affordable and random 40% chance when timer low */
export function maybeBotBid(room: Room): string | null {
  if (room.auction.phase !== "auction" || room.auction.isPaused || room.auction.isRTM) return null;
  if (!room.auction.currentPlayer) return null;

  for (const [teamId, team] of room.teams) {
    if (!team.isBot) continue;
    if (room.auction.currentBidder === teamId) continue;

    const bidAmount = room.auction.currentBidder === null
      ? room.auction.currentPlayer.basePriceLakhs
      : room.auction.nextBidAmount;

    if (team.purse < bidAmount) continue;

    const total = team.squad.length + team.retainedPlayers.length;
    if (total >= 25) continue;

    if (room.auction.currentPlayer.isOverseas) {
      const os = [...team.squad, ...team.retainedPlayers].filter((p) => p.isOverseas).length;
      if (os >= 8) continue;
    }

    // Bots bid more aggressively on overseas and marquee sets
    const chance = room.auction.timerSeconds <= 5 ? 0.55 : 0.25;
    if (Math.random() < chance) return teamId;
  }
  return null;
}
