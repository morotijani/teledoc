import { Platform } from 'react-native';

export const FONTS = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semiBold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extraBold: 'PlusJakartaSans_800ExtraBold',
} as const;

export const COLORS = {
  // Brand Clinical Teal
  primary: '#0D9488',
  primaryDark: '#0F766E',
  primaryLight: '#CCFBF1',
  primarySoft: '#F0FDFA',

  // Doctor Dark Clinical Navy
  navy: '#0F172A',
  navyLight: '#1E293B',
  navyMuted: '#334155',

  // Neutrals
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F5F9',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',

  // Typography
  text: '#0F172A',
  textSecondary: '#334155',
  textMuted: '#64748B',
  textSubtle: '#94A3B8',
  white: '#FFFFFF',

  // Semantic
  success: '#059669',
  successSoft: '#ECFDF5',
  successBorder: '#A7F3D0',
  info: '#0284C7',
  infoSoft: '#E0F2FE',
  infoBorder: '#BAE6FD',
  warning: '#D97706',
  warningSoft: '#FFFBEB',
  warningBorder: '#FDE68A',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  dangerBorder: '#FECACA',
} as const;

export const RADIUS = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const SHADOWS = {
  card: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
    },
    android: {
      elevation: 2,
    },
    default: {},
  }),
  elevated: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
    },
    android: {
      elevation: 5,
    },
    default: {},
  }),
};
