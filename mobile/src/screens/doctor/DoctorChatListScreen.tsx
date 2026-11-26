import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiClient } from '../../api/client';
import Avatar from '../../components/Avatar';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../../theme/theme';

export default function DoctorChatListScreen({ navigation }: any) {
  const [threads, setThreads] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchThreads();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchThreads();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchThreads = async () => {
    try {
      const res = await apiClient.get('/doctors/my/chats');
      setThreads(res.data.threads || []);
    } catch (err) {
      console.error('Failed to load chat threads:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const filteredThreads = threads.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.patient.fullName.toLowerCase().includes(q) ||
      (t.patient.phoneNumber || '').toLowerCase().includes(q)
    );
  });

  const formatTimestamp = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const sameDay = date.toDateString() === now.toDateString();
    if (sameDay) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const renderThread = ({ item }: { item: any }) => {
    const lastMsg = item.lastMessage;
    return (
      <TouchableOpacity
        style={styles.threadCard}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate('DirectChat', {
            appointmentId: item.appointmentId,
            participantName: item.patient.fullName,
            participantPhone: item.patient.phoneNumber,
            participantAvatar: item.patient.avatarUrl,
            channelId: item.channelId,
            isDoctor: true,
          })
        }
      >
        <Avatar uri={item.patient.avatarUrl} name={item.patient.fullName} size={48} borderRadius={16} />

        <View style={styles.threadBody}>
          <View style={styles.threadTopRow}>
            <Text style={styles.patientName} numberOfLines={1}>
              {item.patient.fullName}
            </Text>
            <Text style={styles.timeLabel}>
              {formatTimestamp(lastMsg ? lastMsg.createdAt : item.scheduledStart)}
            </Text>
          </View>

          <Text style={styles.previewText} numberOfLines={1}>
            {lastMsg
              ? `${lastMsg.sender?.role === 'DOCTOR' ? 'You: ' : ''}${lastMsg.message}`
              : 'Tap to start a clinical conversation'}
          </Text>

          <View style={styles.threadFooterRow}>
            <View style={styles.statusChip}>
              <Text style={styles.statusChipText}>{item.status}</Text>
            </View>
            {item.messageCount > 0 && (
              <Text style={styles.msgCountText}>
                {item.messageCount} {item.messageCount === 1 ? 'message' : 'messages'}
              </Text>
            )}
          </View>
        </View>

        <MaterialIcons name="chevron-right" size={20} color={COLORS.textSubtle} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.topHeader}>
          <Text style={styles.screenTitle}>Patient Messages</Text>
          <Text style={styles.screenSub}>
            Tap any patient below to view history or send follow-up advice.
          </Text>

          <View style={styles.searchBar}>
            <MaterialIcons name="search" size={19} color={COLORS.textSubtle} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search patients by name or phone..."
              placeholderTextColor={COLORS.textSubtle}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <MaterialIcons name="close" size={18} color={COLORS.textSubtle} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {isLoading && !refreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading patient conversations...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredThreads}
            keyExtractor={(item) => item.appointmentId}
            renderItem={renderThread}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchThreads();
                }}
                tintColor={COLORS.primary}
                colors={[COLORS.primary]}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <View style={styles.emptyIconCircle}>
                  <MaterialIcons name="forum" size={30} color={COLORS.textSubtle} />
                </View>
                <Text style={styles.emptyTitle}>No Patient Chats Yet</Text>
                <Text style={styles.emptyText}>
                  Once patients book a consultation with you, their chat threads will appear here.
                </Text>
              </View>
            }
          />
        )}
      </View>
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
  topHeader: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  screenTitle: {
    fontSize: 21,
    fontFamily: FONTS.extraBold,
    color: COLORS.text,
    letterSpacing: -0.4,
  },
  screenSub: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 2,
    marginBottom: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  listContent: {
    padding: 18,
    gap: 12,
  },
  threadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 19,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  threadBody: {
    flex: 1,
  },
  threadTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  patientName: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    flex: 1,
  },
  timeLabel: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.textSubtle,
  },
  previewText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 3,
  },
  threadFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  statusChip: {
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
  },
  statusChipText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: COLORS.textSecondary,
  },
  msgCountText: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.primary,
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
  emptyBox: {
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
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 19,
  },
});
