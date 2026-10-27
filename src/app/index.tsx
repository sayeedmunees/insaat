import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import * as DocumentPicker from "expo-document-picker";
import { StatusBar } from "expo-status-bar";

import { useEffect, useRef, useState } from "react";
import { Alert, Animated, Pressable, Text, View } from "react-native";
import Pdf from "react-native-pdf";
import { SafeAreaView } from "react-native-safe-area-context";

import AudioLines from "lucide-react-native/icons/audio-lines";
import FileText from "lucide-react-native/icons/file-text";
import Pause from "lucide-react-native/icons/pause";
import Play from "lucide-react-native/icons/play";
import Plus from "lucide-react-native/icons/plus";
import RotateCcw from "lucide-react-native/icons/rotate-ccw";
import RotateCw from "lucide-react-native/icons/rotate-cw";
import X from "lucide-react-native/icons/x";

type AudioFile = {
  name: string;
  uri: string;
};

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

  const [progressWidth, setProgressWidth] = useState(0);

  const [pdfControlsVisible, setPdfControlsVisible] = useState(false);
  const toolbarOpacity = useRef(new Animated.Value(0)).current;
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStart = useRef({ x: 0, y: 0, time: 0 });

  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);

  const currentTrack = audioFiles[trackIndex] ?? null;

  useEffect(() => {
    if (!currentTrack) {
      player.pause();
      return;
    }

    player.pause();
    player.replace({ uri: currentTrack.uri });
  }, [currentTrack?.uri, player]);

  async function choosePdf() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets.length > 0) {
        const selectedPdf = result.assets[0];

        setPdfName(selectedPdf.name);
        setPdfUri(selectedPdf.uri);
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

      if (!result.canceled && result.assets.length > 0) {
        const tracks = result.assets.map((asset) => ({
          name: asset.name,
          uri: asset.uri,
        }));

        setAudioFiles(tracks);
        setTrackIndex(0);
      }
    } catch {
      Alert.alert(
        "Unable to select audio",
        "Please try selecting your audio files again.",
      );
    }
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

        player.play();
      }
    } catch {
      Alert.alert("Playback error", "Unable to play this audio file.");
    }
  }

  function changeTrack(direction: -1 | 1) {
    if (audioFiles.length === 0) {
      Alert.alert("Your library is empty", "Choose audio lessons first.");
      return;
    }

    const nextIndex =
      (trackIndex + direction + audioFiles.length) % audioFiles.length;

    setTrackIndex(nextIndex);
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

  useEffect(() => {
    return () => {
      clearHideControlsTimer();
    };
  }, []);

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-insaat-background">
      <StatusBar style="light" />

      <View className="flex-1 px-5 pt-3 pb-1">
        {/* App header */}
        <View className="mb-3.5 flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-insaat-accent">
              <Text className="text-xl font-bold text-insaat-background">
                إ
              </Text>
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
        </View>

        {/* Reading section heading */}
        {/* <View className="mb-4">
          <Text className="text-xs font-semibold uppercase tracking-widest text-insaat-accent">
            YOUR READING SPACE
          </Text>
          <Text className="mt-1 text-xl font-semibold text-insaat-text">
            Study at your own pace
          </Text>
        </View> */}

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
                    onPress={() => {
                      clearHideControlsTimer();
                      toolbarOpacity.setValue(0);
                      setPdfControlsVisible(false);
                      setPdfUri(null);
                      setPdfName(null);
                    }}
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
            <View className="flex-1 flex-row items-center gap-3">
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
                    ? `Track ${trackIndex + 1} of ${audioFiles.length}`
                    : "Choose a lesson to begin"}
                </Text>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose audio lessons"
              onPress={chooseAudio}
              className="rounded-full border border-white/10 px-3 py-2"
            >
              <Text className="text-sm font-medium text-insaat-accent">
                Library
              </Text>
            </Pressable>
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

          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-insaat-muted">
              {formatTime(status.currentTime)}
            </Text>

            <View className="flex-row items-center gap-7">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Rewind 10 seconds"
                onPress={() => void skipSeconds(-10)}
                hitSlop={10}
                className="items-center justify-center"
              >
                <RotateCcw size={22} color="#A5A5AD" strokeWidth={1.8} />
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  status.playing ? "Pause audio" : "Play audio"
                }
                onPress={togglePlayback}
                className="h-12 w-12 items-center justify-center rounded-full bg-insaat-accent"
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

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Forward 10 seconds"
                onPress={() => void skipSeconds(10)}
                hitSlop={10}
                className="items-center justify-center"
              >
                <RotateCw size={22} color="#A5A5AD" strokeWidth={1.8} />
              </Pressable>
            </View>

            <Text className="text-xs text-insaat-muted">
              {formatTime(status.duration)}
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
