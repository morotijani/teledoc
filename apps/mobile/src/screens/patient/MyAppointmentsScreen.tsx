import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { apiClient } from '../../api/client';

export default function MyAppointmentsScreen({ navigation }: any) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchMyAppointments();
  }, []);

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

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return styles.statusConfirmed;
      case 'IN_PROGRESS':
        return styles.statusInProgress;
      case 'COMPLETED':
        return styles.statusCompleted;
      case 'CANCELLED':
        return styles.statusCancelled;
      default:
        return styles.statusConfirmed;
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isLive = item.status === 'CONFIRMED' || item.status === 'IN_PROGRESS';
    const isCompleted = item.status === 'COMPLETED';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.doctorName}>{item.doctor.fullName}</Text>
            <Text style={styles.specialty}>
              {item.doctor.doctorProfile?.specialty || 'General Practitioner'}
            </Text>
          </View>

          <View style={[styles.statusBadge, getStatusBadgeStyle(item.status)]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.dateTimeRow}>
          <Text style={styles.dateTimeText}>
            📅 {new Date(item.scheduledStart).toLocaleDateString()} at{' '}
            {new Date(item.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        {item.symptomsDescription ? (
          <Text style={styles.symptomsText} numberOfLines={2}>
            Symptoms: {item.symptomsDescription}
          </Text>
        ) : null}

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          {isLive && (
            <TouchableOpacity
              style={styles.joinCallBtn}
              onPress={() =>
                navigation.navigate('ConsultationRoom', {
                  appointmentId: item.id,
                  doctorName: item.doctor.fullName,
                  channelId: item.meetingChannelId,
                })
              }
            >
              <Text style={styles.joinCallBtnText}>📹 Enter Consultation Room</Text>
            </TouchableOpacity>
          )}

          {isCompleted && item.consultation?.prescriptions && item.consultation.prescriptions.length > 0 && (
            <TouchableOpacity
              style={styles.viewRxBtn}
              onPress={() => navigation.navigate('Prescriptions')}
            >
              <Text style={styles.viewRxBtnText}>💊 View Prescription</Text>
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
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Loading your appointments...</Text>
        </View>
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchMyAppointments();
              }}
              colors={['#059669']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No Appointments Scheduled</Text>
              <Text style={styles.emptyText}>You do not have any upcoming doctor teleconsultations.</Text>
              <TouchableOpacity
                style={styles.findDoctorBtn}
                onPress={() => navigation.navigate('DoctorDiscovery')}
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  specialty: {
    fontSize: 12,
    color: '#0284c7',
    fontWeight: '700',
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusConfirmed: {
    backgroundColor: '#ecfdf5',
  },
  statusInProgress: {
    backgroundColor: '#e0f2fe',
  },
  statusCompleted: {
    backgroundColor: '#f1f5f9',
  },
  statusCancelled: {
    backgroundColor: '#fef2f2',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#334155',
  },
  dateTimeRow: {
    marginTop: 10,
    backgroundColor: '#f8fafc',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  dateTimeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  symptomsText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
    fontStyle: 'italic',
  },
  actionsRow: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  joinCallBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  joinCallBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  viewRxBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  viewRxBtnText: {
    color: '#ffffff',
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
    marginBottom: 16,
  },
  findDoctorBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  findDoctorBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
});
