import { Text, View } from "react-native";

import { chatPalette } from "@/src/features/chat/chat-theme";
import { spacing } from "@/src/theme/tokens";

export function ChatMessageBubble({
  author,
  body,
  own,
  timeLabel,
}: {
  author: string;
  body: string;
  own?: boolean;
  timeLabel: string;
}) {
  return (
    <View
      style={{
        alignSelf: own ? "flex-end" : "stretch",
        maxWidth: "86%",
        borderRadius: 24,
        backgroundColor: own ? chatPalette.accent : chatPalette.panel,
        padding: spacing.md,
        gap: 4,
      }}
    >
      <Text
        style={{
          color: own ? chatPalette.black : chatPalette.accentAlt,
          fontSize: 12,
          fontWeight: "900" as const,
        }}
      >
        {author}
      </Text>
      <Text style={{ color: own ? chatPalette.black : chatPalette.ink, fontSize: 14, lineHeight: 20 }}>{body}</Text>
      <Text
        style={{
          alignSelf: "flex-end",
          color: own ? "rgba(5,7,12,0.74)" : chatPalette.soft,
          fontSize: 10,
          fontWeight: "800" as const,
        }}
      >
        {timeLabel}
      </Text>
    </View>
  );
}
