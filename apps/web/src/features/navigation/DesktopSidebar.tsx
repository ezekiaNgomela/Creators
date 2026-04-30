import type { AuthUser, HealthResponse } from "../../api";
import { firstName } from "../../shared/helpers";
import { bottomTabs } from "../../shared/navigation";
import type { HomeTab } from "../../shared/types";

export function DesktopSidebar({
  activeTab,
  health,
  notificationCount,
  onTabChange,
  user,
}: {
  activeTab: HomeTab;
  health: HealthResponse | null;
  notificationCount: number;
  onTabChange: (tab: HomeTab) => void;
  user: AuthUser;
}) {
  return (
    <aside className="desktop-sidebar" aria-label="Desktop navigation">
      <button className="desktop-brand" type="button" onClick={() => onTabChange("home")} aria-label="Creators home">
        <span>C</span>
      </button>
      <nav>
        {bottomTabs.map((tab) => (
          <button
            className={activeTab === tab.id ? "active" : ""}
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            aria-current={activeTab === tab.id ? "page" : undefined}
          >
            <span className={`nav-glyph ${tab.icon}`} aria-hidden="true" />
            <small>{tab.label}</small>
            {tab.id === "messages" && notificationCount ? <i>{notificationCount}</i> : null}
          </button>
        ))}
      </nav>
      <div className="desktop-sidebar-foot">
        <span className={health?.status === "ok" ? "service-dot ok" : "service-dot"} aria-label={`API ${health?.status ?? "checking"}`} />
        <button type="button" onClick={() => onTabChange("profiles")} aria-label="Open profile">
          {user.avatarUrl ? <img alt="" src={user.avatarUrl} /> : <strong>{firstName(user.name).slice(0, 1).toUpperCase()}</strong>}
        </button>
      </div>
    </aside>
  );
}
