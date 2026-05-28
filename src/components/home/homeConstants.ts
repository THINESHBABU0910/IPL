import { AuctionMode } from "@/lib/types";

export const AUCTION_MODES: {
  id: AuctionMode;
  title: string;
  icon: string;
  accent: string;
  iplOnly?: boolean;
}[] = [
  { id: "mega", title: "Mega Auction", icon: "🏟️", accent: "from-amber-500/20 to-orange-600/10" },
  { id: "custom_retention", title: "Official Retention", icon: "🔒", accent: "from-blue-500/20 to-indigo-600/10" },
  { id: "flex_retention", title: "Flex Retention", icon: "💰", accent: "from-emerald-500/20 to-teal-600/10" },
  {
    id: "legend",
    title: "Legend Auction",
    icon: "⭐",
    accent: "from-violet-500/20 to-fuchsia-600/10",
    iplOnly: true,
  },
];

export const MODE_LABELS: Record<string, string> = {
  mega: "Mega",
  custom_retention: "Retention",
  flex_retention: "Flex",
  legend: "Legend",
  draft: "Draft",
};
