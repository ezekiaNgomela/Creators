import { Text, View } from "react-native";

import { palette, radius, spacing } from "@/src/theme/tokens";

export function StreamChatBubble({
  author,
  body,
  own,
}: {
  author: string;
  body: string;
  own?: boolean;
}) {
  return (
    <View
      style={{
        alignSelf: own ? "flex-end" : "stretch",
        maxWidth: "84%",
        borderRadius: radius.lg,
        backgroundColor: own ? palette.accentStrong : palette.panelRaised,
        padding: spacing.md,
      }}
    >
      <Text style={{ color: own ? palette.black : palette.accent, fontWeight: "800", marginBottom: 4 }}>{author}</Text>
      <Text style={{ color: own ? palette.black : palette.text }}>{body}</Text>
    </View>
  );
}
