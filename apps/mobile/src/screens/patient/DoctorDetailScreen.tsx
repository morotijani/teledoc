import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { apiClient } from '../../api/client';

export default function DoctorDetailScreen({ route, navigation }: any) {
  const { doctor } = route.params;
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDoctorFullProfile();
  }, []);

  const fetchDoctorFullProfile = async () => {
    try {
      const res = await apiClient.get(`/doctors/${doctor.id}`);
      setProfile(res.data.doctor);
    } catch (err) {
      console.error('Failed to load full doctor profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Info */}
      <View style={styles.doctorCard}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarLargeText}>
            {doctor.user.fullName.replace('Dr. ', '').charAt(0)}
          </Text>
        </View>

        <Text style={styles.doctorName}>{doctor.user.fullName}</Text>
        <Text style={styles.specialty}>{doctor.specialty}</Text>
        <Text style={styles.hospital}>{doctor.hospitalAffiliation || 'Accra Medical Center'}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>MDC License</Text>
            <Text style={styles.metaValue}>{doctor.licenseNumber}</Text>
          </View>

          <View style={styles.metaDivider} />

          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Experience</Text>
            <Text style={styles.metaValue}>{doctor.yearsOfExperience} Years</Text>
          </View>

          <View style={styles.metaDivider} />

          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Fee</Text>
            <Text style={styles.metaValue}>
              {parseFloat(doctor.consultationFee) === 0 ? 'Free (Trial)' : `${doctor.consultationFee} GHS`}
            </Text>
          </View>
        </View>
      </View>

      {/* Bio Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>About the Doctor</Text>
        <Text style={styles.bioText}>
          {doctor.bio ||
            'Senior physician committed to delivering accessible clinical care, early diagnoses, and personalized treatment plans across Ghana.'}
        </Text>
      </View>

      {/* Available Consultation Slots */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Available Weekly Schedule</Text>
        <Text style={styles.sectionDesc}>
          Select an available slot below to proceed with your live teleconsultation booking.
        </Text>

        {isLoading ? (
          <ActivityIndicator color="#059669" style={{ marginVertical: 20 }} />
        ) : profile?.user?.availabilities && profile.user.availabilities.length > 0 ? (
          <View style={styles.slotsContainer}>
            {profile.user.availabilities.map((slot: any) => (
              <TouchableOpacity
                key={slot.id}
                style={styles.slotPill}
                onPress={() =>
                  navigation.navigate('BookAppointment', {
                    doctor,
                    slot,
                  })
                }
              >
                <View>
                  <Text style={styles.slotDay}>{daysOfWeek[slot.dayOfWeek]}</Text>
                  <Text style={styles.slotTime}>
                    {slot.startTime} - {slot.endTime}
                  </Text>
                </View>
                <Text style={styles.slotAction}>Select Slot →</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.defaultSlotOption}>
            <Text style={styles.defaultSlotText}>
              Doctor has general morning availability (Mon - Fri: 09:00 - 15:00)
            </Text>
            <TouchableOpacity
              style={styles.primaryBookBtn}
              onPress={() =>
                navigation.navigate('BookAppointment', {
                  doctor,
                  defaultTime: 'tomorrow_0900',
                })
              }
            >
              <Text style={styles.primaryBookBtnText}>Book Next Available Session</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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
  doctorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ecfdf5',
    borderWidth: 2,
    borderColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarLargeText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#059669',
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  specialty: {
    fontSize: 14,
    color: '#0284c7',
    fontWeight: '700',
    marginTop: 2,
  },
  hospital: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  metaItem: {
    alignItems: 'center',
  },
  metaDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e2e8f0',
  },
  metaLabel: {
    fontSize: 10,
    color: '#94a3b8',
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1e293b',
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 16,
  },
  bioText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  slotsContainer: {
    gap: 8,
  },
  slotPill: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  slotDay: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  slotTime: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
    marginTop: 2,
  },
  slotAction: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284c7',
  },
  defaultSlotOption: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  defaultSlotText: {
    fontSize: 12,
    color: '#065f46',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  primaryBookBtn: {
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
  },
  primaryBookBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
