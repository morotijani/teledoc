import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiClient } from '../../api/client';
import { useAlert } from '../../context/AlertContext';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../../theme/theme';

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
  const { showAlert } = useAlert();
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
      showAlert({
        type: 'success',
        title: 'Schedule Saved',
        message: 'Patients can now book 30-min slots matching your updated hours.',
        actions: [{ text: 'Done', style: 'primary', onPress: () => navigation.goBack() }],
      });
    } catch (err: any) {
      showAlert({
        type: 'error',
        title: 'Save Failed',
        message: err.response?.data?.message || 'Failed to update schedule.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading your saved schedule...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
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
                  <Text style={styles.timeLabel}>Start</Text>
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
                  <Text style={styles.timeLabel}>End</Text>
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
              <Text style={styles.offLabel}>No appointments accepted on this day.</Text>
            )}
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, isSaving && styles.btnDisabled]}
        onPress={handleSaveSchedule}
        disabled={isSaving}
        activeOpacity={0.85}
      >
        {isSaving ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <View style={styles.btnInner}>
            <MaterialIcons name="save" size={18} color={COLORS.white} />
            <Text style={styles.saveBtnText}>Save Weekly Schedule</Text>
          </View>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: 18,
    gap: 14,
    paddingBottom: 32,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
  },
  header: {
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontFamily: FONTS.extraBold,
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 3,
    lineHeight: 17,
  },
  daysList: {
    gap: 10,
  },
  dayCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayName: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
  },
  toggleActive: {
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  toggleInactive: {
    backgroundColor: COLORS.surfaceMuted,
  },
  toggleText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
  },
  toggleTextActive: {
    color: COLORS.primaryDark,
  },
  toggleTextInactive: {
    color: COLORS.textSubtle,
  },
  hoursConfigBox: {
    marginTop: 12,
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceMuted,
  },
  hourPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeLabel: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: COLORS.textMuted,
  },
  chipGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  timeOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
  },
  timeOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  timeOptionText: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
  },
  timeOptionTextActive: {
    color: COLORS.white,
  },
  offLabel: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSubtle,
    marginTop: 6,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontFamily: FONTS.bold,
  },
});
