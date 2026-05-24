"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

interface InviteFriendsCardProps {
  roomId: string;
}

export default function InviteFriendsCard({ roomId }: InviteFriendsCardProps) {
  const [url, setUrl] = useState(`/room/${roomId}`);

  useEffect(() => {
    setUrl(`${window.location.origin}/room/${roomId}`);
  }, [roomId]);

  function copyLink() {
    navigator.clipboard.writeText(url);
    toast.success("Link copied!");
  }

  function shareWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(`Join my IPL Auction! ${url}`)}`, "_blank");
  }

  function shareNative() {
    if (navigator.share) {
      navigator.share({ title: "IPL Auction", text: "Join my auction room!", url });
    } else {
      copyLink();
    }
  }

  return (
    <div className="ref-card shrink-0">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[#FFD700]">🔗</span>
        <span className="text-sm font-bold text-[#FFD700]">Invite Friends</span>
      </div>
      <div className="flex gap-1.5">
        <input
          readOnly
          value={url}
          className="flex-1 min-w-0 pro-input py-2 text-[10px] text-gray-400 truncate"
        />
        <button type="button" onClick={copyLink} className="ref-icon-btn" aria-label="Copy">📋</button>
        <button type="button" onClick={shareWhatsApp} className="ref-icon-btn text-green-400" aria-label="WhatsApp">💬</button>
        <button type="button" onClick={shareNative} className="ref-start-btn shrink-0">Share</button>
      </div>
    </div>
  );
}
