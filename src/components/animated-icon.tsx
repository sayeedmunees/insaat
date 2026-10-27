import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const DURATION = 600;

export function AnimatedSplashOverlay() {
  const [animate, setAnimate] = useState(false);
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const splashKeyframe = new Keyframe({
    0: {
      transform: [{ scale: 1 }],
      opacity: 1,
    },
    20: {
      opacity: 1,
    },
    70: {
      opacity: 0,
      easing: Easing.elastic(0.7),
    },
    100: {
      opacity: 0,
      transform: [{ scale: 0.98 }],
      easing: Easing.elastic(0.7),
    },
  });

  const content = (
    <View style={styles.contentContainer}>
      <Image
        style={styles.splashImage}
        source={require('@/assets/images/splash-icon.png')}
        contentFit="contain"
      />
      <Text style={styles.title}>Insaat</Text>
      <Text style={styles.subtitle}>Listen deeply. Follow along.</Text>
    </View>
  );

  return animate ? (
    <Animated.View
      entering={splashKeyframe.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) {
          scheduleOnRN(setVisible, false);
        }
      })}
      style={styles.splashOverlay}>
      {content}
    </Animated.View>
  ) : (
    <View
      onLayout={() => {
        SplashScreen.hideAsync().finally(() => {
          setAnimate(true);
        });
      }}
      style={styles.splashOverlay}>
      {content}
    </View>
  );
}

export function AnimatedIcon() {
  return (
    <View style={styles.iconContainer}>
      <Image
        style={styles.iconImage}
        source={require('@/assets/images/splash-icon.png')}
        contentFit="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#101114',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashImage: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#F4F1E8',
    letterSpacing: 1.5,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#A5A5AD',
    letterSpacing: 0.4,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 128,
    height: 128,
  },
  iconImage: {
    width: 128,
    height: 128,
  },
});
