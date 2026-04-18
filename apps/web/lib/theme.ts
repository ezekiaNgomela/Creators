import { MD3DarkTheme, type MD3Theme } from "react-native-paper";

export const appTheme: MD3Theme = {
  ...MD3DarkTheme,
  roundness: 6,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#f59e0b",
    secondary: "#38bdf8",
    tertiary: "#fb7185",
    background: "#050816",
    surface: "#0f172a",
    surfaceVariant: "#111f3b",
    onSurface: "#f8fafc",
    onSurfaceVariant: "#cbd5e1",
    outline: "rgba(148, 163, 184, 0.25)",
  },
};
