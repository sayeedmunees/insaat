import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import * as DocumentPicker from "expo-document-picker";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import Pdf from "react-native-pdf";
import { SafeAreaView } from "react-native-safe-area-context";

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

  return (
    <SafeAreaView className="flex-1 bg-insaat-background">
      <StatusBar style="light" />

      <View className="flex-1 px-5 pt-3 pb-4">
        {/* App header */}
        <View className="mb-6 flex-row items-center justify-between">
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

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open audio library"
            onPress={chooseAudio}
            className="h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-insaat-surface"
          >
            <Text className="text-xl text-insaat-text">☰</Text>
          </Pressable>
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
            <View className="flex-1">
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

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close PDF"
                onPress={() => {
                  setPdfUri(null);
                  setPdfName(null);
                }}
                className="absolute right-3 top-3 h-10 w-10 items-center justify-center rounded-full bg-insaat-background"
                style={{ elevation: 5 }}
              >
                <Text className="text-xl font-semibold text-insaat-text">
                  ×
                </Text>
              </Pressable>
            </View>
          ) : (
            <View className="flex-1 items-center justify-center px-6">
              <View className="mb-5 h-16 w-16 items-center justify-center rounded-2xl border border-insaat-accent/30 bg-insaat-background">
                <Text className="text-3xl text-insaat-accent">▤</Text>
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
                <Text className="text-lg font-medium text-insaat-background">
                  +
                </Text>
                <Text className="font-semibold text-insaat-background">
                  Choose a document
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Persistent audio player */}
        <View className="mt-4 rounded-3xl border border-white/10 bg-insaat-surface p-4">
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-1 flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-xl bg-insaat-background">
                <Text className="text-xl text-insaat-accent">♫</Text>
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
                accessibilityLabel="Previous track"
                onPress={() => void skipSeconds(-10)}
                hitSlop={10}
              >
                <Text className="text-lg text-insaat-muted">↶</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  status.playing ? "Pause audio" : "Play audio"
                }
                onPress={togglePlayback}
                className="h-12 w-12 items-center justify-center rounded-full bg-insaat-accent"
              >
                <Text className="text-lg text-insaat-background">
                  {status.playing ? "Ⅱ" : "▶"}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next track"
                onPress={() => void skipSeconds(10)}
                hitSlop={10}
              >
                <Text className="text-lg text-insaat-muted">↷</Text>
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
