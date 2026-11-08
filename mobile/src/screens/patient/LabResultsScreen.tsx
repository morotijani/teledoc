import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  Linking,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { apiClient, API_URL } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function LabResultsScreen() {
  const { user } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [fileType, setFileType] = useState('LAB_RESULT');
  const [notes, setNotes] = useState('');
  const [pickedFile, setPickedFile] = useState<{ uri: string; name: string; mimeType: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    if (!user) return;
    try {
      const res = await apiClient.get(`/records/patient/${user.id}`);
      setRecords(res.data.records || []);
    } catch (err) {
      console.error('Failed to load records:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setPickedFile({
          uri: asset.uri,
          name: asset.name || 'medical_document.pdf',
          mimeType: asset.mimeType || 'application/pdf',
        });
        if (!title.trim() && asset.name) {
          setTitle(asset.name.replace(/\.[^/.]+$/, ''));
        }
      }
    } catch (err) {
      Alert.alert('File Picker Error', 'Could not open document picker on this device.');
    }
  };

  const handleUpload = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a title for this lab report.');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('fileType', fileType);
      formData.append('notes', notes.trim());

      if (pickedFile) {
        formData.append('file', {
          uri: pickedFile.uri,
          name: pickedFile.name,
          type: pickedFile.mimeType,
        } as any);
      } else {
        formData.append('useSampleFile', 'true');
      }

      await apiClient.post('/records/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setModalVisible(false);
      setTitle('');
      setNotes('');
      setPickedFile(null);
      fetchRecords();
      Alert.alert('Success', 'Medical document uploaded and linked to your profile.');
    } catch (err: any) {
      Alert.alert('Upload Error', err.response?.data?.message || 'Failed to upload document.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenDocument = async (rawUrl: string) => {
    if (!rawUrl) return;
    const baseServer = API_URL.replace('/api/v1', '');
    const resolvedUrl = rawUrl.replace(/http:\/\/localhost:\d+/, baseServer);
    try {
      await Linking.openURL(resolvedUrl);
    } catch {
      Alert.alert('Cannot Open File', `Document URL: ${resolvedUrl}`);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>{item.fileType === 'LAB_RESULT' ? '🧪' : '📄'}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.meta}>
            {item.fileType} • {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>

        {item.fileUrl ? (
          <TouchableOpacity
            style={styles.openFileBtn}
            onPress={() => handleOpenDocument(item.fileUrl)}
          >
            <Text style={styles.openFileBtnText}>Open ↗</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {item.notes ? <Text style={styles.notesText}>Note: {item.notes}</Text> : null}

      <View style={styles.cardFooter}>
        <Text style={styles.uploaderText}>Uploaded by {item.uploadedBy?.fullName || 'You'}</Text>
        <Text style={styles.readyText}>✓ Available to Doctor</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.screenTitle}>My Lab Results & Files</Text>
          <Text style={styles.screenSubtitle}>Upload test documents for your doctor to review.</Text>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.addBtnText}>+ Upload</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Fetching lab reports...</Text>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🧪</Text>
              <Text style={styles.emptyTitle}>No Lab Results Uploaded</Text>
              <Text style={styles.emptyText}>
                Upload previous blood tests, pathology reports, or scan images so your consulting doctor can inspect them.
              </Text>
            </View>
          }
        />
      )}

      {/* Upload Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Upload Medical Document</Text>
            <Text style={styles.modalDesc}>Supported formats: PDF, JPG, PNG (Max 25 MB)</Text>

            <Text style={styles.label}>Select File from Device</Text>
            <TouchableOpacity style={styles.filePickerBtn} onPress={handlePickDocument}>
              <Text style={styles.filePickerBtnText}>
                {pickedFile
                  ? `📎 Selected: ${pickedFile.name}`
                  : '📂 Choose PDF or Image from Device (or leave blank for Sample PDF)'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.label}>Document Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Complete Blood Count (CBC) - Nov 2026"
              placeholderTextColor="#94a3b8"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.label}>Document Type</Text>
            <View style={styles.typeRow}>
              {['LAB_RESULT', 'IMAGING', 'DOCTOR_NOTE'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typePill, fileType === t && styles.typePillActive]}
                  onPress={() => setFileType(t)}
                >
                  <Text style={[styles.typeText, fileType === t && styles.typeTextActive]}>
                    {t.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Notes for Doctor (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Brief context on when or where this test was conducted..."
              placeholderTextColor="#94a3b8"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setModalVisible(false);
                  setPickedFile(null);
                }}
                disabled={isUploading}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitUploadBtn, isUploading && styles.btnDisabled]}
                onPress={handleUpload}
                disabled={isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitUploadBtnText}>Save & Upload</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  screenTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  screenSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  addBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 20,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  meta: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  openFileBtn: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  openFileBtnText: {
    color: '#0284c7',
    fontSize: 11,
    fontWeight: '800',
  },
  notesText: {
    fontSize: 12,
    color: '#475569',
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  uploaderText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  readyText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#64748b',
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#334155',
  },
  emptyText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  modalDesc: {
    fontSize: 12,
    color: '#64748b',
  },
  filePickerBtn: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  filePickerBtnText: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  typePillActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  typeTextActive: {
    color: '#ffffff',
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  submitUploadBtn: {
    flex: 2,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#059669',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  submitUploadBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
});
