import { FormEvent, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Button, IconButton, InputBase } from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import AudiotrackRounded from "@mui/icons-material/AudiotrackRounded";
import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import CheckRounded from "@mui/icons-material/CheckRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import CloudDoneRounded from "@mui/icons-material/CloudDoneRounded";
import ContentCopyRounded from "@mui/icons-material/ContentCopyRounded";
import ContentCutRounded from "@mui/icons-material/ContentCutRounded";
import Crop169Rounded from "@mui/icons-material/Crop169Rounded";
import CropFreeRounded from "@mui/icons-material/CropFreeRounded";
import DeleteRounded from "@mui/icons-material/DeleteRounded";
import FileUploadRounded from "@mui/icons-material/FileUploadRounded";
import FilterAltRounded from "@mui/icons-material/FilterAltRounded";
import FlipRounded from "@mui/icons-material/FlipRounded";
import FullscreenRounded from "@mui/icons-material/FullscreenRounded";
import HelpOutlineRounded from "@mui/icons-material/HelpOutlineRounded";
import ImageRounded from "@mui/icons-material/ImageRounded";
import KeyboardArrowDownRounded from "@mui/icons-material/KeyboardArrowDownRounded";
import LinkRounded from "@mui/icons-material/LinkRounded";
import LockRounded from "@mui/icons-material/LockRounded";
import MoreHorizRounded from "@mui/icons-material/MoreHorizRounded";
import PauseRounded from "@mui/icons-material/PauseRounded";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import RedoRounded from "@mui/icons-material/RedoRounded";
import RemoveRounded from "@mui/icons-material/RemoveRounded";
import RotateLeftRounded from "@mui/icons-material/RotateLeftRounded";
import RotateRightRounded from "@mui/icons-material/RotateRightRounded";
import SaveRounded from "@mui/icons-material/SaveRounded";
import SendRounded from "@mui/icons-material/SendRounded";
import SkipNextRounded from "@mui/icons-material/SkipNextRounded";
import SkipPreviousRounded from "@mui/icons-material/SkipPreviousRounded";
import TextFieldsRounded from "@mui/icons-material/TextFieldsRounded";
import TuneRounded from "@mui/icons-material/TuneRounded";
import UndoRounded from "@mui/icons-material/UndoRounded";
import VisibilityRounded from "@mui/icons-material/VisibilityRounded";
import VolumeUpRounded from "@mui/icons-material/VolumeUpRounded";
import ZoomInRounded from "@mui/icons-material/ZoomInRounded";
import type { FeedPost, PostInput } from "../../api";
import { createStudioDraft, studioAspectRatios, studioFilters, studioTextColors, studioTools } from "../../shared/studio";
import type { DisplayPost, StudioDraft, StudioTool } from "../../shared/types";

type InspectorTab = "video" | "audio" | "effects" | "adjust";
type MediaKind = "all" | "video" | "image" | "audio";
type TimelineLayer = "text" | "video" | "sequence" | "effects" | "audio";

type MediaAsset = {
  duration: string;
  title: string;
  type: Exclude<MediaKind, "all">;
  url: string;
};

const referenceAdventureImageUrl = "https://images.unsplash.com/photo-1756495411525-35bf535b35a4?auto=format&fit=crop&w=1400&q=84";

const defaultMediaAssets: MediaAsset[] = [
  {
    duration: "00:12",
    title: "A001_C001.mp4",
    type: "video",
    url: referenceAdventureImageUrl,
  },
  {
    duration: "00:08",
    title: "A001_C002.mp4",
    type: "video",
    url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=82",
  },
  {
    duration: "IMG",
    title: "IMG_1281.jpg",
    type: "image",
    url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=82",
  },
  {
    duration: "IMG",
    title: "IMG_1282.jpg",
    type: "image",
    url: "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=1200&q=82",
  },
  {
    duration: "IMG",
    title: "IMG_1283.jpg",
    type: "image",
    url: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=1200&q=82",
  },
  {
    duration: "IMG",
    title: "IMG_1284.jpg",
    type: "image",
    url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=82",
  },
  {
    duration: "02:18",
    title: "Travel Theme.mp3",
    type: "audio",
    url: "audio:travel-theme",
  },
  {
    duration: "01:46",
    title: "Nature Ambience.wav",
    type: "audio",
    url: "audio:nature-ambience",
  },
];

const inspectorTabs: Array<{ id: InspectorTab; label: string }> = [
  { id: "video", label: "Video" },
  { id: "audio", label: "Audio" },
  { id: "effects", label: "Effects" },
  { id: "adjust", label: "Adjust" },
];

const timelineLayers: Array<{ id: TimelineLayer; label: string; icon: ReactNode }> = [
  { id: "text", label: "Text 1", icon: <TextFieldsRounded fontSize="small" /> },
  { id: "video", label: "Video 1", icon: <ImageRounded fontSize="small" /> },
  { id: "sequence", label: "Image Sequence", icon: <ImageRounded fontSize="small" /> },
  { id: "effects", label: "Effects 1", icon: <AutoAwesomeRounded fontSize="small" /> },
  { id: "audio", label: "Audio 1", icon: <AudiotrackRounded fontSize="small" /> },
];

const mobileToolActions: Array<{ id: StudioTool; label: string; icon: ReactNode; inspector: InspectorTab }> = [
  { id: "media", label: "Media", icon: <ImageRounded />, inspector: "video" },
  { id: "audio", label: "Audio", icon: <AudiotrackRounded />, inspector: "audio" },
  { id: "text", label: "Text", icon: <TextFieldsRounded />, inspector: "adjust" },
  { id: "effects", label: "Effects", icon: <AutoAwesomeRounded />, inspector: "effects" },
  { id: "adjust", label: "Adjust", icon: <TuneRounded />, inspector: "adjust" },
];

export function StudioPanel({
  onCreatePost,
  onExitStudio,
  onUploadMedia,
  posts,
  serviceLabel,
}: {
  onCreatePost: (input: PostInput) => Promise<FeedPost>;
  onExitStudio: () => void;
  onUploadMedia: (file: File) => Promise<{ url: string; mediaType: "image" | "video" | string }>;
  posts: DisplayPost[];
  serviceLabel: string;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState<StudioDraft>(() => ({
    ...createStudioDraft(),
    aspectRatio: "16:9",
    body: "Adventure awaits",
    mediaType: "video",
    mediaUrl: referenceAdventureImageUrl,
    mood: "Summer Adventure",
    overlayText: "Adventure Awaits",
  }));
  const [activeTool, setActiveTool] = useState<StudioTool>("media");
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("video");
  const [mediaKind, setMediaKind] = useState<MediaKind>("all");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(31);
  const [zoom, setZoom] = useState(1.1);
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [positionX, setPositionX] = useState(540);
  const [positionY, setPositionY] = useState(360);
  const [trimStart, setTrimStart] = useState(6);
  const [trimEnd, setTrimEnd] = useState(88);
  const [selectedLayer, setSelectedLayer] = useState<TimelineLayer>("video");
  const [cropEnabled, setCropEnabled] = useState(true);
  const [stabilizationEnabled, setStabilizationEnabled] = useState(true);
  const [opacity, setOpacity] = useState(100);
  const [speed, setSpeed] = useState(1);
  const [effectStrength, setEffectStrength] = useState(44);
  const [audioGain, setAudioGain] = useState(72);
  const [publishing, setPublishing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [publishStatus, setPublishStatus] = useState("");
  const [publishedPost, setPublishedPost] = useState<FeedPost | null>(null);

  const mediaAssets = useMemo(() => {
    const postAssets = posts.flatMap((post, postIndex) =>
      post.gallery.map((url, itemIndex) => ({
        duration: isVideoUrl(url) ? "00:10" : "IMG",
        title: isVideoUrl(url) ? `POST_${postIndex + 1}_${itemIndex + 1}.mp4` : `POST_${postIndex + 1}_${itemIndex + 1}.jpg`,
        type: isVideoUrl(url) ? "video" as const : "image" as const,
        url,
      })),
    );
    return [...defaultMediaAssets, ...postAssets.slice(0, 6)];
  }, [posts]);

  const visibleMedia = mediaAssets.filter((item) => mediaKind === "all" || item.type === mediaKind);
  const activeMedia = mediaAssets.find((item) => item.url === draft.mediaUrl) ?? mediaAssets.find((item) => item.type !== "audio") ?? defaultMediaAssets[0];
  const sequenceFrames = mediaAssets.filter((item) => item.type !== "audio").slice(0, 9);
  const selectedFilter = studioFilters.find((filter) => filter.name === draft.filterName) ?? studioFilters[0];
  const exportLabel = publishing ? "Exporting" : "Export";
  const shareUrl = publishedPost ? buildPostLink(publishedPost.id) : "";

  function updateDraft<K extends keyof StudioDraft>(key: K, value: StudioDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function chooseMedia(asset: MediaAsset) {
    if (asset.type === "audio") {
      setActiveTool("audio");
      setInspectorTab("audio");
      setAudioGain(78);
      setPublishStatus(`${asset.title} added to the audio track.`);
      return;
    }
    updateDraft("mediaUrl", asset.url);
    updateDraft("mediaType", asset.type === "video" ? "video" : "image");
    updateDraft("body", draft.body || "Adventure awaits");
    updateDraft("overlayText", draft.overlayText || "Adventure Awaits");
    setSelectedLayer("video");
    setPublishStatus(`${asset.title} placed on the timeline.`);
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
      updateDraft("body", draft.body || "Adventure awaits");
      setPublishStatus(`${media.mediaType === "video" ? "Video" : "Image"} added to the canvas.`);
    } catch (err) {
      setPublishStatus(err instanceof Error ? err.message : "Could not upload media.");
    } finally {
      setUploading(false);
    }
  }

  async function submitPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (publishing) {
      return;
    }
    setPublishing(true);
    setPublishStatus("Exporting studio edit...");
    try {
      const post = await onCreatePost({
        body: draft.body.trim() || "Adventure awaits",
        mood: draft.mood || "Summer Adventure",
        mediaUrl: draft.mediaUrl || activeMedia.url,
        mediaType: draft.mediaType || activeMedia.type,
        filterName: draft.filterName,
        overlayText: draft.overlayText || "Adventure Awaits",
        sticker: draft.sticker,
        textColor: draft.textColor,
        backgroundTone: draft.backgroundTone,
        aspectRatio: draft.aspectRatio || "16:9",
        cropZoom: zoom,
        cropX: draft.cropX,
        cropY: draft.cropY,
        rotation: draft.rotation,
      });
      setPublishedPost(post);
      setPublishStatus("Export complete. Share link is ready.");
    } catch (err) {
      setPublishStatus(err instanceof Error ? err.message : "Could not export studio edit.");
    } finally {
      setPublishing(false);
    }
  }

  async function copyPublishedLink() {
    if (!shareUrl) {
      setPublishStatus("Export first to create a share link.");
      return;
    }
    await navigator.clipboard.writeText(shareUrl);
    setPublishStatus("Share link copied.");
  }

  function splitClip() {
    setSelectedLayer("video");
    setPublishStatus(`Split clip at ${formatTimelineTime(playhead)}.`);
  }

  function trimClip() {
    setTrimStart(Math.max(0, playhead - 9));
    setTrimEnd(Math.min(100, playhead + 28));
    setSelectedLayer("video");
    setPublishStatus("Trim range updated.");
  }

  function toggleCrop() {
    setCropEnabled((enabled) => {
      const next = !enabled;
      setPublishStatus(next ? "Crop handles enabled." : "Crop handles hidden.");
      return next;
    });
    setInspectorTab("video");
  }

  function rotateClip() {
    updateDraft("rotation", (draft.rotation + 15) % 360);
    setSelectedLayer("video");
    setPublishStatus("Clip rotated 15 deg.");
  }

  function duplicateClip() {
    setSelectedLayer((current) => current);
    setPublishStatus(`${timelineLayers.find((layer) => layer.id === selectedLayer)?.label ?? "Layer"} duplicated.`);
  }

  function deleteLayer() {
    if (selectedLayer === "text") {
      updateDraft("overlayText", "");
    }
    if (selectedLayer === "audio") {
      setAudioGain(0);
    }
    setPublishStatus(`${timelineLayers.find((layer) => layer.id === selectedLayer)?.label ?? "Layer"} cleared.`);
  }

  return (
    <section className={`studio-panel studio-reference-shell studio-tool-${activeTool}`}>
      <form className="studio-reference-editor" onSubmit={submitPost}>
        <header className="studio-reference-topbar">
          <div className="studio-reference-brand">
            <button className="studio-mobile-dismiss" type="button" aria-label="Close studio" onClick={onExitStudio}>
              <CloseRounded fontSize="small" />
            </button>
            <span className="studio-reference-logo">C</span>
            <span>Creator Studio</span>
            <i>/</i>
            <button type="button">Summer Adventure <KeyboardArrowDownRounded fontSize="small" /></button>
            <em><CloudDoneRounded fontSize="small" /> {serviceLabel === "Backend live" ? "Saved 2m ago" : serviceLabel}</em>
          </div>
          <div className="studio-reference-actions">
            <IconButton aria-label="Undo edit"><UndoRounded /></IconButton>
            <IconButton aria-label="Redo edit"><RedoRounded /></IconButton>
            <IconButton aria-label="Studio help"><HelpOutlineRounded /></IconButton>
            <button className="studio-ratio-select" type="button">{draft.aspectRatio || "16:9"} <KeyboardArrowDownRounded fontSize="small" /></button>
            <button className="studio-share-button" type="button" onClick={() => void copyPublishedLink()}>Share</button>
            <Button className="studio-export-button" startIcon={<FileUploadRounded />} type="submit" variant="contained">
              {exportLabel}
            </Button>
          </div>
        </header>

        <aside className="studio-reference-rail" aria-label="Studio feature rail">
          {studioTools.map((tool) => (
            <button className={activeTool === tool.id ? "active" : ""} key={tool.id} onClick={() => setActiveTool(tool.id)} title={tool.label} type="button">
              {tool.icon}
              <span>{tool.label}</span>
            </button>
          ))}
        </aside>

        <aside className="studio-reference-media" aria-label="Project media">
          <div className="studio-media-head">
            <button type="button">Project Media <KeyboardArrowDownRounded fontSize="small" /></button>
            <div>
              <IconButton aria-label="Upload media" onClick={() => fileInputRef.current?.click()}>
                <AddRounded />
              </IconButton>
              <IconButton aria-label="Filter media">
                <FilterAltRounded />
              </IconButton>
            </div>
          </div>
          <input
            accept="image/*,video/*,audio/*"
            className="studio-hidden-input"
            disabled={uploading}
            onChange={(event) => void uploadFromDevice(event.currentTarget.files?.[0] ?? null)}
            ref={fileInputRef}
            type="file"
          />
          <div className="studio-media-tabs" aria-label="Media type">
            {[
              ["all", "All"],
              ["video", "Video"],
              ["image", "Image"],
              ["audio", "Audio"],
            ].map(([id, label]) => (
              <button className={mediaKind === id ? "active" : ""} key={id} onClick={() => setMediaKind(id as MediaKind)} type="button">
                {label}
              </button>
            ))}
          </div>
          <div className="studio-media-library">
            {visibleMedia.map((asset) => (
              <button className={activeMedia.url === asset.url ? "selected" : ""} key={`${asset.title}-${asset.url}`} onClick={() => chooseMedia(asset)} type="button">
                {asset.type === "audio" ? <WaveformBars /> : <img alt="" src={asset.url} />}
                <span>{asset.duration}</span>
                <strong>{asset.title}</strong>
                {activeMedia.url === asset.url || asset.type === "audio" ? <i><CheckRounded fontSize="inherit" /></i> : null}
              </button>
            ))}
          </div>
        </aside>

        <main className="studio-reference-stage" aria-label="Video preview">
          <div className="studio-canvas-toolbar" aria-label="Canvas tools">
            <button type="button" onClick={toggleCrop}><CropFreeRounded fontSize="small" /></button>
            <button type="button" onClick={() => { updateDraft("aspectRatio", "16:9"); setPublishStatus("Canvas ratio set to 16:9."); }}><Crop169Rounded fontSize="small" /></button>
            <button type="button" onClick={() => updateDraft("rotation", draft.rotation - 90)}><RotateLeftRounded fontSize="small" /></button>
            <button type="button" onClick={() => updateDraft("rotation", draft.rotation + 90)}><RotateRightRounded fontSize="small" /></button>
            <button type="button"><MoreHorizRounded fontSize="small" /></button>
          </div>
          <div className="studio-reference-preview">
            {activeMedia.type === "video" || activeMedia.type === "image" ? (
              <img
                alt=""
                src={draft.mediaUrl || activeMedia.url}
                style={{
                  filter: `${selectedFilter.css} saturate(${1 + effectStrength / 240}) opacity(${opacity}%)`,
                  objectPosition: `${draft.cropX}% ${draft.cropY}%`,
                  transform: `scale(${zoom}) rotate(${draft.rotation}deg)`,
                }}
              />
            ) : null}
            <div className="studio-preview-selection">
              <span className="corner top-left" />
              <span className="corner top-right" />
              <span className="corner bottom-left" />
              <span className="corner bottom-right" />
              <span className="handle top" />
              <span className="handle right" />
              <span className="handle bottom" />
              <span className="handle left" />
            </div>
          </div>
          <div className="studio-reference-player">
            <span>{formatTimelineTime(playhead)} <i>/</i> 01:02:45</span>
            <div>
              <IconButton aria-label="Previous frame"><SkipPreviousRounded /></IconButton>
              <IconButton aria-label="Play preview" onClick={() => setIsPlaying((value) => !value)}>
                {isPlaying ? <PauseRounded /> : <PlayArrowRounded />}
              </IconButton>
              <IconButton aria-label="Next frame"><SkipNextRounded /></IconButton>
            </div>
            <div>
              <IconButton aria-label="Volume"><VolumeUpRounded /></IconButton>
              <IconButton aria-label="Fullscreen"><FullscreenRounded /></IconButton>
            </div>
          </div>
          <input className="studio-reference-scrubber" min="0" max="100" type="range" value={playhead} onChange={(event) => setPlayhead(Number(event.target.value))} />
        </main>

        <aside className="studio-reference-inspector" aria-label="Inspector">
          <div className="studio-inspector-tabs">
            {inspectorTabs.map((tab) => (
              <button className={inspectorTab === tab.id ? "active" : ""} key={tab.id} onClick={() => setInspectorTab(tab.id)} type="button">
                {tab.label}
              </button>
            ))}
          </div>

          {inspectorTab === "video" ? (
            <div className="studio-inspector-scroll">
              <InspectorSection title="Transform">
                <ControlSlider label="Zoom" max={1.8} min={0.6} step={0.01} suffix={`${Math.round(zoom * 100)}%`} value={zoom} onChange={setZoom} />
                <div className="studio-position-grid">
                  <label>X <input value={positionX} onChange={(event) => setPositionX(Number(event.target.value) || 0)} /></label>
                  <label>Y <input value={positionY} onChange={(event) => setPositionY(Number(event.target.value) || 0)} /></label>
                </div>
                <div className="studio-icon-row">
                  <button type="button" onClick={() => updateDraft("rotation", draft.rotation - 90)}><RotateLeftRounded fontSize="small" /> Rotate</button>
                  <button type="button"><FlipRounded fontSize="small" /> Flip</button>
                </div>
              </InspectorSection>
              <InspectorSection title="Crop" toggle active={cropEnabled} onToggle={() => setCropEnabled((value) => !value)}>
                <label className="studio-select-field">Ratio <select value={draft.aspectRatio} onChange={(event) => updateDraft("aspectRatio", event.target.value)}>{studioAspectRatios.map((ratio) => <option key={ratio}>{ratio}</option>)}</select></label>
                <div className="studio-crop-grid">
                  {["Left", "Top", "Right", "Bottom"].map((label) => <label key={label}>{label}<input readOnly value="5.0%" /></label>)}
                </div>
                <button className="studio-reset-crop" type="button">Reset Crop</button>
              </InspectorSection>
              <InspectorSection title="Speed">
                <ControlSlider label="Rate" max={2} min={0.25} step={0.05} suffix={`${speed.toFixed(2)}x`} value={speed} onChange={setSpeed} />
              </InspectorSection>
              <InspectorSection title="Stabilization" toggle active={stabilizationEnabled} onToggle={() => setStabilizationEnabled((value) => !value)} />
              <InspectorSection title="Opacity">
                <ControlSlider label="Opacity" max={100} min={0} step={1} suffix={`${opacity}%`} value={opacity} onChange={setOpacity} />
              </InspectorSection>
            </div>
          ) : null}

          {inspectorTab === "audio" ? (
            <div className="studio-inspector-scroll">
              <InspectorSection title="Audio">
                <ControlSlider label="Gain" max={100} min={0} step={1} suffix={`${audioGain}%`} value={audioGain} onChange={setAudioGain} />
                <WaveformBars large />
              </InspectorSection>
            </div>
          ) : null}

          {inspectorTab === "effects" ? (
            <div className="studio-inspector-scroll">
              <InspectorSection title="Effects">
                <ControlSlider label="Strength" max={100} min={0} step={1} suffix={`${effectStrength}%`} value={effectStrength} onChange={setEffectStrength} />
                <div className="studio-chip-options">
                  {["Light Leak", "Zoom Blur", "Film Grain", "Glow"].map((effect) => <button key={effect} type="button">{effect}</button>)}
                </div>
              </InspectorSection>
            </div>
          ) : null}

          {inspectorTab === "adjust" ? (
            <div className="studio-inspector-scroll">
              <InspectorSection title="Adjust">
                <div className="studio-chip-options">
                  {studioFilters.map((filter) => (
                    <button className={draft.filterName === filter.name ? "active" : ""} key={filter.name} onClick={() => updateDraft("filterName", filter.name)} type="button">
                      {filter.name}
                    </button>
                  ))}
                </div>
                <div className="studio-color-row reference-colors">
                  {studioTextColors.map((color) => (
                    <button aria-label={`Use ${color}`} className={draft.textColor === color ? "selected" : ""} key={color} onClick={() => updateDraft("textColor", color)} style={{ backgroundColor: color }} type="button" />
                  ))}
                </div>
              </InspectorSection>
              <label className="studio-field">
                <span>Caption</span>
                <InputBase multiline minRows={3} onChange={(event) => updateDraft("body", event.target.value)} value={draft.body} />
              </label>
            </div>
          ) : null}
        </aside>

        <div className="studio-reference-quickbar" aria-label="Quick edit actions">
          <IconButton aria-label="Undo"><UndoRounded /></IconButton>
          <IconButton aria-label="Redo"><RedoRounded /></IconButton>
          <button className="active" type="button" onClick={splitClip}><ContentCutRounded fontSize="small" /></button>
          <button type="button" onClick={deleteLayer}><DeleteRounded fontSize="small" /></button>
          <button type="button" onClick={trimClip}><CropFreeRounded fontSize="small" /></button>
          <button type="button"><AutoAwesomeRounded fontSize="small" /></button>
          <button type="button" onClick={duplicateClip}><ContentCopyRounded fontSize="small" /></button>
          <button type="button" onClick={() => void copyPublishedLink()}><LinkRounded fontSize="small" /></button>
          <button type="button"><LockRounded fontSize="small" /></button>
          <span />
          <button type="button" onClick={() => setTimelineZoom((value) => Math.max(0.6, value - 0.1))}><RemoveRounded fontSize="small" /></button>
          <input aria-label="Timeline zoom" max="1.8" min="0.6" step="0.1" type="range" value={timelineZoom} onChange={(event) => setTimelineZoom(Number(event.target.value))} />
          <button type="button" onClick={() => setTimelineZoom((value) => Math.min(1.8, value + 0.1))}><ZoomInRounded fontSize="small" /></button>
        </div>

        <section className="studio-reference-timeline" aria-label="Layer timeline">
          <div className="studio-layer-list">
            {timelineLayers.map((layer) => (
              <button className={selectedLayer === layer.id ? "active" : ""} key={layer.id} onClick={() => setSelectedLayer(layer.id)} type="button">
                <VisibilityRounded fontSize="small" />
                <LockRounded fontSize="small" />
                <span>{layer.label}</span>
              </button>
            ))}
          </div>
          <div className="studio-timeline-board" style={{ "--timeline-zoom": timelineZoom } as CSSProperties}>
            <div className="studio-reference-ruler">
              {["00:00", "00:10", "00:20", "00:30", "00:40", "00:50", "01:00", "01:10", "01:20"].map((tick) => <span key={tick}>{tick}</span>)}
            </div>
            <span className="studio-reference-playhead" style={{ left: `${playhead}%` }}><i>{formatTimelineTime(playhead)}</i></span>
            <TimelineRow layer="text" selected={selectedLayer === "text"}>
              <span className="timeline-clip text" style={{ left: "10%", width: "28%" }}><TextFieldsRounded fontSize="small" /> {draft.overlayText || "Adventure Awaits"}</span>
            </TimelineRow>
            <TimelineRow layer="video" selected={selectedLayer === "video"}>
              <span className="timeline-clip video" style={{ left: `${trimStart}%`, width: `${Math.max(16, trimEnd - trimStart)}%` }}>
                <i className="trim start" />
                {sequenceFrames.slice(0, 7).map((asset) => <img alt="" key={asset.url} src={asset.url} />)}
                <em>{activeMedia.title}</em>
                <i className="trim end" />
              </span>
            </TimelineRow>
            <TimelineRow layer="sequence" selected={selectedLayer === "sequence"}>
              {sequenceFrames.map((asset, index) => <span className="timeline-frame" key={`${asset.url}-${index}`}><img alt="" src={asset.url} /></span>)}
            </TimelineRow>
            <TimelineRow layer="effects" selected={selectedLayer === "effects"}>
              <span className="timeline-clip effect" style={{ left: "8%", width: "24%" }}>Light Leak</span>
              <span className="timeline-clip effect" style={{ left: "54%", width: "22%" }}>Zoom Blur</span>
            </TimelineRow>
            <TimelineRow layer="audio" selected={selectedLayer === "audio"}>
              <span className="timeline-clip audio" style={{ left: "2%", width: "82%" }}><WaveformBars /></span>
            </TimelineRow>
          </div>
        </section>

        <div className="studio-mobile-actions" aria-label="Mobile editor actions">
          {mobileToolActions.map((tool) => (
            <button
              className={activeTool === tool.id ? "active" : ""}
              key={tool.id}
              type="button"
              onClick={() => {
                setActiveTool(tool.id);
                setInspectorTab(tool.inspector);
                setPublishStatus(`${tool.label} controls selected.`);
              }}
            >
              {tool.icon}<span>{tool.label}</span>
            </button>
          ))}
        </div>
        <div className="studio-mobile-editbar" aria-label="Mobile clip controls">
          {[
            ["Split", <ContentCutRounded key="split" />],
            ["Trim", <CropFreeRounded key="trim" />],
            ["Crop", <Crop169Rounded key="crop" />],
            ["Rotate", <RotateRightRounded key="rotate" />],
            ["Duplicate", <ContentCopyRounded key="duplicate" />],
            ["Delete", <DeleteRounded key="delete" />],
          ].map(([label, icon]) => (
            <button
              key={label as string}
              onClick={
                label === "Split" ? splitClip
                : label === "Trim" ? trimClip
                : label === "Crop" ? toggleCrop
                : label === "Rotate" ? rotateClip
                : label === "Duplicate" ? duplicateClip
                : label === "Delete" ? deleteLayer
                : undefined
              }
              type="button"
            >
              {icon}<span>{label}</span>
            </button>
          ))}
        </div>
      </form>
      {publishStatus ? <p className="studio-floating-status">{publishStatus}</p> : null}
    </section>
  );
}

function InspectorSection({
  active,
  children,
  onToggle,
  title,
  toggle,
}: {
  active?: boolean;
  children?: ReactNode;
  onToggle?: () => void;
  title: string;
  toggle?: boolean;
}) {
  return (
    <section className="studio-inspector-section-ref">
      <header>
        <strong>{title}</strong>
        {toggle ? <button className={active ? "active" : ""} onClick={onToggle} type="button" /> : <KeyboardArrowDownRounded fontSize="small" />}
      </header>
      {children}
    </section>
  );
}

function ControlSlider({
  label,
  max,
  min,
  onChange,
  step,
  suffix,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  suffix: string;
  value: number;
}) {
  return (
    <label className="studio-control-slider">
      <span>{label}</span>
      <input max={max} min={min} step={step} type="range" value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <em>{suffix}</em>
    </label>
  );
}

function TimelineRow({ children, layer, selected }: { children: ReactNode; layer: TimelineLayer; selected: boolean }) {
  return <div className={`studio-reference-track track-${layer} ${selected ? "selected" : ""}`}>{children}</div>;
}

function WaveformBars({ large = false }: { large?: boolean }) {
  return (
    <span className={`studio-waveform-bars ${large ? "large" : ""}`} aria-hidden="true">
      {Array.from({ length: large ? 42 : 24 }, (_, index) => <i key={index} style={{ height: `${12 + ((index * 7) % (large ? 44 : 26))}px` }} />)}
    </span>
  );
}

function formatTimelineTime(value: number) {
  const totalSeconds = Math.max(0, Math.round((value / 100) * 62));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}:23`;
}

function isVideoUrl(url: string) {
  return /\.(mp4|mov|webm)(\?|$)/i.test(url);
}

function buildPostLink(postId: number) {
  if (typeof window === "undefined") {
    return `/post/${postId}`;
  }
  return `${window.location.origin}/post/${postId}`;
}
