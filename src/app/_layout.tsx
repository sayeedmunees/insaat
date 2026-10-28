import "../../global.css";

import { NavigationBar } from "expo-navigation-bar";
import { useEffect } from "react";
import { Platform } from "react-native";

import { DarkTheme, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";
import { Colors } from "@/constants/theme";
import { SettingsProvider } from "@/context/settings-context";

SplashScreen.preventAutoHideAsync();

const InsaatTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.dark.accent,
    background: Colors.dark.background,
    card: Colors.dark.background,
    text: Colors.dark.text,
    border: Colors.dark.backgroundElement,
    notification: Colors.dark.accent,
  },
};

export default function TabLayout() {
  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setStyle("light");
    }
  }, []);

  return (
    <ThemeProvider value={InsaatTheme}>
      <SettingsProvider>
        <AnimatedSplashOverlay />
        <AppTabs />
      </SettingsProvider>
    </ThemeProvider>
  );
}
