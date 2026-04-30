import { FormEvent, useState } from "react";
import { Button, Chip, Fade, IconButton, InputBase, LinearProgress, Paper } from "@mui/material";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import ContentCopyRounded from "@mui/icons-material/ContentCopyRounded";
import Crop169Rounded from "@mui/icons-material/Crop169Rounded";
import DeleteRounded from "@mui/icons-material/DeleteRounded";
import ImageRounded from "@mui/icons-material/ImageRounded";
import LayersRounded from "@mui/icons-material/LayersRounded";
import MoreHorizRounded from "@mui/icons-material/MoreHorizRounded";
import MovieRounded from "@mui/icons-material/MovieRounded";
import NorthEastRounded from "@mui/icons-material/NorthEastRounded";
import SaveRounded from "@mui/icons-material/SaveRounded";
import SendRounded from "@mui/icons-material/SendRounded";
import TextFieldsRounded from "@mui/icons-material/TextFieldsRounded";
import TuneRounded from "@mui/icons-material/TuneRounded";
import UndoRounded from "@mui/icons-material/UndoRounded";
import type { FeedPost, PostInput } from "../../api";
import { createStudioDraft, studioAspectRatios, studioFilters, studioStickers, studioTextColors, studioTimelineTicks, studioTones, studioTools } from "../../shared/studio";
import { compactNumber } from "../../shared/helpers";
import type { DisplayPost, StudioDraft, StudioTool } from "../../shared/types";

export function StudioPanel({
  onCreatePost,
  onUploadMedia,
  posts,
  serviceLabel,
}: {
  onCreatePost: (input: PostInput) => Promise<FeedPost>;
  onUploadMedia: (file: File) => Promise<{ url: string; mediaType: "image" | "video" | string }>;
  posts: DisplayPost[];
  serviceLabel: string;
}) {
  const [draft, setDraft] = useState<StudioDraft>(() => createStudioDraft());
  const [activeTool, setActiveTool] = useState<StudioTool>("media");
  const [creationMode, setCreationMode] = useState<"post" | "collab" | "live">("post");
  const [publishing, setPublishing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [publishStatus, setPublishStatus] = useState("");
  const topPosts = posts.slice(0, 3);
  const topBoost = topPosts[0]?.promotionScore ?? 0;
  const totalReach = topPosts.reduce((total, post) => total + post.likes + post.comments, 0);
  const selectedFilter = studioFilters.find((filter) => filter.name === draft.filterName) ?? studioFilters[0];
  const selectedTone = studioTones.find((tone) => tone.id === draft.backgroundTone) ?? studioTones[0];
  const activeToolLabel = studioTools.find((tool) => tool.id === activeTool)?.label ?? "Media";
  const libraryItems = Array.from(new Set(posts.flatMap((post) => post.gallery))).filter(Boolean);

  function updateDraft<K extends keyof StudioDraft>(key: K, value: StudioDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function submitPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.body.trim() || publishing) {
      return;
    }
    if (creationMode === "live") {
      setActiveTool("publish");
      setPublishStatus("Live setup is ready. Open the Live tab to start the stream room.");
      return;
    }

    setPublishing(true);
    setPublishStatus(creationMode === "collab" ? "Publishing mutual post..." : "Publishing...");
    try {
      const post = await onCreatePost({
        body: draft.body,
        mood: creationMode === "collab" ? `${draft.mood} collab` : draft.mood,
        mediaUrl: draft.mediaUrl,
        mediaType: draft.mediaType,
        filterName: draft.filterName,
        overlayText: draft.overlayText,
        sticker: draft.sticker,
        textColor: draft.textColor,
        backgroundTone: draft.backgroundTone,
        aspectRatio: draft.aspectRatio,
        cropZoom: draft.cropZoom,
        cropX: draft.cropX,
        cropY: draft.cropY,
        rotation: draft.rotation,
      });
      setDraft(createStudioDraft());
      setPublishStatus(`Published ${post.mood.toLowerCase()} post.`);
    } catch (err) {
      setPublishStatus(err instanceof Error ? err.message : "Could not publish post.");
    } finally {
      setPublishing(false);
    }
  }

  async function uploadFromDevice(file: File | null) {
    if (!file) {
      return;
    }
    setUploading(true);
    setPublishStatus("Uploading media...");
    try {
      const media = await onUploadMedia(file);
      updateDraft("mediaUrl", media.url);
      updateDraft("mediaType", media.mediaType === "video" ? "video" : "image");
      setActiveTool("adjust");
      setPublishStatus(`${media.mediaType === "video" ? "Video" : "Image"} added to canvas.`);
    } catch (err) {
      setPublishStatus(err instanceof Error ? err.message : "Could not upload media.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="studio-panel">
      <form className="studio-editor-shell" onSubmit={submitPost}>
        <header className="studio-topbar">
          <div className="studio-topbar-left">
            <IconButton aria-label="Back to editor history">
              <ArrowBackRounded />
            </IconButton>
            <span className="studio-project-name">Creator Studio</span>
            <span className="studio-save-state">{serviceLabel}</span>
          </div>
          <div className="studio-mode-tabs" aria-label="Creation type">
            {[
              ["post", "Post"],
              ["collab", "Mutual"],
              ["live", "Live"],
            ].map(([id, label]) => (
              <button className={creationMode === id ? "active" : ""} key={id} type="button" onClick={() => {
                setCreationMode(id as "post" | "collab" | "live");
                updateDraft("mood", id === "post" ? "Behind the scenes" : id === "collab" ? "Mutual post" : "Live setup");
              }}>
                {label}
              </button>
            ))}
          </div>
          <div className="studio-topbar-actions">
            <IconButton aria-label="Undo last edit" onClick={() => setDraft(createStudioDraft())}>
              <UndoRounded />
            </IconButton>
            <IconButton aria-label="Save draft">
              <SaveRounded />
            </IconButton>
            <Button disabled={!draft.body.trim() || publishing} startIcon={<SendRounded />} type="submit" variant="contained">
              {publishing ? "Publishing" : creationMode === "live" ? "Prepare" : "Publish"}
            </Button>
          </div>
        </header>

        <aside className="studio-tool-rail" aria-label="Studio tools">
          {studioTools.map((tool) => (
            <button className={activeTool === tool.id ? "active" : ""} key={tool.id} onClick={() => setActiveTool(tool.id)} title={tool.label} type="button">
              {tool.icon}
              <span>{tool.label}</span>
            </button>
          ))}
        </aside>

        <main className="studio-stage" aria-label="Editor canvas">
          <div className="studio-stage-label">
            <span>Slide 1</span>
            <strong>{draft.aspectRatio}</strong>
          </div>
          <div className="studio-canvas-area">
            <div className={`studio-preview-frame studio-canvas-frame tone-${selectedTone.id}`} style={{ aspectRatio: draft.aspectRatio.replace(":", " / ") }}>
              {!draft.mediaUrl ? (
                <div className="studio-empty-media">
                  <ImageRounded sx={{ animation: 'float-pulse 4s ease-in-out infinite' }} />
                  <span>Choose media from your device or profile library</span>
                </div>
              ) : draft.mediaType === "video" ? (
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  src={draft.mediaUrl}
                  style={{
                    filter: selectedFilter.css,
                    objectPosition: `${draft.cropX}% ${draft.cropY}%`,
                    transform: `scale(${draft.cropZoom}) rotate(${draft.rotation}deg)`,
                  }}
                />
              ) : (
                <img
                  alt=""
                  src={draft.mediaUrl}
                  style={{
                    filter: selectedFilter.css,
                    objectPosition: `${draft.cropX}% ${draft.cropY}%`,
                    transform: `scale(${draft.cropZoom}) rotate(${draft.rotation}deg)`,
                  }}
                />
              )}
              <div className="studio-preview-scrim" />
              <div className="studio-selection-outline" aria-hidden="true" />
              {draft.sticker ? <span className="studio-preview-sticker">{draft.sticker}</span> : null}
              {draft.overlayText ? <strong style={{ color: draft.textColor }}>{draft.overlayText}</strong> : null}
              <p>{draft.body || "Write the caption to preview it here."}</p>
            </div>
          </div>

          <div className="studio-quick-strip" aria-label="Quick media strip">
            {libraryItems.slice(0, 6).map((image) => (
              <button
                className={draft.mediaUrl === image ? "active" : ""}
                key={image}
                onClick={() => {
                  updateDraft("mediaUrl", image);
                  updateDraft("mediaType", image.match(/\.(mp4|mov|webm)(\?|$)/i) ? "video" : "image");
                }}
                type="button"
              >
                <img alt="" src={image} />
              </button>
            ))}
          </div>

          <div className="studio-timeline" aria-label="Timeline">
            <div className="studio-timeline-ruler">
              {studioTimelineTicks.map((tick) => <span key={tick}>{tick}</span>)}
            </div>
            <div className="studio-timeline-tracks">
              <span className="playhead" />
              <div className="track video-track"><MovieRounded fontSize="small" /> Main media</div>
              <div className="track text-track"><TextFieldsRounded fontSize="small" /> {draft.overlayText || "Text layer"}</div>
              <div className="track audio-track">Audio / effects</div>
            </div>
          </div>
        </main>

        <aside className="studio-inspector" aria-label={`${activeToolLabel} inspector`}>
          <div className="studio-inspector-head">
            <span>{activeToolLabel}</span>
            <button type="button" onClick={() => setActiveTool("publish")}>Export</button>
          </div>

          {activeTool === "media" ? (
            <div className="studio-inspector-section">
              <label className="studio-upload-button full">
                <input
                  accept="image/*,video/*"
                  disabled={uploading}
                  onChange={(event) => void uploadFromDevice(event.currentTarget.files?.[0] ?? null)}
                  type="file"
                />
                <NorthEastRounded fontSize="small" />
                <span>{uploading ? "Uploading..." : "Upload from device"}</span>
              </label>
              <div className="studio-media-grid">
                {libraryItems.map((image) => (
                  <button
                    className={draft.mediaUrl === image ? "selected" : ""}
                    key={image}
                    onClick={() => {
                      updateDraft("mediaUrl", image);
                      updateDraft("mediaType", image.match(/\.(mp4|mov|webm)(\?|$)/i) ? "video" : "image");
                    }}
                    type="button"
                  >
                    <img alt="" src={image} />
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {activeTool === "adjust" ? (
            <div className="studio-inspector-section">
              <div className="studio-control-group" aria-label="Crop and transform">
                <span>Ratio and crop</span>
                <div className="studio-chip-row">
                  {studioAspectRatios.map((ratio) => (
                    <button className={draft.aspectRatio === ratio ? "selected" : ""} key={ratio} onClick={() => updateDraft("aspectRatio", ratio)} type="button">
                      {ratio}
                    </button>
                  ))}
                </div>
                <div className="studio-slider-stack">
                  <label>Zoom <input min="0.8" max="2.4" step="0.02" type="range" value={draft.cropZoom} onChange={(event) => updateDraft("cropZoom", Number(event.target.value))} /></label>
                  <label>X <input min="0" max="100" type="range" value={draft.cropX} onChange={(event) => updateDraft("cropX", Number(event.target.value))} /></label>
                  <label>Y <input min="0" max="100" type="range" value={draft.cropY} onChange={(event) => updateDraft("cropY", Number(event.target.value))} /></label>
                </div>
              </div>
              <div className="studio-control-group">
                <span>Filter</span>
                <div className="studio-chip-row">
                  {studioFilters.map((filter) => (
                    <button className={draft.filterName === filter.name ? "selected" : ""} key={filter.name} onClick={() => updateDraft("filterName", filter.name)} type="button">
                      {filter.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="studio-control-group">
                <span>Rotate</span>
                <div className="studio-chip-row">
                  {[0, 90, 180, 270].map((rotation) => (
                    <button className={draft.rotation === rotation ? "selected" : ""} key={rotation} onClick={() => updateDraft("rotation", rotation)} type="button">
                      {rotation}deg
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {activeTool === "text" ? (
            <div className="studio-inspector-section">
              <label className="studio-field">
                <span>Overlay text</span>
                <InputBase aria-label="Overlay text" onChange={(event) => updateDraft("overlayText", event.target.value)} value={draft.overlayText} />
              </label>
              <label className="studio-field">
                <span>Caption</span>
                <InputBase aria-label="Caption" multiline minRows={4} onChange={(event) => updateDraft("body", event.target.value)} placeholder="Share the moment, offer, or behind-the-scenes note." value={draft.body} />
              </label>
              <div className="studio-control-group">
                <span>Text color</span>
                <div className="studio-color-row">
                  {studioTextColors.map((color) => (
                    <button aria-label={`Use ${color} text`} className={draft.textColor === color ? "selected" : ""} key={color} onClick={() => updateDraft("textColor", color)} style={{ backgroundColor: color }} type="button" />
                  ))}
                </div>
              </div>
              <div className="studio-control-group">
                <span>Sticker</span>
                <div className="studio-chip-row">
                  {studioStickers.map((sticker) => (
                    <button className={draft.sticker === sticker ? "selected" : ""} key={sticker} onClick={() => updateDraft("sticker", sticker)} type="button">
                      {sticker}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {activeTool === "layers" ? (
            <div className="studio-inspector-section">
              {[
                ["Media", draft.mediaType],
                ["Overlay text", draft.overlayText || "Hidden"],
                ["Sticker", draft.sticker || "Hidden"],
                ["Caption", draft.body ? "Visible" : "Empty"],
              ].map(([name, value]) => (
                <button className="studio-layer-row" key={name} type="button">
                  <LayersRounded fontSize="small" />
                  <span><strong>{name}</strong><small>{value}</small></span>
                  <MoreHorizRounded fontSize="small" />
                </button>
              ))}
            </div>
          ) : null}

          {activeTool === "timeline" ? (
            <div className="studio-inspector-section">
              <div className="studio-control-group">
                <span>Timeline tools</span>
                <div className="studio-action-grid">
                  <button type="button"><ContentCopyRounded fontSize="small" /> Duplicate</button>
                  <button type="button"><Crop169Rounded fontSize="small" /> Crop</button>
                  <button type="button"><DeleteRounded fontSize="small" /> Delete</button>
                  <button type="button"><AutoAwesomeRounded fontSize="small" /> Effects</button>
                </div>
              </div>
              <div className="studio-mini-wave" aria-hidden="true">
                {Array.from({ length: 30 }, (_, index) => <i key={index} style={{ height: `${18 + (index % 6) * 7}px` }} />)}
              </div>
            </div>
          ) : null}

          {activeTool === "publish" ? (
            <div className="studio-inspector-section">
              <label className="studio-field compact">
                <span>Mood</span>
                <InputBase aria-label="Mood" onChange={(event) => updateDraft("mood", event.target.value)} value={draft.mood} />
              </label>
              <div className="studio-control-group">
                <span>Tone</span>
                <div className="studio-chip-row">
                  {studioTones.map((tone) => (
                    <button className={draft.backgroundTone === tone.id ? "selected" : ""} key={tone.id} onClick={() => updateDraft("backgroundTone", tone.id)} type="button">
                      {tone.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="studio-composer-actions">
                <Button disabled={!draft.body.trim() || publishing} startIcon={<SendRounded />} type="submit" variant="contained">
                  {publishing ? "Publishing" : creationMode === "live" ? "Prepare live" : "Publish post"}
                </Button>
                <IconButton aria-label="Reset editor" onClick={() => setDraft(createStudioDraft())}>
                  <AutoAwesomeRounded />
                </IconButton>
              </div>
              {publishStatus ? <p className="studio-publish-status">{publishStatus}</p> : null}
            </div>
          ) : null}
        </aside>
      </form>

      <div className="studio-metrics" aria-label="Studio metrics">
        <span><strong>{posts.length}</strong> Posts</span>
        <span><strong>{topBoost}%</strong> Top boost</span>
        <span><strong>{compactNumber(totalReach)}</strong> Reach</span>
      </div>

      <div className="studio-section-title">
        <h2>Promotion queue</h2>
        <button type="button">New campaign</button>
      </div>

      {topPosts.map((post) => (
        <article className="studio-post-row" key={post.id}>
          {post.gallery[0] ? <img alt="" src={post.gallery[0]} /> : <i aria-hidden="true" className="studio-row-placeholder" />}
          <span>
            <strong>{post.author.name}</strong>
            <small>{post.promotionScore}% trend score - {post.mood}</small>
          </span>
          <button type="button">Promote</button>
        </article>
      ))}
    </section>
  );
}
