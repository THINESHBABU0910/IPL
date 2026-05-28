"use client";

interface CreateJoinTabsProps {
  value: "create" | "join";
  onChange: (v: "create" | "join") => void;
}

export default function CreateJoinTabs({ value, onChange }: CreateJoinTabsProps) {
  return (
    <div className="shrink-0 flex gap-1.5 p-1 rounded-2xl bg-ipl-card/50 border border-ipl-border/50">
      <button
        type="button"
        onClick={() => onChange("create")}
        className={`action-pill ${value === "create" ? "action-pill-active" : "action-pill-inactive"}`}
      >
        Create Room
      </button>
      <button
        type="button"
        onClick={() => onChange("join")}
        className={`action-pill ${value === "join" ? "action-pill-active" : "action-pill-inactive"}`}
      >
        Join Room
      </button>
    </div>
  );
}
