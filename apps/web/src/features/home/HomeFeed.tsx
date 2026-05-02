import { type CSSProperties, type FormEvent, useMemo, useState } from "react";
import AddRounded from "@mui/icons-material/AddRounded";
import ChatBubbleOutlineRounded from "@mui/icons-material/ChatBubbleOutlineRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import FavoriteBorderRounded from "@mui/icons-material/FavoriteBorderRounded";
import FavoriteRounded from "@mui/icons-material/FavoriteRounded";
import MoreHorizRounded from "@mui/icons-material/MoreHorizRounded";
import RocketLaunchRounded from "@mui/icons-material/RocketLaunchRounded";
import SendRounded from "@mui/icons-material/SendRounded";
import { type Comment } from "../../api";
import { EmojiText } from "../../components/engagement";
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
  const [promotionCount, setPromotionCount] = useState(post.promotionScore);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [tagComposerOpen, setTagComposerOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [savedTags, setSavedTags] = useState<string[]>(() => loadSavedTags(post.id));
  const imageFilter = webFilterFor(post.filterName);
  const primaryMedia = post.gallery[0] ?? post.mediaUrl;
  const mediaRatio = ratioForPost(post.aspectRatio);
  const visibleTags = useMemo(() => uniqueTags([...post.tags, ...savedTags]).slice(0, 6), [post.tags, savedTags]);
  const commentCount = Math.max(post.comments, comments.length);

  function promotePost() {
    setPromoted((current) => {
      setPromotionCount((count) => count + (current ? -1 : 1));
      return !current;
    });
  }

  function likePost() {
    setLiked((current) => {
      setLikeCount((count) => count + (current ? -1 : 1));
      return !current;
    });
  }

  function openComments() {
    setCommentOpen(true);
    void onLoadComments(post.id);
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = commentDraft.trim();
    if (!value) {
      return;
    }
    await onAddComment(post.id, value);
    setCommentDraft("");
    setCommentOpen(true);
  }

  function saveHashtag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const tag = normalizeTag(tagInput);
    if (!tag) {
      return;
    }
    setSavedTags((current) => {
      const next = uniqueTags([...current, tag]);
      savePostTags(post.id, next);
      return next;
    });
    setTagInput("");
    setTagComposerOpen(false);
  }

  return (
    <article className="feed-card post-card" style={{ "--post-ratio": mediaRatio } as CSSProperties}>
      <div className="photo-grid post-media-frame">
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

        <div className="feed-image-shade" />
        <header className="post-top-header">
          <button className="post-option-button" type="button" aria-label="Post options">
            <MoreHorizRounded fontSize="small" />
          </button>
        </header>
        {post.gallery.length > 1 ? (
          <div className="post-media-dots" aria-label={`${post.gallery.length} media items`}>
            {post.gallery.slice(0, 4).map((item, index) => (
              <i className={index === 0 ? "active" : ""} key={item} />
            ))}
          </div>
        ) : null}

        {commentOpen ? (
          <div className="post-comment-overlay" role="dialog" aria-label="Comments">
            <div className="post-comment-sheet">
              <div className="post-comment-head">
                <span>Comments</span>
                <button type="button" onClick={() => setCommentOpen(false)} aria-label="Close comments">
                  <CloseRounded fontSize="small" />
                </button>
              </div>
              <div className="post-comment-list">
                {comments.length ? comments.map((comment) => (
                  <div className="post-comment-bubble" key={comment.id}>
                    <img alt="" src={profileImageFor(comment.author.name)} />
                    <p>
                      <strong>{comment.author.name}</strong>
                      <EmojiText text={comment.body} />
                    </p>
                  </div>
                )) : <p className="post-comment-empty">No comments yet. Start the reply.</p>}
              </div>
              <form className="post-comment-form" onSubmit={(event) => void submitComment(event)}>
                <input value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} placeholder="Reply to this post" aria-label="Reply to this post" />
                <button type="submit" aria-label="Send comment">
                  <SendRounded fontSize="small" />
                </button>
              </form>
            </div>
          </div>
        ) : null}
      </div>

      <section className="post-caption-layer" aria-label="Post caption">
        <div className="post-author-row">
          <button className="post-author-mini" type="button" onClick={() => onOpenProfile(post)} aria-label={`Open ${post.author.name} profile`}>
            <img alt="" src={profileImageFor(post.author.name)} />
            <span>
              <strong>{post.author.name}</strong>
              <small>{timeAgo(post.createdAt)}</small>
            </span>
          </button>
          <button className={isFollowing ? "post-author-follow active" : "post-author-follow"} type="button" onClick={() => onToggleFollow(post.author.name)}>
            {isFollowing ? "Following" : "Follow"}
          </button>
        </div>
        <p className="feed-copy">{post.body}</p>
        <div className="post-hashtag-row">
          {visibleTags.map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
          <button className="post-hashtag-add" type="button" onClick={() => setTagComposerOpen((value) => !value)} aria-label="Add hashtag">
            <AddRounded fontSize="inherit" />
          </button>
        </div>
        {tagComposerOpen ? (
          <form className="post-hashtag-form" onSubmit={saveHashtag}>
            <input value={tagInput} onChange={(event) => setTagInput(event.target.value)} placeholder="Add hashtag" aria-label="Add hashtag" />
            <button type="submit">Save</button>
          </form>
        ) : null}
      </section>

      <footer className="post-social-bar">
        <button className={liked ? "post-action like active" : "post-action like"} type="button" aria-label="Like post" aria-pressed={liked} onClick={likePost}>
          {liked ? <FavoriteRounded fontSize="small" /> : <FavoriteBorderRounded fontSize="small" />}
          <span>{likeCount}</span>
        </button>
        <button className="post-action comment" type="button" aria-label="Open comments" onClick={openComments}>
          <ChatBubbleOutlineRounded fontSize="small" />
          <span>{commentCount}</span>
        </button>
        <button className={promoted ? "post-action promote active" : "post-action promote"} type="button" aria-label="Promote post" aria-pressed={promoted} onClick={promotePost}>
          <RocketLaunchRounded fontSize="small" />
          <span>{promotionCount}</span>
        </button>
      </footer>
    </article>
  );
}

const tagStoragePrefix = "creators.postTags.";

function ratioForPost(value: string) {
  switch (value) {
    case "1:1":
      return "1 / 1";
    case "9:16":
      return "9 / 16";
    case "16:9":
      return "16 / 9";
    case "4:5":
    default:
      return "4 / 5";
  }
}

function normalizeTag(value: string) {
  return value.trim().replace(/^#+/, "").replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase();
}

function uniqueTags(values: string[]) {
  return Array.from(new Set(values.map(normalizeTag).filter(Boolean)));
}

function loadSavedTags(postId: number) {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(`${tagStoragePrefix}${postId}`) || "[]");
    return Array.isArray(parsed) ? uniqueTags(parsed.filter((value): value is string => typeof value === "string")) : [];
  } catch {
    return [];
  }
}

function savePostTags(postId: number, tags: string[]) {
  window.localStorage.setItem(`${tagStoragePrefix}${postId}`, JSON.stringify(uniqueTags(tags)));
}
