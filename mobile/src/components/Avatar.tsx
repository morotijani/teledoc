import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { API_URL } from '../api/client';
import { COLORS, FONTS } from '../theme/theme';

export function resolveMediaUrl(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;
  const baseServer = API_URL.replace('/api/v1', '');
  return rawUrl.replace(/http:\/\/localhost:\d+/, baseServer);
}

interface AvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: number;
  borderRadius?: number;
  dark?: boolean;
}

export default function Avatar({
  uri,
  name,
  size = 48,
  borderRadius,
  dark = false,
}: AvatarProps) {
  const resolved = resolveMediaUrl(uri);
  const radius = borderRadius ?? Math.round(size * 0.32);
  const initial = (name || 'U').replace(/^Dr\.\s*/i, '').charAt(0).toUpperCase();

  if (resolved) {
    return (
      <Image
        source={{ uri: resolved }}
        style={[
          styles.image,
          {
            width: size,
            height: size,
            borderRadius: radius,
          },
        ]}
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: dark ? COLORS.navyLight : COLORS.primarySoft,
          borderColor: dark ? '#2DD4BF' : COLORS.primaryLight,
        },
      ]}
    >
      <Text
        style={[
          styles.initial,
          {
            fontSize: Math.round(size * 0.4),
            color: dark ? '#2DD4BF' : COLORS.primary,
          },
        ]}
      >
        {initial}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: COLORS.surfaceMuted,
  },
  fallback: {
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: {
    fontFamily: FONTS.extraBold,
  },
});
