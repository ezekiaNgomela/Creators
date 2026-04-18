import { ScrollView, Text, View } from "react-native";

type JsonPreviewProps = {
  label: string;
  value: unknown;
};

export function JsonPreview({ label, value }: JsonPreviewProps) {
  return (
    <View
      style={{
        gap: 10,
      }}
    >
      <Text
        selectable
        style={{
          color: "#dbe4ff",
          fontSize: 13,
          fontWeight: "700",
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      <ScrollView
        horizontal
        contentInsetAdjustmentBehavior="automatic"
        style={{
          maxHeight: 240,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: "rgba(148, 163, 184, 0.18)",
          backgroundColor: "rgba(2, 6, 23, 0.8)",
        }}
        contentContainerStyle={{
          padding: 16,
        }}
      >
        <Text
          selectable
          style={{
            color: "#cbd5e1",
            fontFamily: "monospace",
            fontSize: 12,
            lineHeight: 18,
          }}
        >
          {JSON.stringify(value, null, 2)}
        </Text>
      </ScrollView>
    </View>
  );
}
