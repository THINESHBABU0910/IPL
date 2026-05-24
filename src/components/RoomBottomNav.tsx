"use client";

interface TabDef {
  id: string;
  label: string;
  icon: string;
  badge?: number;
  variant?: "chat" | "squad" | "settings" | "default";
}

interface RoomBottomNavProps {
  tabs: TabDef[];
  active: string;
  onChange: (id: string) => void;
}

export default function RoomBottomNav({ tabs, active, onChange }: RoomBottomNavProps) {
  return (
    <nav className="app-tabbar">
      {tabs.map((t) => {
        const variantClass =
          t.variant === "squad" ? "app-tab-squad" :
          t.variant === "settings" ? "app-tab-settings" : "";
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`app-tab ${variantClass} ${active === t.id ? "app-tab-active" : ""}`}
          >
            <span className="text-lg leading-none relative">
              {t.icon}
              {t.badge !== undefined && t.badge > 0 && (
                <span className="tab-badge">{t.badge > 99 ? "99+" : t.badge}</span>
              )}
            </span>
            <span>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
