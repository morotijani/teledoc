import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Linking,
  Alert,
} from 'react-native';
import { apiClient, API_URL } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function DoctorDashboardScreen({ navigation }: any) {
  const { user, doctorVerification, logout } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Patient Lab Records Modal State
  const [recordsModalVisible, setRecordsModalVisible] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patientRecords, setPatientRecords] = useState<any[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);

  useEffect(() => {
    fetchDoctorAppointments();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchDoctorAppointments();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchDoctorAppointments = async () => {
    try {
      const res = await apiClient.get('/doctors/my/appointments');
      setAppointments(res.data.appointments || []);
    } catch (err) {
      console.error('Failed to load doctor appointments:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleOpenPatientRecords = async (patient: any) => {
    setSelectedPatient(patient);
    setRecordsModalVisible(true);
    setIsLoadingRecords(true);
    try {
      const res = await apiClient.get(`/records/patient/${patient.id}`);
      setPatientRecords(res.data.records || []);
    } catch (err: any) {
      Alert.alert(
        'Records Error',
        err.response?.data?.message || 'Could not load patient medical records.'
      );
      setPatientRecords([]);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  const handleOpenDocument = async (rawUrl: string) => {
    if (!rawUrl) return;
    const baseServer = API_URL.replace('/api/v1', '');
    const resolvedUrl = rawUrl.replace(/http:\/\/localhost:\d+/, baseServer);
    try {
      await Linking.openURL(resolvedUrl);
    } catch {
      Alert.alert('Cannot Open File', `Document URL: ${resolvedUrl}`);
    }
  };

  const renderAppointment = ({ item }: { item: any }) => {
    const isLive = item.status === 'CONFIRMED' || item.status === 'IN_PROGRESS';
    const isCompleted = item.status === 'COMPLETED';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.patientName}>{item.patient.fullName}</Text>
            <Text style={styles.patientContact}>Tel: {item.patient.phoneNumber}</Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              item.status === 'CONFIRMED'
                ? styles.badgeConfirmed
                : item.status === 'IN_PROGRESS'
                ? styles.badgeInProgress
                : styles.badgeCompleted,
            ]}
          >
            <Text style={styles.statusBadgeText}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.timeBox}>
          <Text style={styles.timeText}>
            📅 {new Date(item.scheduledStart).toLocaleDateString()} •{' '}
            {new Date(item.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
            {new Date(item.scheduledEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        {item.symptomsDescription ? (
          <Text style={styles.symptomsText}>
            <Text style={{ fontWeight: '700' }}>Reported Symptoms: </Text>
            {item.symptomsDescription}
          </Text>
        ) : null}

        {/* Action Controls */}
        <View style={styles.cardActions}>
          {isLive && (
            <TouchableOpacity
              style={styles.launchCallBtn}
              onPress={() =>
                navigation.navigate('ConsultationRoom', {
                  appointmentId: item.id,
                  doctorName: user?.fullName,
                  patientName: item.patient.fullName,
                  channelId: item.meetingChannelId,
                  isDoctor: true,
                })
              }
            >
              <Text style={styles.launchCallBtnText}>📹 Launch Agora Video Call</Text>
            </TouchableOpacity>
          )}

          <View style={styles.secondaryActionRow}>
            <TouchableOpacity
              style={[styles.notesBtn, { flex: 1 }]}
              onPress={() =>
                navigation.navigate('PostConsultation', {
                  appointment: item,
                })
              }
            >
              <Text style={styles.notesBtnText}>
                {isCompleted ? '📝 Review Notes & Rx' : '📋 Write Notes & Rx'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.labFilesBtn}
              onPress={() => handleOpenPatientRecords(item.patient)}
            >
              <Text style={styles.labFilesBtnText}>🧪 Lab Files</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Clinical Workspace Banner */}
      <View style={styles.doctorBanner}>
        <View style={styles.bannerRow}>
          <View>
            <Text style={styles.doctorTitle}>{user?.fullName}</Text>
            <Text style={styles.doctorSpecialty}>
              {doctorVerification?.specialty} • MDC: {doctorVerification?.licenseNumber}
            </Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.scheduleRow}>
          <Text style={styles.verifiedText}>✓ Super Admin Verified Clinician</Text>
          <TouchableOpacity
            style={styles.manageScheduleBtn}
            onPress={() => navigation.navigate('DoctorSchedule')}
          >
            <Text style={styles.manageScheduleText}>⚙️ Edit Weekly Hours</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Appointment Queue Header */}
      <View style={styles.queueHeader}>
        <Text style={styles.queueTitle}>Consultation Schedule ({appointments.length})</Text>
        <TouchableOpacity onPress={fetchDoctorAppointments}>
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Loading clinical queue...</Text>
        </View>
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(item) => item.id}
          renderItem={renderAppointment}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchDoctorAppointments();
              }}
              colors={['#059669']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🩺</Text>
              <Text style={styles.emptyTitle}>No Booked Patients</Text>
              <Text style={styles.emptyText}>
                Upcoming patient appointments for the day or week will appear here automatically.
              </Text>
            </View>
          }
        />
      )}

      {/* Patient Uploaded Lab Results & Medical Files Modal */}
      <Modal visible={recordsModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {selectedPatient?.fullName}'s Medical Files
                </Text>
                <Text style={styles.modalSub}>
                  Lab reports, imaging & clinical records
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setRecordsModalVisible(false)}
              >
                <Text style={styles.closeBtnText}>Close ✕</Text>
              </TouchableOpacity>
            </View>

            {isLoadingRecords ? (
              <View style={{ padding: 30, alignItems: 'center' }}>
                <ActivityIndicator color="#059669" />
              </View>
            ) : (
              <FlatList
                data={patientRecords}
                keyExtractor={(r) => r.id}
                style={{ maxHeight: 360 }}
                contentContainerStyle={{ gap: 10, paddingVertical: 8 }}
                renderItem={({ item: rec }) => (
                  <View style={styles.recordItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recordTitle}>
                        {rec.fileType === 'LAB_RESULT' ? '🧪 ' : '📄 '}
                        {rec.title}
                      </Text>
                      <Text style={styles.recordMeta}>
                        {rec.fileType} • {new Date(rec.createdAt).toLocaleDateString()}
                      </Text>
                      {rec.notes ? (
                        <Text style={styles.recordNotes}>Note: {rec.notes}</Text>
                      ) : null}
                    </View>
                    {rec.fileUrl ? (
                      <TouchableOpacity
                        style={styles.openDocBtn}
                        onPress={() => handleOpenDocument(rec.fileUrl)}
                      >
                        <Text style={styles.openDocBtnText}>Open ↗</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                )}
                ListEmptyComponent={
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <Text style={{ color: '#64748b', fontSize: 13 }}>
                      No lab results or medical documents uploaded by this patient yet.
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  doctorBanner: {
    backgroundColor: '#0f172a',
    padding: 20,
    gap: 12,
  },
  bannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  doctorTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
  },
  doctorSpecialty: {
    fontSize: 12,
    color: '#38bdf8',
    fontWeight: '700',
    marginTop: 2,
  },
  logoutBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '700',
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  verifiedText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '800',
  },
  manageScheduleBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  manageScheduleText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  queueTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  refreshText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  patientName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  patientContact: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeConfirmed: {
    backgroundColor: '#ecfdf5',
  },
  badgeInProgress: {
    backgroundColor: '#e0f2fe',
  },
  badgeCompleted: {
    backgroundColor: '#f1f5f9',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#334155',
  },
  timeBox: {
    backgroundColor: '#f8fafc',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  symptomsText: {
    fontSize: 12,
    color: '#475569',
    marginTop: 8,
    lineHeight: 16,
  },
  cardActions: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 8,
  },
  launchCallBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  launchCallBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  secondaryActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  notesBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  notesBtnText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '800',
  },
  labFilesBtn: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labFilesBtnText: {
    color: '#0284c7',
    fontSize: 12,
    fontWeight: '800',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#64748b',
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#334155',
  },
  emptyText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748b',
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  recordTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  recordMeta: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  recordNotes: {
    fontSize: 11,
    color: '#475569',
    marginTop: 4,
  },
  openDocBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  openDocBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
});
