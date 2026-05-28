"use client";

interface HomeTabBarProps {
  screenTab: "play" | "recent";
  onChange: (tab: "play" | "recent") => void;
}

export default function HomeTabBar({ screenTab, onChange }: HomeTabBarProps) {
  return (
    <nav className="app-tabbar">
      <button
        type="button"
        onClick={() => onChange("play")}
        className={`app-tab ${screenTab === "play" ? "app-tab-active" : ""}`}
      >
        <span className="text-lg">🎮</span>
        <span>Play</span>
      </button>
      <button
        type="button"
        onClick={() => onChange("recent")}
        className={`app-tab ${screenTab === "recent" ? "app-tab-active" : ""}`}
      >
        <span className="text-lg">🕐</span>
        <span>Recent</span>
      </button>
    </nav>
  );
}
