import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ImageBackground,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { FONTS, COLORS } from '../theme/theme';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
  fontsLoaded: boolean;
}

export default function SplashScreen({ onFinish, fontsLoaded }: SplashScreenProps) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const textFade = useRef(new Animated.Value(0)).current;
  const textSlide = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(textFade, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.timing(textSlide, {
        toValue: 0,
        duration: 650,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!fontsLoaded) return;

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 420,
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }, 1700);

    return () => clearTimeout(timer);
  }, [fontsLoaded]);

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <StatusBar style="light" />
      <ImageBackground
        source={require('../../assets/splash-screen.jpg')}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.bottomSection}>
          <Animated.View
            style={[
              styles.brandBlock,
              {
                opacity: textFade,
                transform: [{ translateY: textSlide }],
              },
            ]}
          >
            <Text style={[styles.brandTitle, fontsLoaded && { fontFamily: FONTS.extraBold }]}>
              TeleDoc Ghana
            </Text>
            <Text style={[styles.brandTagline, fontsLoaded && { fontFamily: FONTS.medium }]}>
              Accredited Teleconsultations & Digital Care
            </Text>

            <View style={styles.badgePill}>
              <MaterialIcons name="verified-user" size={14} color="#CCFBF1" />
              <Text style={[styles.badgeText, fontsLoaded && { fontFamily: FONTS.semiBold }]}>
                MDC Verified Clinicians
              </Text>
            </View>
          </Animated.View>
        </View>
      </ImageBackground>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width,
    height,
    zIndex: 999,
    backgroundColor: '#0F766E',
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  bottomSection: {
    paddingBottom: 68,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  brandBlock: {
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 30,
    color: COLORS.white,
    letterSpacing: -0.6,
    fontWeight: '800',
  },
  brandTagline: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.84)',
    marginTop: 6,
    textAlign: 'center',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    color: '#CCFBF1',
    letterSpacing: 0.4,
  },
});
