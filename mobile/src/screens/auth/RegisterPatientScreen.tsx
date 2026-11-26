import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../../theme/theme';

export default function RegisterPatientScreen({ navigation }: any) {
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const { registerPatient, isLoading } = useAuth();

  const handleRegister = async () => {
    if (!fullName.trim() || !phoneNumber.trim() || !password.trim()) {
      setErrorMsg('Full name, Ghanaian phone number, and password are required.');
      return;
    }

    setErrorMsg('');
    const res = await registerPatient({
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      email: email.trim() || undefined,
      password: password.trim(),
    });

    if (!res.success) {
      setErrorMsg(res.message || 'Registration failed.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backIconBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Create Patient Account</Text>
          <Text style={styles.subtitle}>
            Consult with MDC-verified specialists anywhere in Ghana.
          </Text>

          <View style={styles.trialBanner}>
            <View style={styles.trialIconCircle}>
              <MaterialIcons name="card-giftcard" size={18} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.trialTitle}>90-Day Free Trial Included</Text>
              <Text style={styles.trialDesc}>
                Full access to video consultations and digital prescriptions for 3 months. No card required upfront.
              </Text>
            </View>
          </View>
        </View>

        {errorMsg ? (
          <View style={styles.errorBox}>
            <MaterialIcons name="error-outline" size={18} color={COLORS.danger} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.label}>Full Name</Text>
          <View style={styles.inputWrap}>
            <MaterialIcons name="person-outline" size={18} color={COLORS.textSubtle} />
            <TextInput
              style={styles.input}
              placeholder="e.g. Kwame Mensah"
              placeholderTextColor={COLORS.textSubtle}
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          <Text style={styles.label}>Ghana Phone Number (MoMo)</Text>
          <View style={styles.inputWrap}>
            <MaterialIcons name="phone-android" size={18} color={COLORS.textSubtle} />
            <TextInput
              style={styles.input}
              placeholder="+233 24 000 0000"
              placeholderTextColor={COLORS.textSubtle}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />
          </View>

          <Text style={styles.label}>Email Address (Optional)</Text>
          <View style={styles.inputWrap}>
            <MaterialIcons name="mail-outline" size={18} color={COLORS.textSubtle} />
            <TextInput
              style={styles.input}
              placeholder="kwame@example.com"
              placeholderTextColor={COLORS.textSubtle}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <Text style={styles.label}>Password (min 6 characters)</Text>
          <View style={styles.inputWrap}>
            <MaterialIcons name="lock-outline" size={18} color={COLORS.textSubtle} />
            <TextInput
              style={styles.input}
              placeholder="Create a secure password"
              placeholderTextColor={COLORS.textSubtle}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, isLoading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.submitBtnText}>Start 3-Month Free Access</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={styles.backLinkText}>
            Already have an account? <Text style={styles.linkBold}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
  content: {
    paddingHorizontal: 22,
    paddingBottom: 32,
    paddingTop: 12,
  },
  backIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: FONTS.extraBold,
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  trialBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginTop: 16,
  },
  trialIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trialTitle: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.primaryDark,
    marginBottom: 2,
  },
  trialDesc: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.dangerSoft,
    borderColor: COLORS.dangerBorder,
    borderWidth: 1,
    padding: 12,
    borderRadius: RADIUS.md,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    color: COLORS.danger,
    fontSize: 12,
    fontFamily: FONTS.medium,
  },
  card: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  label: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
    marginBottom: 7,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontFamily: FONTS.bold,
  },
  backLink: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 8,
  },
  backLinkText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
  },
  linkBold: {
    color: COLORS.primary,
    fontFamily: FONTS.bold,
  },
});
