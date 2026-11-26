import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../../theme/theme';

export default function DoctorPendingScreen() {
  const { user, doctorVerification, refreshProfile, logout, isLoading } = useAuth();

  const isRejected = doctorVerification?.status === 'REJECTED' || doctorVerification?.status === 'SUSPENDED';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <View style={[styles.iconCircle, isRejected ? styles.iconCircleRed : styles.iconCircleAmber]}>
          <MaterialIcons
            name={isRejected ? 'cancel' : 'hourglass-top'}
            size={34}
            color={isRejected ? COLORS.danger : COLORS.warning}
          />
        </View>

        <Text style={styles.title}>
          {isRejected ? 'Account Restricted' : 'Verification In Progress'}
        </Text>

        <Text style={styles.doctorName}>{user?.fullName}</Text>
        <Text style={styles.specialty}>
          {doctorVerification?.specialty} · MDC: {doctorVerification?.licenseNumber}
        </Text>

        <View style={[styles.statusBox, isRejected ? styles.statusBoxRed : styles.statusBoxAmber]}>
          <Text style={[styles.statusTitle, isRejected ? styles.statusTitleRed : styles.statusTitleAmber]}>
            Status: {doctorVerification?.status || 'PENDING'}
          </Text>
          <Text style={styles.statusDesc}>
            {isRejected
              ? `Reason: ${doctorVerification?.rejectionReason || 'License credentials could not be verified.'}`
              : 'Our Super Admin team is validating your credentials with the Medical & Dental Council of Ghana. You will be notified once approved.'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={refreshProfile}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          <MaterialIcons name="refresh" size={18} color={COLORS.white} />
          <Text style={styles.refreshBtnText}>Check Verification Status</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <MaterialIcons name="logout" size={16} color={COLORS.textMuted} />
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    padding: 22,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 26,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.elevated,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircleAmber: {
    backgroundColor: COLORS.warningSoft,
  },
  iconCircleRed: {
    backgroundColor: COLORS.dangerSoft,
  },
  title: {
    fontSize: 20,
    fontFamily: FONTS.extraBold,
    color: COLORS.text,
    marginBottom: 4,
  },
  doctorName: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.textSecondary,
  },
  specialty: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
    marginTop: 2,
    marginBottom: 18,
  },
  statusBox: {
    width: '100%',
    padding: 16,
    borderRadius: RADIUS.lg,
    marginBottom: 20,
    borderWidth: 1,
  },
  statusBoxAmber: {
    backgroundColor: COLORS.warningSoft,
    borderColor: COLORS.warningBorder,
  },
  statusBoxRed: {
    backgroundColor: COLORS.dangerSoft,
    borderColor: COLORS.dangerBorder,
  },
  statusTitle: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  statusTitleAmber: {
    color: '#B45309',
  },
  statusTitleRed: {
    color: COLORS.danger,
  },
  statusDesc: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  refreshBtn: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  refreshBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontFamily: FONTS.bold,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  logoutBtnText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontFamily: FONTS.semiBold,
  },
});
