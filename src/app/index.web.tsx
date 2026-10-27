
import { Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-insaat-background px-6">
      <Text className="text-xl font-bold text-insaat-text">
        Insaat
      </Text>

      <Text className="mt-2 text-center text-sm text-insaat-muted">
        The web version is coming soon. Please use the Android app for PDF
        reading and audio playback.
      </Text>
    </View>
  );
}
