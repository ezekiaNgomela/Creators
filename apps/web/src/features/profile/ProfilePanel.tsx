import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Crown,
  Edit3,
  ExternalLink,
  Grid3X3,
  LogOut,
  Settings,
  Share2,
  Sparkles,
  UserCog,
} from "lucide-react";
import type { AuthUser, ChatUser, HealthResponse, ProfileResponse } from "../../api";
import { EmojiText } from "../../components/engagement";
import { compactNumber, firstName } from "../../shared/helpers";
import type { DisplayPost } from "../../shared/types";
import { ProfileServiceGrid, type ProfileServiceId } from "./services";
import { UserListModal } from "./UserListModal";

type ProfileTab = "posts" | "liked" | "groups";

const tabItems: Array<{ id: ProfileTab; label: string; icon: typeof Grid3X3 }> = [
  { id: "posts", label: "Posts", icon: Grid3X3 },
  { id: "liked", label: "Liked", icon: Sparkles },
  { id: "groups", label: "Groups", icon: Crown },
];

export function ProfilePanel({
  chatUsers,
  followersCount,
  followingCount,
  health,
  onEditPost,
  onLogout,
  onOpenSettings,
  onOpenPost,
  onOpenService,
  onStartCreating,
  posts,
  profile,
  user,
}: {
  chatUsers: ChatUser[];
  followersCount: number;
  followingCount: number;
  health: HealthResponse | null;
  onEditPost: (post: DisplayPost) => void;
  onLogout: () => void;
  onOpenSettings: () => void;
  onOpenPost: (post: DisplayPost) => void;
  onOpenService: (serviceId: ProfileServiceId) => void;
  onStartCreating: () => void;
  posts: DisplayPost[];
  profile: ProfileResponse | null;
  user: AuthUser;
}) {
  const [profileTab, setProfileTab] = useState<ProfileTab>("posts");
  const [profileStatus, setProfileStatus] = useState("");
  const [listType, setListType] = useState<"followers" | "following" | null>(null);

  const profilePosts = useMemo(() => posts.filter((post) => post.author.id === user.id), [posts, user.id]);
  const visiblePosts = useMemo(() => {
    if (profileTab === "liked") {
      return [...posts].sort((left, right) => right.likes - left.likes).slice(0, 9);
    }
    if (profileTab === "groups") {
      return profilePosts.filter((post) => post.mood.toLowerCase().includes("collab") || post.tags.includes("creator"));
    }
    return profilePosts;
  }, [posts, profilePosts, profileTab]);

  const coverImage = profile?.coverUrl || profilePosts[0]?.gallery[0] || "";
  const avatarImage = profile?.avatarUrl || user.avatarUrl || "";
  const handle = `@${user.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;

  async function copyProfileLink() {
    await navigator.clipboard?.writeText(`${window.location.origin}/?profile=${user.id}`);
    setProfileStatus("Profile link copied.");
  }

  return (
    <section className="profile-panel web-profile-screen">
      <motion.div
        className="web-profile-shell"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, ease: "easeOut" }}
      >
        <ProfileHero
          avatarImage={avatarImage}
          coverImage={coverImage}
          handle={handle}
          health={health}
          onCopyProfileLink={() => void copyProfileLink()}
          onLogout={onLogout}
          onOpenSettings={onOpenSettings}
          profile={profile}
          profileStatus={profileStatus}
          user={user}
        />

        <ProfileStatsBar
          followersCount={followersCount}
          followingCount={followingCount}
          postsCount={profilePosts.length}
          onOpenFollowers={() => setListType("followers")}
          onOpenFollowing={() => setListType("following")}
        />

        <section className="web-profile-vip">
          <span>
            <Crown size={20} />
            <strong>Join as a member</strong>
            <small>Member-exclusive rooms, paid content, and live benefits.</small>
          </span>
          <button type="button" onClick={onStartCreating}>Open now</button>
        </section>

        <ProfileServiceGrid
          onOpenService={onOpenService}
        />

        <section className="web-profile-content">
          <header>
            <div>
              <h2>Profile content</h2>
              <p>Edit your posts or preview how they open from the public profile.</p>
            </div>
            <button type="button" onClick={onStartCreating}>
              <Edit3 size={16} />
              New post
            </button>
          </header>
          <ProfileTabs activeTab={profileTab} onChange={setProfileTab} />
          <ProfilePostGrid
            emptyLabel={profileTab}
            onEditPost={onEditPost}
            onOpenPost={onOpenPost}
            onStartCreating={onStartCreating}
            posts={visiblePosts}
          />
        </section>
      </motion.div>

      {listType ? (
        <UserListModal
          posts={posts}
          type={listType}
          users={chatUsers}
          onClose={() => setListType(null)}
          onSelect={onOpenPost}
        />
      ) : null}
    </section>
  );
}

function ProfileHero({
  avatarImage,
  coverImage,
  handle,
  health,
  onCopyProfileLink,
  onLogout,
  onOpenSettings,
  profile,
  profileStatus,
  user,
}: {
  avatarImage: string;
  coverImage: string;
  handle: string;
  health: HealthResponse | null;
  onCopyProfileLink: () => void;
  onLogout: () => void;
  onOpenSettings: () => void;
  profile: ProfileResponse | null;
  profileStatus: string;
  user: AuthUser;
}) {
  return (
    <section className="web-profile-hero">
      <div className="web-profile-cover">
        {coverImage ? <img alt="" src={coverImage} /> : <span />}
        <div className="web-profile-cover-actions">
          <button type="button" onClick={onOpenSettings} aria-label="Open settings">
            <Settings size={18} />
          </button>
          <button type="button" onClick={onLogout} aria-label="Log out">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <div className="web-profile-identity">
        <div className="web-profile-avatar">
          {avatarImage ? <img alt="" src={avatarImage} /> : <strong>{firstName(user.name).slice(0, 1)}</strong>}
          <i><BadgeCheck size={15} /></i>
        </div>
        <div className="web-profile-copy">
          <h1>{user.name}</h1>
          <p>{handle}</p>
          <EmojiText text={profile?.bio || profile?.headline || "Creator stories, live drops, and studio updates. :sparkles:"} />
          {profile?.websiteUrl ? <a href={profile.websiteUrl} target="_blank" rel="noreferrer">{profile.websiteUrl}</a> : null}
        </div>
        <div className="web-profile-actions">
          <button type="button" onClick={onOpenSettings}>
            <UserCog size={16} />
            Edit profile
          </button>
          <button type="button" onClick={onCopyProfileLink}>
            <Share2 size={16} />
            Share
          </button>
          <span className={health?.status === "ok" ? "web-profile-live ok" : "web-profile-live"}>
            {health?.status === "ok" ? "Live" : "Syncing"}
          </span>
          {profileStatus ? <small>{profileStatus}</small> : null}
        </div>
      </div>
    </section>
  );
}

function ProfileStatsBar({
  followersCount,
  followingCount,
  onOpenFollowers,
  onOpenFollowing,
  postsCount,
}: {
  followersCount: number;
  followingCount: number;
  onOpenFollowers: () => void;
  onOpenFollowing: () => void;
  postsCount: number;
}) {
  return (
    <section className="web-profile-stats" aria-label="Profile statistics">
      <span>
        <strong>{postsCount}</strong>
        <small>Posts</small>
      </span>
      <button type="button" onClick={onOpenFollowers}>
        <strong>{compactNumber(followersCount)}</strong>
        <small>Fans</small>
      </button>
      <button type="button" onClick={onOpenFollowing}>
        <strong>{followingCount}</strong>
        <small>Following</small>
      </button>
    </section>
  );
}

function ProfileTabs({ activeTab, onChange }: { activeTab: ProfileTab; onChange: (tab: ProfileTab) => void }) {
  return (
    <nav className="web-profile-tabs" aria-label="Profile content filters">
      {tabItems.map(({ icon: Icon, id, label }) => (
        <button className={activeTab === id ? "active" : ""} key={id} type="button" onClick={() => onChange(id)}>
          <Icon size={17} />
          {label}
        </button>
      ))}
    </nav>
  );
}

function ProfilePostGrid({
  emptyLabel,
  onEditPost,
  onOpenPost,
  onStartCreating,
  posts,
}: {
  emptyLabel: ProfileTab;
  onEditPost: (post: DisplayPost) => void;
  onOpenPost: (post: DisplayPost) => void;
  onStartCreating: () => void;
  posts: DisplayPost[];
}) {
  if (!posts.length) {
    return (
      <div className="web-profile-empty">
        <Grid3X3 size={30} />
        <h3>No {emptyLabel} yet</h3>
        <p>Publish a post from Studio and it will appear here as an editable profile tile.</p>
        <button type="button" onClick={onStartCreating}>Create first post</button>
      </div>
    );
  }

  return (
    <div className="web-profile-post-grid">
      {posts.map((post) => (
        <article className="web-profile-post" key={post.id}>
          <button className="web-profile-post-media" type="button" onClick={() => onEditPost(post)}>
            {post.gallery[0] ? <img alt="" src={post.gallery[0]} /> : <span>{post.mood}</span>}
            <i>
              <Edit3 size={14} />
              Edit
            </i>
          </button>
          <div>
            <span>{post.mood}</span>
            <button type="button" onClick={() => onOpenPost(post)} aria-label={`Open ${post.author.name} profile post`}>
              <ExternalLink size={14} />
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
