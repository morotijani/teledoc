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
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { useDocumentViewer } from '../../context/DocumentViewerContext';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../../theme/theme';

export default function LabResultsScreen() {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { openDocument } = useDocumentViewer();
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
    } catch {
      showAlert({
        type: 'error',
        title: 'File Picker Error',
        message: 'Could not open document picker on this device.',
      });
    }
  };

  const handleUpload = async () => {
    if (!title.trim()) {
      showAlert({
        type: 'warning',
        title: 'Title Required',
        message: 'Please enter a title for this lab report before uploading.',
      });
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
      showAlert({
        type: 'success',
        title: 'Document Uploaded',
        message: 'Medical document uploaded and linked to your profile.',
      });
    } catch (err: any) {
      showAlert({
        type: 'error',
        title: 'Upload Error',
        message: err.response?.data?.message || 'Failed to upload document.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenDocument = (rawUrl: string, docTitle?: string) => {
    if (!rawUrl) return;
    openDocument(rawUrl, docTitle);
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <MaterialIcons
            name={item.fileType === 'LAB_RESULT' ? 'science' : 'description'}
            size={20}
            color={COLORS.primary}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.meta}>
            {item.fileType.replace('_', ' ')} · {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>

        {item.fileUrl ? (
          <TouchableOpacity
            style={styles.openFileBtn}
            onPress={() => handleOpenDocument(item.fileUrl, item.title)}
          >
            <Text style={styles.openFileBtnText}>View</Text>
            <MaterialIcons name="visibility" size={14} color={COLORS.info} />
          </TouchableOpacity>
        ) : null}
      </View>

      {item.notes ? <Text style={styles.notesText}>Note: {item.notes}</Text> : null}

      <View style={styles.cardFooter}>
        <Text style={styles.uploaderText}>Uploaded by {item.uploadedBy?.fullName || 'You'}</Text>
        <View style={styles.readyBadge}>
          <MaterialIcons name="check-circle" size={13} color={COLORS.success} />
          <Text style={styles.readyText}>Shared with Doctor</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.screenTitle}>Clinical Documents</Text>
          <Text style={styles.screenSubtitle}>Upload lab tests or imaging for your physician.</Text>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <MaterialIcons name="upload-file" size={16} color={COLORS.white} />
          <Text style={styles.addBtnText}>Upload</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Fetching lab reports...</Text>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <MaterialIcons name="science" size={30} color={COLORS.textSubtle} />
              </View>
              <Text style={styles.emptyTitle}>No Lab Results Uploaded</Text>
              <Text style={styles.emptyText}>
                Upload blood tests, pathology reports, or scan images so your consulting doctor can inspect them.
              </Text>
            </View>
          }
        />
      )}

      {/* Upload Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Upload Medical Document</Text>
                <Text style={styles.modalDesc}>PDF, JPG, or PNG (Max 25 MB)</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setPickedFile(null);
                }}
              >
                <MaterialIcons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.filePickerBtn} onPress={handlePickDocument}>
              <MaterialIcons
                name={pickedFile ? 'attach-file' : 'cloud-upload'}
                size={20}
                color={COLORS.primary}
              />
              <Text style={styles.filePickerBtnText}>
                {pickedFile
                  ? `Selected: ${pickedFile.name}`
                  : 'Choose PDF or Image from Device'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.label}>Document Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Complete Blood Count (CBC)"
              placeholderTextColor={COLORS.textSubtle}
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
              placeholderTextColor={COLORS.textSubtle}
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
                  <ActivityIndicator color={COLORS.white} />
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
    backgroundColor: COLORS.bg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  screenTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  screenSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
  },
  addBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: FONTS.bold,
  },
  listContent: {
    padding: 18,
    gap: 12,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  meta: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  openFileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.infoSoft,
    borderWidth: 1,
    borderColor: COLORS.infoBorder,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  openFileBtnText: {
    color: COLORS.info,
    fontSize: 11,
    fontFamily: FONTS.bold,
  },
  notesText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    backgroundColor: COLORS.bg,
    padding: 10,
    borderRadius: RADIUS.sm,
    marginTop: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceMuted,
  },
  uploaderText: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.textSubtle,
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readyText: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    color: COLORS.success,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.textMuted,
    fontSize: 13,
    fontFamily: FONTS.medium,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
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
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  modalDesc: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  filePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    borderStyle: 'dashed',
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  filePickerBtnText: {
    color: COLORS.primaryDark,
    fontSize: 12,
    fontFamily: FONTS.bold,
  },
  label: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  input: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typePillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeText: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
  },
  typeTextActive: {
    color: COLORS.white,
  },
  textArea: {
    height: 76,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceMuted,
  },
  cancelBtnText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.textSecondary,
  },
  submitUploadBtn: {
    flex: 2,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  submitUploadBtnText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
});
