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

const DEFAULT_WEEK = [
  { dayOfWeek: 0, name: 'Sunday', isActive: false, startTime: '10:00', endTime: '14:00' },
  { dayOfWeek: 1, name: 'Monday', isActive: true, startTime: '09:00', endTime: '15:00' },
  { dayOfWeek: 2, name: 'Tuesday', isActive: true, startTime: '09:00', endTime: '15:00' },
  { dayOfWeek: 3, name: 'Wednesday', isActive: true, startTime: '09:00', endTime: '15:00' },
  { dayOfWeek: 4, name: 'Thursday', isActive: true, startTime: '09:00', endTime: '15:00' },
  { dayOfWeek: 5, name: 'Friday', isActive: true, startTime: '09:00', endTime: '15:00' },
  { dayOfWeek: 6, name: 'Saturday', isActive: false, startTime: '10:00', endTime: '14:00' },
];

const START_OPTIONS = ['08:00', '09:00', '10:00', '12:00'];
const END_OPTIONS = ['13:00', '15:00', '17:00', '19:00'];

export default function DoctorScheduleScreen({ navigation }: any) {
  const [schedule, setSchedule] = useState<any[]>(DEFAULT_WEEK);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSavedSchedule();
  }, []);

  const loadSavedSchedule = async () => {
    try {
      const res = await apiClient.get('/doctors/my/availabilities');
      const saved: any[] = res.data.availabilities || [];
      if (saved.length > 0) {
        const merged = DEFAULT_WEEK.map((day) => {
          const match = saved.find((s) => s.dayOfWeek === day.dayOfWeek && s.isActive);
          if (match) {
            return {
              ...day,
              isActive: true,
              startTime: match.startTime,
              endTime: match.endTime,
            };
          }
          return { ...day, isActive: false };
        });
        setSchedule(merged);
      }
    } catch (err) {
      console.error('Failed to load doctor schedule:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDay = (index: number) => {
    const updated = [...schedule];
    updated[index] = { ...updated[index], isActive: !updated[index].isActive };
    setSchedule(updated);
  };

  const updateHour = (index: number, field: 'startTime' | 'endTime', value: string) => {
    const updated = [...schedule];
    updated[index] = { ...updated[index], [field]: value };
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
      Alert.alert('Schedule Saved', 'Patients can now book 30-min slots matching your updated hours.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update schedule.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Loading your saved schedule...</Text>
      </View>
    );
  }

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
                <Text
                  style={[
                    styles.toggleText,
                    item.isActive ? styles.toggleTextActive : styles.toggleTextInactive,
                  ]}
                >
                  {item.isActive ? 'Active' : 'Off'}
                </Text>
              </TouchableOpacity>
            </View>

            {item.isActive ? (
              <View style={styles.hoursConfigBox}>
                <View style={styles.hourPickerRow}>
                  <Text style={styles.timeLabel}>Start:</Text>
                  <View style={styles.chipGroup}>
                    {START_OPTIONS.map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.timeOption, item.startTime === t && styles.timeOptionActive]}
                        onPress={() => updateHour(index, 'startTime', t)}
                      >
                        <Text
                          style={[
                            styles.timeOptionText,
                            item.startTime === t && styles.timeOptionTextActive,
                          ]}
                        >
                          {t}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.hourPickerRow}>
                  <Text style={styles.timeLabel}>End:  </Text>
                  <View style={styles.chipGroup}>
                    {END_OPTIONS.map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.timeOption, item.endTime === t && styles.timeOptionActive]}
                        onPress={() => updateHour(index, 'endTime', t)}
                      >
                        <Text
                          style={[
                            styles.timeOptionText,
                            item.endTime === t && styles.timeOptionTextActive,
                          ]}
                        >
                          {t}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
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
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748b',
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
  hoursConfigBox: {
    marginTop: 10,
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  hourPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  chipGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  timeOption: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  timeOptionActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  timeOptionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  timeOptionTextActive: {
    color: '#ffffff',
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
    marginBottom: 20,
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
