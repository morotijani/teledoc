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
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { apiClient } from '../../api/client';
import Avatar from '../../components/Avatar';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../../theme/theme';

export default function DoctorProfileScreen({ navigation }: any) {
  const { user, doctorVerification, logout, refreshProfile } = useAuth();
  const { showAlert } = useAlert();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [email, setEmail] = useState(user?.email || '');
  const [specialty, setSpecialty] = useState(doctorVerification?.specialty || '');
  const [hospitalAffiliation, setHospitalAffiliation] = useState(
    doctorVerification?.hospitalAffiliation || ''
  );
  const [yearsOfExperience, setYearsOfExperience] = useState(
    String(doctorVerification?.yearsOfExperience ?? '')
  );
  const [consultationFee, setConsultationFee] = useState(
    String(doctorVerification?.consultationFee ?? '0')
  );
  const [bio, setBio] = useState(doctorVerification?.bio || '');
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
        name: asset.name || 'doctor_avatar.jpg',
        type: asset.mimeType || 'image/jpeg',
      } as any);

      await apiClient.post('/auth/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await refreshProfile();
      showAlert({
        type: 'success',
        title: 'Profile Picture Updated',
        message: 'Patients will now see your updated clinical photo.',
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
    refreshProfile();
  }, []);

  const openEditModal = () => {
    setFullName(user?.fullName || '');
    setPhoneNumber(user?.phoneNumber || '');
    setEmail(user?.email || '');
    setSpecialty(doctorVerification?.specialty || '');
    setHospitalAffiliation(doctorVerification?.hospitalAffiliation || '');
    setYearsOfExperience(String(doctorVerification?.yearsOfExperience ?? 0));
    setConsultationFee(String(doctorVerification?.consultationFee ?? 0));
    setBio(doctorVerification?.bio || '');
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim() || !phoneNumber.trim() || !specialty.trim()) {
      showAlert({
        type: 'warning',
        title: 'Required Information',
        message: 'Full name, phone number, and medical specialty are required.',
      });
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.put('/doctors/my/profile', {
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim(),
        specialty: specialty.trim(),
        hospitalAffiliation: hospitalAffiliation.trim(),
        yearsOfExperience: parseInt(yearsOfExperience, 10) || 0,
        consultationFee: parseFloat(consultationFee) || 0,
        bio: bio.trim(),
      });
      await refreshProfile();
      setEditModalVisible(false);
      showAlert({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your clinical profile and contact details have been saved.',
      });
    } catch (err: any) {
      showAlert({
        type: 'error',
        title: 'Update Failed',
        message: err.response?.data?.message || 'Could not update doctor profile.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmLogout = () => {
    showAlert({
      type: 'confirm',
      title: 'Sign Out',
      message: 'Are you sure you want to sign out of your clinician workspace?',
      actions: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ],
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Identity Hero Card */}
        <View style={styles.heroCard}>
          <TouchableOpacity
            style={styles.avatarTouchWrap}
            onPress={handleUploadAvatar}
            disabled={isUploadingAvatar}
            activeOpacity={0.85}
          >
            <Avatar uri={user?.avatarUrl} name={user?.fullName} size={82} borderRadius={26} dark />
            <View style={styles.cameraBadge}>
              {isUploadingAvatar ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <MaterialIcons name="photo-camera" size={14} color={COLORS.white} />
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.tapPhotoHint}>Tap photo to update</Text>

          <Text style={styles.doctorName}>{user?.fullName}</Text>
          <Text style={styles.specialtyText}>{doctorVerification?.specialty}</Text>

          <View style={styles.mdcBadge}>
            <MaterialIcons name="verified" size={14} color={COLORS.primary} />
            <Text style={styles.mdcBadgeText}>MDC: {doctorVerification?.licenseNumber}</Text>
          </View>

          <TouchableOpacity style={styles.editBtn} onPress={openEditModal}>
            <MaterialIcons name="edit" size={16} color={COLORS.white} />
            <Text style={styles.editBtnText}>Edit Clinical Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Clinical Details Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Clinical Credentials & Details</Text>

          <View style={styles.infoRow}>
            <MaterialIcons name="local-hospital" size={18} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Hospital Affiliation</Text>
              <Text style={styles.infoValue}>
                {doctorVerification?.hospitalAffiliation || 'Not set'}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="work-outline" size={18} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Clinical Experience</Text>
              <Text style={styles.infoValue}>
                {doctorVerification?.yearsOfExperience ?? 0} years
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="payments" size={18} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Consultation Fee</Text>
              <Text style={styles.infoValue}>
                {parseFloat(String(doctorVerification?.consultationFee ?? 0)) === 0
                  ? 'Included in Patient Plan (GHS 0)'
                  : `GHS ${doctorVerification?.consultationFee}`}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="phone-android" size={18} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Contact Phone</Text>
              <Text style={styles.infoValue}>{user?.phoneNumber}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="mail-outline" size={18} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Email Address</Text>
              <Text style={styles.infoValue}>{user?.email || 'Not set'}</Text>
            </View>
          </View>

          {doctorVerification?.bio ? (
            <View style={styles.bioBox}>
              <Text style={styles.infoLabel}>Clinical Bio</Text>
              <Text style={styles.bioText}>{doctorVerification.bio}</Text>
            </View>
          ) : null}
        </View>

        {/* Quick Actions */}
        <TouchableOpacity
          style={styles.menuRowBtn}
          onPress={() => navigation.navigate('Hours')}
        >
          <View style={styles.menuIconWrap}>
            <MaterialIcons name="schedule" size={20} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>Manage Weekly Consultation Hours</Text>
            <Text style={styles.menuSub}>Configure active days and 30-minute booking slots</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={COLORS.textSubtle} />
        </TouchableOpacity>

        {/* Sign Out */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleConfirmLogout}>
          <MaterialIcons name="logout" size={18} color={COLORS.danger} />
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Edit Profile Bottom-Sheet Modal */}
        <Modal visible={editModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Update Doctor Profile</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <MaterialIcons name="close" size={22} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Dr. Full Name"
                />

                <Text style={styles.label}>Specialty</Text>
                <TextInput
                  style={styles.input}
                  value={specialty}
                  onChangeText={setSpecialty}
                  placeholder="e.g. Cardiology"
                />

                <Text style={styles.label}>Hospital Affiliation</Text>
                <TextInput
                  style={styles.input}
                  value={hospitalAffiliation}
                  onChangeText={setHospitalAffiliation}
                  placeholder="e.g. Korle-Bu Teaching Hospital, Accra"
                />

                <View style={styles.twoCol}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Experience (Years)</Text>
                    <TextInput
                      style={styles.input}
                      value={yearsOfExperience}
                      onChangeText={setYearsOfExperience}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Fee (GHS)</Text>
                    <TextInput
                      style={styles.input}
                      value={consultationFee}
                      onChangeText={setConsultationFee}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                />

                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <Text style={styles.label}>Clinical Bio</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  numberOfLines={3}
                  placeholder="Brief overview of your clinical focus..."
                />
              </ScrollView>

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
    padding: 18,
    gap: 16,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: COLORS.navy,
    borderRadius: RADIUS.xl,
    padding: 22,
    alignItems: 'center',
    ...SHADOWS.elevated,
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
    borderColor: COLORS.navy,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tapPhotoHint: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: '#94A3B8',
    marginBottom: 8,
  },
  doctorName: {
    fontSize: 19,
    fontFamily: FONTS.extraBold,
    color: COLORS.white,
    textAlign: 'center',
  },
  specialtyText: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: '#38BDF8',
    marginTop: 2,
  },
  mdcBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    marginTop: 10,
  },
  mdcBadgeText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.primaryDark,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  editBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontFamily: FONTS.bold,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 14,
    ...SHADOWS.card,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSubtle,
  },
  infoValue: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginTop: 1,
  },
  bioBox: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    padding: 12,
    marginTop: 4,
  },
  bioText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 19,
    marginTop: 4,
  },
  menuRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTitle: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  menuSub: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 1,
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
  label: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
    marginTop: 10,
    marginBottom: 5,
  },
  input: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 10,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
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
