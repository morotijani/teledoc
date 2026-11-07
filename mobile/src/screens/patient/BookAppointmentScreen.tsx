import React, { useState } from 'react';
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

export default function BookAppointmentScreen({ route, navigation }: any) {
  const { doctor, slot } = route.params;
  const { subscription } = useAuth();
  const [symptoms, setSymptoms] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Default to tomorrow 10:00 AM UTC
  const defaultStartTime = new Date();
  defaultStartTime.setDate(defaultStartTime.getDate() + 1);
  defaultStartTime.setHours(10, 0, 0, 0);

  const defaultEndTime = new Date(defaultStartTime);
  defaultEndTime.setMinutes(defaultEndTime.getMinutes() + 30);

  const handleConfirmBooking = async () => {
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await apiClient.post('/appointments/book', {
        doctorId: doctor.userId || doctor.user?.id,
        scheduledStart: defaultStartTime.toISOString(),
        scheduledEnd: defaultEndTime.toISOString(),
        symptomsDescription: symptoms.trim() || 'General teleconsultation request.',
      });

      if (res.data.success) {
        Alert.alert(
          '🎉 Appointment Confirmed!',
          `Your video consultation with ${doctor.user.fullName} is scheduled. You can enter the call room when the session begins.`,
          [
            {
              text: 'View Appointments',
              onPress: () => navigation.navigate('MyAppointments'),
            },
          ]
        );
      }
    } catch (err: any) {
      if (err.response?.status === 402) {
        // Paywall triggered! 90-day trial expired or renewal needed
        Alert.alert(
          'Subscription Required',
          'Your 90-day free trial has expired. A 10 GHS / month subscription is required to book new appointments.',
          [
            {
              text: 'Subscribe via Mobile Money',
              onPress: () => navigation.navigate('SubscriptionPaywall'),
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      } else {
        setErrorMsg(err.response?.data?.message || 'Failed to book appointment. Please try another slot.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Confirm Appointment</Text>
        <Text style={styles.subtitle}>Review session details before confirming your booking.</Text>
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
          <Text style={styles.detailLabel}>Scheduled Date:</Text>
          <Text style={styles.detailValue}>{defaultStartTime.toLocaleDateString()}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Session Time:</Text>
          <Text style={styles.detailValue}>
            {slot ? `${slot.startTime} - ${slot.endTime}` : '10:00 AM - 10:30 AM (30 mins)'}
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
