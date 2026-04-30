import { motion } from "framer-motion";
import {
  BadgeCheck,
  Bell,
  Crown,
  Grid3X3,
  Home,
  MessageCircle,
  Radio,
  Settings,
  ShoppingBag,
  Sparkles,
  Store,
  UserRound,
  Video,
  WalletCards,
} from "lucide-react";

const profileStats = [
  { label: "Fans", value: "1.3M" },
  { label: "Following", value: "2.6M" },
  { label: "Zircon", value: "5K" },
  { label: "Ruby", value: "2.5K" },
];

const creatorTools = [
  { label: "Video", icon: Video },
  { label: "Dynamic", icon: Sparkles },
  { label: "Grade", icon: Crown },
  { label: "Item Store", icon: Store },
  { label: "Wallet", icon: WalletCards },
  { label: "Live store", icon: Radio },
  { label: "Paid content", icon: BadgeCheck },
  { label: "Mall", icon: ShoppingBag },
];

const postImages = [
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=480&q=80",
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=480&q=80",
  "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=480&q=80",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=480&q=80",
  "https://images.unsplash.com/photo-1512316609839-ce289d3eba0a?auto=format&fit=crop&w=480&q=80",
  "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=480&q=80",
];

export function CreatorPhonePreview() {
  return (
    <motion.aside
      className="creator-phone-stage"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.52, ease: "easeOut" }}
      aria-label="Creator profile preview"
    >
      <div className="creator-phone">
        <div className="phone-island" />
        <header className="phone-status">
          <span>9:41</span>
          <span className="phone-status-icons">5G</span>
        </header>

        <section className="phone-cover">
          <img alt="" src="https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?auto=format&fit=crop&w=900&q=80" />
          <div className="phone-cover-actions">
            <button type="button" aria-label="Profile">
              <UserRound size={15} />
            </button>
            <button type="button" aria-label="Settings">
              <Settings size={15} />
            </button>
          </div>
        </section>

        <section className="phone-profile-core">
          <img
            alt=""
            className="phone-avatar"
            src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80"
          />
          <h2>Gina Rodriguez</h2>
          <p>@gina.creator</p>
          <div className="phone-badges">
            <span>VIP</span>
            <span>Live</span>
            <span>12</span>
          </div>
        </section>

        <div className="phone-stats">
          {profileStats.map((stat) => (
            <span key={stat.label}>
              <strong>{stat.value}</strong>
              <small>{stat.label}</small>
            </span>
          ))}
        </div>

        <section className="phone-vip">
          <span>
            <Crown size={18} />
            <strong>Join as a member</strong>
          </span>
          <button type="button">Open now</button>
        </section>

        <section className="phone-tools">
          {creatorTools.map(({ icon: Icon, label }) => (
            <button key={label} type="button">
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </section>

        <section className="phone-posts">
          {postImages.map((image, index) => (
            <article key={image}>
              <img alt="" src={image} />
              <span>{index % 2 === 0 ? "Live" : "Edit"}</span>
            </article>
          ))}
        </section>

        <nav className="phone-bottom-nav" aria-label="Preview navigation">
          {[Home, Radio, MessageCircle, ShoppingBag, UserRound].map((Icon, index) => (
            <button className={index === 4 ? "active" : ""} key={index} type="button">
              <Icon size={16} />
            </button>
          ))}
        </nav>
      </div>
      <div className="feature-modal-card">
        <Bell size={18} />
        <span>
          <strong>Profile update synced</strong>
          <small>New bio, post edits, and shares are ready for home feed.</small>
        </span>
        <Grid3X3 size={18} />
      </div>
    </motion.aside>
  );
}
