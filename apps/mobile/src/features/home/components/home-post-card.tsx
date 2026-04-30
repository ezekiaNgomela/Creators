import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { Text, View } from "react-native";

import type { DisplayPost } from "@/src/providers/app-provider";
import { radius, spacing } from "@/src/theme/tokens";

const cardColors = {
  background: "#fff9f4",
  border: "rgba(255, 164, 105, 0.16)",
  ink: "#2f241f",
  soft: "#8e7a6d",
  accent: "#ff8e68",
  accentStrong: "#ff5d6c",
};

export function HomePostCard({ post }: { post: DisplayPost }) {
  return (
    <View
      style={{
        borderRadius: 28,
        borderWidth: 1,
        borderColor: cardColors.border,
        backgroundColor: cardColors.background, // Keep background
        padding: spacing.md,
        gap: spacing.md,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 }}>
          <Image
              source={{ uri: `https://api.dicebear.com/8.x/lorelei/png?seed=${encodeURIComponent(post.author.name)}` }} // Keep image source
              style={{ width: 36, height: 36, borderRadius: radius.pill }} // Smaller avatar
          />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ color: cardColors.ink, fontWeight: "900", fontSize: 15 }}>
              {post.author.name}
            </Text>
            <Text style={{ color: cardColors.soft, fontSize: 12 }}>{relativeTime(post.createdAt)}</Text>
          </View>
        </View>
        <View
          style={{
            borderRadius: radius.pill,
              backgroundColor: "rgba(255, 142, 104, 0.14)", // Keep background
            paddingHorizontal: spacing.sm,
            paddingVertical: 6,
          }}
        >
          <Text style={{ color: cardColors.accentStrong, fontWeight: "900", fontSize: 11 }}>{post.promotionScore}%</Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
        {post.tags.slice(0, 2).map((tag) => (
          <View
            key={tag}
            style={{
              borderRadius: radius.pill,
              backgroundColor: "rgba(255,255,255,0.82)", // Keep background
              paddingHorizontal: spacing.sm,
              paddingVertical: 6,
            }}
          >
            <Text style={{ color: cardColors.soft, fontSize: 11, fontWeight: "800" }}>#{tag}</Text>
          </View>
        ))}
      </View>

      <Text style={{ color: cardColors.ink, fontSize: 14, lineHeight: 20 }}>{post.body}</Text> {/* Smaller font size */}

      <GalleryMosaic post={post} />

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <Stat icon="heart" label={formatCount(post.likes)} />
          <Stat icon="chatbubble-ellipses" label={formatCount(post.comments)} />
        </View>
        <Text style={{ color: cardColors.soft, fontSize: 12, fontWeight: "800" }}>{post.mood}</Text>
      </View>
    </View>
  );
}

function GalleryMosaic({ post }: { post: DisplayPost }) {
  const gallery = post.gallery;
  const images = gallery.slice(0, 4);

  if (!images.length) {
    return (
      <View style={{ minHeight: 180, borderRadius: 24, backgroundColor: "rgba(255, 142, 104, 0.12)", alignItems: "center", justifyContent: "center", padding: spacing.md }}>
        <Text style={{ color: cardColors.soft, fontWeight: "800", textAlign: "center", fontSize: 12 }}>Media will appear here after upload.</Text> {/* Smaller font size */}
      </View>
    );
  }

  if (images.length <= 1) {
    return (
      <View style={{ overflow: "hidden", borderRadius: 24 }}>
        <MediaTile post={post} source={images[0]} style={{ width: "100%", aspectRatio: 1.08 }} primary />
        <CreativeOverlay post={post} /> {/* Keep overlay */}
      </View>
    );
  }

  if (images.length === 2) {
    return (
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        {images.map((image, index) => (
          <MediaTile key={image} post={post} primary={index === 0} source={image} style={{ flex: 1, aspectRatio: 0.86, borderRadius: 22 }} />
        ))} {/* Keep media tiles */}
      </View>
    );
  }

  return (
    <View style={{ flexDirection: "row", gap: spacing.sm }}>
      <View style={{ flex: 1.28, overflow: "hidden", borderRadius: 24 }}>
        <MediaTile post={post} source={images[0]} style={{ width: "100%", aspectRatio: 0.82 }} primary />
        <CreativeOverlay post={post} compact />
      </View> {/* Keep media tiles and overlay */}
      <View style={{ flex: 0.92, gap: spacing.sm }}>
        <MediaTile post={post} source={images[1]} style={{ width: "100%", aspectRatio: 1.1, borderRadius: 20 }} />
        <View style={{ flexDirection: "row", gap: spacing.sm }}> {/* Keep media tiles */}
          <MediaTile post={post} source={images[2]} style={{ flex: 1, aspectRatio: 1, borderRadius: 18 }} />
          {images[3] ? (
            <View style={{ flex: 1 }}>
              <MediaTile post={post} source={images[3]} style={{ width: "100%", aspectRatio: 1, borderRadius: 18 }} />
              {gallery.length > 4 ? (
                <View
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 18,
                    backgroundColor: "rgba(47,36,31,0.34)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 18, fontWeight: "900" }}>+{gallery.length - 4}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function MediaTile({
  post,
  primary,
  source,
  style,
}: {
  post: DisplayPost;
  primary?: boolean;
  source: string;
  style: object;
}) {
  if (primary && post.mediaType === "video") {
    return <VideoTile post={post} source={source} style={style} />;
  }

  return (
    <Image
      contentFit="cover"
      contentPosition={primary ? { left: `${post.cropX ?? 50}%`, top: `${post.cropY ?? 50}%` } : undefined}
      source={{ uri: source }}
      style={[style, primary ? { transform: [{ scale: post.cropZoom || 1 }, { rotate: `${post.rotation || 0}deg` }] } : null]}
    />
  );
}

function VideoTile({ post, source, style }: { post: DisplayPost; source: string; style: object }) {
  const player = useVideoPlayer(source, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
    videoPlayer.play();
  });

  return (
    <VideoView
      contentFit="cover"
      nativeControls={false}
      player={player}
      style={[style, { overflow: "hidden", transform: [{ scale: post.cropZoom || 1 }, { rotate: `${post.rotation || 0}deg` }] }]}
    />
  );
}

function CreativeOverlay({ compact, post }: { compact?: boolean; post: DisplayPost }) {
  if (!post.overlayText && !post.sticker) {
    return null;
  }

  return (
    <View style={{ position: "absolute", left: 8, right: 8, bottom: 8, gap: 5 }}>
      {post.sticker ? (
        <View style={{ alignSelf: "flex-start", borderRadius: radius.pill, backgroundColor: "rgba(0,0,0,0.42)", paddingHorizontal: 8, paddingVertical: 4 }}>
          <Text style={{ color: "#fff", fontSize: compact ? 9 : 10, fontWeight: "900" }}>{post.sticker}</Text>
        </View>
      ) : null}
      {post.overlayText ? (
        <Text style={{ alignSelf: "flex-start", borderRadius: 14, backgroundColor: toneColor(post.backgroundTone), color: post.textColor || "#fff", fontSize: compact ? 16 : 22, fontWeight: "900", lineHeight: compact ? 17 : 22, paddingHorizontal: 8, paddingVertical: 6 }} numberOfLines={compact ? 2 : 3}>
          {post.overlayText}
        </Text>
      ) : null}
    </View>
  );
}

function toneColor(tone: string) {
  if (tone === "sunset") {
    return "rgba(255, 142, 104, 0.36)";
  }
  if (tone === "emerald") {
    return "rgba(46, 213, 115, 0.3)";
  }
  if (tone === "violet") {
    return "rgba(139, 92, 246, 0.32)";
  }
  return "rgba(6, 12, 26, 0.42)";
}

function Stat({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Ionicons color={cardColors.accentStrong} name={icon} size={16} />
      <Text style={{ color: cardColors.ink, fontWeight: "800", fontSize: 13 }}>{label}</Text>
    </View>
  );
}

function formatCount(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  }
  return `${value}`;
}

function relativeTime(value: string) {
  const then = new Date(value).getTime();
  const diffHours = Math.max(1, Math.round((Date.now() - then) / (1000 * 60 * 60)));
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}
