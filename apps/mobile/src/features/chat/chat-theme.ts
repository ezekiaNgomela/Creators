export const chatPalette = {
  page: "#09111d",
  shell: "#0f1828",
  shellRaised: "#152237",
  panel: "#19273d",
  panelSoft: "rgba(21, 34, 55, 0.72)",
  border: "rgba(147, 164, 189, 0.16)",
  ink: "#f7fbff",
  soft: "#97a9c2",
  accent: "#6de9b7",
  accentStrong: "#2fd58f",
  accentAlt: "#7ca8ff",
  accentWarm: "#ff976c",
  accentHot: "#ff5f89",
  danger: "#ff6f7d",
  glow: "rgba(109, 233, 183, 0.16)",
  spotlight: "rgba(124, 168, 255, 0.14)",
  black: "#05070c",
};

export function chatAvatar(seed: string) {
  return {
    uri: `https://api.dicebear.com/8.x/lorelei/png?seed=${encodeURIComponent(seed)}`,
  };
}

export function firstName(value: string) {
  return value.split(/\s+/)[0] ?? value;
}

export function shortTime(value: string) {
  const then = new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.round((Date.now() - then) / (1000 * 60)));
  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h`;
  }
  return `${Math.round(diffHours / 24)}d`;
}

export function presenceLabel(value?: string) {
  if (!value) {
    return "Connect now";
  }

  const then = new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.round((Date.now() - then) / (1000 * 60)));

  if (diffMinutes < 6) {
    return "Online now";
  }
  if (diffMinutes < 60) {
    return `Active ${diffMinutes}m ago`;
  }
  if (diffMinutes < 60 * 24) {
    return "Active earlier today";
  }
  return `Last seen ${Math.round(diffMinutes / (60 * 24))}d ago`;
}

export function presenceStatus(value?: string): "online" | "away" | "offline" {
  if (!value) return "offline";

  const then = new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.round((Date.now() - then) / (1000 * 60)));

  if (diffMinutes < 6) return "online";
  if (diffMinutes < 60 * 2) return "away";
  return "offline";
}

export function previewBadge(seed: string) {
  const code = seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return (code % 8) + 1;
}
