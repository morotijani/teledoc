import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { apiClient } from '../../api/client';

export default function DoctorScheduleScreen({ navigation }: any) {
  const [schedule, setSchedule] = useState<any[]>([
    { dayOfWeek: 1, name: 'Monday', isActive: true, startTime: '09:00', endTime: '15:00' },
    { dayOfWeek: 2, name: 'Tuesday', isActive: true, startTime: '09:00', endTime: '15:00' },
    { dayOfWeek: 3, name: 'Wednesday', isActive: true, startTime: '09:00', endTime: '15:00' },
    { dayOfWeek: 4, name: 'Thursday', isActive: true, startTime: '09:00', endTime: '15:00' },
    { dayOfWeek: 5, name: 'Friday', isActive: true, startTime: '09:00', endTime: '15:00' },
    { dayOfWeek: 6, name: 'Saturday', isActive: false, startTime: '10:00', endTime: '13:00' },
  ]);

  const [isSaving, setIsSaving] = useState(false);

  const toggleDay = (index: number) => {
    const updated = [...schedule];
    updated[index].isActive = !updated[index].isActive;
    setSchedule(updated);
  };

  const handleSaveSchedule = async () => {
    setIsSaving(true);
    try {
      const activeSlots = schedule
        .filter((s) => s.isActive)
        .map((s) => ({
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          slotDurationMinutes: 30,
          isActive: true,
        }));

      await apiClient.post('/doctors/my/availabilities', { slots: activeSlots });
      Alert.alert('Schedule Saved', 'Patients can now book available slots matching your hours.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update schedule.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Weekly Consultation Hours</Text>
        <Text style={styles.subtitle}>
          Configure your active days and consultation hours for patient self-booking.
        </Text>
      </View>

      <View style={styles.daysList}>
        {schedule.map((item, index) => (
          <View key={item.dayOfWeek} style={styles.dayCard}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayName}>{item.name}</Text>
              <TouchableOpacity
                style={[styles.toggleBtn, item.isActive ? styles.toggleActive : styles.toggleInactive]}
                onPress={() => toggleDay(index)}
              >
                <Text style={[styles.toggleText, item.isActive ? styles.toggleTextActive : styles.toggleTextInactive]}>
                  {item.isActive ? 'Active' : 'Off'}
                </Text>
              </TouchableOpacity>
            </View>

            {item.isActive ? (
              <View style={styles.timeRow}>
                <Text style={styles.timeLabel}>Hours: </Text>
                <Text style={styles.timeValue}>
                  {item.startTime} to {item.endTime} (30-min consultation slots)
                </Text>
              </View>
            ) : (
              <Text style={styles.offLabel}>No patient appointments accepted on this day.</Text>
            )}
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, isSaving && styles.btnDisabled]}
        onPress={handleSaveSchedule}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.saveBtnText}>Save Schedule</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    gap: 14,
  },
  header: {
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 16,
  },
  daysList: {
    gap: 10,
  },
  dayCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  toggleActive: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  toggleInactive: {
    backgroundColor: '#f1f5f9',
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '800',
  },
  toggleTextActive: {
    color: '#059669',
  },
  toggleTextInactive: {
    color: '#94a3b8',
  },
  timeRow: {
    flexDirection: 'row',
    marginTop: 8,
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  timeValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284c7',
  },
  offLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontStyle: 'italic',
    marginTop: 6,
  },
  saveBtn: {
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
