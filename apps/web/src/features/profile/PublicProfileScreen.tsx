import { useState } from "react";
import type { ChatUser } from "../../api";
import { compactNumber, indexFor, profileImageFor } from "../../shared/helpers";
import type { DisplayPost } from "../../shared/types";
import { UserListModal } from "./UserListModal";

export function PublicProfileScreen({
  post,
  onBack,
  chatUsers,
  onOpenPost,
  posts,
}: {
  post: DisplayPost;
  onBack: () => void;
  chatUsers: ChatUser[];
  onOpenPost: (post: DisplayPost) => void;
  posts: DisplayPost[];
}) {
  const followerCount = compactNumber(1200 + indexFor(post.author.name, 8200));
  const followingCount = compactNumber(indexFor(post.author.name, 400) + 120);
  const creationCount = compactNumber(Math.max(1, post.gallery.length));
  const gallery = post.gallery.length ? post.gallery : [profileImageFor(post.author.name)];
  const handle = `@${post.author.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
  const [listType, setListType] = useState<"followers" | "following" | null>(null);

  return (
    <section className="public-profile" aria-label={`${post.author.name} profile`}>
      <div className="public-profile-hero" style={{ backgroundImage: `url("${gallery[0]}")` }}>
        <div className="public-profile-shade" />
        <header className="public-profile-topbar">
          <button className="round-icon" type="button" onClick={onBack} aria-label="Back to feed">
            x
          </button>
          <button className="round-icon" type="button" aria-label="More profile actions">
            ...
          </button>
        </header>

        <aside className="public-side-actions" aria-label="Profile actions">
          <button type="button">+</button>
          <button type="button">Like</button>
        </aside>

        <div className="public-profile-card">
          <div className="public-avatar-wrap neon">
            <img alt="" src={profileImageFor(post.author.name)} />
          </div>
          <h1>{post.author.name}</h1>
          <p className="public-handle">{handle}</p>

          <div className="public-profile-stats" aria-label="Profile statistics">
            <button type="button" onClick={() => setListType("following")} className="bg-transparent text-white cursor-pointer hover:opacity-80 transition text-left">
              <strong>{followingCount}</strong> Following
            </button>
            <button type="button" onClick={() => setListType("followers")} className="bg-transparent text-white cursor-pointer hover:opacity-80 transition text-left">
              <strong>{followerCount}</strong> Followers
            </button>
            <span><strong>{creationCount}</strong> Creations</span>
          </div>

          <div className="public-friend-strip">
            {gallery.slice(0, 4).map((image) => <img alt="" key={image} src={image} />)}
          </div>
          <nav className="public-profile-tabs" aria-label="Profile content filters">
            <button className="active" type="button">All</button>
            <button type="button">Live</button>
            <button type="button">Posts</button>
            <button type="button">Music</button>
          </nav>
        </div>
      </div>

      <div className="profile-section-head public">
        <h2>Photos & Videos</h2>
        <button type="button">See all</button>
      </div>
      <div className="public-gallery">
        {gallery.slice(0, 6).map((image, index) => (
          <button className={index === 0 ? "featured" : ""} type="button" key={image}>
            <img alt="" src={image} />
            <span>{index === 0 ? "Latest drop" : (post.tags[index % Math.max(post.tags.length, 1)] ?? post.mediaType)}</span>
          </button>
        ))}
      </div>
      {listType && (
        <UserListModal
          posts={posts}
          type={listType}
          users={chatUsers}
          onClose={() => setListType(null)}
          onSelect={onOpenPost}
        />
      )}
    </section>
  );
}
