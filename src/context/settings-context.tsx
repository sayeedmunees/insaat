import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAudioModeAsync } from "expo-audio";
import { deactivateKeepAwake } from "expo-keep-awake";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type ScreenAwakeMode = "system" | "keep_awake";

export interface SettingsState {
  screenAwakeMode: ScreenAwakeMode;
  backgroundAudioEnabled: boolean;
}

export interface SettingsContextType extends SettingsState {
  setScreenAwakeMode: (mode: ScreenAwakeMode) => Promise<void>;
  setBackgroundAudioEnabled: (enabled: boolean) => Promise<void>;
  isSettingsLoaded: boolean;
}

const SETTINGS_STORAGE_KEY = "@insaat_settings_v1";

const DEFAULT_SETTINGS: SettingsState = {
  screenAwakeMode: "system",
  backgroundAudioEnabled: true,
};

const SettingsContext = createContext<SettingsContextType>({
  ...DEFAULT_SETTINGS,
  setScreenAwakeMode: async () => {},
  setBackgroundAudioEnabled: async () => {},
  isSettingsLoaded: false,
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [screenAwakeMode, setScreenAwakeModeState] = useState<ScreenAwakeMode>(
    DEFAULT_SETTINGS.screenAwakeMode
  );
  const [backgroundAudioEnabled, setBackgroundAudioEnabledState] = useState<boolean>(
    DEFAULT_SETTINGS.backgroundAudioEnabled
  );
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);

  // Load persisted settings on mount
  useEffect(() => {
    let isCancelled = false;

    async function loadSettings() {
      try {
        const json = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
        if (json && !isCancelled) {
          const parsed = JSON.parse(json);
          if (
            parsed.screenAwakeMode === "system" ||
            parsed.screenAwakeMode === "keep_awake"
          ) {
            setScreenAwakeModeState(parsed.screenAwakeMode);
            if (parsed.screenAwakeMode === "system") {
              try {
                await deactivateKeepAwake("INSAAT_READING_TAG");
                await deactivateKeepAwake();
              } catch {}
            }
          }
          if (typeof parsed.backgroundAudioEnabled === "boolean") {
            setBackgroundAudioEnabledState(parsed.backgroundAudioEnabled);
            try {
              await setAudioModeAsync({
                shouldPlayInBackground: parsed.backgroundAudioEnabled,
                playsInSilentMode: true,
              });
            } catch (e) {
              console.warn("Failed to set audio mode on initial load:", e);
            }
          }
        } else if (!isCancelled) {
          try {
            await setAudioModeAsync({
              shouldPlayInBackground: DEFAULT_SETTINGS.backgroundAudioEnabled,
              playsInSilentMode: true,
            });
          } catch (e) {
            console.warn("Failed to set default audio mode on initial load:", e);
          }
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        if (!isCancelled) {
          setIsSettingsLoaded(true);
        }
      }
    }

    void loadSettings();

    return () => {
      isCancelled = true;
    };
  }, []);

  const setScreenAwakeMode = useCallback(async (mode: ScreenAwakeMode) => {
    setScreenAwakeModeState(mode);
    if (mode === "system") {
      try {
        await deactivateKeepAwake("INSAAT_READING_TAG");
        await deactivateKeepAwake();
      } catch (e) {
        console.warn("Failed deactivating keep-awake:", e);
      }
    }
    try {
      const current = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      const parsed = current ? JSON.parse(current) : {};
      await AsyncStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({ ...parsed, screenAwakeMode: mode })
      );
    } catch (err) {
      console.error("Failed to save screen awake mode:", err);
    }
  }, []);

  const setBackgroundAudioEnabled = useCallback(async (enabled: boolean) => {
    setBackgroundAudioEnabledState(enabled);
    try {
      const current = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      const parsed = current ? JSON.parse(current) : {};
      await AsyncStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({ ...parsed, backgroundAudioEnabled: enabled })
      );

      // Apply audio mode to expo-audio immediately
      await setAudioModeAsync({
        shouldPlayInBackground: enabled,
        playsInSilentMode: true,
      });
    } catch (err) {
      console.error("Failed to update background audio setting:", err);
    }
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        screenAwakeMode,
        setScreenAwakeMode,
        backgroundAudioEnabled,
        setBackgroundAudioEnabled,
        isSettingsLoaded,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

