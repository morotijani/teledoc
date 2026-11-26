import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Image,
  Linking,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { MaterialIcons } from '@expo/vector-icons';
import io, { Socket } from 'socket.io-client';
import { apiClient, API_URL } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { useDocumentViewer } from '../../context/DocumentViewerContext';
import Avatar from '../../components/Avatar';
import { COLORS, FONTS, RADIUS } from '../../theme/theme';

const formatTime = (iso?: string | null) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const isImageUrl = (url: string) => /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(url);

const getFileNameFromUrl = (url: string) => {
  try {
    const clean = url.split('?')[0];
    const parts = clean.split('/');
    return decodeURIComponent(parts[parts.length - 1] || 'Attachment');
  } catch {
    return 'Attachment';
  }
};

const resolveFileUrl = (rawUrl: string) => {
  const baseServer = API_URL.replace('/api/v1', '');
  return rawUrl.replace(/http:\/\/localhost:\d+/, baseServer);
};

export default function DirectChatScreen({ route, navigation }: any) {
  const { appointmentId, participantName, participantPhone, participantAvatar, channelId, isDoctor } =
    route.params;
  const { user, token } = useAuth();
  const { showAlert } = useAlert();
  const { openDocument } = useDocumentViewer();

  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState<{
    uri: string;
    name: string;
    mimeType: string;
  } | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadMessagesAndConnect();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [appointmentId]);

  const loadMessagesAndConnect = async () => {
    try {
      const res = await apiClient.get(`/consultations/${appointmentId}/messages`);
      setMessages(res.data.messages || []);

      // Mark unread incoming messages as seen via REST on load
      apiClient.post(`/consultations/${appointmentId}/messages/read`).catch(() => {});

      const socketServerUrl = API_URL.replace('/api/v1', '');
      const socket = io(socketServerUrl, {
        auth: { token },
        transports: ['websocket'],
      });

      socket.on('connect', () => {
        setIsConnected(true);
        socket.emit('join_consultation', { appointmentId });
        socket.emit('mark_messages_read', { appointmentId });
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
      });

      socket.on('new_message', (msg: any) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });

        // If message is from the other participant, mark it seen immediately
        if (msg.senderId !== user?.id) {
          socket.emit('mark_messages_read', { appointmentId });
        }
      });

      socket.on('messages_read', ({ readerId, readAt }: { readerId: string; readAt: string }) => {
        if (readerId !== user?.id) {
          setMessages((prev) =>
            prev.map((m) =>
              m.senderId === user?.id && !m.readAt ? { ...m, readAt } : m
            )
          );
        }
      });

      socketRef.current = socket;
    } catch (err: any) {
      showAlert({
        type: 'error',
        title: 'Chat Connection Error',
        message: err.response?.data?.message || 'Could not load chat history.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickAttachment = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setPendingAttachment({
          uri: asset.uri,
          name: asset.name || 'attachment.pdf',
          mimeType: asset.mimeType || 'application/octet-stream',
        });
      }
    } catch {
      showAlert({
        type: 'error',
        title: 'Attachment Error',
        message: 'Could not open file picker on this device.',
      });
    }
  };

  const handleSend = async () => {
    if ((!inputMessage.trim() && !pendingAttachment) || !socketRef.current) return;

    let uploadedUrl: string | undefined;

    if (pendingAttachment) {
      setIsUploadingFile(true);
      try {
        const formData = new FormData();
        formData.append('file', {
          uri: pendingAttachment.uri,
          name: pendingAttachment.name,
          type: pendingAttachment.mimeType,
        } as any);

        const uploadRes = await apiClient.post(
          `/consultations/${appointmentId}/attachments`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        uploadedUrl = uploadRes.data.attachmentUrl;
      } catch (err: any) {
        showAlert({
          type: 'error',
          title: 'Upload Failed',
          message: err.response?.data?.message || 'Could not upload attachment.',
        });
        setIsUploadingFile(false);
        return;
      } finally {
        setIsUploadingFile(false);
      }
    }

    socketRef.current.emit('send_message', {
      appointmentId,
      message: inputMessage.trim() || (pendingAttachment ? `Attachment: ${pendingAttachment.name}` : ''),
      attachmentUrl: uploadedUrl,
    });

    setInputMessage('');
    setPendingAttachment(null);
  };

  const handleOpenAttachment = (rawUrl: string) => {
    openDocument(rawUrl, getFileNameFromUrl(rawUrl));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Chat Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>

          <Avatar uri={participantAvatar} name={participantName} size={40} borderRadius={14} />

          <View style={{ flex: 1 }}>
            <Text style={styles.headerName} numberOfLines={1}>
              {participantName || 'Patient'}
            </Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, isConnected && styles.statusDotOnline]} />
              <Text style={styles.headerStatus}>
                {isConnected ? 'Encrypted Chat Active' : 'Connecting...'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.videoShortcutBtn}
            onPress={() =>
              showAlert({
                type: 'info',
                title: `Call ${participantName || 'Participant'}`,
                message: 'Choose In-App Video Call or dial via normal phone.',
                actions: [
                  {
                    text: 'In-App Video Call',
                    style: 'primary',
                    onPress: () =>
                      navigation.navigate('ConsultationRoom', {
                        appointmentId,
                        doctorName: isDoctor ? user?.fullName : participantName,
                        patientName: isDoctor ? participantName : user?.fullName,
                        channelId,
                        isDoctor,
                      }),
                  },
                  ...(participantPhone
                    ? [
                        {
                          text: `Phone Dial (${participantPhone})`,
                          style: 'primary' as const,
                          onPress: () => Linking.openURL(`tel:${participantPhone}`),
                        },
                      ]
                    : []),
                  { text: 'Cancel', style: 'cancel' },
                ],
              })
            }
          >
            <MaterialIcons name="call" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Messages List */}
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading conversation...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id || String(Math.random())}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => {
              const isMe = item.senderId === user?.id;
              const attachmentUrl = item.attachmentUrl ? resolveFileUrl(item.attachmentUrl) : null;
              const isImage = attachmentUrl ? isImageUrl(attachmentUrl) : false;

              return (
                <View style={[styles.bubbleRow, isMe ? styles.rowRight : styles.rowLeft]}>
                  <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                    {/* Attachment Preview */}
                    {attachmentUrl && isImage ? (
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => handleOpenAttachment(attachmentUrl)}
                      >
                        <Image
                          source={{ uri: attachmentUrl }}
                          style={styles.attachmentImage}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    ) : attachmentUrl ? (
                      <TouchableOpacity
                        style={[
                          styles.attachmentCard,
                          isMe ? styles.attachmentCardMe : styles.attachmentCardOther,
                        ]}
                        onPress={() => handleOpenAttachment(attachmentUrl)}
                      >
                        <MaterialIcons
                          name="description"
                          size={20}
                          color={isMe ? COLORS.white : COLORS.primary}
                        />
                        <Text
                          style={[
                            styles.attachmentName,
                            isMe ? styles.msgTextMe : styles.msgTextOther,
                          ]}
                          numberOfLines={1}
                        >
                          {getFileNameFromUrl(attachmentUrl)}
                        </Text>
                        <MaterialIcons
                          name="open-in-new"
                          size={15}
                          color={isMe ? '#CCFBF1' : COLORS.textMuted}
                        />
                      </TouchableOpacity>
                    ) : null}

                    {item.message ? (
                      <Text style={[styles.msgText, isMe ? styles.msgTextMe : styles.msgTextOther]}>
                        {item.message}
                      </Text>
                    ) : null}

                    {/* Sent & Seen Receipt Row */}
                    <View style={styles.receiptRow}>
                      {isMe ? (
                        <>
                          <Text style={styles.msgTimeMe}>
                            Sent {formatTime(item.createdAt)}
                            {item.readAt ? ` · Seen ${formatTime(item.readAt)}` : ''}
                          </Text>
                          <MaterialIcons
                            name={item.readAt ? 'done-all' : 'done'}
                            size={14}
                            color={item.readAt ? '#99F6E4' : 'rgba(255,255,255,0.72)'}
                          />
                        </>
                      ) : (
                        <Text style={styles.msgTimeOther}>{formatTime(item.createdAt)}</Text>
                      )}
                    </View>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <View style={styles.emptyIconCircle}>
                  <MaterialIcons name="chat-bubble-outline" size={28} color={COLORS.textSubtle} />
                </View>
                <Text style={styles.emptyTitle}>Start the conversation</Text>
                <Text style={styles.emptySub}>
                  Send messages, lab PDFs, or images directly to {participantName}.
                </Text>
              </View>
            }
          />
        )}

        {/* Pending Attachment Preview Bar */}
        {pendingAttachment && (
          <View style={styles.pendingBar}>
            <MaterialIcons name="attach-file" size={18} color={COLORS.primary} />
            <Text style={styles.pendingName} numberOfLines={1}>
              {pendingAttachment.name}
            </Text>
            <TouchableOpacity onPress={() => setPendingAttachment(null)}>
              <MaterialIcons name="close" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Composer */}
        <View style={styles.composerRow}>
          <TouchableOpacity
            style={styles.attachBtn}
            onPress={handlePickAttachment}
            disabled={isUploadingFile}
          >
            <MaterialIcons name="attach-file" size={21} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TextInput
            style={styles.composerInput}
            placeholder="Write a message..."
            placeholderTextColor={COLORS.textSubtle}
            value={inputMessage}
            onChangeText={setInputMessage}
            onSubmitEditing={handleSend}
            multiline
          />

          <TouchableOpacity
            style={[
              styles.sendBtn,
              ((!inputMessage.trim() && !pendingAttachment) || isUploadingFile) &&
                styles.sendBtnDisabled,
            ]}
            onPress={handleSend}
            disabled={(!inputMessage.trim() && !pendingAttachment) || isUploadingFile}
          >
            {isUploadingFile ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <MaterialIcons name="send" size={18} color={COLORS.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  headerName: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.textSubtle,
  },
  statusDotOnline: {
    backgroundColor: COLORS.success,
  },
  headerStatus: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
  },
  videoShortcutBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
  },
  messagesList: {
    padding: 16,
    gap: 10,
    flexGrow: 1,
  },
  bubbleRow: {
    maxWidth: '84%',
  },
  rowRight: {
    alignSelf: 'flex-end',
  },
  rowLeft: {
    alignSelf: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleMe: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 4,
  },
  attachmentImage: {
    width: 210,
    height: 155,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
  },
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 12,
    marginBottom: 8,
  },
  attachmentCardMe: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  attachmentCardOther: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  attachmentName: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONTS.semiBold,
  },
  msgText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    lineHeight: 20,
  },
  msgTextMe: {
    color: COLORS.white,
  },
  msgTextOther: {
    color: COLORS.text,
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 5,
  },
  msgTimeMe: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    color: 'rgba(255, 255, 255, 0.82)',
  },
  msgTimeOther: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    color: COLORS.textSubtle,
  },
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  emptySub: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 19,
  },
  pendingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.primarySoft,
    borderTopWidth: 1,
    borderTopColor: COLORS.primaryLight,
  },
  pendingName: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: COLORS.primaryDark,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  attachBtn: {
    width: 42,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  composerInput: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.text,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.45,
  },
});
