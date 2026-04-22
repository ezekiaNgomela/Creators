import { useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { fetchHealth, type HealthResponse } from "./api";

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetchHealth();
      setHealth(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: "#f4f7fb" }}
      contentContainerStyle={{
        minHeight: "100%",
        padding: 24,
        gap: 18,
      }}
    >
      <StatusBar style="dark" />
      <View
        style={{
          gap: 16,
          padding: 24,
          borderRadius: 24,
          backgroundColor: "#101828",
          boxShadow: "0 18px 48px rgba(16, 24, 40, 0.24)",
        }}
      >
        <Text selectable style={{ color: "#9cc7ff", fontSize: 13, fontWeight: "700", letterSpacing: 0 }}>
          Creators
        </Text>
        <Text selectable style={{ color: "white", fontSize: 34, lineHeight: 40, fontWeight: "800", letterSpacing: 0 }}>
          Local creator stack
        </Text>
        <Text selectable style={{ color: "#d9e2ef", fontSize: 16, lineHeight: 24, maxWidth: 720 }}>
          Expo, Go, Postgres, Redis, and MinIO are running from this machine with the same development ports.
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          <Pressable
            onPress={() => void load()}
            disabled={loading}
            style={{
              minHeight: 46,
              paddingHorizontal: 18,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: loading ? "#7a8699" : "#2dd4bf",
            }}
          >
            <Text style={{ color: "#062822", fontWeight: "800", fontSize: 15 }}>
              {loading ? "Checking..." : "Refresh health"}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 18 }}>
        <Panel title="Project flow">
          <FlowStep number="1" label="Local services" detail="Postgres, Redis, MinIO" />
          <FlowStep number="2" label="Backend entry" detail="apps/api/main.go" />
          <FlowStep number="3" label="Expo frontend" detail="apps/web/src/App.tsx" />
        </Panel>

        <Panel title="Service status">
          {error ? (
            <Text selectable style={{ color: "#b42318", fontSize: 15, lineHeight: 22 }}>
              {error}
            </Text>
          ) : null}
          {health ? (
            <View style={{ gap: 10 }}>
              <StatusRow label="overall" value={health.status} />
              <StatusRow label="postgres" value={health.checks.postgres} />
              <StatusRow label="redis" value={health.checks.redis} />
              <StatusRow label="minio" value={health.checks.minio} />
            </View>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              {loading ? <ActivityIndicator /> : null}
              <Text selectable style={{ color: "#475467", fontSize: 15 }}>
                {loading ? "Checking services..." : "No response yet."}
              </Text>
            </View>
          )}
        </Panel>
      </View>
    </ScrollView>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View
      style={{
        flexGrow: 1,
        flexBasis: 320,
        gap: 16,
        padding: 20,
        borderRadius: 18,
        backgroundColor: "white",
        boxShadow: "0 8px 26px rgba(16, 24, 40, 0.08)",
      }}
    >
      <Text selectable style={{ color: "#101828", fontSize: 19, fontWeight: "800", letterSpacing: 0 }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function FlowStep({ number, label, detail }: { number: string; label: string; detail: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#e6f4ff",
        }}
      >
        <Text style={{ color: "#175cd3", fontWeight: "800", fontVariant: ["tabular-nums"] }}>
          {number}
        </Text>
      </View>
      <View style={{ gap: 3 }}>
        <Text selectable style={{ color: "#101828", fontSize: 15, fontWeight: "800" }}>
          {label}
        </Text>
        <Text selectable style={{ color: "#667085", fontSize: 14 }}>
          {detail}
        </Text>
      </View>
    </View>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  const up = value === "up" || value === "ok";
  return (
    <View
      style={{
        minHeight: 42,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: "#f8fafc",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 14,
      }}
    >
      <Text selectable style={{ color: "#475467", fontSize: 15 }}>
        {label}
      </Text>
      <Text
        selectable
        style={{
          color: up ? "#047857" : "#b42318",
          fontSize: 15,
          fontWeight: "800",
          fontVariant: ["tabular-nums"],
        }}
      >
        {value}
      </Text>
    </View>
  );
}
