import { ReactNode } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider as PaperProvider } from "react-native-paper";
import { appTheme } from "@/lib/theme";
import { SessionProvider } from "@/providers/session-provider";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={appTheme}>
        <SessionProvider>{children}</SessionProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
