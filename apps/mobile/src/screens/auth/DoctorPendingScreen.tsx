import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function DoctorPendingScreen() {
  const { user, doctorVerification, refreshProfile, logout, isLoading } = useAuth();

  const isRejected = doctorVerification?.status === 'REJECTED';

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={[styles.iconCircle, isRejected ? styles.iconCircleRed : styles.iconCircleAmber]}>
          <Text style={styles.iconText}>{isRejected ? '❌' : '⏳'}</Text>
        </View>

        <Text style={styles.title}>
          {isRejected ? 'Application Not Approved' : 'Verification In Progress'}
        </Text>

        <Text style={styles.doctorName}>{user?.fullName}</Text>
        <Text style={styles.specialty}>{doctorVerification?.specialty} • MDC: {doctorVerification?.licenseNumber}</Text>

        <View style={[styles.statusBox, isRejected ? styles.statusBoxRed : styles.statusBoxAmber]}>
          <Text style={[styles.statusTitle, isRejected ? styles.statusTitleRed : styles.statusTitleAmber]}>
            Status: {doctorVerification?.status || 'PENDING'}
          </Text>
          <Text style={styles.statusDesc}>
            {isRejected
              ? `Reason: ${doctorVerification?.rejectionReason || 'License information could not be verified.'}`
              : 'Our Super Admin team is validating your medical license credentials with the Medical & Dental Council of Ghana. You will receive an SMS/push notification once approved.'}
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={refreshProfile} disabled={isLoading}>
          <Text style={styles.refreshBtnText}>🔄 Check Verification Status</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircleAmber: {
    backgroundColor: '#fef3c7',
  },
  iconCircleRed: {
    backgroundColor: '#fee2e2',
  },
  iconText: {
    fontSize: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 4,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
  },
  specialty: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 16,
  },
  statusBox: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  statusBoxAmber: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  statusBoxRed: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  statusTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statusTitleAmber: {
    color: '#b45309',
  },
  statusTitleRed: {
    color: '#b91c1c',
  },
  statusDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  refreshBtn: {
    width: '100%',
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  refreshBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  logoutBtn: {
    paddingVertical: 8,
  },
  logoutBtnText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
});
