import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  AppState,
  type AppStateStatus,
  Image,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import Pdf from "react-native-pdf";
import { SafeAreaView } from "react-native-safe-area-context";

import AudioLines from "lucide-react-native/icons/audio-lines";
import Check from "lucide-react-native/icons/check";
import FileText from "lucide-react-native/icons/file-text";
import Gauge from "lucide-react-native/icons/gauge";
import Pause from "lucide-react-native/icons/pause";
import Play from "lucide-react-native/icons/play";
import Plus from "lucide-react-native/icons/plus";
import RotateCcw from "lucide-react-native/icons/rotate-ccw";
import RotateCw from "lucide-react-native/icons/rotate-cw";
import SkipBack from "lucide-react-native/icons/skip-back";
import SkipForward from "lucide-react-native/icons/skip-forward";
import X from "lucide-react-native/icons/x";

import { useSettings } from "@/context/settings-context";

type AudioFile = {
  name: string;
  uri: string;
};

const PLAYBACK_SPEEDS = [
  { value: 0.5, label: "0.5X" },
  { value: 0.75, label: "0.75X" },
  { value: 1.0, label: "1.0X" },
  { value: 1.25, label: "1.25X" },
  { value: 1.5, label: "1.5X" },
  { value: 1.75, label: "1.75X" },
  { value: 2.0, label: "2.0X" },
] as const;

type PlaybackSpeedValue = (typeof PLAYBACK_SPEEDS)[number]["value"];

const SESSION_STORAGE_KEY = "@insaat_session_state_v1";

type InsaatSessionData = {
  version: 1;
  pdf: {
    uri: string;
    name: string;
  } | null;
  audioPlaylist: AudioFile[];
  trackIndex: number;
  playbackPosition: number;
  playbackSpeed: PlaybackSpeedValue;
};

const PDF_DIR = `${FileSystem.documentDirectory}pdfs/`;
const AUDIO_DIR = `${FileSystem.documentDirectory}audio/`;

async function ensureDirExists(dirUri: string) {
  const dirInfo = await FileSystem.getInfoAsync(dirUri);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dirUri, { intermediates: true });
  }
}

async function persistFile(
  sourceUri: string,
  originalName: string,
  type: "pdf" | "audio",
): Promise<AudioFile> {
  const targetDir = type === "pdf" ? PDF_DIR : AUDIO_DIR;
  await ensureDirExists(targetDir);

  const safeBaseName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${safeBaseName}`;
  const destUri = `${targetDir}${uniqueName}`;

  await FileSystem.copyAsync({
    from: sourceUri,
    to: destUri,
  });

  const check = await FileSystem.getInfoAsync(destUri);
  if (!check.exists) {
    throw new Error(`File copy failed for ${originalName}`);
  }

  return {
    name: originalName,
    uri: destUri,
  };
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export default function HomeScreen() {
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [trackIndex, setTrackIndex] = useState(0);

  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeedValue>(1.0);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);

  const [progressWidth, setProgressWidth] = useState(0);

  const [pdfControlsVisible, setPdfControlsVisible] = useState(false);
  const toolbarOpacity = useRef(new Animated.Value(0)).current;
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStart = useRef({ x: 0, y: 0, time: 0 });

  const previousDidJustFinishRef = useRef(false);
  const isRestoredRef = useRef(false);

  const { screenAwakeMode, backgroundAudioEnabled } = useSettings();
  const backgroundAudioEnabledRef = useRef(backgroundAudioEnabled);
  backgroundAudioEnabledRef.current = backgroundAudioEnabled;

  // Keep screen awake while reading/listening on Home screen when enabled
  useFocusEffect(
    useCallback(() => {
      if (screenAwakeMode === "keep_awake") {
        void activateKeepAwakeAsync("INSAAT_READING_TAG");
      } else {
        void deactivateKeepAwake("INSAAT_READING_TAG");
        void deactivateKeepAwake();
      }

      return () => {
        void deactivateKeepAwake("INSAAT_READING_TAG");
        void deactivateKeepAwake();
      };
    }, [screenAwakeMode]),
  );

  // Single stable audio player instance that lives through the session
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);

  const currentTrack = audioFiles[trackIndex] ?? null;

  // Sync lock-screen and notification controls when background audio is enabled
  useEffect(() => {
    if (!player) return;
    if (backgroundAudioEnabled && currentTrack) {
      try {
        player.setActiveForLockScreen(
          true,
          {
            title: currentTrack.name,
            artist: "Insaat",
            albumTitle: "Insaat Lessons",
          },
          {
            showSeekForward: true,
            showSeekBackward: true,
          },
        );
      } catch (e) {
        console.warn("Failed to set lock screen controls:", e);
      }
    } else {
      try {
        player.clearLockScreenControls();
      } catch (e) {
        console.warn("Failed to clear lock screen controls:", e);
      }
    }
  }, [backgroundAudioEnabled, currentTrack?.name, player]);

  // Track latest state in refs for session persistence without stale closures
  const pdfUriRef = useRef(pdfUri);
  const pdfNameRef = useRef(pdfName);
  const audioFilesRef = useRef(audioFiles);
  const trackIndexRef = useRef(trackIndex);
  const playbackSpeedRef = useRef(playbackSpeed);
  const playbackPositionRef = useRef(status.currentTime);

  pdfUriRef.current = pdfUri;
  pdfNameRef.current = pdfName;
  audioFilesRef.current = audioFiles;
  trackIndexRef.current = trackIndex;
  playbackSpeedRef.current = playbackSpeed;
  playbackPositionRef.current = status.currentTime;

  const applyPlaybackSpeed = useCallback(
    (speed: number) => {
      if (!player) return;
      try {
        if (typeof player.setPlaybackRate === "function") {
          player.setPlaybackRate(speed);
        } else {
          player.playbackRate = speed;
        }
      } catch (e) {
        console.warn("Error setting playback rate:", e);
      }
    },
    [player],
  );

  function handleSelectSpeed(speed: number) {
    if (!Number.isFinite(speed) || speed <= 0) return;
    const validOption = PLAYBACK_SPEEDS.find((s) => s.value === speed);
    const targetSpeed = validOption ? validOption.value : 1.0;

    setPlaybackSpeed(targetSpeed);
    applyPlaybackSpeed(targetSpeed);
    setIsSpeedMenuOpen(false);
  }

  // Switch track handler - updates source on the single player instance without recreating it
  const switchTrack = useCallback(
    async (targetIndex: number, shouldPlay: boolean = true) => {
      const files = audioFilesRef.current;
      if (targetIndex < 0 || targetIndex >= files.length) return;
      const targetTrack = files[targetIndex];
      if (!targetTrack || !player) return;

      setTrackIndex(targetIndex);

      try {
        player.replace({ uri: targetTrack.uri });
        try {
          await player.seekTo(0);
        } catch {}
        applyPlaybackSpeed(playbackSpeedRef.current);
        if (backgroundAudioEnabledRef.current) {
          try {
            player.updateLockScreenMetadata({
              title: targetTrack.name,
              artist: "Insaat",
              albumTitle: "Insaat Lessons",
            });
          } catch {}
        }
        if (shouldPlay) {
          player.play();
        }
      } catch (err) {
        console.error("Error switching track:", err);
      }
    },
    [player, applyPlaybackSpeed],
  );

  const hasAudio = audioFiles.length > 0;
  const canGoPrevious = hasAudio && trackIndex > 0;
  const canGoNext = hasAudio && trackIndex < audioFiles.length - 1;

  function handlePreviousTrack() {
    if (!canGoPrevious) return;
    void switchTrack(trackIndex - 1, true);
  }

  function handleNextTrack() {
    if (!canGoNext) return;
    void switchTrack(trackIndex + 1, true);
  }

  // Automatic next-track advancement when audio finishes
  useEffect(() => {
    if (status.didJustFinish && !previousDidJustFinishRef.current) {
      if (trackIndex < audioFiles.length - 1) {
        void switchTrack(trackIndex + 1, true);
      }
    }
    previousDidJustFinishRef.current = Boolean(status.didJustFinish);
  }, [status.didJustFinish, trackIndex, audioFiles.length, switchTrack]);

  // Session saving function
  const saveSessionImmediate = useCallback(async () => {
    if (!isRestoredRef.current) return;
    try {
      const session: InsaatSessionData = {
        version: 1,
        pdf: pdfUriRef.current
          ? {
              uri: pdfUriRef.current,
              name: pdfNameRef.current ?? "Document.pdf",
            }
          : null,
        audioPlaylist: audioFilesRef.current,
        trackIndex: trackIndexRef.current,
        playbackPosition: playbackPositionRef.current,
        playbackSpeed: playbackSpeedRef.current,
      };
      await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch (err) {
      console.error("Failed to save session:", err);
    }
  }, []);

  // Save session when PDF, audio files, track index, or speed change
  useEffect(() => {
    if (isRestoredRef.current) {
      void saveSessionImmediate();
    }
  }, [
    pdfUri,
    pdfName,
    audioFiles,
    trackIndex,
    playbackSpeed,
    saveSessionImmediate,
  ]);

  // Save session immediately when playback pauses
  useEffect(() => {
    if (isRestoredRef.current && !status.playing) {
      void saveSessionImmediate();
    }
  }, [status.playing, saveSessionImmediate]);

  // Throttled position save while playing (every 3 seconds)
  const lastSavedTimeRef = useRef(0);
  useEffect(() => {
    if (!isRestoredRef.current || !status.playing) return;
    const now = Date.now();
    if (now - lastSavedTimeRef.current >= 3000) {
      lastSavedTimeRef.current = now;
      void saveSessionImmediate();
    }
  }, [status.currentTime, status.playing, saveSessionImmediate]);

  // Save session immediately when app goes to background or becomes inactive
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "background" || nextState === "inactive") {
          void deactivateKeepAwake("INSAAT_READING_TAG");
          void deactivateKeepAwake();
          void saveSessionImmediate();

          // When Background Audio is OFF: pause playback so it does not continue in background
          if (!backgroundAudioEnabledRef.current) {
            if (player && status.playing) {
              player.pause();
            }
          }
        }
      },
    );
    return () => {
      subscription.remove();
    };
  }, [player, status.playing, saveSessionImmediate]);

  // Restore session once on mount
  useEffect(() => {
    let isCancelled = false;

    async function restoreSession() {
      try {
        const json = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
        if (isCancelled) return;
        if (!json) {
          isRestoredRef.current = true;
          return;
        }

        const session: InsaatSessionData = JSON.parse(json);

        // 1. Restore PDF
        if (session.pdf?.uri) {
          try {
            const pdfInfo = await FileSystem.getInfoAsync(session.pdf.uri);
            if (pdfInfo.exists && !isCancelled) {
              setPdfUri(session.pdf.uri);
              setPdfName(session.pdf.name);
            }
          } catch (e) {
            console.warn("Failed checking restored PDF:", e);
          }
        }

        // 2. Restore playback speed
        if (session.playbackSpeed) {
          const validSpeed = PLAYBACK_SPEEDS.find(
            (s) => s.value === session.playbackSpeed,
          );
          if (validSpeed) {
            setPlaybackSpeed(validSpeed.value);
            applyPlaybackSpeed(validSpeed.value);
          }
        }

        // 3. Restore Audio Playlist
        if (
          Array.isArray(session.audioPlaylist) &&
          session.audioPlaylist.length > 0
        ) {
          const validTracks: AudioFile[] = [];
          for (const track of session.audioPlaylist) {
            try {
              const trackInfo = await FileSystem.getInfoAsync(track.uri);
              if (trackInfo.exists) {
                validTracks.push(track);
              }
            } catch {
              // file missing or removed
            }
          }

          if (validTracks.length > 0 && !isCancelled) {
            const clampedIndex = Math.max(
              0,
              Math.min(session.trackIndex ?? 0, validTracks.length - 1),
            );
            setAudioFiles(validTracks);
            setTrackIndex(clampedIndex);

            const trackToLoad = validTracks[clampedIndex];
            if (trackToLoad && player) {
              try {
                player.replace({ uri: trackToLoad.uri });
                const pos =
                  typeof session.playbackPosition === "number" &&
                  session.playbackPosition > 0
                    ? session.playbackPosition
                    : 0;
                if (pos > 0) {
                  await player.seekTo(pos);
                }
                const speed = session.playbackSpeed ?? 1.0;
                applyPlaybackSpeed(speed);
                // Keep player paused on restore
              } catch (e) {
                console.warn("Failed loading restored audio into player:", e);
              }
            }
          }
        }
      } catch (err) {
        console.error("Error restoring session:", err);
      } finally {
        if (!isCancelled) {
          isRestoredRef.current = true;
        }
      }
    }

    void restoreSession();

    return () => {
      isCancelled = true;
    };
  }, [player, applyPlaybackSpeed]);

  async function choosePdf() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedPdf = result.assets[0];
        try {
          const persisted = await persistFile(
            selectedPdf.uri,
            selectedPdf.name,
            "pdf",
          );
          setPdfName(persisted.name);
          setPdfUri(persisted.uri);
        } catch (copyErr) {
          console.warn("Could not copy PDF, fallback to picker URI:", copyErr);
          setPdfName(selectedPdf.name);
          setPdfUri(selectedPdf.uri);
        }
      }
    } catch {
      Alert.alert(
        "Unable to open PDF",
        "Please try selecting the document again.",
      );
    }
  }

  async function chooseAudio() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["audio/*"],
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const persistedTracks: AudioFile[] = [];
        for (const asset of result.assets) {
          try {
            const persisted = await persistFile(asset.uri, asset.name, "audio");
            persistedTracks.push(persisted);
          } catch (e) {
            console.warn("Could not persist track, using picker URI:", e);
            persistedTracks.push({ name: asset.name, uri: asset.uri });
          }
        }

        if (persistedTracks.length === 0) return;

        if (persistedTracks.length > 1) {
          // Multiple files selected: replace current playlist with the new list
          setAudioFiles(persistedTracks);
          setTrackIndex(0);
          try {
            player.replace({ uri: persistedTracks[0].uri });
            await player.seekTo(0);
            applyPlaybackSpeed(playbackSpeed);
          } catch (e) {
            console.error("Error loading first track:", e);
          }
        } else {
          // Single file selected: append to existing playlist or start new if empty
          const singleTrack = persistedTracks[0];
          setAudioFiles((prevFiles) => {
            if (prevFiles.length === 0) {
              setTrackIndex(0);
              try {
                player.replace({ uri: singleTrack.uri });
                void player.seekTo(0);
                applyPlaybackSpeed(playbackSpeed);
              } catch (e) {
                console.error("Error loading single track:", e);
              }
              return [singleTrack];
            } else {
              const alreadyExists = prevFiles.some(
                (f) => f.name === singleTrack.name && f.uri === singleTrack.uri,
              );
              if (alreadyExists) return prevFiles;
              return [...prevFiles, singleTrack];
            }
          });
        }
      }
    } catch {
      Alert.alert(
        "Unable to select audio",
        "Please try selecting your audio files again.",
      );
    }
  }

  function clearPlaylist() {
    try {
      player.pause();
      player.clearLockScreenControls();
    } catch {}
    setAudioFiles([]);
    setTrackIndex(0);
  }

  async function togglePlayback() {
    if (!currentTrack) {
      Alert.alert(
        "No audio selected",
        "Choose an audio lesson from your Library first.",
      );
      return;
    }

    try {
      if (status.playing) {
        player.pause();
      } else {
        if (status.duration > 0 && status.currentTime >= status.duration) {
          await player.seekTo(0);
        }
        applyPlaybackSpeed(playbackSpeed);
        player.play();
      }
    } catch {
      Alert.alert("Playback error", "Unable to play this audio file.");
    }
  }

  async function skipSeconds(seconds: number) {
    if (!currentTrack || status.duration <= 0) return;

    const target = Math.max(
      0,
      Math.min(status.currentTime + seconds, status.duration),
    );

    await player.seekTo(target);
  }

  const progress =
    status.duration > 0 ? Math.min(status.currentTime / status.duration, 1) : 0;

  function clearHideControlsTimer() {
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
      hideControlsTimer.current = null;
    }
  }

  function hidePdfControls() {
    clearHideControlsTimer();

    Animated.timing(toolbarOpacity, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setPdfControlsVisible(false);
    });
  }

  function showPdfControls() {
    clearHideControlsTimer();
    setPdfControlsVisible(true);

    Animated.timing(toolbarOpacity, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();

    hideControlsTimer.current = setTimeout(() => {
      hidePdfControls();
    }, 10_000);
  }

  function togglePdfControls() {
    if (pdfControlsVisible) {
      hidePdfControls();
    } else {
      showPdfControls();
    }
  }

  function closePdf() {
    clearHideControlsTimer();
    toolbarOpacity.setValue(0);
    setPdfControlsVisible(false);
    setPdfUri(null);
    setPdfName(null);
  }

  useEffect(() => {
    return () => {
      clearHideControlsTimer();
    };
  }, []);

  const currentSpeedLabel =
    PLAYBACK_SPEEDS.find((s) => s.value === playbackSpeed)?.label ??
    `${playbackSpeed}×`;

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      className="flex-1 bg-insaat-background"
    >
      <StatusBar style="light" />

      <View className="flex-1 px-5 pt-3 pb-1">
        {/* App header */}
        <View className="mb-3.5 flex-row items-center gap-2">
          <View className="h-11 w-11 overflow-hidden rounded-2xl border border-white/0">
            <Image
              source={require("@/assets/images/splash-icon.png")}
              className="h-full w-full"
              resizeMode="cover"
            />
          </View>

          <View>
            <Text className="text-2xl font-bold tracking-wide text-insaat-text">
              Insaat
            </Text>
            <Text className="text-xs text-insaat-muted">
              Listen deeply. Follow along.
            </Text>
          </View>
        </View>

        {/* PDF reading area */}
        <View className="min-h-0 flex-1 overflow-hidden rounded-3xl border border-white/10 bg-insaat-surface">
          {pdfUri ? (
            <View
              className="flex-1"
              onTouchStart={(event) => {
                touchStart.current = {
                  x: event.nativeEvent.pageX,
                  y: event.nativeEvent.pageY,
                  time: Date.now(),
                };
              }}
              onTouchEnd={(event) => {
                const dx = Math.abs(
                  event.nativeEvent.pageX - touchStart.current.x,
                );
                const dy = Math.abs(
                  event.nativeEvent.pageY - touchStart.current.y,
                );
                const elapsed = Date.now() - touchStart.current.time;

                // Only treat a short, stationary touch as a tap.
                // Scrolling and swiping through PDF pages won't toggle the toolbar.
                if (dx < 10 && dy < 10 && elapsed < 350) {
                  togglePdfControls();
                }
              }}
            >
              <Pdf
                source={{ uri: pdfUri }}
                style={{ flex: 1, width: "100%", height: "100%" }}
                trustAllCerts={false}
                onError={(error) => {
                  console.error("PDF loading error:", error);
                  Alert.alert(
                    "Unable to open PDF",
                    "This document could not be displayed. Please try another PDF.",
                  );
                }}
              />

              {pdfControlsVisible && (
                <Animated.View
                  pointerEvents="box-none"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    paddingHorizontal: 12,
                    paddingTop: 12,
                    opacity: toolbarOpacity,
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 10,
                  }}
                >
                  <View
                    pointerEvents="none"
                    className="flex-1 rounded-full bg-insaat-background/70 px-3 py-2"
                    style={{ minWidth: 0 }}
                  >
                    <Text
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      className="text-sm font-semibold text-insaat-text"
                    >
                      {pdfName ?? "PDF document"}
                    </Text>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close PDF"
                    onPress={closePdf}
                    className="h-9 w-9 items-center justify-center rounded-full bg-insaat-background/70"
                  >
                    <X size={16} color="#F4F1E8" strokeWidth={1.8} />
                  </Pressable>
                </Animated.View>
              )}
            </View>
          ) : (
            <View className="flex-1 items-center justify-center px-6">
              <View className="mb-5 h-16 w-16 items-center justify-center rounded-2xl border border-insaat-accent/30 bg-insaat-background">
                <FileText size={30} color="#E6D4A8" strokeWidth={1.6} />
              </View>

              <Text className="text-center text-lg font-semibold text-insaat-text">
                Your document goes here
              </Text>

              <Text className="mt-2 max-w-xs text-center text-sm leading-6 text-insaat-muted">
                Open a PDF to read along while listening to your lesson.
              </Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose a PDF document"
                onPress={choosePdf}
                className="mt-6 flex-row items-center gap-2 rounded-full bg-insaat-accent px-5 py-3"
              >
                <Plus size={18} color="#101114" strokeWidth={2} />
                <Text className="font-semibold text-insaat-background">
                  Choose a document
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Persistent audio player */}
        <View className="mt-2.5 rounded-3xl border border-white/10 bg-insaat-surface p-4">
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-1 flex-row items-center gap-3 mr-2">
              <View className="h-11 w-11 items-center justify-center rounded-xl bg-insaat-background">
                <AudioLines size={22} color="#E6D4A8" strokeWidth={1.6} />
              </View>

              <View className="flex-1">
                <Text
                  numberOfLines={1}
                  className="font-semibold text-insaat-text"
                >
                  {currentTrack?.name ?? "Nothing playing"}
                </Text>
                <Text
                  numberOfLines={1}
                  className="mt-1 text-xs text-insaat-muted"
                >
                  {currentTrack
                    ? audioFiles.length > 1
                      ? `Track ${trackIndex + 1} of ${audioFiles.length}`
                      : "Track 1 of 1 • Tap + to add more"
                    : "Choose a lesson to begin"}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-2">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Playback speed: ${currentSpeedLabel}`}
                onPress={() => setIsSpeedMenuOpen(true)}
                className="rounded-full border border-white/10 bg-insaat-background/70 px-2.5 py-1.5"
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <Text className="text-xs font-semibold text-insaat-accent">
                  {currentSpeedLabel}
                </Text>
              </Pressable>

              {hasAudio ? (
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Add audio lessons"
                    onPress={chooseAudio}
                    hitSlop={8}
                    className="h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-insaat-background/70"
                    style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                  >
                    <Plus size={16} color="#E6D4A8" strokeWidth={2.2} />
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Clear audio playlist"
                    onPress={clearPlaylist}
                    hitSlop={8}
                    className="h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-insaat-background/70"
                    style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                  >
                    <X size={14} color="#A5A5AD" strokeWidth={2} />
                  </Pressable>
                </>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Choose audio lessons"
                  onPress={chooseAudio}
                  className="rounded-full border border-white/10 bg-insaat-background/70 px-3 py-1.5"
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                >
                  <Text className="text-xs font-semibold text-insaat-accent">
                    Library
                  </Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Interactive playback timeline */}
          <View
            onLayout={(event) =>
              setProgressWidth(event.nativeEvent.layout.width)
            }
            onStartShouldSetResponder={() => !!currentTrack}
            onMoveShouldSetResponder={() => !!currentTrack}
            onResponderGrant={(event) => {
              if (status.duration <= 0 || progressWidth <= 0) return;
              const ratio = Math.max(
                0,
                Math.min(event.nativeEvent.locationX / progressWidth, 1),
              );
              void player.seekTo(ratio * status.duration);
            }}
            onResponderMove={(event) => {
              if (status.duration <= 0 || progressWidth <= 0) return;
              const ratio = Math.max(
                0,
                Math.min(event.nativeEvent.locationX / progressWidth, 1),
              );
              void player.seekTo(ratio * status.duration);
            }}
            className="mb-3 h-4 justify-center"
            accessibilityLabel="Audio playback timeline"
          >
            <View className="h-1 overflow-hidden rounded-full bg-white/10">
              <View
                className="h-full rounded-full bg-insaat-accent"
                style={{ width: `${progress * 100}%` }}
              />
            </View>
          </View>

          {/* Player controls row */}
          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-insaat-muted">
              {formatTime(status.currentTime)}
            </Text>

            <View className="flex-row items-center gap-4 sm:gap-6">
              {/* Previous Track */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous track"
                disabled={!canGoPrevious}
                onPress={handlePreviousTrack}
                hitSlop={8}
                className="items-center justify-center p-1"
                style={({ pressed }) => ({
                  opacity: !canGoPrevious ? 0.3 : pressed ? 0.6 : 1,
                })}
              >
                <SkipBack
                  size={20}
                  color={canGoPrevious ? "#F4F1E8" : "#A5A5AD"}
                  fill={canGoPrevious ? "#F4F1E8" : "transparent"}
                  strokeWidth={1.8}
                />
              </Pressable>

              {/* Rewind 10s */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Rewind 10 seconds"
                disabled={!currentTrack}
                onPress={() => void skipSeconds(-10)}
                hitSlop={8}
                className="items-center justify-center p-1"
                style={({ pressed }) => ({
                  opacity: !currentTrack ? 0.3 : pressed ? 0.6 : 1,
                })}
              >
                <RotateCcw
                  size={21}
                  color={currentTrack ? "#A5A5AD" : "#60646C"}
                  strokeWidth={1.8}
                />
              </Pressable>

              {/* Play / Pause */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  status.playing ? "Pause audio" : "Play audio"
                }
                onPress={togglePlayback}
                className="h-12 w-12 items-center justify-center rounded-full bg-insaat-accent"
                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
              >
                {status.playing ? (
                  <Pause
                    size={22}
                    color="#101114"
                    fill="#101114"
                    strokeWidth={1.8}
                  />
                ) : (
                  <Play
                    size={22}
                    color="#101114"
                    fill="#101114"
                    strokeWidth={1.8}
                  />
                )}
              </Pressable>

              {/* Forward 10s */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Forward 10 seconds"
                disabled={!currentTrack}
                onPress={() => void skipSeconds(10)}
                hitSlop={8}
                className="items-center justify-center p-1"
                style={({ pressed }) => ({
                  opacity: !currentTrack ? 0.3 : pressed ? 0.6 : 1,
                })}
              >
                <RotateCw
                  size={21}
                  color={currentTrack ? "#A5A5AD" : "#60646C"}
                  strokeWidth={1.8}
                />
              </Pressable>

              {/* Next Track */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next track"
                disabled={!canGoNext}
                onPress={handleNextTrack}
                hitSlop={8}
                className="items-center justify-center p-1"
                style={({ pressed }) => ({
                  opacity: !canGoNext ? 0.3 : pressed ? 0.6 : 1,
                })}
              >
                <SkipForward
                  size={20}
                  color={canGoNext ? "#F4F1E8" : "#A5A5AD"}
                  fill={canGoNext ? "#F4F1E8" : "transparent"}
                  strokeWidth={1.8}
                />
              </Pressable>
            </View>

            <Text className="text-xs text-insaat-muted">
              {formatTime(status.duration)}
            </Text>
          </View>
        </View>
      </View>

      {/* Playback speed popover modal */}
      <Modal
        visible={isSpeedMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSpeedMenuOpen(false)}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/60 px-6"
          onPress={() => setIsSpeedMenuOpen(false)}
        >
          <Pressable
            className="w-full max-w-xs rounded-3xl border border-white/10 bg-insaat-surface p-4 shadow-2xl"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="mb-3 flex-row items-center justify-between border-b border-white/10 pb-3">
              <View className="flex-row items-center gap-2">
                <Gauge size={18} color="#E6D4A8" strokeWidth={1.8} />
                <Text className="text-sm font-bold  tracking-wider text-insaat-text">
                  Playback Speed
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close speed options"
                onPress={() => setIsSpeedMenuOpen(false)}
                hitSlop={8}
                className="h-7 w-7 items-center justify-center rounded-full bg-insaat-background"
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <X size={15} color="#A5A5AD" strokeWidth={2} />
              </Pressable>
            </View>

            <View className="gap-1">
              {PLAYBACK_SPEEDS.map((speedOption) => {
                const isSelected = playbackSpeed === speedOption.value;
                return (
                  <Pressable
                    key={speedOption.value}
                    accessibilityRole="button"
                    accessibilityLabel={`Speed ${speedOption.label}${isSelected ? ", selected" : ""}`}
                    onPress={() => handleSelectSpeed(speedOption.value)}
                    className="flex-row items-center justify-between rounded-xl px-3.5 py-2.5"
                    style={({ pressed }) => ({
                      backgroundColor: isSelected
                        ? "rgba(230, 212, 168, 0.15)"
                        : pressed
                          ? "rgba(255, 255, 255, 0.05)"
                          : "transparent",
                    })}
                  >
                    <Text
                      className={`text-[15px] ${
                        isSelected
                          ? "font-bold text-insaat-accent"
                          : "font-medium text-insaat-text"
                      }`}
                    >
                      {speedOption.label}
                    </Text>
                    {isSelected ? (
                      <Check size={18} color="#E6D4A8" strokeWidth={2.4} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
