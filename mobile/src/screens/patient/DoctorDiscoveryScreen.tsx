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
} from 'react-native';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function DoctorDiscoveryScreen({ navigation }: any) {
  const { user, subscription } = useAuth();
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

  const handleSearchSubmit = () => {
    fetchDoctors();
  };

  const renderDoctorItem = ({ item }: { item: any }) => (
    <View style={styles.doctorCard}>
      <View style={styles.doctorHeader}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>
            {item.user.fullName.replace('Dr. ', '').charAt(0)}
          </Text>
        </View>

        <View style={styles.doctorInfo}>
          <View style={styles.verifiedRow}>
            <Text style={styles.doctorName}>{item.user.fullName}</Text>
            <Text style={styles.verifiedBadge}>✓ MDC</Text>
          </View>
          <Text style={styles.doctorSpecialty}>{item.specialty}</Text>
          <Text style={styles.hospitalText}>{item.hospitalAffiliation || 'Private Practice'}</Text>
          <Text style={styles.experienceText}>{item.yearsOfExperience} yrs clinical experience</Text>
        </View>
      </View>

      {item.bio ? (
        <Text style={styles.doctorBio} numberOfLines={2}>
          "{item.bio}"
        </Text>
      ) : null}

      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.feeLabel}>Consultation</Text>
          <Text style={styles.feeValue}>
            {parseFloat(item.consultationFee) === 0 ? 'Included in Plan' : `${item.consultationFee} GHS`}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.bookBtn}
          onPress={() => navigation.navigate('DoctorDetail', { doctor: item })}
        >
          <Text style={styles.bookBtnText}>View Availability</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Top Welcome & 90-Day Free Trial Banner */}
      <View style={styles.topBanner}>
        <View style={styles.welcomeRow}>
          <Text style={styles.welcomeText}>Hello, {user?.fullName}</Text>
          <TouchableOpacity
            style={styles.trialPill}
            onPress={() => navigation.navigate('SubscriptionPaywall')}
          >
            <Text style={styles.trialPillText}>
              🎁 {subscription?.trialDaysRemaining ?? 90}d Trial Left
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.topSubtext}>Search Ghana's accredited doctors and book instant slots.</Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search doctor by name, specialty, or hospital..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={handleSearchSubmit}
          returnKeyType="search"
        />
      </View>

      {/* Specialty Filter Horizontal Scroll */}
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
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Finding verified doctors...</Text>
        </View>
      ) : (
        <FlatList
          data={doctors}
          keyExtractor={(item) => item.id}
          renderItem={renderDoctorItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchDoctors();
              }}
              colors={['#059669']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No doctors found</Text>
              <Text style={styles.emptyText}>Try searching for a different specialty or hospital.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topBanner: {
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  welcomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  trialPill: {
    backgroundColor: '#047857',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#34d399',
  },
  trialPillText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  topSubtext: {
    color: '#d1fae5',
    fontSize: 12,
    marginTop: 4,
  },
  searchSection: {
    paddingHorizontal: 16,
    marginTop: -12,
  },
  searchInput: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 13,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  specialtyContainer: {
    marginTop: 12,
    marginBottom: 4,
  },
  specialtiesList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  specialtyPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  specialtyPillActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  specialtyText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '700',
  },
  specialtyTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  doctorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  doctorHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#059669',
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
    fontWeight: '800',
    color: '#0f172a',
  },
  verifiedBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  doctorSpecialty: {
    fontSize: 13,
    color: '#0284c7',
    fontWeight: '700',
    marginTop: 1,
  },
  hospitalText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  experienceText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  doctorBio: {
    fontSize: 12,
    color: '#475569',
    fontStyle: 'italic',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  feeLabel: {
    fontSize: 10,
    color: '#94a3b8',
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  feeValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  bookBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  bookBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
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
  },
});
