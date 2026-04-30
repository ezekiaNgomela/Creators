import type { ReactNode } from "react";
import ImageRounded from "@mui/icons-material/ImageRounded";
import LayersRounded from "@mui/icons-material/LayersRounded";
import MovieRounded from "@mui/icons-material/MovieRounded";
import SendRounded from "@mui/icons-material/SendRounded";
import TextFieldsRounded from "@mui/icons-material/TextFieldsRounded";
import TuneRounded from "@mui/icons-material/TuneRounded";
import type { StudioDraft, StudioTool } from "./types";

export const studioFilters = [
  { name: "Original", css: "none" },
  { name: "Glow", css: "saturate(1.18) contrast(1.06) brightness(1.06)" },
  { name: "Warm", css: "sepia(0.16) saturate(1.22) contrast(1.04)" },
  { name: "Mono", css: "grayscale(1) contrast(1.12)" },
  { name: "Pop", css: "saturate(1.42) contrast(1.12)" },
];

export const studioStickers = ["LIVE", "DROP", "NEW", "VIP", "Q&A"];
export const studioTextColors = ["#ffffff", "#fff5da", "#d8fff1", "#bfe0ff", "#ffb8cf"];
export const studioTones = [
  { id: "midnight", label: "Midnight" },
  { id: "sunset", label: "Sunset" },
  { id: "emerald", label: "Emerald" },
  { id: "violet", label: "Violet" },
];
export const studioAspectRatios = ["4:5", "1:1", "9:16", "16:9"];
export const studioTools: Array<{ id: StudioTool; label: string; icon: ReactNode }> = [
  { id: "media", label: "Media", icon: <ImageRounded /> },
  { id: "adjust", label: "Adjust", icon: <TuneRounded /> },
  { id: "text", label: "Text", icon: <TextFieldsRounded /> },
  { id: "layers", label: "Layers", icon: <LayersRounded /> },
  { id: "timeline", label: "Timeline", icon: <MovieRounded /> },
  { id: "publish", label: "Publish", icon: <SendRounded /> },
];
export const studioTimelineTicks = ["00:00", "00:03", "00:06", "00:09", "00:12", "00:15"];

export function createStudioDraft(): StudioDraft {
  return {
    body: "",
    mood: "Behind the scenes",
    mediaUrl: "",
    mediaType: "image",
    filterName: studioFilters[0].name,
    overlayText: "New drop",
    sticker: studioStickers[0],
    textColor: studioTextColors[0],
    backgroundTone: studioTones[0].id,
    aspectRatio: studioAspectRatios[0],
    cropZoom: 1,
    cropX: 50,
    cropY: 50,
    rotation: 0,
  };
}
