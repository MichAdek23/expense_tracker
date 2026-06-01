import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

interface SplashScreenProps {
  isReady: boolean;
  onAnimationComplete: () => void;
}

export const SplashScreen = ({ isReady, onAnimationComplete }: SplashScreenProps) => {
  // Animation drivers
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoGlowScale = useRef(new Animated.Value(1)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const loaderOpacity = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  const [isAnimationFinished, setIsAnimationFinished] = useState(false);

  useEffect(() => {
    // 1. Entry Animations: Bouncy logo scale-up and fade-in
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1.0,
        tension: 30,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // 2. Pulse / Glow loop for the logo background
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoGlowScale, {
            toValue: 1.15,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(logoGlowScale, {
            toValue: 1.0,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // 3. Fade-in and slide-up the Brand Typography
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // 4. Fade-in the loading spinner
        Animated.timing(loaderOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start(() => {
          setIsAnimationFinished(true);
        });
      });
    });
  }, []);

  // 5. Watch for data loading readiness
  useEffect(() => {
    if (isReady && isAnimationFinished) {
      // Trigger smooth fade-out of the entire screen overlay
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }).start(() => {
        onAnimationComplete();
      });
    }
  }, [isReady, isAnimationFinished]);

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
      <StatusBar style="light" />
      
      <View style={styles.centerContainer}>
        {/* Glow Ring behind logo */}
        <Animated.View
          style={[
            styles.glowRing,
            {
              transform: [{ scale: logoGlowScale }],
              opacity: logoOpacity,
            },
          ]}
        />

        {/* Logo Card */}
        <Animated.View
          style={[
            styles.logoCard,
            {
              transform: [{ scale: logoScale }],
              opacity: logoOpacity,
            },
          ]}
        >
          <Feather name="activity" size={42} color="#00A884" />
        </Animated.View>

        {/* Brand Text Section */}
        <Animated.View
          style={{
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }],
            alignItems: 'center',
          }}
        >
          <Text style={styles.title}>CASHLY</Text>
          <Text style={styles.subtitle}>Sleek Financial Tracking</Text>
        </Animated.View>
      </View>

      {/* Loading Indicator at Bottom */}
      <Animated.View style={[styles.bottomContainer, { opacity: loaderOpacity }]}>
        <ActivityIndicator size="small" color="#00A884" />
        <Text style={styles.loadingText}>Securing your workspace...</Text>
      </Animated.View>
    </Animated.View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0B141A', // Matches App theme dark background
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  glowRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 36,
    backgroundColor: 'rgba(0, 168, 132, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 168, 132, 0.1)',
  },
  logoCard: {
    width: 86,
    height: 86,
    borderRadius: 26,
    backgroundColor: '#202C33', // Matches Card BG in App
    borderWidth: 1.5,
    borderColor: 'rgba(0, 168, 132, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 6,
    marginBottom: 6,
    ...Platform.select({
      ios: { fontFamily: 'System' },
      android: { fontFamily: 'sans-serif-medium' },
      web: { fontFamily: 'Outfit, system-ui' },
    }),
  },
  subtitle: {
    fontSize: 12,
    color: '#8696A0',
    letterSpacing: 1.5,
    fontWeight: '500',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 70 : 50,
    alignItems: 'center',
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 10,
    letterSpacing: 0.5,
  },
});
