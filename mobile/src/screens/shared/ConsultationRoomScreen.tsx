import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
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
import { COLORS, FONTS, RADIUS } from '../../theme/theme';

const formatTime = (iso?: string | null) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const isImageUrl = (url: string) => /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(url);

const resolveFileUrl = (rawUrl: string) => {
  const baseServer = API_URL.replace('/api/v1', '');
  return rawUrl.replace(/http:\/\/localhost:\d+/, baseServer);
};

export default function ConsultationRoomScreen({ route, navigation }: any) {
  const { appointmentId, doctorName, patientName, isDoctor } = route.params;
  const { user, token } = useAuth();
  const { showAlert } = useAlert();
  const { openDocument } = useDocumentViewer();

  const [agoraSession, setAgoraSession] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  const [chatVisible, setChatVisible] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState<{
    uri: string;
    name: string;
    mimeType: string;
  } | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const otherParticipantName = isDoctor
    ? patientName || 'Patient'
    : doctorName || 'Dr. Mensah';

  useEffect(() => {
    initializeConsultation();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (chatVisible && socketRef.current) {
      socketRef.current.emit('mark_messages_read', { appointmentId });
    }
  }, [chatVisible]);

  const initializeConsultation = async () => {
    try {
      const [res, msgsRes] = await Promise.all([
        apiClient.post(`/consultations/${appointmentId}/agora-token`),
        apiClient.get(`/consultations/${appointmentId}/messages`).catch(() => ({ data: { messages: [] } })),
      ]);
      setAgoraSession(res.data);
      if (msgsRes.data?.messages) {
        setMessages(msgsRes.data.messages);
      }

      const socketServerUrl = API_URL.replace('/api/v1', '');
      const socket = io(socketServerUrl, {
        auth: { token },
        transports: ['websocket'],
      });

      socket.on('connect', () => {
        socket.emit('join_consultation', { appointmentId });
      });

      socket.on('new_message', (msg: any) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
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
      console.error('Failed to initialize teleconsultation session:', err);
      showAlert({
        type: 'error',
        title: 'Session Error',
        message: err.response?.data?.message || 'Could not connect to video consultation.',
      });
    } finally {
      setIsConnecting(false);
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
        message: 'Could not open file picker.',
      });
    }
  };

  const handleSendMessage = async () => {
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
          message: err.response?.data?.message || 'Could not upload file.',
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

  const handleEndCall = () => {
    showAlert({
      type: 'confirm',
      title: 'End Consultation',
      message: 'Are you sure you want to leave the consultation room?',
      actions: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Call',
          style: 'destructive',
          onPress: () => {
            if (socketRef.current) socketRef.current.disconnect();
            navigation.goBack();
          },
        },
      ],
    });
  };

  if (isConnecting) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.connectingText}>Establishing Encrypted Video Session...</Text>
        <Text style={styles.connectingSubtext}>Channel: {agoraSession?.channelId || 'tele_room'}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE ENCRYPTED</Text>
        </View>

        <TouchableOpacity style={styles.chatToggleBtn} onPress={() => setChatVisible(true)}>
          <MaterialIcons name="chat-bubble-outline" size={16} color={COLORS.white} />
          <Text style={styles.chatToggleText}>Chat ({messages.length})</Text>
        </TouchableOpacity>
      </View>

      {/* Main Video Canvas */}
      <View style={styles.videoCanvas}>
        <View style={styles.avatarBig}>
          <Text style={styles.avatarBigText}>{otherParticipantName.charAt(0)}</Text>
        </View>
        <Text style={styles.participantName}>{otherParticipantName}</Text>
        <Text style={styles.channelBadge}>
          Channel: {agoraSession?.channelId || 'active_stream'}
        </Text>

        {/* Self Preview PiP */}
        <View style={styles.pipContainer}>
          <View style={styles.pipAvatar}>
            <Text style={styles.pipText}>{user?.fullName.charAt(0)}</Text>
          </View>
          <Text style={styles.pipLabel}>{isVideoEnabled ? 'Cam On' : 'Cam Off'}</Text>
        </View>
      </View>

      {/* Bottom Controls */}
      <View style={styles.controlBar}>
        <TouchableOpacity
          style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
          onPress={() => setIsMuted(!isMuted)}
        >
          <View style={[styles.controlCircle, isMuted && styles.controlCircleMuted]}>
            <MaterialIcons name={isMuted ? 'mic-off' : 'mic'} size={22} color={COLORS.white} />
          </View>
          <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlBtn}
          onPress={() => setIsVideoEnabled(!isVideoEnabled)}
        >
          <View style={[styles.controlCircle, !isVideoEnabled && styles.controlCircleMuted]}>
            <MaterialIcons
              name={isVideoEnabled ? 'videocam' : 'videocam-off'}
              size={22}
              color={COLORS.white}
            />
          </View>
          <Text style={styles.controlLabel}>{isVideoEnabled ? 'Camera' : 'Off'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlBtn} onPress={() => setChatVisible(true)}>
          <View style={styles.controlCircle}>
            <MaterialIcons name="chat" size={21} color={COLORS.white} />
          </View>
          <Text style={styles.controlLabel}>Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlBtn} onPress={handleEndCall}>
          <View style={styles.endCallCircle}>
            <MaterialIcons name="call-end" size={22} color={COLORS.white} />
          </View>
          <Text style={[styles.controlLabel, { color: '#FCA5A5' }]}>Leave</Text>
        </TouchableOpacity>
      </View>

      {/* In-Call Chat Modal */}
      <Modal visible={chatVisible} animationType="slide">
        <SafeAreaView style={styles.chatModalContainer}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatHeaderTitle}>Consultation Chat</Text>
            <TouchableOpacity onPress={() => setChatVisible(false)} style={styles.chatCloseBtn}>
              <MaterialIcons name="close" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={messages}
            keyExtractor={(item) => item.id || String(Math.random())}
            contentContainerStyle={styles.chatList}
            renderItem={({ item }) => {
              const isMe = item.senderId === user?.id;
              const attachmentUrl = item.attachmentUrl ? resolveFileUrl(item.attachmentUrl) : null;
              const isImage = attachmentUrl ? isImageUrl(attachmentUrl) : false;

              return (
                <View style={[styles.bubbleWrapper, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
                  <Text style={styles.senderName}>
                    {item.sender?.fullName || (isMe ? 'You' : otherParticipantName)}
                  </Text>
                  <View style={[styles.messageBubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                    {attachmentUrl && isImage ? (
                      <TouchableOpacity
                        onPress={() => {
                          setChatVisible(false);
                          openDocument(attachmentUrl, 'Chat Image');
                        }}
                      >
                        <Image
                          source={{ uri: attachmentUrl }}
                          style={styles.attachmentImage}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    ) : attachmentUrl ? (
                      <TouchableOpacity
                        style={styles.attachmentLink}
                        onPress={() => {
                          setChatVisible(false);
                          openDocument(attachmentUrl, 'Chat Attachment');
                        }}
                      >
                        <MaterialIcons
                          name="description"
                          size={16}
                          color={isMe ? COLORS.white : COLORS.primary}
                        />
                        <Text
                          style={[styles.attachmentText, isMe ? styles.textMe : styles.textThem]}
                          numberOfLines={1}
                        >
                          View Attachment
                        </Text>
                      </TouchableOpacity>
                    ) : null}

                    <Text style={[styles.messageText, isMe ? styles.textMe : styles.textThem]}>
                      {item.message}
                    </Text>

                    <View style={styles.receiptRow}>
                      {isMe ? (
                        <>
                          <Text style={styles.receiptTextMe}>
                            Sent {formatTime(item.createdAt)}
                            {item.readAt ? ` · Seen ${formatTime(item.readAt)}` : ''}
                          </Text>
                          <MaterialIcons
                            name={item.readAt ? 'done-all' : 'done'}
                            size={13}
                            color={item.readAt ? '#99F6E4' : 'rgba(255,255,255,0.72)'}
                          />
                        </>
                      ) : (
                        <Text style={styles.receiptTextThem}>{formatTime(item.createdAt)}</Text>
                      )}
                    </View>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <MaterialIcons name="forum" size={32} color={COLORS.textSubtle} />
                <Text style={styles.emptyChatText}>
                  Send messages or attach lab files for {otherParticipantName}.
                </Text>
              </View>
            }
          />

          {pendingAttachment && (
            <View style={styles.pendingBar}>
              <MaterialIcons name="attach-file" size={16} color={COLORS.primary} />
              <Text style={styles.pendingName} numberOfLines={1}>
                {pendingAttachment.name}
              </Text>
              <TouchableOpacity onPress={() => setPendingAttachment(null)}>
                <MaterialIcons name="close" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.chatInputRow}>
            <TouchableOpacity style={styles.attachBtn} onPress={handlePickAttachment}>
              <MaterialIcons name="attach-file" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <TextInput
              style={styles.chatInput}
              placeholder="Type a message..."
              placeholderTextColor={COLORS.textSubtle}
              value={inputMessage}
              onChangeText={setInputMessage}
              onSubmitEditing={handleSendMessage}
            />
            <TouchableOpacity
              style={styles.sendBtn}
              onPress={handleSendMessage}
              disabled={isUploadingFile}
            >
              {isUploadingFile ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <MaterialIcons name="send" size={18} color={COLORS.white} />
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.navy,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.navy,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  connectingText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: FONTS.bold,
    marginTop: 16,
  },
  connectingSubtext: {
    color: '#38BDF8',
    fontSize: 12,
    fontFamily: FONTS.medium,
    marginTop: 4,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.navyLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  liveText: {
    color: '#34D399',
    fontSize: 10,
    fontFamily: FONTS.bold,
    letterSpacing: 0.6,
  },
  chatToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.navyLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
  },
  chatToggleText: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: FONTS.semiBold,
  },
  videoCanvas: {
    flex: 1,
    backgroundColor: COLORS.navyLight,
    margin: 14,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  avatarBig: {
    width: 96,
    height: 96,
    borderRadius: 32,
    backgroundColor: COLORS.navyMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#38BDF8',
  },
  avatarBigText: {
    fontSize: 38,
    fontFamily: FONTS.extraBold,
    color: '#38BDF8',
  },
  participantName: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
  channelBadge: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: '#94A3B8',
    marginTop: 4,
  },
  pipContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 86,
    height: 112,
    backgroundColor: COLORS.navy,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.navyMuted,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  pipAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pipText: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
  pipLabel: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    color: '#94A3B8',
    marginTop: 6,
  },
  controlBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: COLORS.navy,
  },
  controlBtn: {
    alignItems: 'center',
    gap: 6,
  },
  controlBtnActive: {
    opacity: 0.9,
  },
  controlCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.navyLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlCircleMuted: {
    backgroundColor: COLORS.navyMuted,
  },
  endCallCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontFamily: FONTS.semiBold,
  },
  chatModalContainer: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  chatHeaderTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  chatCloseBtn: {
    padding: 4,
  },
  chatList: {
    padding: 16,
    gap: 12,
  },
  bubbleWrapper: {
    maxWidth: '82%',
    marginBottom: 8,
  },
  bubbleLeft: {
    alignSelf: 'flex-start',
  },
  bubbleRight: {
    alignSelf: 'flex-end',
  },
  senderName: {
    fontSize: 10,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSubtle,
    marginBottom: 3,
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleMe: {
    backgroundColor: COLORS.primary,
  },
  bubbleThem: {
    backgroundColor: COLORS.surfaceMuted,
  },
  attachmentImage: {
    width: 190,
    height: 140,
    borderRadius: 10,
    marginBottom: 6,
  },
  attachmentLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  attachmentText: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    textDecorationLine: 'underline',
  },
  messageText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    lineHeight: 19,
  },
  textMe: {
    color: COLORS.white,
  },
  textThem: {
    color: COLORS.text,
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 4,
  },
  receiptTextMe: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    color: 'rgba(255, 255, 255, 0.82)',
  },
  receiptTextThem: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    color: COLORS.textSubtle,
  },
  emptyChat: {
    padding: 40,
    alignItems: 'center',
    gap: 10,
  },
  emptyChatText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontFamily: FONTS.regular,
    textAlign: 'center',
    lineHeight: 18,
  },
  pendingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
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
  chatInputRow: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: 8,
  },
  attachBtn: {
    width: 42,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.text,
  },
  sendBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    width: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
