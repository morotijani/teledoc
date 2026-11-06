import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Doctor Application</Text>
        <Text style={styles.subtitle}>
          Join the TeleDoc clinician network. Verified by the Medical & Dental Council (MDC).
        </Text>

        <View style={styles.noticeBox}>
          <Text style={styles.noticeTitle}>📋 Mandatory Credential Verification</Text>
          <Text style={styles.noticeDesc}>
            To safeguard patient safety, new doctor accounts default to PENDING status and cannot accept bookings until reviewed and approved by our Super Admin.
          </Text>
        </View>
      </View>

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.label}>Full Name (including title)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Dr. Ama Serwaa, MD"
          placeholderTextColor="#94a3b8"
          value={fullName}
          onChangeText={setFullName}
        />

        <Text style={styles.label}>Ghana Medical License / MDC Number</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. MDC-GH-2023-8871"
          placeholderTextColor="#94a3b8"
          value={licenseNumber}
          onChangeText={setLicenseNumber}
          autoCapitalize="characters"
        />

        <Text style={styles.label}>Medical Specialty</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Pediatrics, Cardiology, Obstetrics"
          placeholderTextColor="#94a3b8"
          value={specialty}
          onChangeText={setSpecialty}
        />

        <Text style={styles.label}>Current Hospital Affiliation</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 37 Military Hospital, Accra"
          placeholderTextColor="#94a3b8"
          value={hospitalAffiliation}
          onChangeText={setHospitalAffiliation}
        />

        <Text style={styles.label}>Years in Clinical Practice</Text>
        <TextInput
          style={styles.input}
          placeholder="5"
          placeholderTextColor="#94a3b8"
          value={yearsOfExperience}
          onChangeText={setYearsOfExperience}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={styles.input}
          placeholder="+233 24 000 0000"
          placeholderTextColor="#94a3b8"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Official / Professional Email</Text>
        <TextInput
          style={styles.input}
          placeholder="dr.ama@hospital.gov.gh"
          placeholderTextColor="#94a3b8"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Create Password</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#94a3b8"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Text style={styles.label}>Short Bio / Clinical Focus</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Brief overview of clinical expertise and patient approach..."
          placeholderTextColor="#94a3b8"
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity
          style={[styles.submitBtn, isLoading && styles.btnDisabled]}
          onPress={handleRegister}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 24,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '500',
  },
  noticeBox: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginTop: 14,
  },
  noticeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#b45309',
    marginBottom: 2,
  },
  noticeDesc: {
    fontSize: 11,
    color: '#92400e',
    lineHeight: 16,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  backLink: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 8,
  },
  backLinkText: {
    fontSize: 13,
    color: '#64748b',
  },
  linkBold: {
    color: '#0284c7',
    fontWeight: '800',
  },
});
