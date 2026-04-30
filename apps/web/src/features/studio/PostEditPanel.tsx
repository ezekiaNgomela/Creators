import { useState } from "react";
import { Button, Chip, IconButton, Paper } from "@mui/material";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import ImageRounded from "@mui/icons-material/ImageRounded";
import NorthEastRounded from "@mui/icons-material/NorthEastRounded";
import SaveRounded from "@mui/icons-material/SaveRounded";
import SendRounded from "@mui/icons-material/SendRounded";
import type { FeedPost, PostInput } from "../../api";
import { studioTextColors, studioTones } from "../../shared/studio";
import { webFilterFor } from "../../shared/helpers";
import type { DisplayPost } from "../../shared/types";

export function PostEditPanel({
  onBack,
  onSave,
  onShareHome,
  post,
}: {
  onBack: () => void;
  onSave: (postId: number, input: PostInput) => Promise<FeedPost>;
  onShareHome: () => void;
  post: DisplayPost;
}) {
  const [body, setBody] = useState(post.body);
  const [mood, setMood] = useState(post.mood);
  const [overlayText, setOverlayText] = useState(post.overlayText);
  const [sticker, setSticker] = useState(post.sticker || "NEW");
  const [textColor, setTextColor] = useState(post.textColor || "#ffffff");
  const [backgroundTone, setBackgroundTone] = useState(post.backgroundTone || "midnight");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const primaryMedia = post.gallery[0] || post.mediaUrl;

  async function savePost(shareHome: boolean) {
    if (!body.trim() || saving) {
      return;
    }
    setSaving(true);
    setStatus(shareHome ? "Saving to Home..." : "Saving changes...");
    try {
      await onSave(post.id, {
        body,
        mood,
        mediaUrl: post.mediaUrl || primaryMedia,
        mediaType: post.mediaType,
        filterName: post.filterName,
        overlayText,
        sticker,
        textColor,
        backgroundTone,
        aspectRatio: post.aspectRatio,
        cropZoom: post.cropZoom,
        cropX: post.cropX,
        cropY: post.cropY,
        rotation: post.rotation,
      });
      setStatus("Post updated.");
      if (shareHome) {
        onShareHome();
      } else {
        onBack();
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not update post.");
    } finally {
      setSaving(false);
    }
  }

  async function shareOutsideApp() {
    const url = `${window.location.origin}/?post=${post.id}`;
    const text = `${body}\n${url}`;
    if (navigator.share) {
      await navigator.share({ title: "Creators post", text: body, url });
      return;
    }
    await navigator.clipboard.writeText(text);
    setStatus("Post link copied.");
  }

  return (
    <section className="post-edit-page">
      <header className="post-edit-topbar">
        <button className="round-icon" type="button" onClick={onBack} aria-label="Back to profile">
          <ArrowBackRounded fontSize="small" />
        </button>
        <strong>Edit profile post</strong>
        <button className="round-icon" type="button" onClick={() => void shareOutsideApp()} aria-label="Share post">
          <NorthEastRounded fontSize="small" />
        </button>
      </header>

      <div className="post-edit-shell">
        <div className={`post-edit-preview tone-${backgroundTone}`}>
          {primaryMedia ? (
            post.mediaType === "video" ? (
              <video autoPlay loop muted playsInline src={primaryMedia} />
            ) : (
              <img alt="" src={primaryMedia} />
            )
          ) : (
            <div className="post-edit-empty"><ImageRounded />Media preview</div>
          )}
          <div className="post-edit-scrim" />
          {sticker ? <span>{sticker}</span> : null}
          {overlayText ? <strong style={{ color: textColor }}>{overlayText}</strong> : null}
          <p>{body || "Write your caption to preview it here."}</p>
        </div>

        <form className="post-edit-form" onSubmit={(event) => {
          event.preventDefault();
          void savePost(false);
        }}>
          <label>
            <span>Caption</span>
            <textarea value={body} onChange={(event) => setBody(event.target.value)} />
          </label>
          <label>
            <span>Mood</span>
            <input value={mood} onChange={(event) => setMood(event.target.value)} />
          </label>
          <label>
            <span>Overlay</span>
            <input value={overlayText} onChange={(event) => setOverlayText(event.target.value)} />
          </label>

          <div className="post-edit-control">
            <span>Sticker</span>
            <div>
              {["LIVE", "DROP", "NEW", "VIP", "Q&A", ""].map((item) => (
                <button className={sticker === item ? "active" : ""} key={item || "none"} type="button" onClick={() => setSticker(item)}>
                  {item || "None"}
                </button>
              ))}
            </div>
          </div>

          <div className="post-edit-control">
            <span>Tone</span>
            <div>
              {studioTones.map((tone) => (
                <button className={backgroundTone === tone.id ? "active" : ""} key={tone.id} type="button" onClick={() => setBackgroundTone(tone.id)}>
                  {tone.label}
                </button>
              ))}
            </div>
          </div>

          <div className="post-edit-colors">
            {studioTextColors.map((color) => (
              <button aria-label={`Use ${color}`} className={textColor === color ? "active" : ""} key={color} style={{ backgroundColor: color }} type="button" onClick={() => setTextColor(color)} />
            ))}
          </div>

          <div className="post-edit-actions">
            <Button disabled={!body.trim() || saving} type="submit" variant="outlined">
              {saving ? "Saving" : "Save"}
            </Button>
            <Button disabled={!body.trim() || saving} onClick={() => void savePost(true)} startIcon={<SendRounded />} variant="contained">
              Save to Home
            </Button>
          </div>
          {status ? <p className="post-edit-status">{status}</p> : null}
        </form>
      </div>
    </section>
  );
}
