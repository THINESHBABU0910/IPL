"use client";

import { useState } from "react";

interface NameGateProps {
  onConfirm: (name: string) => void;
}

export default function NameGate({ onConfirm }: NameGateProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  function submit() {
    const trimmed = name.trim();
    if (trimmed.length < 3) { setError("Min 3 characters"); return; }
    if (!/^[a-zA-Z0-9 _.-]+$/.test(trimmed)) { setError("Letters & numbers only"); return; }
    localStorage.setItem("playerName", trimmed);
    onConfirm(trimmed);
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="glass-card p-5 w-full max-w-sm">
        <h2 className="text-xl font-bold text-ipl-gold mb-1 text-center">Your Name</h2>
        <p className="text-gray-400 text-xs mb-4 text-center">Shown to everyone in the room</p>
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Auction name..."
          maxLength={20}
          autoFocus
          className="w-full px-3 py-2.5 bg-ipl-dark/60 border border-ipl-border rounded-lg text-white text-sm mb-2 focus:outline-none focus:border-ipl-gold"
        />
        {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
        <button type="button" onClick={submit} className="w-full py-2.5 bid-btn rounded-lg text-black font-bold text-sm">
          Continue
        </button>
      </div>
    </div>
  );
}
