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
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiClient, API_URL } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { useDocumentViewer } from '../../context/DocumentViewerContext';
import Avatar from '../../components/Avatar';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../../theme/theme';

export default function DoctorDashboardScreen({ navigation }: any) {
  const { user, doctorVerification, logout } = useAuth();
  const { showAlert } = useAlert();
  const { openDocument } = useDocumentViewer();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      showAlert({
        type: 'error',
        title: 'Records Error',
        message: err.response?.data?.message || 'Could not load patient medical records.',
      });
      setPatientRecords([]);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  const handleOpenDocument = (rawUrl: string, title?: string) => {
    if (!rawUrl) return;
    setRecordsModalVisible(false);
    openDocument(rawUrl, title);
  };

  const getStatusStyle = (status: string) => {
    if (status === 'CONFIRMED') return { bg: COLORS.successSoft, text: COLORS.success };
    if (status === 'IN_PROGRESS') return { bg: COLORS.infoSoft, text: COLORS.info };
    return { bg: COLORS.surfaceMuted, text: COLORS.textSecondary };
  };

  const renderAppointment = ({ item }: { item: any }) => {
    const isLive = item.status === 'CONFIRMED' || item.status === 'IN_PROGRESS';
    const isCompleted = item.status === 'COMPLETED';
    const badge = getStatusStyle(item.status);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.patientRow}>
            <Avatar uri={item.patient.avatarUrl} name={item.patient.fullName} size={44} borderRadius={14} />
            <View style={{ flex: 1 }}>
              <Text style={styles.patientName}>{item.patient.fullName}</Text>
              <Text style={styles.patientContact}>{item.patient.phoneNumber}</Text>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.statusBadgeText, { color: badge.text }]}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.timeBox}>
          <MaterialIcons name="schedule" size={15} color={COLORS.primary} />
          <Text style={styles.timeText}>
            {new Date(item.scheduledStart).toLocaleDateString()} ·{' '}
            {new Date(item.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
            {new Date(item.scheduledEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        {item.symptomsDescription ? (
          <Text style={styles.symptomsText}>
            <Text style={styles.symptomsLabel}>Symptoms: </Text>
            {item.symptomsDescription}
          </Text>
        ) : null}

        <View style={styles.cardActions}>
          {isLive && (
            <TouchableOpacity
              style={styles.launchCallBtn}
              activeOpacity={0.85}
              onPress={() =>
                showAlert({
                  type: 'info',
                  title: `Call ${item.patient.fullName}`,
                  message: 'Choose In-App Video Call or dial their phone directly.',
                  actions: [
                    {
                      text: 'In-App Video Call',
                      style: 'primary',
                      onPress: () =>
                        navigation.navigate('ConsultationRoom', {
                          appointmentId: item.id,
                          doctorName: user?.fullName,
                          patientName: item.patient.fullName,
                          channelId: item.meetingChannelId,
                          isDoctor: true,
                        }),
                    },
                    ...(item.patient.phoneNumber
                      ? [
                          {
                            text: `Phone Dial (${item.patient.phoneNumber})`,
                            style: 'primary' as const,
                            onPress: () => Linking.openURL(`tel:${item.patient.phoneNumber}`),
                          },
                        ]
                      : []),
                    { text: 'Cancel', style: 'cancel' },
                  ],
                })
              }
            >
              <MaterialIcons name="call" size={18} color={COLORS.white} />
              <Text style={styles.launchCallBtnText}>Call Patient</Text>
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
              <MaterialIcons name="edit-note" size={17} color={COLORS.textSecondary} />
              <Text style={styles.notesBtnText}>
                {isCompleted ? 'Review Notes & Rx' : 'Notes & Rx'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.labFilesBtn}
              onPress={() =>
                navigation.navigate('DirectChat', {
                  appointmentId: item.id,
                  participantName: item.patient.fullName,
                  participantPhone: item.patient.phoneNumber,
                  participantAvatar: item.patient.avatarUrl,
                  channelId: item.meetingChannelId,
                  isDoctor: true,
                })
              }
            >
              <MaterialIcons name="chat-bubble-outline" size={16} color={COLORS.primary} />
              <Text style={[styles.labFilesBtnText, { color: COLORS.primary }]}>Chat</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.labFilesBtn}
              onPress={() => handleOpenPatientRecords(item.patient)}
            >
              <MaterialIcons name="science" size={16} color={COLORS.info} />
              <Text style={styles.labFilesBtnText}>Labs</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Clinical Header */}
        <View style={styles.doctorBanner}>
          <View style={styles.bannerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerOverline}>CLINICAL WORKSPACE</Text>
              <Text style={styles.doctorTitle}>{user?.fullName}</Text>
              <Text style={styles.doctorSpecialty}>
                {doctorVerification?.specialty} · MDC {doctorVerification?.licenseNumber}
              </Text>
            </View>
            <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
              <MaterialIcons name="logout" size={16} color={COLORS.white} />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.scheduleRow}>
            <View style={styles.verifiedBadge}>
              <MaterialIcons name="verified" size={14} color="#2DD4BF" />
              <Text style={styles.verifiedText}>MDC Verified Clinician</Text>
            </View>
            <TouchableOpacity
              style={styles.manageScheduleBtn}
              onPress={() => navigation.navigate('DoctorSchedule')}
            >
              <MaterialIcons name="schedule" size={14} color="#CBD5E1" />
              <Text style={styles.manageScheduleText}>Weekly Hours</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Queue Header */}
        <View style={styles.queueHeader}>
          <Text style={styles.queueTitle}>Appointments ({appointments.length})</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={fetchDoctorAppointments}>
            <MaterialIcons name="refresh" size={15} color={COLORS.primary} />
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {isLoading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading clinical queue...</Text>
          </View>
        ) : (
          <FlatList
            data={appointments}
            keyExtractor={(item) => item.id}
            renderItem={renderAppointment}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchDoctorAppointments();
                }}
                tintColor={COLORS.primary}
                colors={[COLORS.primary]}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <MaterialIcons name="event-note" size={30} color={COLORS.textSubtle} />
                </View>
                <Text style={styles.emptyTitle}>No Booked Patients</Text>
                <Text style={styles.emptyText}>
                  Upcoming patient appointments will appear here automatically.
                </Text>
              </View>
            }
          />
        )}

        {/* Patient Lab Results Modal */}
        <Modal visible={recordsModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>
                    {selectedPatient?.fullName}'s Medical Files
                  </Text>
                  <Text style={styles.modalSub}>Lab reports, imaging & clinical records</Text>
                </View>
                <TouchableOpacity onPress={() => setRecordsModalVisible(false)}>
                  <MaterialIcons name="close" size={22} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              {isLoadingRecords ? (
                <View style={{ padding: 30, alignItems: 'center' }}>
                  <ActivityIndicator color={COLORS.primary} />
                </View>
              ) : (
                <FlatList
                  data={patientRecords}
                  keyExtractor={(r) => r.id}
                  style={{ maxHeight: 360 }}
                  contentContainerStyle={{ gap: 10, paddingVertical: 8 }}
                  renderItem={({ item: rec }) => (
                    <View style={styles.recordItem}>
                      <View style={styles.recordIconBox}>
                        <MaterialIcons
                          name={rec.fileType === 'LAB_RESULT' ? 'science' : 'description'}
                          size={18}
                          color={COLORS.primary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.recordTitle}>{rec.title}</Text>
                        <Text style={styles.recordMeta}>
                          {rec.fileType.replace('_', ' ')} · {new Date(rec.createdAt).toLocaleDateString()}
                        </Text>
                        {rec.notes ? <Text style={styles.recordNotes}>Note: {rec.notes}</Text> : null}
                      </View>
                      {rec.fileUrl ? (
                        <TouchableOpacity
                          style={styles.openDocBtn}
                          onPress={() => handleOpenDocument(rec.fileUrl, rec.title)}
                        >
                          <Text style={styles.openDocBtnText}>View</Text>
                          <MaterialIcons name="visibility" size={13} color={COLORS.white} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  )}
                  ListEmptyComponent={
                    <View style={{ padding: 24, alignItems: 'center' }}>
                      <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: FONTS.medium }}>
                        No lab results uploaded by this patient yet.
                      </Text>
                    </View>
                  }
                />
              )}
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.navy,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  doctorBanner: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 18,
    gap: 14,
  },
  bannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  bannerOverline: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: '#2DD4BF',
    letterSpacing: 1,
    marginBottom: 2,
  },
  doctorTitle: {
    fontSize: 20,
    fontFamily: FONTS.extraBold,
    color: COLORS.white,
  },
  doctorSpecialty: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: '#94A3B8',
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.navyLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
  },
  logoutText: {
    color: COLORS.white,
    fontSize: 11,
    fontFamily: FONTS.bold,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.navyLight,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  verifiedText: {
    color: '#2DD4BF',
    fontSize: 12,
    fontFamily: FONTS.semiBold,
  },
  manageScheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.navyLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.sm,
  },
  manageScheduleText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontFamily: FONTS.semiBold,
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
  },
  queueTitle: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  refreshText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 24,
    paddingTop: 6,
    gap: 14,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  patientAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientAvatarText: {
    fontSize: 17,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  patientName: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  patientContact: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    letterSpacing: 0.4,
  },
  timeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: COLORS.bg,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
    marginTop: 12,
  },
  timeText: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
  },
  symptomsText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 10,
    lineHeight: 17,
  },
  symptomsLabel: {
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  cardActions: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceMuted,
    gap: 8,
  },
  launchCallBtn: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  launchCallBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontFamily: FONTS.bold,
  },
  secondaryActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  notesBtn: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notesBtnText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontFamily: FONTS.bold,
  },
  labFilesBtn: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: COLORS.infoSoft,
    borderWidth: 1,
    borderColor: COLORS.infoBorder,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labFilesBtnText: {
    color: COLORS.info,
    fontSize: 12,
    fontFamily: FONTS.bold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.textMuted,
    fontSize: 13,
    fontFamily: FONTS.medium,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
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
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceMuted,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  modalSub: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  recordIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordTitle: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  recordMeta: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  recordNotes: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  openDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: RADIUS.sm,
  },
  openDocBtnText: {
    color: COLORS.white,
    fontSize: 11,
    fontFamily: FONTS.bold,
  },
});
