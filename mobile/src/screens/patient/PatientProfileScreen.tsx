import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { apiClient } from '../../api/client';
import Avatar from '../../components/Avatar';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../../theme/theme';

export default function PatientProfileScreen({ navigation }: any) {
  const { user, subscription, logout, refreshProfile } = useAuth();
  const { showAlert } = useAlert();
  const [stats, setStats] = useState({ appointments: 0, prescriptions: 0, records: 0 });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleUploadAvatar = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const asset = result.assets[0];
      setIsUploadingAvatar(true);

      const formData = new FormData();
      formData.append('avatar', {
        uri: asset.uri,
        name: asset.name || 'profile.jpg',
        type: asset.mimeType || 'image/jpeg',
      } as any);

      await apiClient.post('/auth/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await refreshProfile();
      showAlert({
        type: 'success',
        title: 'Photo Updated',
        message: 'Your profile picture has been updated.',
      });
    } catch (err: any) {
      showAlert({
        type: 'error',
        title: 'Upload Failed',
        message: err.response?.data?.message || 'Could not upload profile picture.',
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

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
      showAlert({
        type: 'warning',
        title: 'Required Information',
        message: 'Full name and phone number are required.',
      });
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
      showAlert({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your personal details have been saved.',
      });
    } catch (err: any) {
      showAlert({
        type: 'error',
        title: 'Update Failed',
        message: err.response?.data?.message || 'Could not update profile.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmLogout = () => {
    showAlert({
      type: 'confirm',
      title: 'Sign Out',
      message: 'Are you sure you want to sign out of your TeleDoc Ghana account?',
      actions: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ],
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Identity Card */}
      <View style={styles.profileCard}>
        <TouchableOpacity
          style={styles.avatarTouchWrap}
          onPress={handleUploadAvatar}
          disabled={isUploadingAvatar}
          activeOpacity={0.85}
        >
          <Avatar uri={user?.avatarUrl} name={user?.fullName} size={80} borderRadius={26} />
          <View style={styles.cameraBadge}>
            {isUploadingAvatar ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <MaterialIcons name="photo-camera" size={14} color={COLORS.white} />
            )}
          </View>
        </TouchableOpacity>
        <Text style={styles.tapPhotoHint}>Tap photo to update</Text>

        <Text style={styles.userName}>{user?.fullName}</Text>
        <Text style={styles.userPhone}>{user?.phoneNumber}</Text>
        {user?.email ? <Text style={styles.userEmail}>{user.email}</Text> : null}

        <View style={styles.roleBadge}>
          <MaterialIcons name="verified" size={14} color={COLORS.primary} />
          <Text style={styles.roleBadgeText}>Verified Patient Account</Text>
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
          <MaterialIcons name="edit" size={15} color={COLORS.textSecondary} />
          <Text style={styles.editProfileBtnText}>Edit Personal Info</Text>
        </TouchableOpacity>
      </View>

      {/* Health Activity Summary */}
      <View style={styles.statsRow}>
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => navigation.navigate('Schedule')}
        >
          <MaterialIcons name="calendar-today" size={18} color={COLORS.primary} />
          <Text style={styles.statNumber}>{isLoadingStats ? '...' : stats.appointments}</Text>
          <Text style={styles.statLabel}>Visits</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statCard}
          onPress={() => navigation.navigate('Prescriptions')}
        >
          <MaterialIcons name="medication" size={18} color={COLORS.info} />
          <Text style={styles.statNumber}>{isLoadingStats ? '...' : stats.prescriptions}</Text>
          <Text style={styles.statLabel}>Rx</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statCard}
          onPress={() => navigation.navigate('Lab Tests')}
        >
          <MaterialIcons name="science" size={18} color={COLORS.success} />
          <Text style={styles.statNumber}>{isLoadingStats ? '...' : stats.records}</Text>
          <Text style={styles.statLabel}>Labs</Text>
        </TouchableOpacity>
      </View>

      {/* Subscription Card */}
      <View style={styles.planCard}>
        <View style={styles.planHeaderRow}>
          <View>
            <Text style={styles.planOverline}>SUBSCRIPTION TIER</Text>
            <Text style={styles.planTitle}>
              {subscription?.status === 'ACTIVE'
                ? 'Monthly Unlimited (GHS 10/mo)'
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
          <MaterialIcons name="account-balance-wallet" size={16} color="#38BDF8" />
          <Text style={styles.managePlanBtnText}>Manage Plan & Mobile Money</Text>
          <MaterialIcons name="arrow-forward" size={16} color="#38BDF8" />
        </TouchableOpacity>
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleConfirmLogout}>
        <MaterialIcons name="logout" size={18} color={COLORS.danger} />
        <Text style={styles.logoutButtonText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Edit Profile Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Personal Info</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <MaterialIcons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

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
              placeholder="+233 24 000 0001"
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
                  <ActivityIndicator color={COLORS.white} />
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
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: 18,
    gap: 16,
    paddingBottom: 32,
  },
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  avatarTouchWrap: {
    position: 'relative',
    marginBottom: 6,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tapPhotoHint: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.textSubtle,
    marginBottom: 8,
  },
  userName: {
    fontSize: 19,
    fontFamily: FONTS.extraBold,
    color: COLORS.text,
  },
  userPhone: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  userEmail: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    marginTop: 10,
  },
  roleBadgeText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.primaryDark,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
  },
  editProfileBtnText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
    ...SHADOWS.card,
  },
  statNumber: {
    fontSize: 20,
    fontFamily: FONTS.extraBold,
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    color: COLORS.textMuted,
  },
  planCard: {
    backgroundColor: COLORS.navy,
    borderRadius: RADIUS.xl,
    padding: 20,
    gap: 10,
    ...SHADOWS.elevated,
  },
  planHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planOverline: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: '#2DD4BF',
    letterSpacing: 0.8,
  },
  planTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    marginTop: 3,
  },
  planStatusPill: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  planStatusText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
  planDesc: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: '#94A3B8',
    lineHeight: 18,
  },
  managePlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.navyLight,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    marginTop: 4,
  },
  managePlanBtnText: {
    color: '#38BDF8',
    fontSize: 12,
    fontFamily: FONTS.bold,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    borderRadius: RADIUS.md,
    height: 48,
  },
  logoutButtonText: {
    color: COLORS.danger,
    fontSize: 14,
    fontFamily: FONTS.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    gap: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  input: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.textSecondary,
  },
  saveBtn: {
    flex: 2,
    height: 46,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
});
