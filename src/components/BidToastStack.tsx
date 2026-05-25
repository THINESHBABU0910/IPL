"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AuctionActivity } from "@/lib/auctionActivity";
import { RoomState } from "@/lib/types";
import FeedEventCard from "./feed/FeedEventCard";

export type BidToast = {
  id: string;
  activity: AuctionActivity;
  createdAt: number;
};

const TOAST_MS = 4500;

interface BidToastStackProps {
  toasts: BidToast[];
  roomState: RoomState;
  onDismiss: (id: string) => void;
}

export default function BidToastStack({ toasts, roomState, onDismiss }: BidToastStackProps) {
  return (
    <div className="shrink-0 px-2 pt-1 space-y-1.5 max-h-[42vh] overflow-hidden pointer-events-none">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-auto"
          >
            <FeedEventCard activity={t.activity} roomState={roomState} compact />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function useBidToasts() {
  const [toasts, setToasts] = useState<BidToast[]>([]);

  function pushActivity(activity: AuctionActivity) {
    if (!["BID_PLACED", "PLAYER_SOLD", "PLAYER_UNSOLD"].includes(activity.type)) return;
    const id = activity.id;
    setToasts((prev) => [...prev.filter((t) => t.id !== id), { id, activity, createdAt: Date.now() }].slice(-4));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_MS);
  }

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return { toasts, pushActivity, dismiss };
}
