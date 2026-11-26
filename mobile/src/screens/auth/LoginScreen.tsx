import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../../theme/theme';

export default function LoginScreen({ navigation }: any) {
  const [identifier, setIdentifier] = useState('+233240000004');
  const [password, setPassword] = useState('Password123!');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { login, isLoading } = useAuth();

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      setErrorMsg('Please enter both your phone/email and password.');
      return;
    }

    setErrorMsg('');
    const res = await login(identifier.trim(), password);
    if (!res.success) {
      setErrorMsg(res.message || 'Login failed.');
    }
  };

  const setDemoUser = (userIdentifier: string) => {
    setIdentifier(userIdentifier);
    setPassword('Password123!');
    setErrorMsg('');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand Header */}
          <View style={styles.brandHeader}>
            <View style={styles.logoMark}>
              <MaterialIcons name="medical-services" size={32} color={COLORS.white} />
            </View>
            <Text style={styles.appTitle}>TeleDoc Ghana</Text>
            <Text style={styles.appSubtitle}>
              Accredited Teleconsultations & Digital Healthcare
            </Text>
          </View>

          {/* Demo Fast Logins */}
          <View style={styles.demoCard}>
            <View style={styles.demoHeaderRow}>
              <MaterialIcons name="bolt" size={16} color={COLORS.primaryDark} />
              <Text style={styles.demoTitle}>Quick Demo Accounts</Text>
            </View>
            <View style={styles.demoButtonsRow}>
              {[
                { label: 'Patient (Kwame)', id: '+233240000004', icon: 'person' as const },
                { label: 'Dr. Mensah', id: 'dr.mensah@teledoc.gh', icon: 'verified-user' as const },
                { label: 'Dr. Boateng', id: 'dr.boateng@teledoc.gh', icon: 'hourglass-top' as const },
              ].map((demo) => {
                const isActive = identifier === demo.id;
                return (
                  <TouchableOpacity
                    key={demo.id}
                    style={[styles.demoChip, isActive && styles.demoChipActive]}
                    onPress={() => setDemoUser(demo.id)}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons
                      name={demo.icon}
                      size={14}
                      color={isActive ? COLORS.white : COLORS.primaryDark}
                    />
                    <Text style={[styles.demoChipText, isActive && styles.demoChipTextActive]}>
                      {demo.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {errorMsg ? (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={18} color={COLORS.danger} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Sign In Card */}
          <View style={styles.formCard}>
            <Text style={styles.formHeading}>Sign in to your account</Text>

            <Text style={styles.label}>Phone Number or Email</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="alternate-email" size={18} color={COLORS.textSubtle} />
              <TextInput
                style={styles.input}
                placeholder="+233... or user@example.com"
                placeholderTextColor={COLORS.textSubtle}
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="lock-outline" size={18} color={COLORS.textSubtle} />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor={COLORS.textSubtle}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                <MaterialIcons
                  name={showPassword ? 'visibility-off' : 'visibility'}
                  size={18}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.loginBtn, isLoading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <View style={styles.btnInner}>
                  <Text style={styles.loginBtnText}>Sign In</Text>
                  <MaterialIcons name="arrow-forward" size={18} color={COLORS.white} />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Registration Links */}
          <View style={styles.footerLinks}>
            <TouchableOpacity
              style={styles.registerLink}
              onPress={() => navigation.navigate('RegisterPatient')}
            >
              <Text style={styles.registerLinkText}>
                New patient? <Text style={styles.linkHighlight}>Create account (90 days free)</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.doctorRegisterCard}
              onPress={() => navigation.navigate('RegisterDoctor')}
              activeOpacity={0.8}
            >
              <View style={styles.doctorIconBox}>
                <MaterialIcons name="local-hospital" size={18} color={COLORS.info} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.doctorCardTitle}>Licensed Clinician?</Text>
                <Text style={styles.doctorCardSub}>Apply with your MDC credentials</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={COLORS.textSubtle} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingVertical: 28,
    justifyContent: 'center',
    flexGrow: 1,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    ...SHADOWS.elevated,
  },
  appTitle: {
    fontSize: 26,
    fontFamily: FONTS.extraBold,
    color: COLORS.text,
    letterSpacing: -0.6,
  },
  appSubtitle: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  demoCard: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primaryLight,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 18,
  },
  demoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  demoTitle: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  demoButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  demoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.pill,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  demoChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  demoChipText: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
  },
  demoChipTextActive: {
    color: COLORS.white,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    padding: 12,
    borderRadius: RADIUS.md,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    color: COLORS.danger,
    fontSize: 13,
    fontFamily: FONTS.medium,
  },
  formCard: {
    backgroundColor: COLORS.surface,
    padding: 22,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  formHeading: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: 18,
  },
  label: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    marginBottom: 16,
    height: 50,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  loginBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    ...SHADOWS.card,
  },
  btnDisabled: {
    opacity: 0.65,
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loginBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontFamily: FONTS.bold,
  },
  footerLinks: {
    marginTop: 22,
    gap: 14,
  },
  registerLink: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  registerLinkText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
  },
  linkHighlight: {
    color: COLORS.primary,
    fontFamily: FONTS.bold,
  },
  doctorRegisterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: 14,
    ...SHADOWS.card,
  },
  doctorIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.infoSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doctorCardTitle: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  doctorCardSub: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 1,
  },
});
