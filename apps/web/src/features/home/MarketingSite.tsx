import { motion } from "framer-motion";
import {
  BellRing,
  Edit3,
  Home,
  MessageCircle,
  Radio,
  Settings,
  Share2,
  Sparkles,
  UserRound,
  Video,
} from "lucide-react";
import type { HealthResponse } from "../../api";
import { CreatorPhonePreview } from "../../components/CreatorPhonePreview";
import { FeatureCard } from "../../components/FeatureCard";
import { NotificationPreview } from "../notifications/NotificationPreview";
import { SettingsPreview } from "../settings/SettingsPreview";

const navigationItems = [
  { label: "Home", icon: Home },
  { label: "Live Stream", icon: Radio },
  { label: "Chat", icon: MessageCircle },
  { label: "Notifications", icon: BellRing },
  { label: "Profile", icon: UserRound },
  { label: "Settings", icon: Settings },
];

const featureCards = [
  {
    body: "A mobile-style creator page on web with cover media, fan stats, badges, account tools, and editable posts.",
    icon: <UserRound size={22} />,
    title: "Profile workspace",
    tone: "coral" as const,
  },
  {
    body: "Open your own post from profile, adjust caption, mood, media treatment, and push the saved result back to Home.",
    icon: <Edit3 size={22} />,
    title: "Post editor",
    tone: "mint" as const,
  },
  {
    body: "Share posts into the home feed, copy links, or publish a studio draft without leaving the web shell.",
    icon: <Share2 size={22} />,
    title: "Home feed sharing",
    tone: "ink" as const,
  },
  {
    body: "Live rooms, creator meetings, ratings, and comments live in their own stream surface.",
    icon: <Video size={22} />,
    title: "Live stream rooms",
  },
  {
    body: "Direct and group chat now sit beside profile and live actions, with room calls ready from the same navigation.",
    icon: <MessageCircle size={22} />,
    title: "Chat handling",
  },
  {
    body: "Settings and notifications have dedicated folders, previews, and feature surfaces instead of hiding in one file.",
    icon: <Sparkles size={22} />,
    title: "Component folders",
    tone: "coral" as const,
  },
];

export function MarketingSite({
  health,
  onLogin,
  onRegister,
  serviceLabel,
}: {
  health: HealthResponse | null;
  onLogin: () => void;
  onRegister: () => void;
  serviceLabel: string;
}) {
  return (
    <>
      <header className="marketing-nav" aria-label="Main navigation">
        <a className="marketing-brand" href="/">
          <span>C</span>
          <strong>Creators</strong>
        </a>
        <nav aria-label="Feature navigation">
          {navigationItems.map(({ icon: Icon, label }) => (
            <a href={`#${label.toLowerCase().replace(/\s+/g, "-")}`} key={label}>
              <Icon size={16} />
              {label}
            </a>
          ))}
        </nav>
        <div className="marketing-actions">
          <button className="ghost-button on-light" type="button" onClick={onLogin}>
            Log in
          </button>
          <button className="solid-button" type="button" onClick={onRegister}>
            Register
          </button>
        </div>
      </header>

      <section className="marketing-hero" id="home">
        <motion.div
          className="marketing-hero-copy"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <h1>Creators</h1>
          <p>
            A web and mobile creator workspace for profile updates, post edits, home feed sharing, live rooms,
            chat, notifications, and settings.
          </p>
          <div className="marketing-hero-actions">
            <button className="solid-button large" type="button" onClick={onRegister}>
              Start your studio
            </button>
            <button className="glass-button light large" type="button" onClick={onLogin}>
              Open dashboard
            </button>
          </div>
          <div className="service-strip light" aria-live="polite">
            <span className={health?.status === "ok" ? "status-dot is-up" : "status-dot"} />
            <span>{serviceLabel}</span>
            <span>{health ? `API ${health.checks.postgres}/${health.checks.redis}/${health.checks.minio}` : "Waiting for API"}</span>
          </div>
        </motion.div>
        <CreatorPhonePreview />
      </section>

      <section className="feature-grid-section" id="profile">
        <div className="feature-section-head">
          <h2>Feature pages, split into real components.</h2>
          <p>Home, live stream, chat, notifications, profile, and settings each now have an owned place in the Vite app.</p>
        </div>
        <div className="feature-grid-v2">
          {featureCards.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </section>

      <section className="workflow-section" id="notifications">
        <div className="workflow-copy">
          <h2>The modal work now shows up as a polished product surface.</h2>
          <p>
            The web landing reflects the mobile profile style: compact account tools, edit-ready media tiles, VIP member
            callouts, and responsive feature previews without leaving empty space around the main content.
          </p>
        </div>
        <div className="workflow-previews">
          <NotificationPreview />
          <SettingsPreview />
        </div>
      </section>
    </>
  );
}
