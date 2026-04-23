import { Ionicons } from "@expo/vector-icons";

import { palette } from "@/src/theme/tokens";

export function TabIcon({
  color,
  name,
}: {
  color: string;
  name: keyof typeof Ionicons.glyphMap;
}) {
  return <Ionicons color={color || palette.textMuted} name={name} size={22} />;
}
