import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { apiClient } from '../../api/client';

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
        <View>
          <Text style={styles.doctorName}>Prescribed by {item.doctorName || 'Doctor'}</Text>
          <Text style={styles.specialty}>{item.specialty || 'General Practice'}</Text>
        </View>
        <Text style={styles.rxDate}>{new Date(item.date).toLocaleDateString()}</Text>
      </View>

      <View style={styles.medsList}>
        {item.medications && Array.isArray(item.medications) ? (
          item.medications.map((med: any, idx: number) => (
            <View key={idx} style={styles.medItem}>
              <View style={styles.medBullet}>
                <Text style={styles.medBulletText}>Rx</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.drugName}>
                  {med.drugName} <Text style={styles.dosage}>({med.dosage})</Text>
                </Text>
                <Text style={styles.instructions}>
                  {med.frequency} • {med.duration}
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
        <Text style={styles.footerNote}>✓ Digitally signed via TeleDoc Ghana e-Prescription System</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Fetching digital prescriptions...</Text>
        </View>
      ) : (
        <FlatList
          data={prescriptions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchPrescriptions();
              }}
              colors={['#059669']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>💊</Text>
              <Text style={styles.emptyTitle}>No Prescriptions Yet</Text>
              <Text style={styles.emptyText}>
                When a doctor issues an electronic prescription after a consultation, it will appear here instantly.
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
    backgroundColor: '#f8fafc',
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
  rxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 10,
    marginBottom: 12,
  },
  doctorName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  specialty: {
    fontSize: 11,
    color: '#0284c7',
    fontWeight: '700',
    marginTop: 1,
  },
  rxDate: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  medsList: {
    gap: 10,
  },
  medItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 12,
  },
  medBullet: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  medBulletText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#059669',
  },
  drugName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  dosage: {
    color: '#059669',
    fontWeight: '700',
  },
  instructions: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  specialNotes: {
    fontSize: 10,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 2,
  },
  emptyMeds: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  rxFooter: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  footerNote: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: '700',
    textAlign: 'center',
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
});
