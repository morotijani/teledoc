import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../../theme/theme';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function generateUpcomingDates(targetDayOfWeek?: number): Date[] {
  const dates: Date[] = [];
  const now = new Date();

  if (typeof targetDayOfWeek === 'number') {
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

interface BookedSlot {
  scheduledStart: string;
  scheduledEnd: string;
}

export default function BookAppointmentScreen({ route, navigation }: any) {
  const { doctor, slot } = route.params;
  const { subscription } = useAuth();
  const { showAlert } = useAlert();
  const [symptoms, setSymptoms] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(true);

  const availableDates = useMemo(
    () => generateUpcomingDates(slot?.dayOfWeek),
    [slot?.dayOfWeek]
  );
  const timeWindows = useMemo(
    () => generate30MinWindows(slot?.startTime || '09:00', slot?.endTime || '15:00'),
    [slot?.startTime, slot?.endTime]
  );

  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [selectedWindowIndex, setSelectedWindowIndex] = useState<number>(-1);

  const selectedDate = availableDates[selectedDateIndex] || availableDates[0];
  const doctorId = doctor.userId || doctor.user?.id || doctor.id;

  const isWindowBooked = (win: { start: string; end: string }, booked: BookedSlot[]) => {
    const [sH, sM] = win.start.split(':').map(Number);
    const [eH, eM] = win.end.split(':').map(Number);

    const winStart = new Date(selectedDate);
    winStart.setHours(sH, sM, 0, 0);

    const winEnd = new Date(selectedDate);
    winEnd.setHours(eH, eM, 0, 0);

    if (winStart <= new Date()) return true;

    return booked.some((b) => {
      const bStart = new Date(b.scheduledStart).getTime();
      const bEnd = new Date(b.scheduledEnd).getTime();
      return winStart.getTime() < bEnd && winEnd.getTime() > bStart;
    });
  };

  const fetchBookedSlotsForDate = async (dateObj: Date) => {
    setIsLoadingSlots(true);
    try {
      const dateStr = dateObj.toISOString().split('T')[0];
      const res = await apiClient.get(`/doctors/${doctorId}/booked-slots`, {
        params: { date: dateStr },
      });
      const booked: BookedSlot[] = res.data.bookedSlots || [];
      setBookedSlots(booked);

      // Automatically select the NEXT AVAILABLE (first unbooked) 30-minute slot
      const firstOpenIdx = timeWindows.findIndex((w) => !isWindowBooked(w, booked));
      setSelectedWindowIndex(firstOpenIdx);
    } catch (err) {
      console.error('Failed to fetch booked slots:', err);
      setBookedSlots([]);
      setSelectedWindowIndex(0);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  useEffect(() => {
    fetchBookedSlotsForDate(selectedDate);
  }, [selectedDateIndex]);

  const selectedWindow =
    selectedWindowIndex >= 0 ? timeWindows[selectedWindowIndex] : null;

  const getScheduledTimestamps = () => {
    if (!selectedWindow) return null;
    const [sH, sM] = selectedWindow.start.split(':').map(Number);
    const [eH, eM] = selectedWindow.end.split(':').map(Number);

    const start = new Date(selectedDate);
    start.setHours(sH, sM, 0, 0);

    const end = new Date(selectedDate);
    end.setHours(eH, eM, 0, 0);

    return { start, end };
  };

  const handleConfirmBooking = async () => {
    const timestamps = getScheduledTimestamps();
    if (!timestamps || !selectedWindow) {
      showAlert({
        type: 'warning',
        title: 'No Available Slot Selected',
        message: 'All slots on this date are booked. Please pick another date.',
      });
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const { start, end } = timestamps;

      const res = await apiClient.post('/appointments/book', {
        doctorId: doctor.userId || doctor.user?.id,
        scheduledStart: start.toISOString(),
        scheduledEnd: end.toISOString(),
        symptomsDescription: symptoms.trim() || 'General teleconsultation request.',
      });

      if (res.data.success) {
        showAlert({
          type: 'success',
          title: 'Appointment Confirmed',
          message: `Your video consultation with ${doctor.user.fullName} is scheduled for ${start.toLocaleDateString()} at ${selectedWindow.start}.`,
          actions: [
            {
              text: 'View Schedule',
              style: 'primary',
              onPress: () => {
                navigation.popToTop();
                navigation.getParent()?.navigate('Schedule');
              },
            },
          ],
        });
      }
    } catch (err: any) {
      if (err.response?.status === 402) {
        showAlert({
          type: 'warning',
          title: 'Subscription Required',
          message:
            'Your 90-day free trial has expired. A GHS 10 / month subscription is required to book new appointments.',
          actions: [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Subscribe via MoMo',
              style: 'primary',
              onPress: () => navigation.getParent()?.navigate('Plan & MoMo'),
            },
          ],
        });
      } else {
        if (err.response?.status === 409) {
          // Refresh booked slots and auto-advance to next open slot
          fetchBookedSlotsForDate(selectedDate);
        }
        setErrorMsg(
          err.response?.data?.message ||
            'Failed to book appointment. Please select another available slot.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const openSlotsCount = timeWindows.filter((w) => !isWindowBooked(w, bookedSlots)).length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Active Plan Banner */}
      <View style={styles.trialInfoCard}>
        <View style={styles.trialIconWrap}>
          <MaterialIcons name="verified-user" size={18} color={COLORS.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.trialTitle}>
            {subscription?.status === 'TRIAL' ? '90-Day Free Trial Active' : 'Monthly Plan Active'}
          </Text>
          <Text style={styles.trialDesc}>
            {subscription?.status === 'TRIAL'
              ? `${subscription?.trialDaysRemaining ?? 90} days remaining — booking this session is free.`
              : 'Your 10 GHS monthly plan covers unlimited teleconsultations.'}
          </Text>
        </View>
      </View>

      {errorMsg ? (
        <View style={styles.errorBox}>
          <MaterialIcons name="error-outline" size={18} color={COLORS.danger} />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      {/* Date & Time Picker Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <MaterialIcons name="calendar-month" size={18} color={COLORS.primary} />
          <Text style={styles.cardHeader}>
            Select Date {slot ? `(${DAYS_OF_WEEK[slot.dayOfWeek]}s)` : ''}
          </Text>
        </View>

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
                activeOpacity={0.8}
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

        <View style={[styles.slotTitleBar, { marginTop: 14 }]}>
          <View style={styles.cardHeaderRow}>
            <MaterialIcons name="schedule" size={18} color={COLORS.primary} />
            <Text style={styles.cardHeader}>Available 30-Min Slots</Text>
          </View>
          {!isLoadingSlots && (
            <Text style={styles.openCountText}>
              {openSlotsCount} of {timeWindows.length} open
            </Text>
          )}
        </View>

        {isLoadingSlots ? (
          <View style={styles.slotsLoading}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.slotsLoadingText}>Checking live availability...</Text>
          </View>
        ) : openSlotsCount === 0 ? (
          <View style={styles.fullyBookedBox}>
            <MaterialIcons name="event-busy" size={20} color={COLORS.warning} />
            <Text style={styles.fullyBookedText}>
              All slots on this date are booked. Please choose another date above.
            </Text>
          </View>
        ) : (
          <View style={styles.timeGrid}>
            {timeWindows.map((win, idx) => {
              const booked = isWindowBooked(win, bookedSlots);
              const isSelected = !booked && idx === selectedWindowIndex;
              return (
                <TouchableOpacity
                  key={win.start}
                  style={[
                    styles.timeChip,
                    isSelected && styles.timeChipActive,
                    booked && styles.timeChipBooked,
                  ]}
                  onPress={() => {
                    if (!booked) setSelectedWindowIndex(idx);
                  }}
                  disabled={booked}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.timeChipText,
                      isSelected && styles.timeChipTextActive,
                      booked && styles.timeChipTextBooked,
                    ]}
                  >
                    {win.start} – {win.end}
                  </Text>
                  {booked && <Text style={styles.bookedTag}>Booked</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Summary Card */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>Consultation Summary</Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Physician</Text>
          <Text style={styles.detailValue}>{doctor.user.fullName}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Specialty</Text>
          <Text style={styles.detailValue}>{doctor.specialty}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date</Text>
          <Text style={styles.detailValue}>
            {DAYS_OF_WEEK[selectedDate.getDay()]}, {selectedDate.toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Time Window</Text>
          <Text style={[styles.detailValue, { color: selectedWindow ? COLORS.primary : COLORS.danger }]}>
            {selectedWindow ? `${selectedWindow.start} – ${selectedWindow.end} (30 min)` : 'None available'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Format</Text>
          <Text style={styles.detailValue}>HD Video & Chat</Text>
        </View>
      </View>

      {/* Symptoms Note */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>Symptoms & Reason for Visit</Text>
        <Text style={styles.notesSubtitle}>
          Briefly describe your symptoms so your doctor can prepare ahead of the call.
        </Text>

        <TextInput
          style={styles.textArea}
          placeholder="e.g. Mild chest tightness during morning walk, headache for 2 days..."
          placeholderTextColor={COLORS.textSubtle}
          value={symptoms}
          onChangeText={setSymptoms}
          multiline
          numberOfLines={4}
        />
      </View>

      <TouchableOpacity
        style={[
          styles.confirmBtn,
          (isSubmitting || !selectedWindow || isLoadingSlots) && styles.btnDisabled,
        ]}
        onPress={handleConfirmBooking}
        disabled={isSubmitting || !selectedWindow || isLoadingSlots}
        activeOpacity={0.85}
      >
        {isSubmitting ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <View style={styles.btnInner}>
            <MaterialIcons name="check-circle-outline" size={18} color={COLORS.white} />
            <Text style={styles.confirmBtnText}>Confirm & Book Consultation</Text>
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
    gap: 16,
    paddingBottom: 32,
  },
  trialInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    borderRadius: RADIUS.lg,
    padding: 14,
  },
  trialIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trialTitle: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.primaryDark,
  },
  trialDesc: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    padding: 12,
    borderRadius: RADIUS.md,
  },
  errorText: {
    flex: 1,
    color: COLORS.danger,
    fontSize: 12,
    fontFamily: FONTS.medium,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
    ...SHADOWS.card,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotTitleBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  openCountText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  cardHeader: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  pillsRow: {
    gap: 10,
    paddingVertical: 4,
  },
  datePill: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    alignItems: 'center',
    minWidth: 80,
  },
  datePillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  datePillDay: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  datePillNum: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginTop: 2,
  },
  datePillTextActive: {
    color: COLORS.white,
  },
  slotsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    justifyContent: 'center',
  },
  slotsLoadingText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
  },
  fullyBookedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.warningSoft,
    borderWidth: 1,
    borderColor: COLORS.warningBorder,
    borderRadius: RADIUS.md,
    padding: 12,
  },
  fullyBookedText: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: '#92400E',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  timeChipActive: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primary,
  },
  timeChipBooked: {
    backgroundColor: COLORS.surfaceMuted,
    borderColor: COLORS.border,
    opacity: 0.65,
  },
  timeChipText: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
  },
  timeChipTextActive: {
    color: COLORS.primaryDark,
    fontFamily: FONTS.bold,
  },
  timeChipTextBooked: {
    color: COLORS.textSubtle,
    textDecorationLine: 'line-through',
  },
  bookedTag: {
    fontSize: 9,
    fontFamily: FONTS.bold,
    color: COLORS.danger,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
  },
  detailValue: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  notesSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    lineHeight: 17,
  },
  textArea: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.md,
    padding: 14,
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    height: 96,
    textAlignVertical: 'top',
  },
  confirmBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.card,
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnDisabled: {
    opacity: 0.55,
  },
  confirmBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontFamily: FONTS.bold,
  },
});
