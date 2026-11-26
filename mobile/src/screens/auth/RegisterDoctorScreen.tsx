import React, { useState, useEffect } from 'react';
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
import * as DocumentPicker from 'expo-document-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../../theme/theme';

const FALLBACK_SPECIALTIES = [
  'General Practice',
  'Cardiology',
  'Pediatrics',
  'Obstetrics',
  'Dermatology',
  'Internal Medicine',
  'Psychiatry & Mental Health',
  'Ophthalmology',
  'Orthopedics',
];

export default function RegisterDoctorScreen({ navigation }: any) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Account & Personal
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 2: Clinical Credentials & Specialty
  const [specialties, setSpecialties] = useState<string[]>(FALLBACK_SPECIALTIES);
  const [loadingSpecs, setLoadingSpecs] = useState(true);
  const [specialty, setSpecialty] = useState('General Practice');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [hospitalAffiliation, setHospitalAffiliation] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('5');

  // Step 3: Bio & Verification Document
  const [bio, setBio] = useState('');
  const [pickedCert, setPickedCert] = useState<{ name: string; uri: string } | null>(null);

  const [errorMsg, setErrorMsg] = useState('');
  const { registerDoctor, isLoading } = useAuth();

  useEffect(() => {
    fetchSpecialties();
  }, []);

  const fetchSpecialties = async () => {
    try {
      const res = await apiClient.get('/doctors/specialties');
      const list = (res.data.specialties || []).map((s: any) => s.name);
      if (list.length > 0) {
        setSpecialties(list);
        if (!list.includes(specialty)) {
          setSpecialty(list[0]);
        }
      }
    } catch {
      // Fallback defaults already set
    } finally {
      setLoadingSpecs(false);
    }
  };

  const handleNextStep = () => {
    setErrorMsg('');
    if (step === 1) {
      if (!fullName.trim() || !phoneNumber.trim() || !email.trim() || password.trim().length < 6) {
        setErrorMsg('Please enter your full name, phone, valid email, and a password (min 6 chars).');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!specialty.trim() || !licenseNumber.trim()) {
        setErrorMsg('Please select a medical specialty and enter your MDC license number.');
        return;
      }
      setStep(3);
    }
  };

  const handlePickCertificate = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        setPickedCert({
          name: res.assets[0].name || 'mdc_certificate.pdf',
          uri: res.assets[0].uri,
        });
      }
    } catch {
      // Ignore picker cancel
    }
  };

  const handleRegister = async () => {
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
      documentUrls: [
        pickedCert
          ? `uploaded://${pickedCert.name}`
          : `https://example.com/certs/${licenseNumber.replace(/\s+/g, '_')}.pdf`,
      ],
    });

    if (!res.success) {
      setErrorMsg(res.message || 'Registration failed.');
    }
  };

  const stepMeta = [
    { num: 1, title: 'Account' },
    { num: 2, title: 'Credentials' },
    { num: 3, title: 'Review' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          style={styles.backIconBtn}
          onPress={() => {
            if (step > 1) {
              setErrorMsg('');
              setStep((step - 1) as 1 | 2);
            } else {
              navigation.goBack();
            }
          }}
        >
          <MaterialIcons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Clinician Application</Text>
          <Text style={styles.subtitle}>
            Step {step} of 3 · Verified by the Medical & Dental Council (MDC)
          </Text>

          {/* Visual Stepper */}
          <View style={styles.stepperRow}>
            {stepMeta.map((s, idx) => {
              const isCompleted = step > s.num;
              const isCurrent = step === s.num;
              return (
                <React.Fragment key={s.num}>
                  <View style={styles.stepItem}>
                    <View
                      style={[
                        styles.stepCircle,
                        isCurrent && styles.stepCircleActive,
                        isCompleted && styles.stepCircleDone,
                      ]}
                    >
                      {isCompleted ? (
                        <MaterialIcons name="check" size={14} color={COLORS.white} />
                      ) : (
                        <Text
                          style={[
                            styles.stepNum,
                            (isCurrent || isCompleted) && styles.stepNumActive,
                          ]}
                        >
                          {s.num}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.stepLabel, isCurrent && styles.stepLabelActive]}>
                      {s.title}
                    </Text>
                  </View>
                  {idx < stepMeta.length - 1 && (
                    <View style={[styles.stepLine, step > s.num && styles.stepLineActive]} />
                  )}
                </React.Fragment>
              );
            })}
          </View>
        </View>

        {errorMsg ? (
          <View style={styles.errorBox}>
            <MaterialIcons name="error-outline" size={18} color={COLORS.danger} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* STEP 1: Personal & Account Info */}
        {step === 1 && (
          <View style={styles.card}>
            <Text style={styles.cardHeading}>Personal & Account Details</Text>

            <Text style={styles.label}>Full Name (including title) *</Text>
            <View style={styles.inputWrap}>
              <MaterialIcons name="person-outline" size={18} color={COLORS.textSubtle} />
              <TextInput
                style={styles.input}
                placeholder="e.g. Dr. Ama Serwaa, MD"
                placeholderTextColor={COLORS.textSubtle}
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            <Text style={styles.label}>Ghana Phone Number *</Text>
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

            <Text style={styles.label}>Official Email Address *</Text>
            <View style={styles.inputWrap}>
              <MaterialIcons name="mail-outline" size={18} color={COLORS.textSubtle} />
              <TextInput
                style={styles.input}
                placeholder="dr.ama@hospital.gov.gh"
                placeholderTextColor={COLORS.textSubtle}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <Text style={styles.label}>Create Password (min 6 chars) *</Text>
            <View style={styles.inputWrap}>
              <MaterialIcons name="lock-outline" size={18} color={COLORS.textSubtle} />
              <TextInput
                style={styles.input}
                placeholder="Create a secure password"
                placeholderTextColor={COLORS.textSubtle}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <MaterialIcons
                  name={showPassword ? 'visibility-off' : 'visibility'}
                  size={18}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.nextBtn} onPress={handleNextStep} activeOpacity={0.85}>
              <Text style={styles.nextBtnText}>Continue to Credentials</Text>
              <MaterialIcons name="arrow-forward" size={18} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: Specialty & MDC Credentials */}
        {step === 2 && (
          <View style={styles.card}>
            <Text style={styles.cardHeading}>Medical Specialty & License</Text>

            <Text style={styles.label}>Select Medical Specialty *</Text>
            {loadingSpecs ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 12 }} />
            ) : (
              <View style={styles.specialtyGrid}>
                {specialties.map((spec) => {
                  const isSelected = specialty === spec;
                  return (
                    <TouchableOpacity
                      key={spec}
                      style={[styles.specChip, isSelected && styles.specChipActive]}
                      onPress={() => setSpecialty(spec)}
                      activeOpacity={0.8}
                    >
                      {isSelected && (
                        <MaterialIcons name="check-circle" size={14} color={COLORS.white} />
                      )}
                      <Text style={[styles.specChipText, isSelected && styles.specChipTextActive]}>
                        {spec}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <Text style={styles.label}>Ghana Medical License / MDC Number *</Text>
            <View style={styles.inputWrap}>
              <MaterialIcons name="badge" size={18} color={COLORS.textSubtle} />
              <TextInput
                style={styles.input}
                placeholder="e.g. MDC-GH-2023-8871"
                placeholderTextColor={COLORS.textSubtle}
                value={licenseNumber}
                onChangeText={setLicenseNumber}
                autoCapitalize="characters"
              />
            </View>

            <Text style={styles.label}>Current Hospital Affiliation</Text>
            <View style={styles.inputWrap}>
              <MaterialIcons name="local-hospital" size={18} color={COLORS.textSubtle} />
              <TextInput
                style={styles.input}
                placeholder="e.g. 37 Military Hospital, Accra"
                placeholderTextColor={COLORS.textSubtle}
                value={hospitalAffiliation}
                onChangeText={setHospitalAffiliation}
              />
            </View>

            <Text style={styles.label}>Years in Clinical Practice</Text>
            <View style={styles.inputWrap}>
              <MaterialIcons name="work-outline" size={18} color={COLORS.textSubtle} />
              <TextInput
                style={styles.input}
                placeholder="5"
                placeholderTextColor={COLORS.textSubtle}
                value={yearsOfExperience}
                onChangeText={setYearsOfExperience}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.stepButtonsRow}>
              <TouchableOpacity style={styles.prevBtn} onPress={() => setStep(1)}>
                <Text style={styles.prevBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nextBtn, { flex: 2, marginTop: 0 }]}
                onPress={handleNextStep}
              >
                <Text style={styles.nextBtnText}>Continue to Review</Text>
                <MaterialIcons name="arrow-forward" size={18} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* STEP 3: Bio, Certificate & Final Review */}
        {step === 3 && (
          <View style={styles.card}>
            <Text style={styles.cardHeading}>Clinical Bio & Final Review</Text>

            <Text style={styles.label}>Short Clinical Bio</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Brief overview of clinical expertise and patient approach..."
              placeholderTextColor={COLORS.textSubtle}
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.label}>MDC License Certificate (Optional)</Text>
            <TouchableOpacity style={styles.uploadBox} onPress={handlePickCertificate}>
              <MaterialIcons
                name={pickedCert ? 'check-circle' : 'upload-file'}
                size={20}
                color={COLORS.primary}
              />
              <Text style={styles.uploadBoxText}>
                {pickedCert
                  ? `Attached: ${pickedCert.name}`
                  : 'Attach MDC Certificate (PDF or Image)'}
              </Text>
            </TouchableOpacity>

            {/* Summary Review */}
            <View style={styles.reviewBox}>
              <Text style={styles.reviewTitle}>Application Summary</Text>
              <Text style={styles.reviewRow}>Name: {fullName}</Text>
              <Text style={styles.reviewRow}>Specialty: {specialty}</Text>
              <Text style={styles.reviewRow}>MDC License: {licenseNumber}</Text>
              <Text style={styles.reviewRow}>
                Hospital: {hospitalAffiliation || 'Private Practice'}
              </Text>
              <Text style={styles.reviewRow}>Experience: {yearsOfExperience || '0'} years</Text>
            </View>

            <View style={styles.noticeBox}>
              <MaterialIcons name="verified-user" size={17} color={COLORS.warning} />
              <Text style={styles.noticeDesc}>
                Your account will start in Pending status until verified and approved by our Super Admin.
              </Text>
            </View>

            <View style={styles.stepButtonsRow}>
              <TouchableOpacity style={styles.prevBtn} onPress={() => setStep(2)}>
                <Text style={styles.prevBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, { flex: 2 }, isLoading && styles.btnDisabled]}
                onPress={handleRegister}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.nextBtnText}>Submit Application</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.backLink} onPress={() => navigation.navigate('Login')}>
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
    marginBottom: 14,
  },
  header: {
    marginBottom: 18,
  },
  title: {
    fontSize: 24,
    fontFamily: FONTS.extraBold,
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    paddingHorizontal: 6,
  },
  stepItem: {
    alignItems: 'center',
    gap: 5,
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  stepCircleDone: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  stepNum: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.textMuted,
  },
  stepNumActive: {
    color: COLORS.white,
  },
  stepLabel: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.textSubtle,
  },
  stepLabelActive: {
    color: COLORS.primaryDark,
    fontFamily: FONTS.bold,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.border,
    marginHorizontal: 8,
    marginBottom: 18,
  },
  stepLineActive: {
    backgroundColor: COLORS.success,
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
  cardHeading: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: 14,
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
    marginBottom: 15,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  specialtyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  specChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
  },
  specChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  specChipText: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
  },
  specChipTextActive: {
    color: COLORS.white,
  },
  textArea: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.md,
    padding: 14,
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    height: 88,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  uploadBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    borderStyle: 'dashed',
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  uploadBoxText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.primaryDark,
  },
  reviewBox: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
    marginBottom: 14,
  },
  reviewTitle: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reviewRow: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.warningSoft,
    borderColor: COLORS.warningBorder,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 16,
  },
  noticeDesc: {
    flex: 1,
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: '#92400E',
    lineHeight: 16,
  },
  stepButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  prevBtn: {
    flex: 1,
    height: 50,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prevBtnText: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.textSecondary,
  },
  nextBtn: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  submitBtn: {
    backgroundColor: COLORS.info,
    borderRadius: RADIUS.md,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  nextBtnText: {
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
