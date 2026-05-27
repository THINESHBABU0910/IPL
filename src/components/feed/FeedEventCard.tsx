"use client";

import { AuctionActivity } from "@/lib/auctionActivity";
import { RoomState } from "@/lib/types";
import { formatPrice } from "@/lib/constants";
import TeamLogo from "@/components/TeamLogo";
import { getSoldFlavorText } from "@/lib/soldFlavorText";

interface FeedEventCardProps {
  activity: AuctionActivity;
  roomState: RoomState;
  compact?: boolean;
}

export default function FeedEventCard({ activity, roomState, compact }: FeedEventCardProps) {
  switch (activity.type) {
    case "BID_PLACED":
      return <BidCard activity={activity} roomState={roomState} compact={compact} />;
    case "PLAYER_SOLD":
      return <SoldCard activity={activity} roomState={roomState} compact={compact} />;
    case "PLAYER_UNSOLD":
      return <UnsoldCard activity={activity} compact={compact} />;
    case "PLAYER_JOINED":
      return <JoinCard activity={activity} />;
    case "DRAFT_PICK":
      return <DraftPickCard activity={activity} roomState={roomState} compact={compact} />;
    case "PICK_MISSED":
      return <MissedPickCard activity={activity} roomState={roomState} compact={compact} />;
    case "ORDER_SHUFFLED":
      return (
        <div className={`ref-card flex items-center gap-2 text-[11px] text-purple-300 ${compact ? "p-2" : "p-2.5"}`}>
          <span>🔀</span>
          <span>Pick order shuffled for next cycle</span>
        </div>
      );
    default:
      return null;
  }
}

function BidCard({ activity, roomState, compact }: FeedEventCardProps & { compact?: boolean }) {
  const team = activity.teamId ? roomState.teams[activity.teamId] : null;
  if (!team || !activity.playerName) return null;

  return (
    <div className={`ref-card flex items-center gap-2 ${compact ? "p-2" : "p-2.5"}`}>
      <span className={`shrink-0 ${compact ? "text-base" : "text-lg"}`} aria-hidden>🔨</span>
      {activity.teamId && (
        <TeamLogo teamId={activity.teamId} logoUrl={team.logoUrl} shortName={team.shortName} size={compact ? 24 : 28} />
      )}
      <div className={`flex-1 min-w-0 ${compact ? "text-[10px]" : "text-[11px]"}`}>
        <span className="text-[#FFD700] font-bold">{team.shortName}</span>
        <span className="text-gray-300"> bid </span>
        <span className="text-[#22C55E] font-bold">{formatPrice(activity.price || 0)}</span>
        <span className="text-gray-300"> for </span>
        <span className="text-white font-medium">{activity.playerName}</span>
      </div>
    </div>
  );
}

function SoldCard({ activity, roomState, compact }: FeedEventCardProps & { compact?: boolean }) {
  const team = activity.teamId ? roomState.teams[activity.teamId] : null;
  if (!team || !activity.playerName) return null;
  const flavor = compact ? null : getSoldFlavorText(activity.playerName, team.shortName);

  return (
    <div className={`ref-card border border-green-500/20 ${compact ? "p-2" : "p-3"}`}>
      <div className="flex items-start gap-2">
        <TeamLogo teamId={team.id} logoUrl={team.logoUrl} shortName={team.shortName} size={compact ? 28 : 36} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {!compact && <span className="text-[10px] text-gray-400">{team.ownerName}</span>}
            <span className="ref-pill bg-green-600 text-white text-[8px] border-0">SOLD 🏆</span>
          </div>
          <div className={`font-bold text-pink-400 mt-0.5 ${compact ? "text-xs" : "text-sm"}`}>{activity.playerName}</div>
          <div className={`font-black text-[#22C55E] ${compact ? "text-sm" : "text-lg"}`}>{formatPrice(activity.price || 0)}</div>
          {flavor && <div className="text-[10px] text-gray-500 mt-1 italic">{flavor}</div>}
        </div>
      </div>
    </div>
  );
}

function UnsoldCard({ activity, compact }: { activity: AuctionActivity; compact?: boolean }) {
  return (
    <div className={`ref-card border border-red-500/20 flex items-center gap-2 ${compact ? "p-2" : "p-2.5"}`}>
      <span className="text-red-400 font-black text-xs">UNSOLD</span>
      <span className="text-sm text-white">{activity.playerName}</span>
    </div>
  );
}

function DraftPickCard({ activity, roomState, compact }: FeedEventCardProps & { compact?: boolean }) {
  const team = activity.teamId ? roomState.teams[activity.teamId] : null;
  if (!activity.playerName) return null;
  return (
    <div className={`ref-card border border-ipl-gold/30 flex items-center gap-2 ${compact ? "p-2" : "p-2.5"}`}>
      {team && <TeamLogo teamId={team.id} logoUrl={team.logoUrl} shortName={team.shortName} size={compact ? 24 : 28} />}
      <div className={`flex-1 min-w-0 ${compact ? "text-[10px]" : "text-[11px]"}`}>
        <span className="text-ipl-gold font-bold">{team?.shortName || activity.displayName}</span>
        <span className="text-gray-300"> drafted </span>
        <span className="text-white font-medium">{activity.playerName}</span>
      </div>
    </div>
  );
}

function MissedPickCard({ activity, roomState, compact }: FeedEventCardProps & { compact?: boolean }) {
  const team = activity.teamId ? roomState.teams[activity.teamId] : null;
  return (
    <div className={`ref-card border border-orange-500/30 flex items-center gap-2 ${compact ? "p-2" : "p-2.5"}`}>
      <span className="text-orange-400 text-xs font-bold">MISSED</span>
      <span className={`text-gray-300 ${compact ? "text-[10px]" : "text-[11px]"}`}>
        {team?.shortName || "Team"} — catch-up later
      </span>
    </div>
  );
}

function JoinCard({ activity }: { activity: AuctionActivity }) {
  return (
    <div className="flex items-center gap-2 px-1 py-1 text-[11px] text-gray-400">
      <span className="text-green-400">👤</span>
      <span className="text-green-400 font-medium">{activity.displayName || "Someone"}</span>
      <span>joined the room</span>
    </div>
  );
}
