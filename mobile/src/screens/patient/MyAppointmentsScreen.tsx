import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiClient } from '../../api/client';
import { useAlert } from '../../context/AlertContext';
import Avatar from '../../components/Avatar';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../../theme/theme';

export default function MyAppointmentsScreen({ navigation }: any) {
  const { showAlert } = useAlert();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchMyAppointments();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchMyAppointments();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchMyAppointments = async () => {
    try {
      const res = await apiClient.get('/appointments/my');
      setAppointments(res.data.appointments || []);
    } catch (err) {
      console.error('Failed to load appointments:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return { bg: COLORS.successSoft, text: COLORS.success };
      case 'IN_PROGRESS':
        return { bg: COLORS.infoSoft, text: COLORS.info };
      case 'COMPLETED':
        return { bg: COLORS.surfaceMuted, text: COLORS.textSecondary };
      case 'CANCELLED':
        return { bg: COLORS.dangerSoft, text: COLORS.danger };
      default:
        return { bg: COLORS.successSoft, text: COLORS.success };
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isLive = item.status === 'CONFIRMED' || item.status === 'IN_PROGRESS';
    const isCompleted = item.status === 'COMPLETED';
    const badge = getStatusStyle(item.status);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.docInfoRow}>
            <Avatar uri={item.doctor.avatarUrl} name={item.doctor.fullName} size={46} borderRadius={14} />
            <View style={{ flex: 1 }}>
              <Text style={styles.doctorName}>{item.doctor.fullName}</Text>
              <Text style={styles.specialty}>
                {item.doctor.doctorProfile?.specialty || 'General Practice'}
              </Text>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.statusText, { color: badge.text }]}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.dateTimeRow}>
          <MaterialIcons name="event" size={16} color={COLORS.primary} />
          <Text style={styles.dateTimeText}>
            {new Date(item.scheduledStart).toLocaleDateString()} ·{' '}
            {new Date(item.scheduledStart).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        {item.symptomsDescription ? (
          <Text style={styles.symptomsText} numberOfLines={2}>
            Symptoms: {item.symptomsDescription}
          </Text>
        ) : null}

        {isCompleted && item.consultation ? (
          <View style={styles.summaryBox}>
            <View style={styles.summaryHeader}>
              <MaterialIcons name="assignment-turned-in" size={15} color={COLORS.primaryDark} />
              <Text style={styles.summaryTitle}>
                Diagnosis: {item.consultation.diagnosis || 'General Consultation'}
              </Text>
            </View>
            {item.consultation.patientSummary ? (
              <Text style={styles.summaryBody}>{item.consultation.patientSummary}</Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.actionsRow}>
          {isLive && (
            <View style={styles.liveActionRow}>
              <TouchableOpacity
                style={[styles.joinCallBtn, { flex: 1 }]}
                activeOpacity={0.85}
                onPress={() =>
                  showAlert({
                    type: 'info',
                    title: `Call ${item.doctor.fullName}`,
                    message: 'Select In-App Video Call or place a standard phone call.',
                    actions: [
                      {
                        text: 'In-App Video Call',
                        style: 'primary',
                        onPress: () =>
                          navigation.navigate('ConsultationRoom', {
                            appointmentId: item.id,
                            doctorName: item.doctor.fullName,
                            channelId: item.meetingChannelId,
                          }),
                      },
                      ...(item.doctor.phoneNumber
                        ? [
                            {
                              text: `Phone Dial (${item.doctor.phoneNumber})`,
                              style: 'primary' as const,
                              onPress: () => Linking.openURL(`tel:${item.doctor.phoneNumber}`),
                            },
                          ]
                        : []),
                      { text: 'Cancel', style: 'cancel' },
                    ],
                  })
                }
              >
                <MaterialIcons name="call" size={18} color={COLORS.white} />
                <Text style={styles.joinCallBtnText}>Call Doctor</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.chatQuickBtn}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate('DirectChat', {
                    appointmentId: item.id,
                    participantName: item.doctor.fullName,
                    participantPhone: item.doctor.phoneNumber,
                    participantAvatar: item.doctor.avatarUrl,
                    channelId: item.meetingChannelId,
                    isDoctor: false,
                  })
                }
              >
                <MaterialIcons name="chat-bubble-outline" size={18} color={COLORS.primary} />
                <Text style={styles.chatQuickBtnText}>Chat</Text>
              </TouchableOpacity>
            </View>
          )}

          {isCompleted &&
            item.consultation?.prescriptions &&
            item.consultation.prescriptions.length > 0 && (
              <TouchableOpacity
                style={styles.viewRxBtn}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Prescriptions')}
              >
                <MaterialIcons name="medication" size={16} color={COLORS.white} />
                <Text style={styles.viewRxBtnText}>View Prescription</Text>
              </TouchableOpacity>
            )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading your appointments...</Text>
        </View>
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchMyAppointments();
              }}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <MaterialIcons name="calendar-today" size={30} color={COLORS.textSubtle} />
              </View>
              <Text style={styles.emptyTitle}>No Appointments Scheduled</Text>
              <Text style={styles.emptyText}>
                You do not have any upcoming doctor teleconsultations yet.
              </Text>
              <TouchableOpacity
                style={styles.findDoctorBtn}
                onPress={() => navigation.getParent()?.navigate('Find Doctors')}
              >
                <Text style={styles.findDoctorBtnText}>Browse Available Doctors</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  listContent: {
    padding: 18,
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
  docInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  doctorName: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  specialty: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.info,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  statusText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    letterSpacing: 0.4,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    backgroundColor: COLORS.bg,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
  },
  dateTimeText: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
  },
  symptomsText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 10,
    lineHeight: 17,
  },
  summaryBox: {
    marginTop: 12,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    borderRadius: RADIUS.md,
    padding: 12,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryTitle: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.primaryDark,
  },
  summaryBody: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 17,
  },
  actionsRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceMuted,
  },
  liveActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chatQuickBtn: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatQuickBtnText: {
    color: COLORS.primaryDark,
    fontSize: 13,
    fontFamily: FONTS.bold,
  },
  joinCallBtn: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinCallBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontFamily: FONTS.bold,
  },
  viewRxBtn: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: COLORS.info,
    borderRadius: RADIUS.md,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewRxBtnText: {
    color: COLORS.white,
    fontSize: 13,
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
    marginBottom: 18,
    lineHeight: 18,
  },
  findDoctorBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: RADIUS.md,
  },
  findDoctorBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontFamily: FONTS.bold,
  },
});
