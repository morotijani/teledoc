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
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen({ navigation }: any) {
  const [identifier, setIdentifier] = useState('+233240000004'); // default demo patient
  const [password, setPassword] = useState('Password123!');
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Branding */}
        <View style={styles.brandHeader}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>🩺</Text>
          </View>
          <Text style={styles.appTitle}>TeleDoc Ghana</Text>
          <Text style={styles.appSubtitle}>Accredited Teleconsultations & Digital Healthcare</Text>
        </View>

        {/* Demo Fast Logins for Easy Evaluation */}
        <View style={styles.demoCard}>
          <Text style={styles.demoTitle}>🚀 Quick Test Accounts:</Text>
          <View style={styles.demoButtonsRow}>
            <TouchableOpacity
              style={[styles.demoBadge, identifier.includes('4') && styles.demoBadgeActive]}
              onPress={() => setDemoUser('+233240000004')}
            >
              <Text style={styles.demoBadgeText}>Patient (Kwame)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.demoBadge, identifier.includes('2') && styles.demoBadgeActive]}
              onPress={() => setDemoUser('dr.mensah@teledoc.gh')}
            >
              <Text style={styles.demoBadgeText}>Dr. Mensah (Active)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.demoBadge, identifier.includes('3') && styles.demoBadgeActive]}
              onPress={() => setDemoUser('dr.boateng@teledoc.gh')}
            >
              <Text style={styles.demoBadgeText}>Dr. Boateng (Pending)</Text>
            </TouchableOpacity>
          </View>
        </View>

        {errorMsg ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Form Fields */}
        <View style={styles.formContainer}>
          <Text style={styles.label}>Phone Number or Email</Text>
          <TextInput
            style={styles.input}
            placeholder="+233... or user@example.com"
            placeholderTextColor="#94a3b8"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#94a3b8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.loginBtn, isLoading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginBtnText}>Sign In</Text>
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
              New Patient? <Text style={styles.linkHighlight}>Sign Up (3 Months Free)</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.doctorRegisterLink}
            onPress={() => navigation.navigate('RegisterDoctor')}
          >
            <Text style={styles.doctorRegisterText}>
              Are you a licensed doctor? <Text style={styles.doctorHighlight}>Apply to Consult</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 24,
    justifyContent: 'center',
    minHeight: '100%',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoText: {
    fontSize: 32,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  demoCard: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 20,
  },
  demoTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  demoButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  demoBadge: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  demoBadgeActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  demoBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '600',
  },
  formContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  label: {
    fontSize: 12,
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
  loginBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  footerLinks: {
    marginTop: 24,
    alignItems: 'center',
    gap: 12,
  },
  registerLink: {
    paddingVertical: 4,
  },
  registerLinkText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  linkHighlight: {
    color: '#059669',
    fontWeight: '800',
  },
  doctorRegisterLink: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  doctorRegisterText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  doctorHighlight: {
    color: '#0284c7',
    fontWeight: '800',
  },
});
