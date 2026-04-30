import { bottomTabs } from "../../shared/navigation";
import type { HomeTab } from "../../shared/types";

export function BottomNav({ activeTab, onTabChange }: { activeTab: HomeTab; onTabChange: (tab: HomeTab) => void }) {
  return (
    <nav className="social-bottom-nav" aria-label="Primary">
      {bottomTabs.map((tab) => (
        <button
          className={activeTab === tab.id ? "active" : ""}
          aria-current={activeTab === tab.id ? "page" : undefined}
          aria-label={tab.label}
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
        >
          <span className={`nav-glyph ${tab.icon}`} aria-hidden="true" />
          <small>{tab.label}</small>
        </button>
      ))}
    </nav>
  );
}
