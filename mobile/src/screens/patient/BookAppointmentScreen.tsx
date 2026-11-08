import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function generateUpcomingDates(targetDayOfWeek?: number): Date[] {
  const dates: Date[] = [];
  const now = new Date();

  if (typeof targetDayOfWeek === 'number') {
    // Find the next 4 occurrences of targetDayOfWeek starting from tomorrow
    for (let offset = 1; offset <= 28; offset++) {
      const candidate = new Date(now);
      candidate.setDate(now.getDate() + offset);
      candidate.setHours(0, 0, 0, 0);
      if (candidate.getDay() === targetDayOfWeek) {
        dates.push(candidate);
        if (dates.length >= 4) break;
      }
    }
  } else {
    // Next 5 days starting tomorrow
    for (let offset = 1; offset <= 5; offset++) {
      const candidate = new Date(now);
      candidate.setDate(now.getDate() + offset);
      candidate.setHours(0, 0, 0, 0);
      dates.push(candidate);
    }
  }
  return dates;
}

function generate30MinWindows(startStr = '09:00', endStr = '15:00'): { start: string; end: string }[] {
  const [startH, startM] = startStr.split(':').map(Number);
  const [endH, endM] = endStr.split(':').map(Number);

  const startTotal = (isNaN(startH) ? 9 : startH) * 60 + (isNaN(startM) ? 0 : startM);
  const endTotal = (isNaN(endH) ? 15 : endH) * 60 + (isNaN(endM) ? 0 : endM);

  const windows: { start: string; end: string }[] = [];
  for (let t = startTotal; t + 30 <= endTotal; t += 30) {
    const sH = String(Math.floor(t / 60)).padStart(2, '0');
    const sM = String(t % 60).padStart(2, '0');
    const eH = String(Math.floor((t + 30) / 60)).padStart(2, '0');
    const eM = String((t + 30) % 60).padStart(2, '0');
    windows.push({ start: `${sH}:${sM}`, end: `${eH}:${eM}` });
  }

  return windows.length > 0 ? windows : [{ start: '10:00', end: '10:30' }];
}

export default function BookAppointmentScreen({ route, navigation }: any) {
  const { doctor, slot } = route.params;
  const { subscription } = useAuth();
  const [symptoms, setSymptoms] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const availableDates = useMemo(
    () => generateUpcomingDates(slot?.dayOfWeek),
    [slot?.dayOfWeek]
  );
  const timeWindows = useMemo(
    () => generate30MinWindows(slot?.startTime || '09:00', slot?.endTime || '15:00'),
    [slot?.startTime, slot?.endTime]
  );

  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [selectedWindowIndex, setSelectedWindowIndex] = useState(0);

  const selectedDate = availableDates[selectedDateIndex] || availableDates[0];
  const selectedWindow = timeWindows[selectedWindowIndex] || timeWindows[0];

  const getScheduledTimestamps = () => {
    const [sH, sM] = selectedWindow.start.split(':').map(Number);
    const [eH, eM] = selectedWindow.end.split(':').map(Number);

    const start = new Date(selectedDate);
    start.setHours(sH, sM, 0, 0);

    const end = new Date(selectedDate);
    end.setHours(eH, eM, 0, 0);

    return { start, end };
  };

  const handleConfirmBooking = async () => {
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const { start, end } = getScheduledTimestamps();

      const res = await apiClient.post('/appointments/book', {
        doctorId: doctor.userId || doctor.user?.id,
        scheduledStart: start.toISOString(),
        scheduledEnd: end.toISOString(),
        symptomsDescription: symptoms.trim() || 'General teleconsultation request.',
      });

      if (res.data.success) {
        Alert.alert(
          '🎉 Appointment Confirmed!',
          `Your video consultation with ${doctor.user.fullName} is scheduled for ${start.toLocaleDateString()} at ${selectedWindow.start}.`,
          [
            {
              text: 'View Appointments',
              onPress: () => {
                navigation.popToTop();
                navigation.getParent()?.navigate('Schedule');
              },
            },
          ]
        );
      }
    } catch (err: any) {
      if (err.response?.status === 402) {
        Alert.alert(
          'Subscription Required',
          'Your 90-day free trial has expired. A 10 GHS / month subscription is required to book new appointments.',
          [
            {
              text: 'Subscribe via Mobile Money',
              onPress: () => navigation.getParent()?.navigate('Plan & MoMo'),
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      } else {
        setErrorMsg(
          err.response?.data?.message ||
            'Failed to book appointment. Please select a different 30-minute time slot.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Confirm Appointment</Text>
        <Text style={styles.subtitle}>
          Select your preferred date and 30-minute consultation slot below.
        </Text>
      </View>

      {/* Trial Status Card */}
      <View style={styles.trialInfoCard}>
        <Text style={styles.trialTitle}>
          Active Plan: {subscription?.status === 'TRIAL' ? '90-Day Free Trial Tier' : 'Monthly Subscriber'}
        </Text>
        <Text style={styles.trialDesc}>
          {subscription?.status === 'TRIAL'
            ? `Your 3-month free trial is currently active (${subscription?.trialDaysRemaining ?? 90} days remaining). Booking this session is completely free.`
            : 'Your monthly 10 GHS subscription covers unlimited teleconsultations.'}
        </Text>
      </View>

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      {/* Step 1: Select Date */}
      <View style={styles.summaryCard}>
        <Text style={styles.cardHeader}>
          1. Select Consultation Date {slot ? `(${DAYS_OF_WEEK[slot.dayOfWeek]}s)` : ''}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
          {availableDates.map((d, idx) => {
            const isSelected = idx === selectedDateIndex;
            const dayName = DAYS_OF_WEEK[d.getDay()].slice(0, 3);
            const dateLabel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            return (
              <TouchableOpacity
                key={d.toISOString()}
                style={[styles.datePill, isSelected && styles.datePillActive]}
                onPress={() => setSelectedDateIndex(idx)}
              >
                <Text style={[styles.datePillDay, isSelected && styles.datePillTextActive]}>
                  {dayName}
                </Text>
                <Text style={[styles.datePillNum, isSelected && styles.datePillTextActive]}>
                  {dateLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Step 2: Select 30-Min Time Window */}
        <Text style={[styles.cardHeader, { marginTop: 10 }]}>2. Select 30-Minute Time Slot</Text>
        <View style={styles.timeGrid}>
          {timeWindows.map((win, idx) => {
            const isSelected = idx === selectedWindowIndex;
            return (
              <TouchableOpacity
                key={win.start}
                style={[styles.timeChip, isSelected && styles.timeChipActive]}
                onPress={() => setSelectedWindowIndex(idx)}
              >
                <Text style={[styles.timeChipText, isSelected && styles.timeChipTextActive]}>
                  {win.start} - {win.end}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Doctor & Slot Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.cardHeader}>Consultation Summary</Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Physician:</Text>
          <Text style={styles.detailValue}>{doctor.user.fullName}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Specialty:</Text>
          <Text style={styles.detailValue}>{doctor.specialty}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Hospital:</Text>
          <Text style={styles.detailValue}>{doctor.hospitalAffiliation || 'Accra Medical Center'}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Selected Date:</Text>
          <Text style={styles.detailValue}>
            {DAYS_OF_WEEK[selectedDate.getDay()]}, {selectedDate.toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Selected Time:</Text>
          <Text style={[styles.detailValue, { color: '#059669' }]}>
            {selectedWindow.start} - {selectedWindow.end} (30 mins)
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Platform:</Text>
          <Text style={styles.detailValue}>Agora HD Video / Audio Call</Text>
        </View>
      </View>

      {/* Symptoms Note */}
      <View style={styles.notesCard}>
        <Text style={styles.cardHeader}>Reason for Visit & Symptoms</Text>
        <Text style={styles.notesSubtitle}>
          Help the doctor prepare by briefly describing your main symptoms or health questions:
        </Text>

        <TextInput
          style={styles.textArea}
          placeholder="e.g. Mild chest tightness during morning walk, headache for 2 days..."
          placeholderTextColor="#94a3b8"
          value={symptoms}
          onChangeText={setSymptoms}
          multiline
          numberOfLines={4}
        />
      </View>

      <TouchableOpacity
        style={[styles.confirmBtn, isSubmitting && styles.btnDisabled]}
        onPress={handleConfirmBooking}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.confirmBtnText}>Confirm & Book Consultation</Text>
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
    padding: 20,
    gap: 16,
  },
  header: {
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  trialInfoCard: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 16,
    padding: 14,
  },
  trialTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#047857',
    marginBottom: 2,
  },
  trialDesc: {
    fontSize: 11,
    color: '#065f46',
    lineHeight: 16,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 12,
    borderRadius: 12,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  cardHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  pillsRow: {
    gap: 10,
    paddingVertical: 4,
  },
  datePill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    minWidth: 76,
  },
  datePillActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  datePillDay: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  datePillNum: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 2,
  },
  datePillTextActive: {
    color: '#ffffff',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  timeChipActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#059669',
  },
  timeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  timeChipTextActive: {
    color: '#059669',
    fontWeight: '900',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1e293b',
  },
  notesCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  notesSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 10,
    lineHeight: 16,
  },
  textArea: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#0f172a',
    height: 90,
    textAlignVertical: 'top',
  },
  confirmBtn: {
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
