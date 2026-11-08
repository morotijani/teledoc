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
  Alert,
} from 'react-native';
import io, { Socket } from 'socket.io-client';
import { apiClient, API_URL } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function ConsultationRoomScreen({ route, navigation }: any) {
  const { appointmentId, doctorName, patientName, isDoctor } = route.params;
  const { user, token } = useAuth();

  const [agoraSession, setAgoraSession] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  // In-Call Socket.io Chat State
  const [chatVisible, setChatVisible] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState('');
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

  const initializeConsultation = async () => {
    try {
      // 1. Fetch Agora Dynamic Token & Historical Chat Messages in parallel
      const [res, msgsRes] = await Promise.all([
        apiClient.post(`/consultations/${appointmentId}/agora-token`),
        apiClient.get(`/consultations/${appointmentId}/messages`).catch(() => ({ data: { messages: [] } })),
      ]);
      setAgoraSession(res.data);
      if (msgsRes.data?.messages) {
        setMessages(msgsRes.data.messages);
      }

      // 2. Initialize Socket.io Chat Connection
      const socketServerUrl = API_URL.replace('/api/v1', '');
      const socket = io(socketServerUrl, {
        auth: { token },
        transports: ['websocket'],
      });

      socket.on('connect', () => {
        console.log('[Socket] Connected to consultation server');
        socket.emit('join_consultation', { appointmentId });
      });

      socket.on('new_message', (msg: any) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      });

      socketRef.current = socket;
    } catch (err: any) {
      console.error('Failed to initialize teleconsultation session:', err);
      Alert.alert('Session Error', err.response?.data?.message || 'Could not connect to video consultation.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim() || !socketRef.current) return;

    socketRef.current.emit('send_message', {
      appointmentId,
      message: inputMessage.trim(),
    });

    setInputMessage('');
  };

  const handleEndCall = () => {
    Alert.alert('End Consultation', 'Are you sure you want to exit the consultation call?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Call',
        style: 'destructive',
        onPress: () => {
          if (socketRef.current) socketRef.current.disconnect();
          navigation.goBack();
        },
      },
    ]);
  };

  if (isConnecting) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.connectingText}>Establishing Encrypted WebRTC Session...</Text>
        <Text style={styles.connectingSubtext}>Channel: {agoraSession?.channelId || 'tele_room'}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE HD ENCRYPTED</Text>
        </View>

        <TouchableOpacity style={styles.chatToggleBtn} onPress={() => setChatVisible(true)}>
          <Text style={styles.chatToggleText}>💬 Chat ({messages.length})</Text>
        </TouchableOpacity>
      </View>

      {/* Main Video View Canvas (Remote Video Participant) */}
      <View style={styles.videoCanvas}>
        <View style={styles.avatarBig}>
          <Text style={styles.avatarBigText}>{otherParticipantName.charAt(0)}</Text>
        </View>
        <Text style={styles.participantName}>{otherParticipantName}</Text>
        <Text style={styles.channelBadge}>
          Agora Channel: {agoraSession?.channelId || 'active_stream'}
        </Text>

        {/* Self Camera Picture-in-Picture Preview */}
        <View style={styles.pipContainer}>
          <View style={styles.pipAvatar}>
            <Text style={styles.pipText}>{user?.fullName.charAt(0)}</Text>
          </View>
          <Text style={styles.pipLabel}>You ({isVideoEnabled ? 'Cam On' : 'Cam Off'})</Text>
        </View>
      </View>

      {/* In-Call Controls Bottom Bar */}
      <View style={styles.controlBar}>
        <TouchableOpacity
          style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
          onPress={() => setIsMuted(!isMuted)}
        >
          <Text style={styles.controlIcon}>{isMuted ? '🔇' : '🎙️'}</Text>
          <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, !isVideoEnabled && styles.controlBtnActive]}
          onPress={() => setIsVideoEnabled(!isVideoEnabled)}
        >
          <Text style={styles.controlIcon}>{isVideoEnabled ? '📹' : '🚫'}</Text>
          <Text style={styles.controlLabel}>{isVideoEnabled ? 'Stop Cam' : 'Start Cam'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlBtn} onPress={() => setChatVisible(true)}>
          <Text style={styles.controlIcon}>💬</Text>
          <Text style={styles.controlLabel}>In-Call Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.endCallBtn} onPress={handleEndCall}>
          <Text style={styles.endCallIcon}>📞</Text>
          <Text style={styles.endCallLabel}>Leave</Text>
        </TouchableOpacity>
      </View>

      {/* In-Platform Chat Modal */}
      <Modal visible={chatVisible} animationType="slide">
        <SafeAreaView style={styles.chatModalContainer}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatHeaderTitle}>In-Consultation Chat</Text>
            <TouchableOpacity onPress={() => setChatVisible(false)} style={styles.chatCloseBtn}>
              <Text style={styles.chatCloseText}>Close ✕</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={messages}
            keyExtractor={(item) => item.id || String(Math.random())}
            contentContainerStyle={styles.chatList}
            renderItem={({ item }) => {
              const isMe = item.senderId === user?.id;
              return (
                <View style={[styles.bubbleWrapper, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
                  <Text style={styles.senderName}>{item.sender?.fullName || (isMe ? 'You' : otherParticipantName)}</Text>
                  <View style={[styles.messageBubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                    <Text style={[styles.messageText, isMe ? styles.textMe : styles.textThem]}>
                      {item.message}
                    </Text>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Text style={styles.emptyChatText}>
                  Send text messages, symptom clarifications, or notes to {otherParticipantName} during the call.
                </Text>
              </View>
            }
          />

          <View style={styles.chatInputRow}>
            <TextInput
              style={styles.chatInput}
              placeholder="Type message..."
              placeholderTextColor="#94a3b8"
              value={inputMessage}
              onChangeText={setInputMessage}
              onSubmitEditing={handleSendMessage}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSendMessage}>
              <Text style={styles.sendBtnText}>Send</Text>
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
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  connectingText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 16,
  },
  connectingSubtext: {
    color: '#38bdf8',
    fontSize: 12,
    marginTop: 4,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  liveText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '800',
  },
  chatToggleBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  chatToggleText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  videoCanvas: {
    flex: 1,
    backgroundColor: '#1e293b',
    margin: 12,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  avatarBig: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#38bdf8',
  },
  avatarBigText: {
    fontSize: 38,
    fontWeight: '900',
    color: '#38bdf8',
  },
  participantName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
  },
  channelBadge: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
  },
  pipContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 90,
    height: 120,
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  pipAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pipText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  pipLabel: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 4,
    fontWeight: '600',
  },
  controlBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
    backgroundColor: '#0f172a',
  },
  controlBtn: {
    alignItems: 'center',
    gap: 4,
  },
  controlBtnActive: {
    opacity: 0.5,
  },
  controlIcon: {
    fontSize: 24,
  },
  controlLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
  },
  endCallBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 14,
    alignItems: 'center',
    gap: 2,
  },
  endCallIcon: {
    fontSize: 20,
  },
  endCallLabel: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  chatModalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  chatHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  chatCloseBtn: {
    padding: 6,
  },
  chatCloseText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
  },
  chatList: {
    padding: 16,
    gap: 12,
  },
  bubbleWrapper: {
    maxWidth: '80%',
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
    color: '#94a3b8',
    marginBottom: 2,
    fontWeight: '600',
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleMe: {
    backgroundColor: '#059669',
  },
  bubbleThem: {
    backgroundColor: '#f1f5f9',
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
  },
  textMe: {
    color: '#ffffff',
  },
  textThem: {
    color: '#1e293b',
  },
  emptyChat: {
    padding: 40,
    alignItems: 'center',
  },
  emptyChatText: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  chatInputRow: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    gap: 8,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
  },
  sendBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
});
