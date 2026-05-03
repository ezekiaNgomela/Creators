import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Button, IconButton, InputBase, Tooltip } from "@mui/material";
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
import HeadsetRounded from "@mui/icons-material/HeadsetRounded";
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
import SearchRounded from "@mui/icons-material/SearchRounded";
import SendRounded from "@mui/icons-material/SendRounded";
import SkipNextRounded from "@mui/icons-material/SkipNextRounded";
import SelectAllRounded from "@mui/icons-material/SelectAllRounded";
import SkipPreviousRounded from "@mui/icons-material/SkipPreviousRounded";
import SortRounded from "@mui/icons-material/SortRounded";
import TextFieldsRounded from "@mui/icons-material/TextFieldsRounded";
import TuneRounded from "@mui/icons-material/TuneRounded";
import UndoRounded from "@mui/icons-material/UndoRounded";
import VisibilityRounded from "@mui/icons-material/VisibilityRounded";
import HistoryRounded from "@mui/icons-material/HistoryRounded";
import VolumeUpRounded from "@mui/icons-material/VolumeUpRounded";
import VolumeOffRounded from "@mui/icons-material/VolumeOffRounded";
import ZoomInRounded from "@mui/icons-material/ZoomInRounded";
import {
  fetchStudioRenderJob,
  fetchStudioRendererHealth,
  startStudioRender,
  type FeedPost,
  type PostInput,
  type StudioRenderInput,
  type StudioRenderJob,
  type StudioRendererHealth,
} from "../../api";
import { createStudioDraft, studioAspectRatios, studioFilters, studioTextColors, studioTools } from "../../shared/studio";
import type { DisplayPost, StudioDraft, StudioTool } from "../../shared/types";

type InspectorTab = "video" | "audio" | "effects" | "adjust" | "history";
type MediaKind = "all" | "video" | "image" | "audio";
type TimelineLayer = "text" | "video" | "sequence" | "effects" | "audio";
type TimelineClipType = "text" | "video" | "image" | "effect" | "audio";
type AudioEffectId = "clean" | "noise-reduction" | "loudness" | "distortion" | "flanger" | "de-esser" | "bass-boost" | "echo";
type MediaFormat = "mp4" | "mov" | "webm" | "mkv" | "gif" | "mp3" | "wav" | "aac" | "flac" | "jpg";

type HistoryEntry = {
  label: string;
  timestamp: number;
  clips: TimelineClip[];
  draft: StudioDraft;
};

type MediaAsset = {
  duration: string;
  durationSeconds: number;
  format: MediaFormat;
  mimeType: string;
  title: string;
  type: Exclude<MediaKind, "all">;
  url: string;
};

type TimelineClip = {
  audioEffect?: AudioEffectId;
  format: MediaFormat;
  gain?: number;
  id: string;
  inPoint: number;
  outPoint: number;
  sourceDuration: number;
  start: number;
  thumbnailUrl?: string;
  title: string;
  track: TimelineLayer;
  type: TimelineClipType;
  url?: string;
};

const referenceAdventureImageUrl = "https://images.unsplash.com/photo-1756495411525-35bf535b35a4?auto=format&fit=crop&w=1400&q=84";
const timelinePaddingSeconds = 8;
const SNAP_THRESHOLD = 0.5;

const defaultMediaAssets: MediaAsset[] = [
  {
    duration: "01:02",
    durationSeconds: 62,
    format: "mp4",
    mimeType: "video/mp4",
    title: "A001_C001.mp4",
    type: "video",
    url: referenceAdventureImageUrl,
  },
  {
    duration: "00:46",
    durationSeconds: 46,
    format: "mp4",
    mimeType: "video/mp4",
    title: "A001_C002.mp4",
    type: "video",
    url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=82",
  },
  {
    duration: "IMG",
    durationSeconds: 6,
    format: "jpg",
    mimeType: "image/jpeg",
    title: "IMG_1281.jpg",
    type: "image",
    url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=82",
  },
  {
    duration: "IMG",
    durationSeconds: 6,
    format: "jpg",
    mimeType: "image/jpeg",
    title: "IMG_1282.jpg",
    type: "image",
    url: "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=1200&q=82",
  },
  {
    duration: "IMG",
    durationSeconds: 6,
    format: "jpg",
    mimeType: "image/jpeg",
    title: "IMG_1283.jpg",
    type: "image",
    url: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=1200&q=82",
  },
  {
    duration: "IMG",
    durationSeconds: 6,
    format: "jpg",
    mimeType: "image/jpeg",
    title: "IMG_1284.jpg",
    type: "image",
    url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=82",
  },
  {
    duration: "02:18",
    durationSeconds: 138,
    format: "mp3",
    mimeType: "audio/mpeg",
    title: "Travel Theme.mp3",
    type: "audio",
    url: "audio:travel-theme",
  },
  {
    duration: "01:46",
    durationSeconds: 106,
    format: "wav",
    mimeType: "audio/wav",
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
  { id: "history", label: "History" },
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

const audioEffects: Array<{ id: AudioEffectId; label: string; description: string }> = [
  { id: "clean", label: "Clean", description: "Original signal" },
  { id: "noise-reduction", label: "Noise filter", description: "Suppress room noise" },
  { id: "loudness", label: "Loudness", description: "Broadcast lift" },
  { id: "distortion", label: "Distortion", description: "Driven texture" },
  { id: "flanger", label: "Flanger", description: "Sweeping phase" },
  { id: "de-esser", label: "De-esser", description: "Reduce harsh s" },
  { id: "bass-boost", label: "Bass boost", description: "Low-end weight" },
  { id: "echo", label: "Echo", description: "Space repeat" },
];

const videoFormatOptions: Array<{ id: MediaFormat; label: string }> = [
  { id: "mp4", label: "MP4 H.264" },
  { id: "mov", label: "MOV ProRes" },
  { id: "webm", label: "WebM VP9" },
  { id: "mkv", label: "MKV" },
  { id: "gif", label: "GIF Sequence" },
];

const audioFormatOptions: Array<{ id: MediaFormat; label: string }> = [
  { id: "mp3", label: "MP3" },
  { id: "wav", label: "WAV" },
  { id: "aac", label: "AAC" },
  { id: "flac", label: "FLAC" },
];

function createInitialTimelineClips(): TimelineClip[] {
  const [heroVideo, secondVideo, lakeImage, waterfallImage, forestImage, mountainImage, themeAudio] = defaultMediaAssets;

  return [
    {
      format: "mp4",
      id: "clip-text-001",
      inPoint: 0,
      outPoint: 18,
      sourceDuration: 18,
      start: 0,
      title: "Adventure Awaits",
      track: "text",
      type: "text",
    },
    createClipFromAsset(heroVideo, 0, "clip-video-001"), // Starts at 0
    createClipFromAsset(secondVideo, 62, "clip-video-002"),
    createClipFromAsset(lakeImage, 18, "clip-sequence-001"),
    createClipFromAsset(waterfallImage, 24, "clip-sequence-002"),
    createClipFromAsset(forestImage, 30, "clip-sequence-003"),
    createClipFromAsset(mountainImage, 21, "clip-sequence-004"),
    {
      format: "mp4",
      id: "clip-effect-001",
      inPoint: 0,
      outPoint: 24,
      sourceDuration: 24,
      start: 8,
      title: "Light Leak",
      track: "effects",
      type: "effect",
    },
    {
      format: "mp4",
      id: "clip-effect-002",
      inPoint: 0,
      outPoint: 22,
      sourceDuration: 22,
      start: 54,
      title: "Zoom Blur",
      track: "effects",
      type: "effect",
    },
    createClipFromAsset(themeAudio, 2, "clip-audio-001"),
  ];
}

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
  const clipCounterRef = useRef(1000);
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
  const [mediaSearchQuery, setMediaSearchQuery] = useState("");
  const [importedAssets, setImportedAssets] = useState<MediaAsset[]>([]);
  const [timelineClips, setTimelineClips] = useState<TimelineClip[]>(createInitialTimelineClips);
  const [selectedClipId, setSelectedClipId] = useState("clip-video-001");
  const [multiSelectActive, setMultiSelectActive] = useState(false);
  const [selectedClipIds, setSelectedClipIds] = useState<Set<string>>(() => new Set(["clip-video-001"]));
  const [isPlaying, setIsPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [zoom, setZoom] = useState(1.1);
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [trimmingId, setTrimmingId] = useState<string | null>(null);
  const trimSideRef = useRef<"start" | "end" | null>(null);
  const dragStartXRef = useRef<number>(0);
  const initialClipStartRef = useRef<number>(0);
  const initialInPointRef = useRef<number>(0);
  const initialOutPointRef = useRef<number>(0);
  const timelineBoardRef = useRef<HTMLDivElement>(null);
  const timelineScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const zoomPivotRef = useRef<{ pct: number; x: number } | null>(null);
  const [positionX, setPositionX] = useState(540);
  const [positionY, setPositionY] = useState(360);
  const [selectedLayer, setSelectedLayer] = useState<TimelineLayer>("video");
  const [cropEnabled, setCropEnabled] = useState(true);
  const [stabilizationEnabled, setStabilizationEnabled] = useState(true);
  const [opacity, setOpacity] = useState(100);
  const [speed, setSpeed] = useState(1);
  const [effectStrength, setEffectStrength] = useState(44);
  const [audioGain, setAudioGain] = useState(72);
  const [outputFormat, setOutputFormat] = useState<MediaFormat>("mp4");
  const [publishing, setPublishing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [lastFailedFiles, setLastFailedFiles] = useState<FileList | null>(null);
  const [publishStatus, setPublishStatus] = useState("");
  const [publishedPost, setPublishedPost] = useState<FeedPost | null>(null);
  const [rendererHealth, setRendererHealth] = useState<StudioRendererHealth | null>(null);
  const [renderJob, setRenderJob] = useState<StudioRenderJob | null>(null);
  const [rippleEnabled, setRippleEnabled] = useState(false);

  // History Management
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const recordHistory = (label: string, overrideClips?: TimelineClip[], overrideDraft?: StudioDraft) => {
    const entry: HistoryEntry = {
      label,
      timestamp: Date.now(),
      clips: overrideClips || [...timelineClips],
      draft: overrideDraft || { ...draft },
    };
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      return [...newHistory, entry];
    });
    setHistoryIndex(prev => prev + 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prevEntry = history[historyIndex - 1];
      setTimelineClips(prevEntry.clips);
      setDraft(prevEntry.draft);
      setHistoryIndex(historyIndex - 1);
      setPublishStatus(`Undo: ${history[historyIndex].label}`);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextEntry = history[historyIndex + 1];
      setTimelineClips(nextEntry.clips);
      setDraft(nextEntry.draft);
      setHistoryIndex(historyIndex + 1);
      setPublishStatus(`Redo: ${nextEntry.label}`);
    }
  };

  const jumpToHistory = (index: number) => {
    const entry = history[index];
    setTimelineClips(entry.clips);
    setDraft(entry.draft);
    setHistoryIndex(index);
    setPublishStatus(`Jumped to: ${entry.label}`);
  };

  useEffect(() => {
    // Record initial state
    recordHistory("Initial State");
  }, []);

  useEffect(() => {
    if (publishStatus && !publishing && !uploading) {
      const timer = setTimeout(() => setPublishStatus(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [publishStatus, publishing, uploading]);

  useEffect(() => {
    let cancelled = false;
    fetchStudioRendererHealth()
      .then((health) => {
        if (!cancelled) {
          setRendererHealth(health);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setRendererHealth({
            available: false,
            binary: "",
            version: "",
            message: err instanceof Error ? err.message : "Studio renderer is not reachable.",
            supportedInputs: [],
            supportedOutputs: [],
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [mutedLayers, setMutedLayers] = useState<Set<TimelineLayer>>(new Set());
  const [soloedLayers, setSoloedLayers] = useState<Set<TimelineLayer>>(new Set());
  const [trackLevels, setTrackLevels] = useState<Record<TimelineLayer, number>>({
    text: 0,
    video: 0,
    sequence: 0,
    effects: 0,
    audio: 0,
  });
  const [trackGains, setTrackGains] = useState<Record<TimelineLayer, number>>({
    text: 100,
    video: 100,
    sequence: 100,
    effects: 100,
    audio: 100,
  });
  const [snapPosition, setSnapPosition] = useState<number | null>(null);
  const projectDuration = useMemo(() => {
    const clipEnd = timelineClips.reduce((max, clip) => Math.max(max, clip.start + visibleClipDuration(clip)), 0);
    return Math.max(90, Math.ceil(clipEnd + timelinePaddingSeconds));
  }, [timelineClips]);

  useEffect(() => {
    if (!draggingId || !timelineBoardRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const board = timelineBoardRef.current;
      if (!board) return;

      const rect = board.getBoundingClientRect();
      const deltaX = e.clientX - dragStartXRef.current;

      // Convert pixel delta to time delta
      // board width represents projectDuration
      const secondsPerPixel = projectDuration / rect.width;
      const deltaSeconds = deltaX * secondsPerPixel;

      let newStart = initialClipStartRef.current + deltaSeconds;
      newStart = Math.max(0, Math.round(newStart * 10) / 10);

      const clip = timelineClips.find(c => c.id === draggingId);
      if (!clip) return;

      const snap = findSnapPoint(newStart, clip.track, clip.id);
      const finalValue = snap !== null ? snap : newStart;
      setSnapPosition(snap);

      updateClip(draggingId, (c) => ({ ...c, start: finalValue }), rippleEnabled);
      recordHistory(`Move ${clip.title}`);
    };

    const handleMouseUp = () => {
      setDraggingId(null);
      setSnapPosition(null);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingId, projectDuration, rippleEnabled, timelineClips]);

  const handleClipMouseDown = (e: React.MouseEvent, clip: TimelineClip) => {
    setDraggingId(clip.id);
    dragStartXRef.current = e.clientX;
    initialClipStartRef.current = clip.start;
    selectClip(clip);
  };

  useEffect(() => {
    if (snapPosition !== null) {
      const timer = setTimeout(() => setSnapPosition(null), 1200);
      return () => clearTimeout(timer);
    }
  }, [snapPosition]);

  // Real-time audio levels calculation for meters
  useEffect(() => {
    if (!isPlaying) {
      setTrackLevels({ text: 0, video: 0, sequence: 0, effects: 0, audio: 0 });
      return;
    }

    const newLevels: Record<TimelineLayer, number> = { text: 0, video: 0, sequence: 0, effects: 0, audio: 0 };
    const isSoloActive = soloedLayers.size > 0;

    timelineClips.forEach((clip) => {
      const dur = visibleClipDuration(clip);
      if (playhead >= clip.start && playhead <= clip.start + dur) {
        const isMuted = mutedLayers.has(clip.track);
        const isSoloed = soloedLayers.has(clip.track);

        if (isMuted) return;
        if (isSoloActive && !isSoloed) return;

        const seed = clip.id.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
        // Generate a synthetic level peak based on playhead and track gain
        const level = (Math.abs(Math.sin(seed + playhead * 20)) * 0.7 + 0.1) * (trackGains[clip.track] / 100);
        if (level > newLevels[clip.track]) {
          newLevels[clip.track] = Math.min(1, level);
        }
      }
    });
    setTrackLevels(newLevels);
  }, [playhead, isPlaying, timelineClips, trackGains, mutedLayers, soloedLayers]);

  // Playback ticker logic to make the playhead move
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying) {
      const step = 0.033; // ~30fps resolution
      interval = setInterval(() => {
        setPlayhead((prev) => {
          if (prev >= projectDuration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + step;
        });
      }, 33);
    }
    return () => clearInterval(interval);
  }, [isPlaying, projectDuration]);

  const mediaAssets = useMemo(() => {
    const postAssets = posts.flatMap((post, postIndex) =>
      post.gallery.map((url, itemIndex) => {
        const isPostVideo = post.mediaType === "video" || isVideoUrl(url);
        return {
          duration: isPostVideo ? "00:10" : "IMG",
          durationSeconds: isPostVideo ? 10 : 6,
          format: inferFormat(url, post.mediaType),
          mimeType: inferMimeType(url, post.mediaType),
          title: isPostVideo ? `POST_${postIndex + 1}_${itemIndex + 1}.mp4` : `POST_${postIndex + 1}_${itemIndex + 1}.jpg`,
          type: isPostVideo ? "video" as const : "image" as const,
          url,
        };
      }),
    );
    return [...defaultMediaAssets, ...importedAssets, ...postAssets.slice(0, 6)];
  }, [importedAssets, posts]);

  const visibleMedia = mediaAssets.filter((item) => {
    const matchesKind = mediaKind === "all" || item.type === mediaKind;
    const matchesSearch = item.title.toLowerCase().includes(mediaSearchQuery.toLowerCase());
    return matchesKind && matchesSearch;
  });
  const selectedClip = timelineClips.find((clip) => clip.id === selectedClipId) ?? timelineClips.find((clip) => clip.track === selectedLayer);
  const selectedAudioClip = selectedClip?.type === "audio" ? selectedClip : timelineClips.find((clip) => clip.type === "audio");
  const selectedVisualClip = selectedClip && isVisualClip(selectedClip)
    ? selectedClip
    : timelineClips.find((clip) => isVisualClip(clip));
  const activeMedia = mediaAssets.find((item) => item.url === selectedVisualClip?.url)
    ?? mediaAssets.find((item) => item.url === draft.mediaUrl)
    ?? mediaAssets.find((item) => item.type !== "audio")
    ?? defaultMediaAssets[0];
  const rulerTicks = useMemo(() => {
    const tickCount = 9;
    return Array.from({ length: tickCount }, (_, index) => formatClock((projectDuration / (tickCount - 1)) * index));
  }, [projectDuration]);
  const selectedFilter = studioFilters.find((filter) => filter.name === draft.filterName) ?? studioFilters[0];
  const exportLabel = publishing ? (renderJob?.status === "running" ? "Rendering" : "Exporting") : "Export";
  const rendererLabel = rendererHealth
    ? rendererHealth.available
      ? "Renderer ready"
      : "Renderer offline"
    : "Checking renderer";
  const shareUrl = publishedPost ? buildPostLink(publishedPost.id) : "";

  function updateDraft<K extends keyof StudioDraft>(key: K, value: StudioDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function nextClipId(prefix: TimelineClipType) {
    clipCounterRef.current += 1;
    return `${prefix}-${clipCounterRef.current}`;
  }

  function updateClip(clipId: string, updater: (clip: TimelineClip) => TimelineClip, ripple = false) {
    setTimelineClips((current) => {
      const target = current.find((c) => c.id === clipId);
      if (!target) return current;

      const updated = updater(target);
      if (!ripple) {
        return current.map((clip) => (clip.id === clipId ? updated : clip));
      }

      const durDiff = visibleClipDuration(updated) - visibleClipDuration(target);
      const startDiff = updated.start - target.start;

      let finalUpdated = updated;
      let shift = durDiff;

      // If both start and duration changed (trim start), we anchor to original start to close the gap
      if (startDiff !== 0 && durDiff !== 0) {
        finalUpdated = { ...updated, start: target.start };
        shift = durDiff;
      } else if (startDiff !== 0) {
        shift = startDiff;
      }

      return current.map((clip) => {
        if (clip.id === clipId) return finalUpdated;
        if (clip.track === target.track && clip.start >= target.start) {
          return { ...clip, start: Math.max(0, clip.start + shift) };
        }
        return clip;
      });
    });
  }

  useEffect(() => {
    const container = timelineScrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();

      const board = timelineBoardRef.current;
      if (!board) return;

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const scrollLeft = container.scrollLeft;

      const boardWidth = board.scrollWidth;
      const mouseXOnBoard = scrollLeft + mouseX;
      const mousePct = mouseXOnBoard / boardWidth;

      const delta = e.deltaY < 0 ? 0.1 : -0.1;

      setTimelineZoom((prev) => {
        const next = Math.min(1.8, Math.max(0.6, prev + delta));
        if (next !== prev) {
          zoomPivotRef.current = { pct: mousePct, x: mouseX };
        }
        return next;
      });
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  useEffect(() => {
    if (!zoomPivotRef.current || !timelineScrollContainerRef.current || !timelineBoardRef.current) return;
    const { pct, x } = zoomPivotRef.current;
    const container = timelineScrollContainerRef.current;
    const board = timelineBoardRef.current;

    container.style.scrollBehavior = "auto";
    container.scrollLeft = pct * board.scrollWidth - x;
    container.style.scrollBehavior = "smooth";

    zoomPivotRef.current = null;
  }, [timelineZoom]);

  useEffect(() => {
    if (!trimmingId || !timelineBoardRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const board = timelineBoardRef.current;
      if (!board) return;

      const rect = board.getBoundingClientRect();
      const deltaX = e.clientX - dragStartXRef.current;
      const secondsPerPixel = projectDuration / rect.width;
      const deltaSeconds = deltaX * secondsPerPixel;

      const clip = timelineClips.find((c) => c.id === trimmingId);
      if (!clip) return;

      if (trimSideRef.current === "start") {
        const targetStart = initialClipStartRef.current + deltaSeconds;
        const snap = findSnapPoint(targetStart, clip.track, clip.id);
        const finalTimelineStart = snap !== null ? snap : targetStart;
        setSnapPosition(snap);

        const timelineDelta = finalTimelineStart - initialClipStartRef.current;
        const newInPoint = clamp(initialInPointRef.current + timelineDelta, 0, clip.outPoint - 1);
        const actualDelta = newInPoint - initialInPointRef.current;
        const finalStart = initialClipStartRef.current + actualDelta;

        updateClip(trimmingId, (c) => ({ ...c, start: finalStart, inPoint: newInPoint }), rippleEnabled);
        recordHistory(`Trim ${clip.title} Start`);
      } else if (trimSideRef.current === "end") {
        const newOutPoint = clamp(initialOutPointRef.current + deltaSeconds, clip.inPoint + 1, clip.sourceDuration);
        const targetTimelineEnd = clip.start + (newOutPoint - clip.inPoint);
        const snap = findSnapPoint(targetTimelineEnd, clip.track, clip.id);
        setSnapPosition(snap);

        let finalOutPoint = newOutPoint;
        if (snap !== null) {
          const snapTimelineDelta = snap - clip.start;
          finalOutPoint = clamp(clip.inPoint + snapTimelineDelta, clip.inPoint + 1, clip.sourceDuration);
        }

        updateClip(trimmingId, (c) => ({ ...c, outPoint: finalOutPoint }), rippleEnabled);
        recordHistory(`Trim ${clip.title} End`);
      }
    };

    const handleMouseUp = () => {
      setTrimmingId(null);
      trimSideRef.current = null;
      setSnapPosition(null);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [trimmingId, projectDuration, rippleEnabled, timelineClips]);

  const handleTrimMouseDown = (e: React.MouseEvent, clip: TimelineClip, side: "start" | "end") => {
    e.stopPropagation(); // Prevent drag initialization on the parent clip button
    setTrimmingId(clip.id);
    trimSideRef.current = side;
    dragStartXRef.current = e.clientX;
    initialClipStartRef.current = clip.start;
    initialInPointRef.current = clip.inPoint;
    initialOutPointRef.current = clip.outPoint;
    if (!selectedClipIds.has(clip.id)) {
      selectClip(clip);
    }
  };

  function findSnapPoint(value: number, track: TimelineLayer, excludeClipId: string): number | null {
    if (Math.abs(value - playhead) < SNAP_THRESHOLD) return playhead;
    if (Math.abs(value) < SNAP_THRESHOLD) return 0;

    for (const clip of timelineClips) {
      if (clip.id === excludeClipId || clip.track !== track) continue;
      const start = clip.start;
      const end = clip.start + visibleClipDuration(clip);

      if (Math.abs(value - start) < SNAP_THRESHOLD) return start;
      if (Math.abs(value - end) < SNAP_THRESHOLD) return end;
    }
    return null;
  }

  function selectClip(clip: TimelineClip) {
    setSelectedLayer(clip.track);

    if (multiSelectActive) {
      setSelectedClipIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(clip.id)) {
          newSet.delete(clip.id);
        } else {
          newSet.add(clip.id);
        }
        return newSet;
      });
      setSelectedClipId(clip.id); // The last clicked clip becomes the primary for inspector
    } else {
      setSelectedClipIds(new Set([clip.id]));
      setSelectedClipId(clip.id);
    }

    setSelectedClipId(clip.id);
    setSelectedLayer(clip.track);
    setOutputFormat(clip.format);
    // The rest of the logic for inspector tabs etc. should apply to the primary selected clip
    // which is now `clip` (the argument passed in).
    if (clip.type === "audio") {
      setActiveTool("audio");
      setInspectorTab("audio");
      setAudioGain(clip.gain ?? 72);
    } else if (clip.type === "text") {
      setActiveTool("text");
      setInspectorTab("adjust");
    } else if (clip.type === "effect") {
      setActiveTool("effects");
      setInspectorTab("effects");
    } else if (isVisualClip(clip) && clip.url) {
      updateDraft("mediaUrl", clip.url);
      updateDraft("mediaType", clip.type === "video" ? "video" : "image");
      setInspectorTab("video");
    }
  }

  function setSelectedLayerAndClip(layer: TimelineLayer) {
    setSelectedLayer(layer);
    const nextClip = timelineClips.find((clip) => clip.track === layer);
    if (nextClip) {
      selectClip(nextClip);
      setMultiSelectActive(false); // Clear multi-select when focusing on a layer
      setSelectedClipIds(new Set([nextClip.id]));
      setSelectedClipId(nextClip.id);
      if (nextClip.type === "audio") {
        setActiveTool("audio");
        setInspectorTab("audio");
        setAudioGain(nextClip.gain ?? 72);
      } else if (isVisualClip(nextClip) && nextClip.url) {
        updateDraft("mediaUrl", nextClip.url);
        updateDraft("mediaType", nextClip.type === "video" ? "video" : "image");
        setInspectorTab("video");
      }
    } else { // If no clip on the layer, clear selection
      setSelectedClipIds(new Set());
      setSelectedClipId("");
    }
  }

  function addAssetToTimeline(asset: MediaAsset, placementStart?: number) {
    const track = trackForAsset(asset);
    const clip = createClipFromAsset(
      asset,
      placementStart ?? nextTrackStart(timelineClips, track),
      nextClipId(asset.type === "audio" ? "audio" : asset.type === "video" ? "video" : "image"),
    );
    // When adding a new asset, clear multi-select and select only this new clip
    setMultiSelectActive(false);
    setSelectedClipIds(new Set([clip.id]));
    setTimelineClips((current) => [...current, clip]);
    selectClip(clip);
    recordHistory(`Add ${asset.title}`);

    if (asset.type === "audio") {
      setPublishStatus(`${asset.title} loaded at full length on the audio timeline.`);
      return;
    }

    updateDraft("body", draft.body || "Adventure awaits");
    updateDraft("overlayText", draft.overlayText || "Adventure Awaits");
    setPublishStatus(`${asset.title} extracted and loaded at full length on the ${track === "video" ? "video" : "image sequence"} timeline.`);
  }

  function chooseMedia(asset: MediaAsset) {
    addAssetToTimeline(asset);
  }

  async function uploadFromDevice(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    setLastFailedFiles(null);
    const count = files.length;
    setPublishStatus(count === 1 ? "Uploading media..." : `Uploading ${count} files...`);

    try {
      const uploadedAssets: MediaAsset[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const metadata = await readMediaFileMetadata(file);
        const media = await onUploadMedia(file);
        const asset = mediaAssetFromUpload(file, media.url, media.mediaType, metadata.duration);
        uploadedAssets.push(asset);
        setUploadProgress(Math.round(((i + 1) / count) * 100));
      }

      setImportedAssets((current) => [...uploadedAssets, ...current]);

      let updatedClips = [...timelineClips];
      const newlyAddedClips: TimelineClip[] = [];

      for (const asset of uploadedAssets) {
        const track = trackForAsset(asset);
        const clip = createClipFromAsset(
          asset,
          nextTrackStart(updatedClips, track),
          nextClipId(asset.type === "audio" ? "audio" : asset.type === "video" ? "video" : "image"),
        );
        newlyAddedClips.push(clip);
        updatedClips = [...updatedClips, clip];
      }

      setTimelineClips(updatedClips);

      if (newlyAddedClips.length > 0) {
        const lastClip = newlyAddedClips[newlyAddedClips.length - 1];
        setMultiSelectActive(false);
        setSelectedClipIds(new Set([lastClip.id]));
        setSelectedClipId(lastClip.id);
        recordHistory(`Upload ${count} files`, updatedClips);
      }

      setPublishStatus(count === 1
        ? `${uploadedAssets[0].title} added to project.`
        : `Successfully uploaded ${count} assets to project.`);
    } catch (err) {
      setPublishStatus(err instanceof Error ? err.message : "Could not upload media.");
      setLastFailedFiles(files);
    } finally {
      setUploading(false);
    }
  }

  function buildStudioRenderInput(): StudioRenderInput {
    const clips = timelineClips
      .filter((clip) => {
        if (clip.type === "text" || clip.type === "effect") {
          return true;
        }
        return Boolean(clip.url && !clip.url.startsWith("audio:"));
      })
      .map((clip) => {
        const shouldRenderAsImage = clip.type === "video" && clip.url && !isVideoUrl(clip.url);
        return {
          id: clip.id,
          type: shouldRenderAsImage ? "image" : clip.type,
          track: clip.track,
          title: clip.title,
          url: clip.url ?? "",
          start: clip.start,
          inPoint: clip.inPoint,
          outPoint: clip.outPoint,
          sourceDuration: clip.sourceDuration,
          format: clip.format,
          gain: clip.gain,
          audioEffect: clip.audioEffect,
        };
      });

    if (clips.filter((clip) => clip.type === "video" || clip.type === "image").length === 0 && !isAudioOutputFormat(outputFormat)) {
      throw new Error("Load an image or video clip before exporting the timeline.");
    }
    if (isAudioOutputFormat(outputFormat) && clips.filter((clip) => clip.type === "audio").length === 0) {
      throw new Error("Import a real audio file before exporting audio.");
    }

    return {
      aspectRatio: draft.aspectRatio || "16:9",
      clips,
      cropZoom: zoom,
      filterName: draft.filterName,
      outputFormat,
      rotation: draft.rotation,
    };
  }

  async function waitForRenderJob(job: StudioRenderJob) {
    let current = job;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      if (current.status === "completed" || current.status === "failed") {
        return current;
      }
      await delay(1000);
      current = await fetchStudioRenderJob(job.id);
      setRenderJob(current);
      setPublishStatus(current.message || `Render ${current.status}.`);
    }
    throw new Error("Renderer timed out before finishing the export.");
  }

  async function submitPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (publishing) {
      return;
    }
    setPublishing(true);
    setRenderJob(null);
    setPublishStatus("Preparing studio timeline render...");
    try {
      if (rendererHealth && !rendererHealth.available) {
        throw new Error(rendererHealth.message || "Studio renderer is unavailable.");
      }
      const renderInput = buildStudioRenderInput();
      const queuedJob = await startStudioRender(renderInput);
      setRenderJob(queuedJob);
      setPublishStatus(queuedJob.message || "Render queued.");
      const finalJob = await waitForRenderJob(queuedJob);
      if (finalJob.status !== "completed" || !finalJob.outputUrl) {
        throw new Error(finalJob.message || "Renderer did not produce an output file.");
      }
      const post = await onCreatePost({
        body: draft.body.trim() || "Adventure awaits",
        mood: draft.mood || "Summer Adventure",
        mediaUrl: finalJob.outputUrl,
        mediaType: mediaTypeFromOutputFormat(finalJob.outputFormat),
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
      setPublishStatus(`Export complete as ${outputFormat.toUpperCase()}. Share link is ready.`);
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

  function splitTimelineClip(clipToSplit: TimelineClip) {
    const clipLength = visibleClipDuration(clipToSplit);
    const splitOffset = clamp(playhead - clipToSplit.start, 1, clipLength - 1);
    if (clipLength <= 2) {
      setPublishStatus("Clip is too short to split.");
      return;
    }

    const sourceSplit = clipToSplit.inPoint + splitOffset;
    const secondClip: TimelineClip = {
      ...clipToSplit,
      id: nextClipId(clipToSplit.type),
      inPoint: sourceSplit,
      start: clipToSplit.start + splitOffset,
      title: `${clipToSplit.title} split`,
    };

    setTimelineClips((current) =>
      current.flatMap((clip) => {
        if (clip.id !== clipToSplit.id) {
          return [clip];
        }
        return [{ ...clip, outPoint: sourceSplit }, secondClip];
      }),
    );
    selectClip(secondClip);
    recordHistory(`Split ${clipToSplit.title}`);
    setPublishStatus(`${clipToSplit.title} split at ${formatTimelineTime(playhead)}.`);
  }

  function splitClip() {
    // If no clip is selected, try to find the one under the playhead on the selected layer
    let clipToSplit = selectedClip;
    if (!clipToSplit) {
      clipToSplit = timelineClips.find(c =>
        c.track === selectedLayer &&
        playhead >= c.start &&
        playhead <= c.start + visibleClipDuration(c)
      );
    }

    if (!clipToSplit) {
      setPublishStatus("Select a timeline clip to split.");
      return;
    }
    splitTimelineClip(clipToSplit);
  }

  function trimClip() {
    let clipToTrim = selectedClip;
    if (!clipToTrim) {
      clipToTrim = timelineClips.find(c =>
        c.track === selectedLayer &&
        playhead >= c.start &&
        playhead <= c.start + visibleClipDuration(c)
      );
    }

    if (!clipToTrim) {
      setPublishStatus("Select a clip to trim.");
      return;
    }

    updateClip(clipToTrim.id, (clip) => {
      const clipRelativePlayhead = playhead - clip.start;
      const duration = visibleClipDuration(clip);

      // If playhead is in the first half of the clip, trim the start
      if (clipRelativePlayhead < duration / 2) {
        const newInPoint = clip.inPoint + Math.max(0, clipRelativePlayhead);
        return { ...clip, inPoint: newInPoint, start: clip.start + clipRelativePlayhead };
      }

      // Otherwise trim the end
      const newOutPoint = clip.inPoint + clipRelativePlayhead;
      return { ...clip, outPoint: Math.max(clip.inPoint + 1, newOutPoint) };
    });

    recordHistory(`Trim ${clipToTrim.title}`);
    setPublishStatus(`${clipToTrim.title} trimmed to playhead.`);
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
    if (selectedVisualClip) {
      selectClip(selectedVisualClip);
    }
    setPublishStatus("Clip rotated 15 deg.");
  }

  function duplicateClip() {
    const clipsToDuplicate = multiSelectActive && selectedClipIds.size > 0
      ? timelineClips.filter(c => selectedClipIds.has(c.id))
      : selectedClip ? [selectedClip] : [];

    if (clipsToDuplicate.length === 0) {
      setPublishStatus("Select one or more clips to duplicate.");
      return;
    }

    const newClips: TimelineClip[] = [];
    let currentClipsForPlacement = [...timelineClips]; // Use a mutable copy for placement calculation

    // Sort by start time to maintain order and place duplicates sequentially
    clipsToDuplicate.sort((a, b) => a.start - b.start);

    for (const clipToDuplicate of clipsToDuplicate) {
      const newStart = nextTrackStart(currentClipsForPlacement, clipToDuplicate.track);
      const copy: TimelineClip = {
        ...clipToDuplicate,
        id: nextClipId(clipToDuplicate.type),
        start: newStart,
        title: `${clipToDuplicate.title} copy`,
      };
      newClips.push(copy);
      currentClipsForPlacement.push(copy); // Add to this temp array for correct nextTrackStart calculation in subsequent iterations
    }

    setTimelineClips(current => [...current, ...newClips]);
    setSelectedClipIds(new Set(newClips.map(c => c.id))); // Select the new duplicates
    setSelectedClipId(newClips[0]?.id || ""); // Set primary to the first duplicated clip
    recordHistory(`Duplicate ${clipsToDuplicate.length} clip(s)`);
    setPublishStatus(`${clipsToDuplicate.length} clip(s) duplicated.`);
  }

  function deleteLayer() {
    const clipsToDelete = multiSelectActive && selectedClipIds.size > 0
      ? timelineClips.filter(c => selectedClipIds.has(c.id))
      : selectedClip ? [selectedClip] : [];

    if (clipsToDelete.length === 0) {
      setPublishStatus("Select one or more clips to delete.");
      return;
    }

    let currentClips = [...timelineClips];
    const deletedClipTitles: string[] = [];

    // Sort clips to delete by start time to handle ripple correctly
    clipsToDelete.sort((a, b) => a.start - b.start);

    for (const clipToDelete of clipsToDelete) {
      deletedClipTitles.push(clipToDelete.title);
      const duration = visibleClipDuration(clipToDelete);
      const track = clipToDelete.track;

      currentClips = currentClips.filter((clip) => clip.id !== clipToDelete.id);

      if (rippleEnabled) {
        // Shift subsequent clips on the same track
        currentClips = currentClips.map((clip) => {
          if (clip.track === track && clip.start > clipToDelete.start) {
            return { ...clip, start: Math.max(0, clip.start - duration) };
          }
          return clip;
        });
      }
    }

    setTimelineClips(currentClips);
    setSelectedClipIds(new Set()); // Clear all selections
    setSelectedClipId(""); // Clear primary selection

    // Update draft if any text clip was deleted
    if (clipsToDelete.some(c => c.type === "text")) {
      updateDraft("overlayText", "");
    }
    recordHistory(`Delete ${clipsToDelete.length} clip(s)`);

    setPublishStatus(`${deletedClipTitles.join(", ")} deleted.`);
  }

  function moveTimelineClip(clipToMove: TimelineClip, deltaSeconds: number) {
    updateClip(clipToMove.id, (clip) => ({ ...clip, start: Math.max(0, Math.round((clip.start + deltaSeconds) * 10) / 10) }));
    selectClip(clipToMove);
    setPublishStatus(`${clipToMove.title} moved ${deltaSeconds > 0 ? "right" : "left"} by ${Math.abs(deltaSeconds)}s.`);
  }

  function moveSelectedClip(deltaSeconds: number) {
    const clipsToMove = multiSelectActive && selectedClipIds.size > 0
      ? timelineClips.filter(c => selectedClipIds.has(c.id))
      : selectedClip ? [selectedClip] : [];

    if (clipsToMove.length === 0) {
      setPublishStatus("Select one or more clips to move.");
      return;
    }

    if (rippleEnabled && clipsToMove.length > 1) {
      setPublishStatus("Multi-clip move with ripple is not supported yet.");
      return;
    }

    setTimelineClips(current => {
      let newClips = [...current];
      for (const clipToMove of clipsToMove) {
        const originalClip = newClips.find(c => c.id === clipToMove.id);
        if (!originalClip) continue;

        const newStart = Math.max(0, Math.round((originalClip.start + deltaSeconds) * 10) / 10);
        const shiftAmount = newStart - originalClip.start;

        newClips = newClips.map(clip => {
          if (clip.id === clipToMove.id) {
            return { ...clip, start: newStart };
          }
          if (rippleEnabled && clip.track === originalClip.track && clip.start >= originalClip.start) {
            return { ...clip, start: Math.max(0, clip.start + shiftAmount) };
          }
          return clip;
        });
      }
      return newClips;
    });
    recordHistory(`Move ${clipsToMove.length} clip(s)`);

    setPublishStatus(`${clipsToMove.length} clip(s) moved ${deltaSeconds > 0 ? "right" : "left"} by ${Math.abs(deltaSeconds)}s.`);
  }

  function setSelectedClipStart(value: number) {
    if (!selectedClip) {
      return;
    }
    const snap = findSnapPoint(value, selectedClip.track, selectedClip.id);
    const finalValue = snap !== null ? snap : value;
    setSnapPosition(snap);
    updateClip(selectedClip.id, (clip) => ({ ...clip, start: Math.max(0, finalValue) }), rippleEnabled);
  }

  function setSelectedClipIn(value: number) {
    if (!selectedClip) {
      return;
    }
    // Target timeline start is start + (value - inPoint)
    const targetStart = selectedClip.start + (value - selectedClip.inPoint);
    const snap = findSnapPoint(targetStart, selectedClip.track, selectedClip.id);

    let finalValue = value;
    if (snap !== null) {
      finalValue = clamp(snap - selectedClip.start + selectedClip.inPoint, 0, selectedClip.outPoint - 1);
    }

    setSnapPosition(snap);
    updateClip(selectedClip.id, (clip) => {
      const diff = finalValue - clip.inPoint;
      return { ...clip, inPoint: Math.min(finalValue, clip.outPoint - 1), start: Math.max(0, clip.start + diff) };
    }, rippleEnabled);
  }

  function setSelectedClipOut(value: number) {
    if (!selectedClip) {
      return;
    }
    // Target timeline end is start + (value - inPoint)
    const targetEnd = selectedClip.start + (value - selectedClip.inPoint);
    const snap = findSnapPoint(targetEnd, selectedClip.track, selectedClip.id);

    let finalValue = value;
    if (snap !== null) {
      finalValue = clamp(snap - selectedClip.start + selectedClip.inPoint, selectedClip.inPoint + 1, selectedClip.sourceDuration);
    }

    setSnapPosition(snap);
    updateClip(selectedClip.id, (clip) => ({ ...clip, outPoint: Math.max(finalValue, clip.inPoint + 1) }), rippleEnabled);
  }

  function joinSelectedClip() {
    if (!selectedClip) {
      setPublishStatus("Select a clip to join.");
      return;
    }

    const trackClips = timelineClips.filter((clip) => clip.track === selectedClip.track).sort((a, b) => a.start - b.start);
    const selectedIndex = trackClips.findIndex((clip) => clip.id === selectedClip.id);
    const nextClip = trackClips[selectedIndex + 1];
    if (!nextClip) {
      setPublishStatus("No following clip on this track to join.");
      return;
    }

    const joinedLength = visibleClipDuration(selectedClip) + visibleClipDuration(nextClip);
    const joinedClip: TimelineClip = {
      ...selectedClip,
      inPoint: 0,
      outPoint: joinedLength,
      sourceDuration: joinedLength,
      title: `${selectedClip.title} + ${nextClip.title}`,
    };
    setTimelineClips((current) => current.map((clip) => (clip.id === selectedClip.id ? joinedClip : clip)).filter((clip) => clip.id !== nextClip.id));
    selectClip(joinedClip);
    recordHistory(`Join ${selectedClip.title} and ${nextClip.title}`);
    setPublishStatus(`${selectedClip.title} joined with ${nextClip.title}.`);
  }

  function setSelectedClipFormat(format: MediaFormat) {
    setOutputFormat(format);
    if (!selectedClip) {
      return;
    }
    updateClip(selectedClip.id, (clip) => ({ ...clip, format }));
    setPublishStatus(`${selectedClip.title} output format set to ${format.toUpperCase()}.`);
  }

  function setSelectedAudioEffect(effectId: AudioEffectId) {
    const clip = selectedAudioClip;
    if (!clip) {
      setPublishStatus("Load an audio clip before applying audio effects.");
      return;
    }
    updateClip(clip.id, (current) => ({ ...current, audioEffect: effectId }));
    selectClip({ ...clip, audioEffect: effectId });
    setPublishStatus(`${audioEffects.find((effect) => effect.id === effectId)?.label ?? "Audio effect"} applied to ${clip.title}.`);
  }

  function setSelectedAudioGain(value: number) {
    setAudioGain(value);
    if (selectedAudioClip) {
      updateClip(selectedAudioClip.id, (clip) => ({ ...clip, gain: value }));
    }
  }

  function updateTrackGain(layerId: TimelineLayer, value: number) {
    setTrackGains((prev) => ({ ...prev, [layerId]: value }));
    setPublishStatus(`${layerLabel(layerId)} track volume set to ${value}%`);
  }

  function toggleMute(layerId: TimelineLayer) {
    const isCurrentlyMuted = mutedLayers.has(layerId);
    setMutedLayers((prev) => {
      const next = new Set(prev);
      if (isCurrentlyMuted) next.delete(layerId);
      else next.add(layerId);
      return next;
    });
    setPublishStatus(`${layerLabel(layerId)} track ${isCurrentlyMuted ? "unmuted" : "muted"}.`);
  }

  function toggleSolo(layerId: TimelineLayer) {
    const isCurrentlySoloed = soloedLayers.has(layerId);
    setSoloedLayers((prev) => {
      const next = new Set(prev);
      if (isCurrentlySoloed) next.delete(layerId);
      else next.add(layerId);
      return next;
    });
    setPublishStatus(`${layerLabel(layerId)} track solo ${isCurrentlySoloed ? "off" : "on"}.`);
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
            <em className={`studio-render-status ${rendererHealth?.available ? "ready" : "offline"}`} title={rendererHealth?.message || serviceLabel}>
              <CloudDoneRounded fontSize="small" /> {serviceLabel === "Backend live" ? rendererLabel : serviceLabel}
            </em>
          </div>
          <div className="studio-reference-actions">
            <IconButton aria-label="Undo edit" onClick={undo} disabled={historyIndex <= 0}><UndoRounded /></IconButton>
            <IconButton aria-label="Redo edit" onClick={redo} disabled={historyIndex >= history.length - 1}><RedoRounded /></IconButton>
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
            <button
              className={activeTool === tool.id ? "active" : ""}
              key={tool.id}
              onClick={() => {
                setActiveTool(tool.id);
                if (tool.id === "media") setInspectorTab("video");
                else if (tool.id === "audio") setInspectorTab("audio");
                else if (tool.id === "text") setInspectorTab("adjust");
                else if (tool.id === "effects") setInspectorTab("effects");
                else if (tool.id === "adjust") setInspectorTab("adjust");
              }}
              title={tool.label}
              type="button"
            >
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
          {uploading && (
            <div className="studio-media-progress" style={{ padding: "0 12px 12px" }}>
              <div style={{ height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${uploadProgress}%`, background: "#ff6848", transition: "width 0.2s" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
                <span style={{ fontSize: "10px", opacity: 0.6, fontWeight: 700 }}>UPLOADING ASSETS</span>
                <span style={{ fontSize: "10px", opacity: 0.6, fontWeight: 700 }}>{uploadProgress}%</span>
              </div>
            </div>
          )}
          <input
            accept="image/*,video/*,audio/*,.mp4,.mov,.webm,.mkv,.gif,.jpg,.jpeg,.png,.mp3,.wav,.aac,.flac,.m4a,.ogg"
            className="studio-hidden-input"
            disabled={uploading}
            multiple
            onChange={(event) => void uploadFromDevice(event.currentTarget.files)}
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
          <div className="studio-media-search" style={{ padding: "0 12px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: "8px" }}>
            <SearchRounded fontSize="small" sx={{ opacity: 0.4 }} />
            <InputBase
              placeholder="Search assets..."
              value={mediaSearchQuery}
              onChange={(e) => setMediaSearchQuery(e.target.value)}
              sx={{ fontSize: "0.75rem", color: "inherit", opacity: 0.8 }}
              fullWidth
            />
            {mediaSearchQuery && (
              <IconButton onClick={() => setMediaSearchQuery("")} size="small" sx={{ opacity: 0.5, p: 0.5 }}>
                <CloseRounded fontSize="small" />
              </IconButton>
            )}
          </div>
          <div className="studio-media-library" style={{ gap: '10px', padding: '0 12px 12px' }}>
            {visibleMedia.map((asset) => (
              <Tooltip
                key={`${asset.title}-${asset.url}`}
                title={
                  <div style={{ padding: '4px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '2px' }}>{asset.title}</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.8, lineHeight: 1.4 }}>
                      {asset.type.toUpperCase()} • {asset.format.toUpperCase()}<br />
                      Duration: {asset.duration} • {asset.mimeType}
                    </div>
                  </div>
                }
                arrow
                placement="right"
              >
                <button
                  className={selectedClip?.url === asset.url || activeMedia.url === asset.url ? "selected" : ""}
                  onClick={() => chooseMedia(asset)}
                  type="button"
                  style={{
                    borderRadius: '10px',
                    overflow: 'hidden',
                    transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
                    minHeight: '110px'
                  }}
                >
                  {asset.type === "audio" ? <WaveformBars /> : <img alt="" src={asset.url} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />}
                  <span>{asset.duration}</span>
                  <strong>{asset.title}</strong>
                  {selectedClip?.url === asset.url || activeMedia.url === asset.url ? <i><CheckRounded fontSize="inherit" /></i> : null}
                </button>
              </Tooltip>
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
            {selectedVisualClip?.url ? (
              <img
                alt=""
                src={selectedVisualClip.url}
                style={{
                  filter: `${selectedFilter.css} saturate(${1 + effectStrength / 240}) opacity(${opacity}%)`,
                  objectPosition: `${draft.cropX}% ${draft.cropY}%`,
                  transform: `scale(${zoom}) rotate(${draft.rotation}deg)`,
                  transition: "transform 0.2s cubic-bezier(0.2, 0, 0, 1), filter 0.25s ease-out",
                }}
              />
            ) : null}
            {cropEnabled ? <div className="studio-preview-selection">
              <span className="corner top-left" />
              <span className="corner top-right" />
              <span className="corner bottom-left" />
              <span className="corner bottom-right" />
              <span className="handle top" />
              <span className="handle right" />
              <span className="handle bottom" />
              <span className="handle left" />
            </div> : null}
          </div>
          <div className="studio-reference-player">
            <span>{formatTimelineTime(playhead)} <i>/</i> {formatTimelineTime(projectDuration)}</span>
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
          <input className="studio-reference-scrubber" min="0" max={projectDuration} type="range" value={playhead} onChange={(event) => setPlayhead(Number(event.target.value))} />
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
              {selectedClip ? (
                <InspectorSection title="Timeline Clip">
                  <div className="studio-selected-clip-card">
                    <strong>{selectedClip.title}</strong>
                    <span>{layerLabel(selectedClip.track)} / {selectedClip.format.toUpperCase()} / {formatClock(visibleClipDuration(selectedClip))}</span>
                  </div>
                  <ControlSlider
                    label="Start"
                    max={Math.max(projectDuration, selectedClip.start + visibleClipDuration(selectedClip))}
                    min={0}
                    step={0.5}
                    suffix={formatClock(selectedClip.start)}
                    value={selectedClip.start}
                    onChange={setSelectedClipStart}
                  />
                  <ControlSlider
                    label="In"
                    max={Math.max(selectedClip.outPoint - 1, 1)}
                    min={0}
                    step={0.5}
                    suffix={formatClock(selectedClip.inPoint)}
                    value={selectedClip.inPoint}
                    onChange={setSelectedClipIn}
                  />
                  <ControlSlider
                    label="Out"
                    max={selectedClip.sourceDuration}
                    min={Math.min(selectedClip.inPoint + 1, selectedClip.sourceDuration)}
                    step={0.5}
                    suffix={formatClock(selectedClip.outPoint)}
                    value={selectedClip.outPoint}
                    onChange={setSelectedClipOut}
                  />
                  <div className="studio-icon-row">
                    <button type="button" onClick={() => moveSelectedClip(-2)}><SkipPreviousRounded fontSize="small" /> Move</button>
                    <button type="button" onClick={() => moveSelectedClip(2)}>Move <SkipNextRounded fontSize="small" /></button>
                    <button type="button" onClick={joinSelectedClip}><LinkRounded fontSize="small" /> Join</button>
                  </div>
                </InspectorSection>
              ) : null}
              <InspectorSection title="Format">
                <div className="studio-format-options">
                  {videoFormatOptions.map((format) => (
                    <button className={outputFormat === format.id ? "active" : ""} key={format.id} onClick={() => setSelectedClipFormat(format.id)} type="button">
                      {format.label}
                    </button>
                  ))}
                </div>
                <div className={`studio-render-card ${rendererHealth?.available ? "ready" : "offline"}`}>
                  <strong>{rendererHealth?.available ? "Local renderer ready" : "Renderer needs FFmpeg"}</strong>
                  <span>{renderJob ? `${renderJob.status}: ${renderJob.message}` : rendererHealth?.message ?? "Checking render service..."}</span>
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
              <InspectorSection title="Track Mixer">
                <div className="studio-mixer-group" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {timelineLayers.map((layer) => (
                    <ControlSlider
                      key={layer.id}
                      label={layer.label}
                      max={150}
                      min={0}
                      step={1}
                      suffix={`${trackGains[layer.id]}%`}
                      value={trackGains[layer.id]}
                      onChange={(val) => updateTrackGain(layer.id, val)}
                    />
                  ))}
                </div>
              </InspectorSection>
              <InspectorSection title="Audio">
                <div className="studio-selected-clip-card">
                  <strong>{selectedAudioClip?.title ?? "No audio loaded"}</strong>
                  <span>{selectedAudioClip ? `${selectedAudioClip.format.toUpperCase()} / ${formatClock(visibleClipDuration(selectedAudioClip))}` : "Choose or import audio to create a track"}</span>
                </div>
                <ControlSlider label="Gain" max={140} min={0} step={1} suffix={`${audioGain}%`} value={audioGain} onChange={setSelectedAudioGain} />
                <WaveformBars large />
              </InspectorSection>
              {selectedAudioClip ? (
                <InspectorSection title="Audio Trim">
                  <ControlSlider
                    label="Start"
                    max={Math.max(projectDuration, selectedAudioClip.start + visibleClipDuration(selectedAudioClip))}
                    min={0}
                    step={0.5}
                    suffix={formatClock(selectedAudioClip.start)}
                    value={selectedAudioClip.start}
                    onChange={(value) => {
                      selectClip(selectedAudioClip);
                      updateClip(selectedAudioClip.id, (clip) => ({ ...clip, start: Math.max(0, value) }));
                    }}
                  />
                  <ControlSlider
                    label="In"
                    max={Math.max(selectedAudioClip.outPoint - 1, 1)}
                    min={0}
                    step={0.5}
                    suffix={formatClock(selectedAudioClip.inPoint)}
                    value={selectedAudioClip.inPoint}
                    onChange={(value) => {
                      selectClip(selectedAudioClip);
                      updateClip(selectedAudioClip.id, (clip) => ({ ...clip, inPoint: Math.min(value, clip.outPoint - 1) }));
                    }}
                  />
                  <ControlSlider
                    label="Out"
                    max={selectedAudioClip.sourceDuration}
                    min={Math.min(selectedAudioClip.inPoint + 1, selectedAudioClip.sourceDuration)}
                    step={0.5}
                    suffix={formatClock(selectedAudioClip.outPoint)}
                    value={selectedAudioClip.outPoint}
                    onChange={(value) => {
                      selectClip(selectedAudioClip);
                      updateClip(selectedAudioClip.id, (clip) => ({ ...clip, outPoint: Math.max(value, clip.inPoint + 1) }));
                    }}
                  />
                  <div className="studio-icon-row">
                    <button type="button" onClick={() => moveTimelineClip(selectedAudioClip, -2)}><SkipPreviousRounded fontSize="small" /> Move</button>
                    <button type="button" onClick={() => moveTimelineClip(selectedAudioClip, 2)}>Move <SkipNextRounded fontSize="small" /></button>
                    <button type="button" onClick={() => splitTimelineClip(selectedAudioClip)}><ContentCutRounded fontSize="small" /> Cut</button>
                  </div>
                </InspectorSection>
              ) : null}
              <InspectorSection title="Noise & Tone">
                <div className="studio-effect-grid">
                  {audioEffects.map((effect) => (
                    <button
                      className={(selectedAudioClip?.audioEffect ?? "clean") === effect.id ? "active" : ""}
                      key={effect.id}
                      onClick={() => setSelectedAudioEffect(effect.id)}
                      type="button"
                    >
                      <strong>{effect.label}</strong>
                      <span>{effect.description}</span>
                    </button>
                  ))}
                </div>
              </InspectorSection>
              <InspectorSection title="Audio Format">
                <div className="studio-format-options">
                  {audioFormatOptions.map((format) => (
                    <button
                      className={(selectedAudioClip?.format ?? outputFormat) === format.id ? "active" : ""}
                      key={format.id}
                      onClick={() => {
                        if (selectedAudioClip) {
                          selectClip(selectedAudioClip);
                          updateClip(selectedAudioClip.id, (clip) => ({ ...clip, format: format.id }));
                          setOutputFormat(format.id);
                          setPublishStatus(`${selectedAudioClip.title} output format set to ${format.id.toUpperCase()}.`);
                          return;
                        }
                        setSelectedClipFormat(format.id);
                      }}
                      type="button"
                    >
                      {format.label}
                    </button>
                  ))}
                </div>
                <div className={`studio-render-card ${rendererHealth?.available ? "ready" : "offline"}`}>
                  <strong>{rendererHealth?.available ? "Audio render ready" : "Audio render offline"}</strong>
                  <span>{renderJob ? `${renderJob.status}: ${renderJob.message}` : rendererHealth?.message ?? "Checking render service..."}</span>
                </div>
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
                <span>Overlay Text</span>
                <InputBase onChange={(event) => updateDraft("overlayText", event.target.value)} value={draft.overlayText} />
              </label>
              <label className="studio-field">
                <span>Caption</span>
                <InputBase multiline minRows={3} onChange={(event) => updateDraft("body", event.target.value)} value={draft.body} />
              </label>
            </div>
          ) : null}

          {inspectorTab === "history" ? (
            <div className="studio-inspector-scroll">
              <InspectorSection title="Edit History">
                <div className="studio-history-list">
                  {history.map((entry, idx) => (
                    <button
                      key={`${entry.timestamp}-${idx}`}
                      className={`studio-history-item ${idx === historyIndex ? 'active' : ''} ${idx > historyIndex ? 'future' : ''}`}
                      onClick={() => jumpToHistory(idx)}
                      type="button"
                    >
                      <HistoryRounded fontSize="small" />
                      <div className="history-details">
                        <strong>{entry.label}</strong>
                        <span>{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                    </button>
                  ))}
                  {history.length === 0 && <p className="studio-empty-note">No history recorded yet.</p>}
                </div>
              </InspectorSection>
            </div>
          ) : null}
        </aside>

        <div className="studio-reference-quickbar" aria-label="Quick edit actions">
          <IconButton aria-label="Undo" onClick={undo} disabled={historyIndex <= 0}><UndoRounded /></IconButton>
          <IconButton aria-label="Redo" onClick={redo} disabled={historyIndex >= history.length - 1}><RedoRounded /></IconButton>
          <button className="active" type="button" onClick={splitClip}><ContentCutRounded fontSize="small" /></button>
          <button className={multiSelectActive ? "active" : ""} type="button" onClick={() => setMultiSelectActive(!multiSelectActive)} title="Multi-select Mode">
            <SelectAllRounded fontSize="small" />
          </button>
          <button className={rippleEnabled ? "active" : ""} type="button" onClick={() => setRippleEnabled(!rippleEnabled)} title="Ripple Mode">
            <SortRounded fontSize="small" />
          </button>
          <button type="button" onClick={deleteLayer}><DeleteRounded fontSize="small" /></button>
          <button type="button" onClick={trimClip}><CropFreeRounded fontSize="small" /></button>
          <button type="button" onClick={() => moveSelectedClip(-2)}><SkipPreviousRounded fontSize="small" /></button>
          <button type="button" onClick={() => moveSelectedClip(2)}><SkipNextRounded fontSize="small" /></button>
          <button type="button" onClick={joinSelectedClip}><LinkRounded fontSize="small" /></button>
          <button type="button"><AutoAwesomeRounded fontSize="small" /></button>
          <button type="button" onClick={duplicateClip}><ContentCopyRounded fontSize="small" /></button>
          <button type="button" onClick={() => void copyPublishedLink()}><SendRounded fontSize="small" /></button>
          <button type="button"><LockRounded fontSize="small" /></button>
          <span />
          <button type="button" onClick={() => setTimelineZoom((value) => Math.max(0.6, value - 0.1))}><RemoveRounded fontSize="small" /></button>
          <input aria-label="Timeline zoom" max="1.8" min="0.6" step="0.1" type="range" value={timelineZoom} onChange={(event) => setTimelineZoom(Number(event.target.value))} />
          <button type="button" onClick={() => setTimelineZoom((value) => Math.min(1.8, value + 0.1))}><ZoomInRounded fontSize="small" /></button>
        </div>

        <section className="studio-reference-timeline" aria-label="Layer timeline">
          <div
            className="studio-timeline-scroll-container"
            ref={timelineScrollContainerRef}
            style={{ scrollBehavior: "smooth" }}
          >
            <div className="studio-layer-list">
              <div className="studio-timeline-header-spacer" style={{ position: "sticky", top: 0, zIndex: 10 }} />
              {timelineLayers.map((layer) => (
                <button className={selectedLayer === layer.id ? "active" : ""} key={layer.id} onClick={() => setSelectedLayerAndClip(layer.id)} type="button">
                  <span
                    className={`studio-track-toggle ${mutedLayers.has(layer.id) ? "active" : ""}`}
                    onClick={(e) => { e.stopPropagation(); toggleMute(layer.id); }}
                    title="Mute Track"
                  >
                    <VolumeOffRounded fontSize="small" />
                  </span>
                  <span
                    className={`studio-track-toggle ${soloedLayers.has(layer.id) ? "active" : ""}`}
                    onClick={(e) => { e.stopPropagation(); toggleSolo(layer.id); }}
                    title="Solo Track"
                  >
                    <HeadsetRounded fontSize="small" />
                  </span>
                  <span>{layer.label}</span>
                  <div
                    className="studio-layer-meter"
                    style={{
                      height: "14px", width: "4px", background: "rgba(255,255,255,0.1)",
                      borderRadius: "1px", overflow: "hidden", marginLeft: "auto",
                      marginRight: "8px", display: "flex", alignItems: "flex-end"
                    }}
                  >
                    <div
                      className="studio-layer-meter-bar"
                      style={{
                        width: "100%",
                        height: `${trackLevels[layer.id] * 100}%`,
                        background: trackLevels[layer.id] > 0.85 ? "#ef4444" : "#10b981",
                        transition: "height 0.08s linear"
                      }}
                    />
                  </div>
                  <em>{timelineClips.filter((clip) => clip.track === layer.id).length}</em>
                </button>
              ))}
            </div>
            <div
              className="studio-timeline-board"
              ref={timelineBoardRef}
              style={{ "--timeline-zoom": timelineZoom, position: "relative" } as CSSProperties}
            >
              <div className="studio-reference-ruler" style={{ position: "sticky", top: 0, zIndex: 5 }}>
                {rulerTicks.map((tick) => <span key={tick}>{tick}</span>)}
              </div>
              <span
                className="studio-reference-playhead"
                style={{
                  left: `${(playhead / projectDuration) * 100}%`,
                  transition: isPlaying ? "left 33ms linear" : "none",
                  zIndex: 2
                }}
              ><i>{formatTimelineTime(playhead)}</i></span>
              {snapPosition !== null && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: `${(snapPosition / projectDuration) * 100}%`,
                    width: "2px",
                    backgroundColor: "#10b981",
                    boxShadow: "0 0 8px #10b981",
                    zIndex: 3,
                    pointerEvents: "none",
                  }}
                />
              )}
              <div className="studio-tracks-content">
                {timelineLayers.map((layer) => (
                  <TimelineRow key={layer.id} layer={layer.id} selected={selectedLayer === layer.id}>
                    {timelineClips.filter((clip) => clip.track === layer.id).map((clip) => (
                      <TimelineClipButton
                        clip={clip}
                        key={clip.id}
                        projectDuration={projectDuration}
                        selected={selectedClipIds.has(clip.id)}
                        onSelect={() => selectClip(clip)}
                        onMouseDown={(e) => handleClipMouseDown(e, clip)}
                        onTrimStartMouseDown={(e) => handleTrimMouseDown(e, clip, "start")}
                        onTrimEndMouseDown={(e) => handleTrimMouseDown(e, clip, "end")}
                        isDragging={draggingId === clip.id}
                        isTrimming={trimmingId === clip.id}
                      />
                    ))}
                  </TimelineRow>
                ))}
              </div>
            </div>
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
            ["Multi-select", <SelectAllRounded key="multi-select" />],
            ["Ripple", <SortRounded key="ripple" />],
            ["Crop", <Crop169Rounded key="crop" />],
            ["Rotate", <RotateRightRounded key="rotate" />],
            ["Join", <LinkRounded key="join" />],
            ["Duplicate", <ContentCopyRounded key="duplicate" />],
            ["Delete", <DeleteRounded key="delete" />],
          ].map(([label, icon]) => (
            <button
              key={label as string}
              onClick={
                label === "Split" ? splitClip
                  : label === "Trim" ? trimClip
                    : label === "Multi-select" ? () => setMultiSelectActive(!multiSelectActive)
                      : label === "Ripple" ? () => setRippleEnabled(!rippleEnabled)
                        : label === "Crop" ? toggleCrop
                          : label === "Rotate" ? rotateClip
                            : label === "Join" ? joinSelectedClip
                              : label === "Duplicate" ? duplicateClip
                                : label === "Delete" ? deleteLayer
                                  : undefined
              }
              className={
                (label === "Ripple" && rippleEnabled) || (label === "Multi-select" && multiSelectActive) ? "active" : ""
              }
              type="button"
            >
              {icon}<span>{label}</span>
            </button>
          ))}
        </div>
      </form>
      {publishStatus ? (
        <p className="studio-floating-status">
          {publishStatus}
          {uploading && (
            <span className="studio-mini-progress" style={{ display: "inline-block", width: "80px", height: "3px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", overflow: "hidden", marginLeft: "12px", verticalAlign: "middle" }}>
              <i style={{ display: "block", height: "100%", width: `${uploadProgress}%`, background: "#ff6848", transition: "width 0.2s", fontStyle: "normal" }} />
            </span>
          )}
          {!uploading && lastFailedFiles && (
            <button
              onClick={() => void uploadFromDevice(lastFailedFiles)}
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "none",
                borderRadius: "4px",
                color: "white",
                cursor: "pointer",
                fontSize: "10px",
                fontWeight: 700,
                marginLeft: "12px",
                padding: "2px 8px",
                textTransform: "uppercase",
                verticalAlign: "middle",
              }}
              type="button"
            >
              Retry
            </button>
          )}
          <button
            onClick={() => setPublishStatus("")}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.6)",
              cursor: "pointer",
              fontSize: "14px",
              marginLeft: "12px",
              padding: "2px",
              display: "inline-flex",
              alignItems: "center",
              verticalAlign: "middle",
            }}
            type="button"
            aria-label="Dismiss status"
          >
            <CloseRounded fontSize="inherit" />
          </button>
        </p>
      ) : null}
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
  active?: boolean; // Used for togglable sections like Crop or Stabilization
  children?: ReactNode;
  onToggle?: () => void;
  title: string;
  toggle?: boolean;
}) {
  return (
    <section className="studio-inspector-section-ref" style={{ transition: 'all 0.3s ease' }}>
      <header style={{ cursor: toggle ? 'pointer' : 'default' }} onClick={toggle ? onToggle : undefined}>
        <strong>{title}</strong>
        {toggle ? (
          <button className={active ? "active" : ""} type="button" style={{ pointerEvents: 'none' }} />
        ) : (
          <IconButton size="small" style={{ padding: 0 }}>
            <KeyboardArrowDownRounded fontSize="small" />
          </IconButton>
        )}
      </header>
      <div className="inspector-content-inner" style={{ opacity: toggle && !active ? 0.4 : 1 }}>
        {children}
      </div>
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

function TimelineClipButton({
  clip,
  isDragging,
  isTrimming,
  onMouseDown,
  onTrimStartMouseDown,
  onTrimEndMouseDown,
  onSelect,
  projectDuration,
  selected,
}: {
  clip: TimelineClip;
  isDragging?: boolean;
  isTrimming?: boolean;
  onTrimStartMouseDown?: (e: React.MouseEvent) => void;
  onTrimEndMouseDown?: (e: React.MouseEvent) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onSelect: () => void;
  projectDuration: number;
  selected: boolean;
}) {
  const width = Math.max(3, (visibleClipDuration(clip) / projectDuration) * 100);
  const left = Math.max(0, (clip.start / projectDuration) * 100);
  const thumbnails = clip.url ? Array.from({ length: clip.type === "video" ? 6 : 1 }, (_, index) => `${clip.id}-${index}`) : [];

  return (
    <button
      className={`timeline-clip ${clip.type} ${selected ? "selected" : ""} ${isDragging ? "dragging" : ""} ${isTrimming ? "trimming" : ""} ${clip.audioEffect ? `audio-effect-${clip.audioEffect}` : ""}`}
      onClick={onSelect}
      onMouseDown={onMouseDown}
      style={{
        left: `${left}%`,
        width: `${width}%`,
        transition: (isDragging || isTrimming) ? "none" : "all 0.15s cubic-bezier(0.2, 0, 0, 1)",
        cursor: (isDragging || isTrimming) ? "grabbing" : "grab",
        opacity: (isDragging || isTrimming) ? 0.8 : 1,
      }}
      type="button"
    >
      <i className="trim start" onMouseDown={onTrimStartMouseDown} />
      {clip.type === "audio" ? <WaveformBars /> : null}
      {clip.type === "video" ? <WaveformBars clipId={clip.id} overlay /> : null}
      {clip.type === "video" || clip.type === "image"
        ? thumbnails.map((key) => <img alt="" key={key} src={clip.thumbnailUrl || clip.url} />)
        : null}
      {clip.type === "text" ? <TextFieldsRounded fontSize="small" /> : null}
      {clip.type === "effect" ? <AutoAwesomeRounded fontSize="small" /> : null}
      <em>{clip.title}</em>
      <small>{clip.format.toUpperCase()} / {formatClock(visibleClipDuration(clip))}</small>
      <i className="trim end" onMouseDown={onTrimEndMouseDown} />
    </button>
  );
}

function WaveformBars({ clipId, large = false, overlay = false }: { clipId?: string; large?: boolean; overlay?: boolean }) {
  const barCount = large ? 64 : (overlay ? 48 : 24);
  const baseHeight = overlay ? 4 : 10;
  const maxHeight = large ? 42 : (overlay ? 20 : 24);
  const seed = clipId ? clipId.split('').reduce((a, b) => a + b.charCodeAt(0), 0) : 0;

  return (
    <span className={`studio-waveform-bars ${large ? "large" : ""} ${overlay ? "overlay" : ""}`} aria-hidden="true">
      {Array.from({ length: barCount }, (_, i) => {
        const peak = (Math.abs(Math.sin(seed + i * 1.3)) * 0.7 + 0.3) * maxHeight;
        return <i key={i} style={{ height: `${baseHeight + peak}px` }} />;
      })}
    </span>
  );
}

function formatTimelineTime(value: number) {
  const totalSeconds = Math.max(0, Math.round(value));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function formatClock(value: number) {
  const totalSeconds = Math.max(0, Math.round(value));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function isVideoUrl(url: string) {
  return /\.(mp4|mov|webm|mkv)(\?|$)/i.test(url);
}

function isAudioUrl(url: string) {
  return /\.(mp3|wav|aac|m4a|flac|ogg)(\?|$)/i.test(url) || url.startsWith("audio:");
}

function isAudioOutputFormat(format: string) {
  return ["mp3", "wav", "aac", "flac"].includes(format);
}

function mediaTypeFromOutputFormat(format: string) {
  if (isAudioOutputFormat(format)) {
    return "audio";
  }
  if (format === "gif") {
    return "image";
  }
  return "video";
}

function inferFormat(source: string, mediaType?: string): MediaFormat {
  const extension = source.split("?")[0].split(".").pop()?.toLowerCase();
  if (extension && ["mp4", "mov", "webm", "mkv", "gif", "mp3", "wav", "aac", "flac", "jpg"].includes(extension)) {
    return extension as MediaFormat;
  }
  if (mediaType?.startsWith("audio")) {
    return "mp3";
  }
  if (mediaType?.startsWith("video")) {
    return "mp4";
  }
  return "jpg";
}

function inferMimeType(source: string, mediaType?: string) {
  if (mediaType?.includes("/")) {
    return mediaType;
  }
  const format = inferFormat(source, mediaType);
  const mimeByFormat: Record<MediaFormat, string> = {
    aac: "audio/aac",
    flac: "audio/flac",
    gif: "image/gif",
    jpg: "image/jpeg",
    mkv: "video/x-matroska",
    mov: "video/quicktime",
    mp3: "audio/mpeg",
    mp4: "video/mp4",
    wav: "audio/wav",
    webm: "video/webm",
  };
  return mimeByFormat[format];
}

function mediaKindFromType(mediaType: string, name = ""): Exclude<MediaKind, "all"> {
  if (mediaType.startsWith("audio") || isAudioUrl(name)) {
    return "audio";
  }
  if (mediaType.startsWith("video") || isVideoUrl(name)) {
    return "video";
  }
  return "image";
}

function mediaAssetFromUpload(file: File, url: string, mediaType: string, duration?: number): MediaAsset {
  const type = mediaKindFromType(file.type || mediaType, file.name);
  const fallbackDuration = type === "audio" ? 90 : type === "video" ? 30 : 6;
  const durationSeconds = Math.max(1, Math.round(duration || fallbackDuration));
  const format = inferFormat(file.name, file.type || mediaType);
  return {
    duration: type === "image" ? "IMG" : formatClock(durationSeconds),
    durationSeconds,
    format,
    mimeType: file.type || inferMimeType(file.name, mediaType),
    title: file.name || `Imported ${type}`,
    type,
    url,
  };
}

function createClipFromAsset(asset: MediaAsset, start: number, id: string): TimelineClip {
  const track = trackForAsset(asset);
  return {
    audioEffect: asset.type === "audio" ? "clean" : undefined,
    format: asset.format,
    gain: asset.type === "audio" ? 72 : undefined,
    id,
    inPoint: 0,
    outPoint: asset.durationSeconds,
    sourceDuration: asset.durationSeconds,
    start,
    thumbnailUrl: asset.type !== "audio" ? asset.url : undefined,
    title: asset.title,
    track,
    type: asset.type === "image" ? "image" : asset.type,
    url: asset.url,
  };
}

function trackForAsset(asset: MediaAsset): TimelineLayer {
  if (asset.type === "audio") {
    return "audio";
  }
  if (asset.type === "image") {
    return "sequence";
  }
  return "video";
}

function visibleClipDuration(clip: TimelineClip) {
  return Math.max(1, clip.outPoint - clip.inPoint);
}

function nextTrackStart(clips: TimelineClip[], track: TimelineLayer) {
  return clips
    .filter((clip) => clip.track === track)
    .reduce((max, clip) => Math.max(max, clip.start + visibleClipDuration(clip) + 1), 0);
}

function isVisualClip(clip: TimelineClip) {
  return clip.type === "video" || clip.type === "image";
}

function layerLabel(layer: TimelineLayer) {
  return timelineLayers.find((item) => item.id === layer)?.label ?? "Timeline";
}

function clamp(value: number, min: number, max: number) {
  if (max < min) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

function readMediaFileMetadata(file: File) {
  return new Promise<{ duration?: number }>((resolve) => {
    if (!file.type.startsWith("video") && !file.type.startsWith("audio")) {
      resolve({});
      return;
    }

    const element = file.type.startsWith("audio") ? document.createElement("audio") : document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    const cleanup = () => URL.revokeObjectURL(objectUrl);
    const finish = () => {
      const duration = Number.isFinite(element.duration) ? element.duration : undefined;
      cleanup();
      resolve({ duration });
    };
    element.preload = "metadata";
    element.onloadedmetadata = finish;
    element.onerror = () => {
      cleanup();
      resolve({});
    };
    element.src = objectUrl;
  });
}

function buildPostLink(postId: number) {
  if (typeof window === "undefined") {
    return `/post/${postId}`;
  }
  return `${window.location.origin}/post/${postId}`;
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
