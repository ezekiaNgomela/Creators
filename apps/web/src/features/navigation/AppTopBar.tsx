import { Bell, Menu, Search } from "lucide-react";
import type { HomeTab, ProfileView } from "../../shared/types";

const tabTitles: Record<HomeTab, string> = {
  home: "Creators",
  streams: "Live",
  messages: "Chats",
  studio: "Studio",
  profiles: "Profile",
};

export function AppTopBar({
  activeTab,
  notificationCount,
  profileTitle,
  profileView,
  sidebarOpen,
  onLogoClick,
  onOpenMessages,
  onOpenNotifications,
  onOpenProfile,
}: {
  activeTab: HomeTab;
  notificationCount: number;
  profileTitle?: string;
  profileView: ProfileView;
  sidebarOpen: boolean;
  onLogoClick: () => void;
  onOpenMessages: () => void;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
}) {
  const title = activeTab === "profiles" ? profileTitle ?? (profileView === "settings" ? "Settings" : tabTitles[activeTab]) : tabTitles[activeTab];

  return (
    <header className="app-top-bar" aria-label="Application header">
      <button
        aria-expanded={sidebarOpen}
        aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
        className="app-top-brand"
        type="button"
        onClick={onLogoClick}
      >
        <span>C</span>
      </button>

      <strong className="app-top-title">{title}</strong>

      <nav className="app-top-actions" aria-label="Quick actions">
        <button type="button" aria-label="Search chats" onClick={onOpenMessages}>
          <Search size={20} strokeWidth={2.4} />
        </button>
        <button type="button" aria-label="Notifications" onClick={onOpenNotifications}>
          <Bell size={20} strokeWidth={2.4} />
          {notificationCount ? <i>{notificationCount}</i> : null}
        </button>
        <button type="button" aria-label="Open menu" onClick={onOpenProfile}>
          <Menu size={21} strokeWidth={2.6} />
        </button>
      </nav>
    </header>
  );
}
