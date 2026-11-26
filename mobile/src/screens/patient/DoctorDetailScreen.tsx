import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiClient } from '../../api/client';
import { useAlert } from '../../context/AlertContext';
import Avatar from '../../components/Avatar';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../../theme/theme';

export default function DoctorDetailScreen({ route, navigation }: any) {
  const { doctor } = route.params;
  const { showAlert } = useAlert();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleCallDoctor = () => {
    const phone = profile?.user?.phoneNumber || doctor.user?.phoneNumber;
    showAlert({
      type: 'info',
      title: `Call ${doctor.user.fullName}`,
      message: 'Choose how you would like to connect with this clinician.',
      actions: [
        {
          text: 'In-App Video Consultation',
          style: 'primary',
          onPress: () => {
            const firstSlot = profile?.user?.availabilities?.[0];
            navigation.navigate('BookAppointment', { doctor, slot: firstSlot });
          },
        },
        ...(phone
          ? [
              {
                text: `Phone Dialer (${phone})`,
                style: 'primary' as const,
                onPress: () => Linking.openURL(`tel:${phone}`),
              },
            ]
          : []),
        { text: 'Cancel', style: 'cancel' },
      ],
    });
  };

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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Hero Card */}
      <View style={styles.doctorCard}>
        <View style={{ marginBottom: 12 }}>
          <Avatar
            uri={profile?.user?.avatarUrl || doctor.user.avatarUrl}
            name={doctor.user.fullName}
            size={78}
            borderRadius={26}
          />
        </View>

        <View style={styles.nameRow}>
          <Text style={styles.doctorName}>{doctor.user.fullName}</Text>
          <MaterialIcons name="verified" size={18} color={COLORS.primary} />
        </View>
        <Text style={styles.specialty}>{doctor.specialty}</Text>

        <View style={styles.hospitalRow}>
          <MaterialIcons name="local-hospital" size={14} color={COLORS.textMuted} />
          <Text style={styles.hospital}>{doctor.hospitalAffiliation || 'Accra Medical Center'}</Text>
        </View>

        <TouchableOpacity style={styles.callDoctorBtn} onPress={handleCallDoctor} activeOpacity={0.85}>
          <MaterialIcons name="call" size={17} color={COLORS.white} />
          <Text style={styles.callDoctorBtnText}>Call Doctor</Text>
        </TouchableOpacity>

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
              {parseFloat(doctor.consultationFee) === 0 ? 'In Plan' : `GHS ${doctor.consultationFee}`}
            </Text>
          </View>
        </View>
      </View>

      {/* About Section */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="info-outline" size={18} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>About Physician</Text>
        </View>
        <Text style={styles.bioText}>
          {doctor.bio ||
            'Senior physician committed to delivering accessible clinical care, early diagnoses, and personalized treatment plans across Ghana.'}
        </Text>
      </View>

      {/* Available Consultation Slots */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="event-available" size={18} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Weekly Consultation Hours</Text>
        </View>
        <Text style={styles.sectionDesc}>
          Select a day below to pick your exact date and 30-minute video consultation slot.
        </Text>

        {isLoading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} />
        ) : profile?.user?.availabilities && profile.user.availabilities.length > 0 ? (
          <View style={styles.slotsContainer}>
            {profile.user.availabilities.map((slot: any) => (
              <TouchableOpacity
                key={slot.id}
                style={styles.slotPill}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate('BookAppointment', {
                    doctor,
                    slot,
                  })
                }
              >
                <View style={styles.slotLeft}>
                  <View style={styles.slotIconBox}>
                    <MaterialIcons name="schedule" size={16} color={COLORS.primary} />
                  </View>
                  <View>
                    <Text style={styles.slotDay}>{daysOfWeek[slot.dayOfWeek]}</Text>
                    <Text style={styles.slotTime}>
                      {slot.startTime} – {slot.endTime}
                    </Text>
                  </View>
                </View>

                <View style={styles.slotActionRow}>
                  <Text style={styles.slotAction}>Select</Text>
                  <MaterialIcons name="chevron-right" size={18} color={COLORS.primary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.defaultSlotOption}>
            <Text style={styles.defaultSlotText}>
              Standard morning availability (Mon – Fri, 09:00 – 15:00)
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
              <MaterialIcons name="arrow-forward" size={16} color={COLORS.white} />
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
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: 18,
    gap: 16,
    paddingBottom: 32,
  },
  doctorCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  avatarLarge: {
    width: 74,
    height: 74,
    borderRadius: 24,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarLargeText: {
    fontSize: 30,
    fontFamily: FONTS.extraBold,
    color: COLORS.primary,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  doctorName: {
    fontSize: 19,
    fontFamily: FONTS.extraBold,
    color: COLORS.text,
  },
  specialty: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.info,
    marginTop: 2,
  },
  hospitalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
    marginBottom: 18,
  },
  hospital: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
  },
  callDoctorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    marginBottom: 16,
  },
  callDoctorBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontFamily: FONTS.bold,
  },
  metaRow: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    paddingHorizontal: 14,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metaItem: {
    alignItems: 'center',
    flex: 1,
  },
  metaDivider: {
    width: 1,
    height: 26,
    backgroundColor: COLORS.border,
  },
  metaLabel: {
    fontSize: 10,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginTop: 3,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  sectionDesc: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginBottom: 14,
    lineHeight: 18,
  },
  bioText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  slotsContainer: {
    gap: 10,
  },
  slotPill: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  slotLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  slotIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotDay: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  slotTime: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.primaryDark,
    marginTop: 1,
  },
  slotActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  slotAction: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  defaultSlotOption: {
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    borderRadius: RADIUS.lg,
    padding: 16,
    alignItems: 'center',
  },
  defaultSlotText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.primaryDark,
    textAlign: 'center',
    marginBottom: 12,
  },
  primaryBookBtn: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 46,
    paddingHorizontal: 20,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBookBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontFamily: FONTS.bold,
  },
});
