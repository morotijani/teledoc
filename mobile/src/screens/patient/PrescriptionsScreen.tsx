import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiClient } from '../../api/client';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../../theme/theme';

export default function PrescriptionsScreen() {
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      const res = await apiClient.get('/appointments/my');
      const allRx: any[] = [];
      const appts = res.data.appointments || [];

      appts.forEach((appt: any) => {
        if (appt.consultation?.prescriptions) {
          appt.consultation.prescriptions.forEach((rx: any) => {
            allRx.push({
              ...rx,
              doctorName: appt.doctor?.fullName,
              specialty: appt.doctor?.doctorProfile?.specialty,
              date: appt.scheduledStart,
            });
          });
        }
      });

      setPrescriptions(allRx);
    } catch (err) {
      console.error('Failed to load prescriptions:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.rxHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.doctorName}>Prescribed by {item.doctorName || 'Doctor'}</Text>
          <Text style={styles.specialty}>{item.specialty || 'General Practice'}</Text>
        </View>
        <View style={styles.datePill}>
          <MaterialIcons name="event" size={12} color={COLORS.textMuted} />
          <Text style={styles.rxDate}>{new Date(item.date).toLocaleDateString()}</Text>
        </View>
      </View>

      <View style={styles.medsList}>
        {item.medications && Array.isArray(item.medications) ? (
          item.medications.map((med: any, idx: number) => (
            <View key={idx} style={styles.medItem}>
              <View style={styles.medBullet}>
                <MaterialIcons name="medication" size={16} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.drugName}>
                  {med.drugName} <Text style={styles.dosage}>({med.dosage})</Text>
                </Text>
                <Text style={styles.instructions}>
                  {med.frequency} · {med.duration}
                </Text>
                {med.instructions ? (
                  <Text style={styles.specialNotes}>Note: {med.instructions}</Text>
                ) : null}
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyMeds}>No specific medication records available.</Text>
        )}
      </View>

      <View style={styles.rxFooter}>
        <MaterialIcons name="verified" size={14} color={COLORS.success} />
        <Text style={styles.footerNote}>Digitally signed via TeleDoc Ghana e-Prescription</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Fetching digital prescriptions...</Text>
        </View>
      ) : (
        <FlatList
          data={prescriptions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchPrescriptions();
              }}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <MaterialIcons name="medication" size={30} color={COLORS.textSubtle} />
              </View>
              <Text style={styles.emptyTitle}>No Prescriptions Yet</Text>
              <Text style={styles.emptyText}>
                Electronic prescriptions issued after your consultations will appear here automatically.
              </Text>
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
  rxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceMuted,
    paddingBottom: 12,
    marginBottom: 12,
  },
  doctorName: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  specialty: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: COLORS.info,
    marginTop: 2,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  rxDate: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    color: COLORS.textMuted,
  },
  medsList: {
    gap: 10,
  },
  medItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: COLORS.bg,
    padding: 12,
    borderRadius: RADIUS.md,
  },
  medBullet: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  drugName: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  dosage: {
    color: COLORS.primaryDark,
    fontFamily: FONTS.semiBold,
  },
  instructions: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  specialNotes: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 3,
  },
  emptyMeds: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSubtle,
  },
  rxFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceMuted,
  },
  footerNote: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    color: COLORS.success,
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
});
