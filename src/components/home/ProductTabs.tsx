"use client";

interface ProductTabsProps {
  value: "auction" | "drafts";
  onChange: (v: "auction" | "drafts") => void;
}

export default function ProductTabs({ value, onChange }: ProductTabsProps) {
  return (
    <div className="shrink-0 flex gap-1 p-1 rounded-2xl bg-ipl-card/50 border border-ipl-border/50">
      <button
        type="button"
        onClick={() => onChange("auction")}
        className={`action-pill flex-1 text-[11px] ${value === "auction" ? "action-pill-active" : "action-pill-inactive"}`}
      >
        Auction
      </button>
      <button
        type="button"
        onClick={() => onChange("drafts")}
        className={`action-pill flex-1 text-[11px] ${value === "drafts" ? "action-pill-active" : "action-pill-inactive"}`}
      >
        Drafts
      </button>
    </div>
  );
}
