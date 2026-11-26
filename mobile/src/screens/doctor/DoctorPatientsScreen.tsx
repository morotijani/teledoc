import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Linking,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiClient } from '../../api/client';
import { useAlert } from '../../context/AlertContext';
import { useDocumentViewer } from '../../context/DocumentViewerContext';
import Avatar from '../../components/Avatar';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../../theme/theme';

export default function DoctorPatientsScreen({ navigation }: any) {
  const { showAlert } = useAlert();
  const { openDocument } = useDocumentViewer();
  const [patients, setPatients] = useState<any[]>([]);
  const [chatMap, setChatMap] = useState<Record<string, { appointmentId: string; channelId: string }>>({});
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [recordsModalVisible, setRecordsModalVisible] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  useEffect(() => {
    fetchPatients();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchPatients();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchPatients = async () => {
    try {
      const [patRes, chatsRes] = await Promise.all([
        apiClient.get('/doctors/my/patients'),
        apiClient.get('/doctors/my/chats'),
      ]);
      setPatients(patRes.data.patients || []);

      const map: Record<string, { appointmentId: string; channelId: string }> = {};
      (chatsRes.data.threads || []).forEach((t: any) => {
        map[t.patient.id] = {
          appointmentId: t.appointmentId,
          channelId: t.channelId,
        };
      });
      setChatMap(map);
    } catch (err) {
      console.error('Failed to load patients:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleOpenDocument = (rawUrl: string, title?: string) => {
    if (!rawUrl) return;
    setRecordsModalVisible(false);
    openDocument(rawUrl, title);
  };

  const filteredPatients = patients.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.fullName.toLowerCase().includes(q) ||
      (p.phoneNumber || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q)
    );
  });

  const renderPatient = ({ item }: { item: any }) => {
    const recordsCount = item.medicalRecords?.length || 0;
    const rxCount = item.patientPrescriptions?.length || 0;
    const threadInfo = chatMap[item.id];

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Avatar uri={item.avatarUrl} name={item.fullName} size={46} borderRadius={15} />
          <View style={{ flex: 1 }}>
            <Text style={styles.patientName}>{item.fullName}</Text>
            <Text style={styles.patientMeta}>{item.phoneNumber}</Text>
            {item.email ? <Text style={styles.patientSubMeta}>{item.email}</Text> : null}
          </View>
        </View>

        <View style={styles.statsStrip}>
          <View style={styles.statBadge}>
            <MaterialIcons name="science" size={14} color={COLORS.primary} />
            <Text style={styles.statBadgeText}>
              {recordsCount} {recordsCount === 1 ? 'Lab File' : 'Lab Files'}
            </Text>
          </View>
          <View style={styles.statBadge}>
            <MaterialIcons name="medication" size={14} color={COLORS.info} />
            <Text style={styles.statBadgeText}>
              {rxCount} {rxCount === 1 ? 'Prescription' : 'Prescriptions'}
            </Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          {threadInfo && (
            <TouchableOpacity
              style={styles.chatBtn}
              onPress={() =>
                navigation.navigate('DirectChat', {
                  appointmentId: threadInfo.appointmentId,
                  participantName: item.fullName,
                  participantPhone: item.phoneNumber,
                  participantAvatar: item.avatarUrl,
                  channelId: threadInfo.channelId,
                  isDoctor: true,
                })
              }
            >
              <MaterialIcons name="chat-bubble-outline" size={16} color={COLORS.white} />
              <Text style={styles.chatBtnText}>Chat</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.callSmallBtn}
            onPress={() =>
              showAlert({
                type: 'info',
                title: `Call ${item.fullName}`,
                message: 'Choose In-App Video Call or dial their phone directly.',
                actions: [
                  ...(threadInfo
                    ? [
                        {
                          text: 'In-App Video Call',
                          style: 'primary' as const,
                          onPress: () =>
                            navigation.navigate('ConsultationRoom', {
                              appointmentId: threadInfo.appointmentId,
                              patientName: item.fullName,
                              channelId: threadInfo.channelId,
                              isDoctor: true,
                            }),
                        },
                      ]
                    : []),
                  ...(item.phoneNumber
                    ? [
                        {
                          text: `Phone Dial (${item.phoneNumber})`,
                          style: 'primary' as const,
                          onPress: () => Linking.openURL(`tel:${item.phoneNumber}`),
                        },
                      ]
                    : []),
                  { text: 'Cancel', style: 'cancel' },
                ],
              })
            }
          >
            <MaterialIcons name="call" size={16} color={COLORS.primary} />
            <Text style={styles.callSmallBtnText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.recordsBtn}
            onPress={() => {
              setSelectedPatient(item);
              setRecordsModalVisible(true);
            }}
          >
            <MaterialIcons name="folder-shared" size={16} color={COLORS.info} />
            <Text style={styles.recordsBtnText}>Labs</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topHeader}>
          <Text style={styles.screenTitle}>My Patients ({patients.length})</Text>
          <Text style={styles.screenSub}>
            View patient profiles, lab uploads, and start direct follow-up chats.
          </Text>

          <View style={styles.searchBar}>
            <MaterialIcons name="search" size={19} color={COLORS.textSubtle} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search patients by name, phone, or email..."
              placeholderTextColor={COLORS.textSubtle}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <MaterialIcons name="close" size={18} color={COLORS.textSubtle} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {isLoading && !refreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading your patient roster...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredPatients}
            keyExtractor={(item) => item.id}
            renderItem={renderPatient}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchPatients();
                }}
                tintColor={COLORS.primary}
                colors={[COLORS.primary]}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <View style={styles.emptyIconCircle}>
                  <MaterialIcons name="people-outline" size={30} color={COLORS.textSubtle} />
                </View>
                <Text style={styles.emptyTitle}>No Patients Yet</Text>
                <Text style={styles.emptyText}>
                  Patients who book consultations with you will be listed here with their clinical files.
                </Text>
              </View>
            }
          />
        )}

        {/* Patient Lab Records Modal */}
        <Modal visible={recordsModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>
                    {selectedPatient?.fullName}'s Medical Records
                  </Text>
                  <Text style={styles.modalSub}>Uploaded lab tests & clinical attachments</Text>
                </View>
                <TouchableOpacity onPress={() => setRecordsModalVisible(false)}>
                  <MaterialIcons name="close" size={22} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              <FlatList
                data={selectedPatient?.medicalRecords || []}
                keyExtractor={(r) => r.id}
                style={{ maxHeight: 340 }}
                contentContainerStyle={{ gap: 10, paddingVertical: 8 }}
                renderItem={({ item: rec }) => (
                  <View style={styles.recordItem}>
                    <View style={styles.recordIcon}>
                      <MaterialIcons
                        name={rec.fileType === 'LAB_RESULT' ? 'science' : 'description'}
                        size={18}
                        color={COLORS.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recordTitle}>{rec.title}</Text>
                      <Text style={styles.recordMeta}>
                        {rec.fileType.replace('_', ' ')} ·{' '}
                        {new Date(rec.createdAt).toLocaleDateString()}
                      </Text>
                      {rec.notes ? <Text style={styles.recordNotes}>{rec.notes}</Text> : null}
                    </View>
                    {rec.fileUrl && (
                      <TouchableOpacity
                        style={styles.openBtn}
                        onPress={() => handleOpenDocument(rec.fileUrl, rec.title)}
                      >
                        <Text style={styles.openBtnText}>View</Text>
                        <MaterialIcons name="visibility" size={12} color={COLORS.white} />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                ListEmptyComponent={
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, fontFamily: FONTS.medium, color: COLORS.textMuted }}>
                      No lab results uploaded by this patient yet.
                    </Text>
                  </View>
                }
              />
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
    backgroundColor: COLORS.surface,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  topHeader: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  screenTitle: {
    fontSize: 21,
    fontFamily: FONTS.extraBold,
    color: COLORS.text,
    letterSpacing: -0.4,
  },
  screenSub: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 2,
    marginBottom: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  listContent: {
    padding: 18,
    gap: 14,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: COLORS.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  patientName: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  patientMeta: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  patientSubMeta: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  statsStrip: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  statBadgeText: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceMuted,
  },
  chatBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    backgroundColor: COLORS.primary,
    height: 40,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: FONTS.bold,
  },
  callSmallBtn: {
    flexDirection: 'row',
    gap: 5,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    paddingHorizontal: 13,
    height: 40,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callSmallBtnText: {
    color: COLORS.primaryDark,
    fontSize: 12,
    fontFamily: FONTS.bold,
  },
  recordsBtn: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: COLORS.infoSoft,
    borderWidth: 1,
    borderColor: COLORS.infoBorder,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordsBtnText: {
    color: COLORS.info,
    fontSize: 12,
    fontFamily: FONTS.bold,
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
  },
  emptyBox: {
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
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 19,
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
    gap: 10,
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  recordIcon: {
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
  },
  recordNotes: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: RADIUS.sm,
  },
  openBtnText: {
    color: COLORS.white,
    fontSize: 11,
    fontFamily: FONTS.bold,
  },
});
