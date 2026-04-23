import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
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
        backgroundColor: cardColors.background,
        padding: spacing.md,
        gap: spacing.md,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 }}>
          <Image
            source={{ uri: `https://api.dicebear.com/8.x/lorelei/png?seed=${encodeURIComponent(post.author.name)}` }}
            style={{ width: 42, height: 42, borderRadius: radius.pill }}
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
            backgroundColor: "rgba(255, 142, 104, 0.14)",
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
              backgroundColor: "rgba(255,255,255,0.82)",
              paddingHorizontal: spacing.sm,
              paddingVertical: 6,
            }}
          >
            <Text style={{ color: cardColors.soft, fontSize: 11, fontWeight: "800" }}>#{tag}</Text>
          </View>
        ))}
      </View>

      <Text style={{ color: cardColors.ink, fontSize: 15, lineHeight: 22 }}>{post.body}</Text>

      <GalleryMosaic gallery={post.gallery} />

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

function GalleryMosaic({ gallery }: { gallery: string[] }) {
  const images = gallery.slice(0, 4);

  if (images.length <= 1) {
    return (
      <Image
        source={{ uri: images[0] }}
        style={{ width: "100%", aspectRatio: 1.08, borderRadius: 24 }}
      />
    );
  }

  if (images.length === 2) {
    return (
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        {images.map((image) => (
          <Image key={image} source={{ uri: image }} style={{ flex: 1, aspectRatio: 0.86, borderRadius: 22 }} />
        ))}
      </View>
    );
  }

  return (
    <View style={{ flexDirection: "row", gap: spacing.sm }}>
      <Image source={{ uri: images[0] }} style={{ flex: 1.28, aspectRatio: 0.82, borderRadius: 24 }} />
      <View style={{ flex: 0.92, gap: spacing.sm }}>
        <Image source={{ uri: images[1] }} style={{ width: "100%", aspectRatio: 1.1, borderRadius: 20 }} />
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Image source={{ uri: images[2] }} style={{ flex: 1, aspectRatio: 1, borderRadius: 18 }} />
          {images[3] ? (
            <View style={{ flex: 1 }}>
              <Image source={{ uri: images[3] }} style={{ width: "100%", aspectRatio: 1, borderRadius: 18 }} />
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
