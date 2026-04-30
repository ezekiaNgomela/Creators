import { useState } from "react";
import { Collapse, Paper } from "@mui/material";
import { createPost, type Comment } from "../../api";
import { EmojiComposer, EmojiText, FollowPill } from "../../components/engagement";
import { profileImageFor, timeAgo, webFilterFor } from "../../shared/helpers";
import type { DisplayPost } from "../../shared/types";

export function HomeFeed({
  comments,
  isFollowing,
  loading,
  onAddComment,
  onLoadComments,
  onOpenProfile,
  onToggleFollow,
  posts,
}: {
  comments: Comment[];
  isFollowing: (name: string) => boolean;
  loading: boolean;
  onAddComment: (postId: number, body: string) => Promise<void>;
  onLoadComments: (postId: number) => Promise<void>;
  onOpenProfile: (post: DisplayPost) => void;
  onToggleFollow: (name: string) => void;
  posts: DisplayPost[];
}) {
  if (loading) {
    return <p className="feed-muted">Loading the home feed...</p>;
  }

  return (
    <section className="home-feed" aria-label="Home feed">
      {posts.map((post) => (
        <FeedCard comments={comments.filter((comment) => comment.targetType === "post" && comment.targetId === post.id)} isFollowing={isFollowing(post.author.name)} key={post.id} onAddComment={onAddComment} onLoadComments={onLoadComments} onOpenProfile={onOpenProfile} onToggleFollow={onToggleFollow} post={post} />
      ))}
    </section>
  );
}

export function FeedCard({
  comments,
  isFollowing,
  onAddComment,
  onLoadComments,
  onOpenProfile,
  onToggleFollow,
  post,
}: {
  comments: Comment[];
  isFollowing: boolean;
  onAddComment: (postId: number, body: string) => Promise<void>;
  onLoadComments: (postId: number) => Promise<void>;
  onOpenProfile: (post: DisplayPost) => void;
  onToggleFollow: (name: string) => void;
  post: DisplayPost;
}) {
  const [promoted, setPromoted] = useState(false);
  const [promoteCount, setPromoteCount] = useState(post.likes);
  const [open, setOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const imageFilter = webFilterFor(post.filterName);
  const primaryMedia = post.gallery[0] ?? post.mediaUrl;

  function promotePost() {
    setPromoted((current) => {
      setPromoteCount((count) => count + (current ? -1 : 1));
      return !current;
    });
  }

  async function shareToProfile() {
    setShareStatus("Sharing...");
    try {
      await createPost({
        body: `Sharing ${post.author.name}'s post: ${post.body}`,
        mood: post.mood,
        mediaUrl: post.mediaUrl || primaryMedia,
        filterName: post.filterName,
        overlayText: post.overlayText,
        sticker: post.sticker,
        textColor: post.textColor,
        backgroundTone: post.backgroundTone,
        aspectRatio: post.aspectRatio,
      });
      setShareStatus("Shared to your profile.");
    } catch (err) {
      setShareStatus(err instanceof Error ? err.message : "Could not share to profile.");
    }
  }

  async function shareOutsideApp() {
    const shareUrl = `${window.location.origin}/?post=${post.id}`;
    const shareText = `${post.author.name} on Creators: ${post.body}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${post.author.name} on Creators`,
          text: shareText,
          url: shareUrl,
        });
        setShareStatus("Share sheet opened.");
        return;
      }
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setShareStatus("Link copied for external sharing.");
    } catch (err) {
      setShareStatus(err instanceof Error ? err.message : "External share was cancelled.");
    }
  }

  return (
    <article className="feed-card">
      <div className="photo-grid">
        {!primaryMedia ? (
          <div className="photo-grid-main media-placeholder">Media will appear here after upload.</div>
        ) : post.mediaType === "video" ? (
          <video
            autoPlay
            className="photo-grid-main"
            loop
            muted
            playsInline
            src={primaryMedia}
            style={{
              filter: imageFilter,
              objectPosition: `${post.cropX || 50}% ${post.cropY || 50}%`,
              transform: `scale(${post.cropZoom || 1}) rotate(${post.rotation || 0}deg)`,
            }}
          />
        ) : (
          <img
            className="photo-grid-main"
            alt=""
            src={primaryMedia}
            style={{
              filter: imageFilter,
              objectPosition: `${post.cropX || 50}% ${post.cropY || 50}%`,
              transform: `scale(${post.cropZoom || 1}) rotate(${post.rotation || 0}deg)`,
            }}
          />
        )}
        {post.gallery.slice(1, 5).map((image, index) => (
          <div className="photo-tile" key={image}>
            <img alt="" src={image} />
            {index === 3 ? <span>+23</span> : null}
          </div>
        ))}

        {post.overlayText || post.sticker ? (
          <div className={`feed-creative-layer tone-${post.backgroundTone || "midnight"}`}>
            {post.sticker ? <span className="feed-sticker">{post.sticker}</span> : null}
            {post.overlayText ? <strong style={{ color: post.textColor || "#ffffff" }}>{post.overlayText}</strong> : null}
          </div>
        ) : null}

        <div className="feed-image-shade" />
        <header className="feed-card-header">
          <button className="feed-profile-trigger" type="button" onClick={() => onOpenProfile(post)} aria-label={`Open ${post.author.name} profile`}>
            <img alt="" src={profileImageFor(post.author.name)} />
            <span>
              <strong>{post.author.name}</strong>
              <small>{timeAgo(post.createdAt)}</small>
            </span>
          </button>
          <FollowPill following={isFollowing} onClick={() => onToggleFollow(post.author.name)} />
        </header>

        <div className="feed-overlay-copy">
          <div className="tag-row">
            {post.tags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>
          <p className="feed-copy">{post.body}</p>
        </div>

        <footer className="feed-actions">
          <button className={promoted ? "promote active" : "promote"} type="button" aria-label="Promote post" aria-pressed={promoted} onClick={promotePost}>
            <span className="action-icon trend" aria-hidden="true" />
          </button>
          <span>{promoteCount}</span>
          <button className="share-action" type="button" aria-label="Share post" onClick={() => setShareOpen((value) => !value)}>
            <span className="action-icon share" aria-hidden="true" />
          </button>
          <span>{Math.max(0, Math.round(post.likes / 4))}</span>
          <button className="comment" type="button" aria-label="Open comments" onClick={() => { setOpen((value) => !value); void onLoadComments(post.id); }}>
            <span className="action-icon chat" aria-hidden="true" />
          </button>
          <span>{post.comments + comments.length}</span>
          <div className="reader-stack">
            <img alt="" src={profileImageFor(`${post.author.name}-1`)} />
            <img alt="" src={profileImageFor(`${post.author.name}-2`)} />
            <img alt="" src={profileImageFor(`${post.author.name}-3`)} />
          </div>
        </footer>
      </div>

      {shareOpen ? (
        <section className="share-panel" aria-label="Share post">
          <button type="button" onClick={() => void shareToProfile()}>Share to my profile</button>
          <button type="button" onClick={() => void shareOutsideApp()}>Share outside app</button>
          <button type="button" onClick={() => void navigator.clipboard.writeText(`${window.location.origin}/?post=${post.id}`).then(() => setShareStatus("Post link copied."))}>Copy link</button>
          {shareStatus ? <p>{shareStatus}</p> : null}
        </section>
      ) : null}

      {open ? (
        <Collapse in={open}>
          <section className="comment-panel">
            <div className="flex flex-col gap-3">
              {comments.length ? comments.map((comment) => (
                <Paper
                  elevation={0}
                  key={comment.id}
                  sx={{
                    p: 1.25,
                    borderRadius: "16px",
                    background: "color-mix(in srgb, var(--surface-2) 58%, transparent)",
                    border: "1px solid var(--line-soft)",
                  }}
                >
                  <p className="m-0 text-sm font-semibold text-[color:var(--text-1)]">{comment.author.name}</p>
                  <EmojiText className="mt-1 block text-sm text-[color:var(--text-2)]" text={comment.body} />
                </Paper>
              )) : <p className="text-sm text-[color:var(--text-3)]">No comments yet. Start the conversation.</p>}
            </div>
            <EmojiComposer
              placeholder="Drop a thought with emoji"
              onSubmit={async (value) => {
                await onAddComment(post.id, value);
                setOpen(true);
              }}
            />
          </section>
        </Collapse>
      ) : null}
    </article>
  );
}
