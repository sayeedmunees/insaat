import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Code2,
  Headphones,
  Moon,
} from "lucide-react-native";
import { useState, type ReactNode } from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";

const GITHUB_URL = "https://github.com/sayeedmunees/insaat";

const DOCUMENTATION_URL =
  "https://developer.android.com/training/data-storage/shared/documents-files";

const ACCENT_COLOR = "#E6D4A8";

function SettingRow({
  icon,
  title,
  description,
  onPress,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="min-h-[76px] flex-row items-center gap-3 rounded-2xl bg-insaat-surface px-4 py-3"
      style={({ pressed }) => (pressed ? { opacity: 0.7 } : undefined)}
    >
      <View className="w-7 items-center justify-center">{icon}</View>

      <View className="flex-1 gap-1">
        <Text className="text-[15px] font-semibold text-insaat-text">
          {title}
        </Text>

        {description ? (
          <Text className="text-xs leading-5 text-insaat-muted">
            {description}
          </Text>
        ) : null}
      </View>

      {onPress ? <ChevronRight size={18} color={ACCENT_COLOR} /> : null}
    </Pressable>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="mt-2 text-xs font-semibold  tracking-widest text-insaat-muted">
      {children}
    </Text>
  );
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const contentPadding = Platform.select({
    android: {
      paddingTop: insets.top + Spacing.four,
      paddingBottom: insets.bottom + BottomTabInset + Spacing.four,
    },
    default: {
      paddingTop: Spacing.four,
      paddingBottom: Spacing.six,
    },
  });

  const faqs = [
    {
      id: "about",
      title: "What is Insaat?",
      answer:
        "Insaat is an offline reading and listening app that lets you read PDF documents while listening to your audio files in one place.",
    },
    {
      id: "use",
      title: "How to use Insaat?",
      answer:
        "Choose a PDF from your device to read it. Select your audio files to build a listening queue. Use the player controls to play, pause, seek, and move through your audio.",
    },
  ];

  return (
    <ScrollView
      className="flex-1 bg-insaat-background"
      contentContainerStyle={[
        {
          flexGrow: 1,
          alignItems: "center",
          paddingHorizontal: Spacing.four,
        },
        contentPadding,
      ]}
    >
      <View className="w-full gap-3" style={{ maxWidth: MaxContentWidth }}>
        {/* Page header */}
        <Text className="text-[30px] font-bold leading-[38px] text-insaat-text">
          Settings
        </Text>

        <Text className="-mt-2 mb-2 text-sm text-insaat-muted">
          Make Insaat yours.
        </Text>

        {/* Appearance */}
        <SectionTitle>Appearance</SectionTitle>

        <View className="rounded-2xl bg-insaat-surface px-4">
          <View className="min-h-[82px] flex-row items-center gap-3">
            <View className="w-7 items-center justify-center">
              <Moon size={21} color={ACCENT_COLOR} />
            </View>

            <View className="flex-1 gap-1">
              <Text className="text-[15px] font-semibold text-insaat-text">
                Dark theme
              </Text>

              <Text className="text-xs leading-5 text-insaat-muted">
                Theme customization is coming soon.
              </Text>
            </View>

            <Text className="text-xs font-semibold text-insaat-accent">
              Soon
            </Text>
          </View>
        </View>

        {/* Library folders */}
        <SectionTitle>Library folders</SectionTitle>

        <View className="gap-2">
          <SettingRow
            icon={<BookOpen size={21} color={ACCENT_COLOR} />}
            title="PDF Folder"
            description="No folder selected"
            onPress={() => Linking.openURL(DOCUMENTATION_URL)}
          />

          <SettingRow
            icon={<Headphones size={21} color={ACCENT_COLOR} />}
            title="Audio Folder"
            description="No folder selected"
            onPress={() => Linking.openURL(DOCUMENTATION_URL)}
          />
        </View>

        <Text className="-mt-1 text-xs leading-5 text-insaat-muted">
          Folder selection will be connected in a later step. Your existing PDF
          and audio file selection on Home remains unchanged.
        </Text>

        {/* Frequently asked questions */}
        <SectionTitle>Frequently asked questions</SectionTitle>

        <View className="rounded-2xl bg-insaat-surface px-4">
          {faqs.map((faq, index) => (
            <View key={faq.id}>
              {index > 0 ? <View className="h-px bg-white/10" /> : null}

              <Pressable
                onPress={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                className="min-h-[54px] flex-row items-center justify-between gap-2"
              >
                <Text className="flex-1 text-[15px] font-semibold text-insaat-text">
                  {faq.title}
                </Text>

                {openFaq === faq.id ? (
                  <ChevronDown size={18} color={ACCENT_COLOR} />
                ) : (
                  <ChevronRight size={18} color={ACCENT_COLOR} />
                )}
              </Pressable>

              {openFaq === faq.id ? (
                <Text className="pb-4 pr-3 text-sm leading-[21px] text-insaat-muted">
                  {faq.answer}
                </Text>
              ) : null}
            </View>
          ))}
        </View>

        {/* App information */}
        <View className="items-center gap-2 py-4">
          <Text className="text-base font-semibold text-insaat-text">
            Insaat
          </Text>

          <Text className="text-xs text-insaat-muted">Version 1.0.0</Text>

          <Pressable
            onPress={() => Linking.openURL(GITHUB_URL)}
            className="flex-row items-center gap-2 py-2"
            style={({ pressed }) => (pressed ? { opacity: 0.7 } : undefined)}
          >
            <Code2 size={16} color={ACCENT_COLOR} />

            <Text className="text-xs text-insaat-muted">
              View source code on GitHub
            </Text>

            <ChevronRight size={15} color={ACCENT_COLOR} />
          </Pressable>

          <Text className="text-center text-xs leading-5 text-insaat-muted">
            © 2026 Insaat. Built for focused reading and listening.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
