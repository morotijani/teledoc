import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiClient } from '../../api/client';
import { useAlert } from '../../context/AlertContext';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../../theme/theme';

export default function PostConsultationScreen({ route, navigation }: any) {
  const { appointment } = route.params;
  const { showAlert } = useAlert();
  const existingConsultation = appointment?.consultation;
  const existingRx = existingConsultation?.prescriptions?.[0]?.medications;

  const [diagnosis, setDiagnosis] = useState(existingConsultation?.diagnosis || '');
  const [patientSummary, setPatientSummary] = useState(existingConsultation?.patientSummary || '');
  const [doctorNotes, setDoctorNotes] = useState(existingConsultation?.doctorNotes || '');

  const [medications, setMedications] = useState<any[]>(
    Array.isArray(existingRx) && existingRx.length > 0
      ? existingRx
      : [{ drugName: '', dosage: '', frequency: 'Twice daily', duration: '7 days', instructions: '' }]
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchLatestConsultation();
  }, []);

  const fetchLatestConsultation = async () => {
    try {
      const res = await apiClient.get(`/consultations/${appointment.id}`);
      const c = res.data.consultation;
      if (c) {
        if (c.diagnosis) setDiagnosis(c.diagnosis);
        if (c.patientSummary) setPatientSummary(c.patientSummary);
        if (c.doctorNotes) setDoctorNotes(c.doctorNotes);
        const rxMeds = c.prescriptions?.[c.prescriptions.length - 1]?.medications;
        if (Array.isArray(rxMeds) && rxMeds.length > 0) {
          setMedications(rxMeds);
        }
      }
    } catch {
      // Fresh consultation
    }
  };

  const handleAddMedication = () => {
    setMedications([
      ...medications,
      { drugName: '', dosage: '', frequency: 'Once daily', duration: '5 days', instructions: '' },
    ]);
  };

  const handleRemoveMedication = (index: number) => {
    if (medications.length === 1) return;
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleMedChange = (index: number, field: string, value: string) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], [field]: value };
    setMedications(updated);
  };

  const handleSubmit = async () => {
    if (!diagnosis.trim() || !patientSummary.trim()) {
      showAlert({
        type: 'warning',
        title: 'Required Information',
        message: 'Diagnosis and Patient Summary are required to complete this session.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post(`/consultations/${appointment.id}/notes`, {
        diagnosis: diagnosis.trim(),
        patientSummary: patientSummary.trim(),
        doctorNotes: doctorNotes.trim() || undefined,
      });

      const validMeds = medications.filter((m) => m.drugName && m.drugName.trim().length > 0);
      if (validMeds.length > 0) {
        await apiClient.post(`/consultations/${appointment.id}/prescriptions`, {
          medications: validMeds,
        });
      }

      showAlert({
        type: 'success',
        title: 'Documentation Saved',
        message: `Clinical notes and prescription have been synchronized to ${appointment.patient.fullName}'s profile.`,
        actions: [{ text: 'Done', style: 'primary', onPress: () => navigation.goBack() }],
      });
    } catch (err: any) {
      showAlert({
        type: 'error',
        title: 'Submission Error',
        message: err.response?.data?.message || 'Failed to save post-consultation documentation.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.patientTitle}>{appointment.patient.fullName}</Text>
        <Text style={styles.sessionDate}>
          Session Date: {new Date(appointment.scheduledStart).toLocaleDateString()}
        </Text>
      </View>

      {/* Clinical Notes Card */}
      <View style={styles.card}>
        <View style={styles.sectionTitleRow}>
          <MaterialIcons name="assignment" size={18} color={COLORS.primary} />
          <Text style={styles.cardTitle}>Clinical Diagnosis & Findings</Text>
        </View>

        <Text style={styles.label}>Formal Diagnosis *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Essential Hypertension Stage 1"
          placeholderTextColor={COLORS.textSubtle}
          value={diagnosis}
          onChangeText={setDiagnosis}
        />

        <Text style={styles.label}>Patient-Visible Summary *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Summary of findings and lifestyle recommendations visible to patient..."
          placeholderTextColor={COLORS.textSubtle}
          value={patientSummary}
          onChangeText={setPatientSummary}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Confidential Doctor Notes (Private)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Private clinician notes and follow-up markers (never shown to patients)..."
          placeholderTextColor={COLORS.textSubtle}
          value={doctorNotes}
          onChangeText={setDoctorNotes}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Prescription Builder Card */}
      <View style={styles.card}>
        <View style={styles.rxHeaderRow}>
          <View style={styles.sectionTitleRow}>
            <MaterialIcons name="medication" size={18} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Electronic Prescription (Rx)</Text>
          </View>
          <TouchableOpacity onPress={handleAddMedication} style={styles.addMedBtn}>
            <MaterialIcons name="add" size={15} color={COLORS.primaryDark} />
            <Text style={styles.addMedBtnText}>Add Drug</Text>
          </TouchableOpacity>
        </View>

        {medications.map((med, index) => (
          <View key={index} style={styles.medBox}>
            <View style={styles.medBoxHeader}>
              <Text style={styles.medIndexText}>Medication #{index + 1}</Text>
              {medications.length > 1 && (
                <TouchableOpacity onPress={() => handleRemoveMedication(index)}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.row}>
              <View style={{ flex: 2 }}>
                <Text style={styles.label}>Drug Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Amlodipine"
                  placeholderTextColor={COLORS.textSubtle}
                  value={med.drugName}
                  onChangeText={(val) => handleMedChange(index, 'drugName', val)}
                />
              </View>

              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.label}>Dosage</Text>
                <TextInput
                  style={styles.input}
                  placeholder="5mg"
                  placeholderTextColor={COLORS.textSubtle}
                  value={med.dosage}
                  onChangeText={(val) => handleMedChange(index, 'dosage', val)}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Frequency</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Once daily"
                  placeholderTextColor={COLORS.textSubtle}
                  value={med.frequency}
                  onChangeText={(val) => handleMedChange(index, 'frequency', val)}
                />
              </View>

              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.label}>Duration</Text>
                <TextInput
                  style={styles.input}
                  placeholder="30 days"
                  placeholderTextColor={COLORS.textSubtle}
                  value={med.duration}
                  onChangeText={(val) => handleMedChange(index, 'duration', val)}
                />
              </View>
            </View>

            <Text style={styles.label}>Instructions</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Take with breakfast"
              placeholderTextColor={COLORS.textSubtle}
              value={med.instructions || ''}
              onChangeText={(val) => handleMedChange(index, 'instructions', val)}
            />
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, isSubmitting && styles.btnDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
        activeOpacity={0.85}
      >
        {isSubmitting ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <View style={styles.btnInner}>
            <MaterialIcons name="check-circle-outline" size={18} color={COLORS.white} />
            <Text style={styles.submitBtnText}>Complete Session & Sync Rx</Text>
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
  header: {
    backgroundColor: COLORS.navy,
    padding: 18,
    borderRadius: RADIUS.lg,
  },
  patientTitle: {
    fontSize: 17,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
  sessionDate: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: '#94A3B8',
    marginTop: 2,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  rxHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  addMedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  addMedBtnText: {
    color: COLORS.primaryDark,
    fontSize: 11,
    fontFamily: FONTS.bold,
  },
  label: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
    marginBottom: 5,
    marginTop: 8,
  },
  input: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  medBox: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 14,
    marginTop: 10,
  },
  medBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  medIndexText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.primaryDark,
  },
  removeText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.danger,
  },
  row: {
    flexDirection: 'row',
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontFamily: FONTS.bold,
  },
});
