import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { apiClient } from '../../api/client';

export default function PostConsultationScreen({ route, navigation }: any) {
  const { appointment } = route.params;
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
      // No existing consultation record yet — start fresh
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
      Alert.alert(
        'Required Information',
        'Diagnosis and Patient Summary are required to complete this session.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Save consultation clinical notes
      await apiClient.post(`/consultations/${appointment.id}/notes`, {
        diagnosis: diagnosis.trim(),
        patientSummary: patientSummary.trim(),
        doctorNotes: doctorNotes.trim() || undefined,
      });

      // 2. Issue digital prescription if any medications have a drug name
      const validMeds = medications.filter((m) => m.drugName && m.drugName.trim().length > 0);
      if (validMeds.length > 0) {
        await apiClient.post(`/consultations/${appointment.id}/prescriptions`, {
          medications: validMeds,
        });
      }

      Alert.alert(
        '✓ Documentation Complete',
        `Clinical notes and prescription have been synchronized to ${appointment.patient.fullName}'s profile.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      Alert.alert(
        'Submission Error',
        err.response?.data?.message || 'Failed to save post-consultation documentation.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.patientTitle}>Consultation with {appointment.patient.fullName}</Text>
        <Text style={styles.sessionDate}>
          Session Date: {new Date(appointment.scheduledStart).toLocaleDateString()}
        </Text>
      </View>

      {/* Clinical Notes Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Clinical Diagnosis & Findings</Text>

        <Text style={styles.label}>Formal Diagnosis *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Essential Hypertension Stage 1"
          placeholderTextColor="#94a3b8"
          value={diagnosis}
          onChangeText={setDiagnosis}
        />

        <Text style={styles.label}>Patient-Visible Summary *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Summary of findings and lifestyle recommendations visible to patient..."
          placeholderTextColor="#94a3b8"
          value={patientSummary}
          onChangeText={setPatientSummary}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Confidential Doctor Notes (Private - Doctors Only)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Confidential clinician notes and follow-up markers (never shown to patients)..."
          placeholderTextColor="#94a3b8"
          value={doctorNotes}
          onChangeText={setDoctorNotes}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Digital Prescription Builder Card */}
      <View style={styles.card}>
        <View style={styles.rxHeaderRow}>
          <Text style={styles.cardTitle}>Electronic Prescription (Rx)</Text>
          <TouchableOpacity onPress={handleAddMedication} style={styles.addMedBtn}>
            <Text style={styles.addMedBtnText}>+ Add Medication</Text>
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
                  placeholderTextColor="#94a3b8"
                  value={med.drugName}
                  onChangeText={(val) => handleMedChange(index, 'drugName', val)}
                />
              </View>

              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.label}>Dosage</Text>
                <TextInput
                  style={styles.input}
                  placeholder="5mg"
                  placeholderTextColor="#94a3b8"
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
                  placeholderTextColor="#94a3b8"
                  value={med.frequency}
                  onChangeText={(val) => handleMedChange(index, 'frequency', val)}
                />
              </View>

              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.label}>Duration</Text>
                <TextInput
                  style={styles.input}
                  placeholder="30 days"
                  placeholderTextColor="#94a3b8"
                  value={med.duration}
                  onChangeText={(val) => handleMedChange(index, 'duration', val)}
                />
              </View>
            </View>

            <Text style={styles.label}>Instructions</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Take with breakfast"
              placeholderTextColor="#94a3b8"
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
      >
        {isSubmitting ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.submitBtnText}>Complete Session & Sync e-Prescription</Text>
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
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 16,
  },
  patientTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
  },
  sessionDate: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
  },
  rxHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addMedBtn: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  addMedBtnText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '800',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 4,
    marginTop: 6,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0f172a',
  },
  textArea: {
    height: 65,
    textAlignVertical: 'top',
  },
  medBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  medBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  medIndexText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  removeText: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
  },
  submitBtn: {
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
