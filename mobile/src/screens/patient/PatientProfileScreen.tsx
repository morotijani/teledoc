import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';

export default function PatientProfileScreen({ navigation }: any) {
  const { user, subscription, logout, refreshProfile } = useAuth();
  const [stats, setStats] = useState({ appointments: 0, prescriptions: 0, records: 0 });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Edit profile modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPatientSummary();
  }, []);

  const fetchPatientSummary = async () => {
    if (!user) return;
    setIsLoadingStats(true);
    try {
      const [apptsRes, recsRes] = await Promise.all([
        apiClient.get('/appointments/my'),
        apiClient.get(`/records/patient/${user.id}`),
      ]);

      const appts = apptsRes.data.appointments || [];
      let rxCount = 0;
      appts.forEach((a: any) => {
        if (a.consultation?.prescriptions?.length) {
          rxCount += a.consultation.prescriptions.length;
        }
      });

      setStats({
        appointments: appts.length,
        prescriptions: rxCount,
        records: (recsRes.data.records || []).length,
      });
    } catch (err) {
      console.error('Failed to load patient summary stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim() || !phoneNumber.trim()) {
      Alert.alert('Required', 'Full name and phone number are required.');
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.put('/auth/profile', {
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim(),
      });
      await refreshProfile();
      setEditModalVisible(false);
      Alert.alert('Profile Updated', 'Your personal details have been saved.');
    } catch (err: any) {
      Alert.alert('Update Failed', err.response?.data?.message || 'Could not update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of your TeleDoc Ghana account?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Identity Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitials}>
            {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'P'}
          </Text>
        </View>

        <Text style={styles.userName}>{user?.fullName}</Text>
        <Text style={styles.userPhone}>{user?.phoneNumber}</Text>
        {user?.email ? <Text style={styles.userEmail}>{user.email}</Text> : null}

        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>✓ Verified Patient Account</Text>
        </View>

        <TouchableOpacity
          style={styles.editProfileBtn}
          onPress={() => {
            setFullName(user?.fullName || '');
            setPhoneNumber(user?.phoneNumber || '');
            setEmail(user?.email || '');
            setEditModalVisible(true);
          }}
        >
          <Text style={styles.editProfileBtnText}>✏️ Edit Personal Info</Text>
        </TouchableOpacity>
      </View>

      {/* Health Activity Summary */}
      <View style={styles.statsRow}>
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => navigation.navigate('Schedule')}
        >
          <Text style={styles.statNumber}>{isLoadingStats ? '...' : stats.appointments}</Text>
          <Text style={styles.statLabel}>Consultations</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statCard}
          onPress={() => navigation.navigate('Prescriptions')}
        >
          <Text style={styles.statNumber}>{isLoadingStats ? '...' : stats.prescriptions}</Text>
          <Text style={styles.statLabel}>e-Prescriptions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statCard}
          onPress={() => navigation.navigate('Lab Tests')}
        >
          <Text style={styles.statNumber}>{isLoadingStats ? '...' : stats.records}</Text>
          <Text style={styles.statLabel}>Lab Reports</Text>
        </TouchableOpacity>
      </View>

      {/* Subscription & Billing Card */}
      <View style={styles.planCard}>
        <View style={styles.planHeaderRow}>
          <View>
            <Text style={styles.planOverline}>SUBSCRIPTION TIER</Text>
            <Text style={styles.planTitle}>
              {subscription?.status === 'ACTIVE'
                ? 'Monthly Unlimited (10 GHS/mo)'
                : '90-Day Free Trial'}
            </Text>
          </View>
          <View style={styles.planStatusPill}>
            <Text style={styles.planStatusText}>{subscription?.status || 'TRIAL'}</Text>
          </View>
        </View>

        <Text style={styles.planDesc}>
          {subscription?.status === 'TRIAL'
            ? `You have ${subscription?.trialDaysRemaining ?? 90} days remaining on your 3-month free trial.`
            : 'Your Mobile Money subscription is active with full access to all doctors.'}
        </Text>

        <TouchableOpacity
          style={styles.managePlanBtn}
          onPress={() => navigation.navigate('Plan & MoMo')}
        >
          <Text style={styles.managePlanBtnText}>💳 Manage Plan & Mobile Money Billing →</Text>
        </TouchableOpacity>
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleConfirmLogout}>
        <Text style={styles.logoutButtonText}>🚪 Sign Out of Account</Text>
      </TouchableOpacity>

      {/* Edit Profile Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Patient Profile</Text>

            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Full Name"
            />

            <Text style={styles.inputLabel}>Ghana Phone Number (MoMo)</Text>
            <TextInput
              style={styles.input}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              placeholder="0244000001"
            />

            <Text style={styles.inputLabel}>Email Address (Optional)</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="patient@teledoc.gh"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditModalVisible(false)}
                disabled={isSaving}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveProfile}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 18,
    gap: 16,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ecfdf5',
    borderWidth: 2,
    borderColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: '900',
    color: '#059669',
  },
  userName: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0f172a',
  },
  userPhone: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginTop: 2,
  },
  userEmail: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  editProfileBtn: {
    marginTop: 14,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  editProfileBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: '#059669',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 2,
  },
  planCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 18,
    gap: 10,
  },
  planHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planOverline: {
    fontSize: 10,
    fontWeight: '800',
    color: '#34d399',
    letterSpacing: 0.8,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 2,
  },
  planStatusPill: {
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  planStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
  planDesc: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 18,
  },
  managePlanBtn: {
    backgroundColor: '#1e293b',
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  managePlanBtnText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '800',
  },
  logoutButton: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  logoutButtonText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0f172a',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#059669',
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
});
