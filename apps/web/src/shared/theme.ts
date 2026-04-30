import type { ThemeName, ThemeOption } from "./types";

export const THEME_STORAGE_KEY = "creators-theme";

export const themeOptions: ThemeOption[] = [
  {
    id: "default",
    label: "Default",
    caption: "Night sky blue",
    swatches: ["#79a7ff", "#1a2951", "#090f1d"],
  },
  {
    id: "dark",
    label: "Dark",
    caption: "Classic dark mood",
    swatches: ["#ff5b7e", "#1b2230", "#0d111a"],
  },
  {
    id: "beautiful",
    label: "Beautiful",
    caption: "Neon dusk glow",
    swatches: ["#ff8e68", "#ff4d86", "#2d234f"],
  },
  {
    id: "blueish",
    label: "Blueish",
    caption: "Cool electric blue",
    swatches: ["#60c7ff", "#3467ff", "#102347"],
  },
  {
    id: "greenish",
    label: "Greenish",
    caption: "Emerald aurora",
    swatches: ["#65f2c4", "#1fb28f", "#0f2630"],
  },
  {
    id: "whiteish",
    label: "Whiteish",
    caption: "Smoke white",
    swatches: ["#ffffff", "#e5e7eb", "#cdd3dc"],
  },
];

export function isThemeName(value: string | null): value is ThemeName {
  return value === "default" || value === "dark" || value === "beautiful" || value === "blueish" || value === "greenish" || value === "whiteish";
}
