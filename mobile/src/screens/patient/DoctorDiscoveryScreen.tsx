import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../../components/Avatar';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../../theme/theme';

export default function DoctorDiscoveryScreen({ navigation }: any) {
  const { user, subscription, logout } = useAuth();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const specialties = ['All', 'General Practice', 'Cardiology', 'Pediatrics', 'Obstetrics', 'Dermatology'];

  useEffect(() => {
    fetchDoctors();
  }, [selectedSpecialty]);

  const fetchDoctors = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (search.trim()) params.search = search.trim();
      if (selectedSpecialty && selectedSpecialty !== 'All') params.specialty = selectedSpecialty;

      const res = await apiClient.get('/doctors', { params });
      setDoctors(res.data.doctors || []);
    } catch (err) {
      console.error('Failed to fetch doctors:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const renderDoctorItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.doctorCard}
      activeOpacity={0.9}
      onPress={() => navigation.navigate('DoctorDetail', { doctor: item })}
    >
      <View style={styles.doctorHeader}>
        <Avatar uri={item.user.avatarUrl} name={item.user.fullName} size={54} borderRadius={18} />

        <View style={styles.doctorInfo}>
          <View style={styles.verifiedRow}>
            <Text style={styles.doctorName} numberOfLines={1}>
              {item.user.fullName}
            </Text>
            <View style={styles.verifiedBadge}>
              <MaterialIcons name="verified" size={12} color={COLORS.primary} />
              <Text style={styles.verifiedBadgeText}>MDC</Text>
            </View>
          </View>

          <Text style={styles.doctorSpecialty}>{item.specialty}</Text>

          <View style={styles.metaInline}>
            <MaterialIcons name="local-hospital" size={13} color={COLORS.textSubtle} />
            <Text style={styles.hospitalText} numberOfLines={1}>
              {item.hospitalAffiliation || 'Private Practice'}
            </Text>
          </View>

          <View style={styles.metaInline}>
            <MaterialIcons name="work-outline" size={13} color={COLORS.textSubtle} />
            <Text style={styles.experienceText}>
              {item.yearsOfExperience} yrs clinical experience
            </Text>
          </View>
        </View>
      </View>

      {item.bio ? (
        <Text style={styles.doctorBio} numberOfLines={2}>
          {item.bio}
        </Text>
      ) : null}

      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.feeLabel}>Consultation Fee</Text>
          <Text style={styles.feeValue}>
            {parseFloat(item.consultationFee) === 0 ? 'Included in Plan' : `GHS ${item.consultationFee}`}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.bookBtn}
          onPress={() => navigation.navigate('DoctorDetail', { doctor: item })}
          activeOpacity={0.85}
        >
          <Text style={styles.bookBtnText}>Book Slot</Text>
          <MaterialIcons name="arrow-forward" size={14} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Clean Modern Top Header */}
        <View style={styles.topHeader}>
          <View style={styles.welcomeRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greetingLabel}>Welcome back</Text>
              <Text style={styles.welcomeText} numberOfLines={1}>
                {user?.fullName}
              </Text>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.trialPill}
                onPress={() => navigation.getParent()?.navigate('Plan & MoMo')}
              >
                <MaterialIcons name="workspace-premium" size={14} color={COLORS.primaryDark} />
                <Text style={styles.trialPillText}>
                  {subscription?.trialDaysRemaining ?? 90}d Trial
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconActionBtn}
                onPress={logout}
                accessibilityLabel="Sign Out"
              >
                <MaterialIcons name="logout" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBar}>
            <MaterialIcons name="search" size={20} color={COLORS.textSubtle} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search doctors, specialties, hospitals..."
              placeholderTextColor={COLORS.textSubtle}
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={fetchDoctors}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearch('');
                  fetchDoctors();
                }}
              >
                <MaterialIcons name="close" size={18} color={COLORS.textSubtle} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Specialty Filter Pills */}
        <View style={styles.specialtyContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={specialties}
            keyExtractor={(item) => item}
            renderItem={({ item }) => {
              const isSelected = (selectedSpecialty === '' && item === 'All') || selectedSpecialty === item;
              return (
                <TouchableOpacity
                  style={[styles.specialtyPill, isSelected && styles.specialtyPillActive]}
                  onPress={() => setSelectedSpecialty(item === 'All' ? '' : item)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.specialtyText, isSelected && styles.specialtyTextActive]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={styles.specialtiesList}
          />
        </View>

        {/* Doctors List */}
        {isLoading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Finding verified doctors...</Text>
          </View>
        ) : (
          <FlatList
            data={doctors}
            keyExtractor={(item) => item.id}
            renderItem={renderDoctorItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchDoctors();
                }}
                tintColor={COLORS.primary}
                colors={[COLORS.primary]}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <MaterialIcons name="person-search" size={32} color={COLORS.textSubtle} />
                </View>
                <Text style={styles.emptyTitle}>No doctors found</Text>
                <Text style={styles.emptyText}>
                  Try adjusting your search or selecting a different specialty.
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
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  welcomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  greetingLabel: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
  },
  welcomeText: {
    fontSize: 20,
    fontFamily: FONTS.extraBold,
    color: COLORS.text,
    letterSpacing: -0.4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trialPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  trialPillText: {
    color: COLORS.primaryDark,
    fontSize: 11,
    fontFamily: FONTS.bold,
  },
  iconActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  specialtyContainer: {
    paddingVertical: 12,
  },
  specialtiesList: {
    paddingHorizontal: 20,
    gap: 8,
  },
  specialtyPill: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  specialtyPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  specialtyText: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
  },
  specialtyTextActive: {
    color: COLORS.white,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 14,
  },
  doctorCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  doctorHeader: {
    flexDirection: 'row',
    gap: 14,
  },
  avatarBox: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontFamily: FONTS.extraBold,
    color: COLORS.primary,
  },
  doctorInfo: {
    flex: 1,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  doctorName: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    flexShrink: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: COLORS.primaryDark,
  },
  doctorSpecialty: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: COLORS.info,
    marginTop: 2,
    marginBottom: 4,
  },
  metaInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  hospitalText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    flex: 1,
  },
  experienceText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  doctorBio: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    backgroundColor: COLORS.bg,
    padding: 12,
    borderRadius: RADIUS.md,
    marginTop: 12,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceMuted,
  },
  feeLabel: {
    fontSize: 10,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  feeValue: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginTop: 1,
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  bookBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: FONTS.bold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontFamily: FONTS.medium,
    marginTop: 10,
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
    marginBottom: 12,
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
});
