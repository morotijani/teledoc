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

export default function RegisterDoctorScreen({ navigation }: any) {
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [specialty, setSpecialty] = useState('General Practice');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [hospitalAffiliation, setHospitalAffiliation] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('5');
  const [bio, setBio] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const { registerDoctor, isLoading } = useAuth();

  const handleRegister = async () => {
    if (!fullName.trim() || !phoneNumber.trim() || !email.trim() || !licenseNumber.trim() || !password.trim()) {
      setErrorMsg('Name, Phone, Email, License Number, and Password are required.');
      return;
    }

    setErrorMsg('');
    const res = await registerDoctor({
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      email: email.trim(),
      password: password.trim(),
      specialty: specialty.trim(),
      licenseNumber: licenseNumber.trim(),
      hospitalAffiliation: hospitalAffiliation.trim() || undefined,
      yearsOfExperience: parseInt(yearsOfExperience, 10) || 0,
      bio: bio.trim() || undefined,
      documentUrls: [`https://example.com/certs/${licenseNumber.replace(/\s+/g, '_')}.pdf`],
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
          <Text style={styles.title}>Clinician Application</Text>
          <Text style={styles.subtitle}>
            Join the TeleDoc Ghana medical network verified by the Medical & Dental Council.
          </Text>

          <View style={styles.noticeBox}>
            <MaterialIcons name="verified-user" size={18} color={COLORS.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.noticeTitle}>Mandatory Credential Verification</Text>
              <Text style={styles.noticeDesc}>
                New doctor accounts start in Pending status until reviewed and approved by our Super Admin.
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
          <Text style={styles.label}>Full Name (including title)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Dr. Ama Serwaa, MD"
            placeholderTextColor={COLORS.textSubtle}
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={styles.label}>Ghana Medical License / MDC Number</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. MDC-GH-2023-8871"
            placeholderTextColor={COLORS.textSubtle}
            value={licenseNumber}
            onChangeText={setLicenseNumber}
            autoCapitalize="characters"
          />

          <Text style={styles.label}>Medical Specialty</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Pediatrics, Cardiology, Obstetrics"
            placeholderTextColor={COLORS.textSubtle}
            value={specialty}
            onChangeText={setSpecialty}
          />

          <Text style={styles.label}>Current Hospital Affiliation</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 37 Military Hospital, Accra"
            placeholderTextColor={COLORS.textSubtle}
            value={hospitalAffiliation}
            onChangeText={setHospitalAffiliation}
          />

          <Text style={styles.label}>Years in Clinical Practice</Text>
          <TextInput
            style={styles.input}
            placeholder="5"
            placeholderTextColor={COLORS.textSubtle}
            value={yearsOfExperience}
            onChangeText={setYearsOfExperience}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="+233 24 000 0000"
            placeholderTextColor={COLORS.textSubtle}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Official Email</Text>
          <TextInput
            style={styles.input}
            placeholder="dr.ama@hospital.gov.gh"
            placeholderTextColor={COLORS.textSubtle}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Create Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Minimum 6 characters"
            placeholderTextColor={COLORS.textSubtle}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Text style={styles.label}>Clinical Focus & Bio</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Brief overview of clinical expertise and patient approach..."
            placeholderTextColor={COLORS.textSubtle}
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[styles.submitBtn, isLoading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.submitBtnText}>Submit Credentials for Verification</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={styles.backLinkText}>
            Already registered? <Text style={styles.linkBold}>Sign In</Text>
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
    paddingBottom: 36,
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
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: COLORS.warningSoft,
    borderColor: COLORS.warningBorder,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginTop: 14,
  },
  noticeTitle: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: '#92400E',
    marginBottom: 2,
  },
  noticeDesc: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: '#92400E',
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
  input: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.text,
    marginBottom: 15,
  },
  textArea: {
    height: 84,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: COLORS.info,
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
    color: COLORS.info,
    fontFamily: FONTS.bold,
  },
});
