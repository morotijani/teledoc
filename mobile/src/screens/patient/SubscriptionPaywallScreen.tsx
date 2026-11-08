import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function SubscriptionPaywallScreen() {
  const { user, subscription, refreshProfile } = useAuth();
  const [subData, setSubData] = useState<any>(null);
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [selectedChannel, setSelectedChannel] = useState<'mtn-gh' | 'vodafone-gh' | 'tigo-gh' | 'card'>('mtn-gh');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await apiClient.get('/billing/subscription-status');
      setSubData(res.data.subscription);
    } catch (err) {
      console.error('Failed to load sub status:', err);
    }
  };

  const handlePaySubscription = async () => {
    if (!phone.trim()) {
      Alert.alert('Phone Required', 'Please enter your Mobile Money phone number.');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await apiClient.post('/billing/pay-subscription', {
        phoneNumber: phone.trim(),
        channel: selectedChannel,
      });

      const clientReference = res.data.clientReference;

      Alert.alert(
        '📲 MoMo USSD Prompt Sent',
        `A 10.00 GHS Mobile Money debit prompt has been sent to ${phone}. Authorize the prompt on your handset, then tap "Confirm Payment" below.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setIsProcessing(false),
          },
          {
            text: 'Confirm Payment',
            onPress: async () => {
              try {
                const verifyRes = await apiClient.get(
                  `/billing/verify-transaction/${clientReference}`
                );
                if (verifyRes.data.status === 'SUCCESS' || verifyRes.data.status === 'PAID') {
                  await refreshProfile();
                  await fetchStatus();
                  Alert.alert(
                    '🎉 Subscription Active!',
                    'Your 10 GHS monthly TeleDoc subscription has been activated via Mobile Money. You have unlimited teleconsultation booking access.'
                  );
                } else {
                  Alert.alert('Payment Pending', 'Your transaction is still awaiting confirmation.');
                }
              } catch (vErr: any) {
                Alert.alert('Verification Error', 'Could not verify Mobile Money payment.');
              } finally {
                setIsProcessing(false);
              }
            },
          },
        ]
      );
    } catch (err: any) {
      setIsProcessing(false);
      Alert.alert('Payment Error', err.response?.data?.message || 'Could not initiate payment.');
    }
  };

  const isTrial = (subData?.status || subscription?.status) === 'TRIAL';
  const daysLeft = subData?.daysRemainingInTrial ?? subscription?.trialDaysRemaining ?? 90;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Tier Badge Banner */}
      <View style={styles.tierBanner}>
        <View style={styles.badgeCircle}>
          <Text style={styles.badgeIcon}>🛡️</Text>
        </View>
        <Text style={styles.tierTitle}>
          {isTrial ? '3-Month Free Trial Tier' : 'Active 10 GHS Monthly Tier'}
        </Text>
        <Text style={styles.tierSubtitle}>
          {isTrial
            ? `Your initial 90-day free trial is running. You have ${daysLeft} days remaining.`
            : 'Your subscription is active and renews monthly via Mobile Money.'}
        </Text>
      </View>

      {/* Pricing Card */}
      <View style={styles.pricingCard}>
        <View style={styles.priceRow}>
          <Text style={styles.priceCurrency}>GHS</Text>
          <Text style={styles.priceAmount}>10</Text>
          <Text style={styles.priceFrequency}>/ month</Text>
        </View>
        <Text style={styles.priceDesc}>
          Access Ghana's top licensed doctors from any phone across all 16 regions.
        </Text>

        <View style={styles.perksList}>
          <Text style={styles.perkItem}>✓ Unlimited Video & Audio Consultations</Text>
          <Text style={styles.perkItem}>✓ Direct in-platform Chat with Doctors</Text>
          <Text style={styles.perkItem}>✓ Instant Digital Prescriptions synced to phone</Text>
          <Text style={styles.perkItem}>✓ Lab Results & Imaging uploads</Text>
          <Text style={styles.perkItem}>✓ Instant SMS & Push Appointment Reminders</Text>
        </View>
      </View>

      {/* Payment Channels Selector */}
      <View style={styles.paymentSection}>
        <Text style={styles.sectionTitle}>Select Local Payment Method (Hubtel)</Text>

        <View style={styles.channelsGrid}>
          {[
            { id: 'mtn-gh', label: 'MTN MoMo', icon: '🟡' },
            { id: 'vodafone-gh', label: 'Telecel Cash', icon: '🔴' },
            { id: 'tigo-gh', label: 'AT Money', icon: '🔵' },
            { id: 'card', label: 'Visa / Card', icon: '💳' },
          ].map((ch) => (
            <TouchableOpacity
              key={ch.id}
              style={[
                styles.channelCard,
                selectedChannel === ch.id && styles.channelCardSelected,
              ]}
              onPress={() => setSelectedChannel(ch.id as any)}
            >
              <Text style={styles.channelIcon}>{ch.icon}</Text>
              <Text
                style={[
                  styles.channelLabel,
                  selectedChannel === ch.id && styles.channelLabelSelected,
                ]}
              >
                {ch.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.inputLabel}>Mobile Money Phone Number</Text>
        <TextInput
          style={styles.phoneInput}
          placeholder="+233 24 000 0000"
          placeholderTextColor="#94a3b8"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <TouchableOpacity
          style={[styles.payBtn, isProcessing && styles.btnDisabled]}
          onPress={handlePaySubscription}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.payBtnText}>
              {isTrial && daysLeft > 0
                ? 'Pre-pay Next Month (10 GHS)'
                : 'Subscribe Now (10 GHS / MoMo)'}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.secureNote}>
          🔒 Secured by Hubtel Ghana PCI-DSS Certified Payment Gateway. Recurring billing can be cancelled anytime with zero penalty.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  tierBanner: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  badgeCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeIcon: {
    fontSize: 26,
  },
  tierTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#065f46',
  },
  tierSubtitle: {
    fontSize: 12,
    color: '#047857',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  pricingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceCurrency: {
    fontSize: 16,
    fontWeight: '800',
    color: '#059669',
    marginRight: 4,
  },
  priceAmount: {
    fontSize: 38,
    fontWeight: '900',
    color: '#0f172a',
  },
  priceFrequency: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 6,
    fontWeight: '600',
  },
  priceDesc: {
    fontSize: 12,
    color: '#475569',
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 18,
  },
  perksList: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 14,
  },
  perkItem: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  paymentSection: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  channelsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  channelCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
  },
  channelCardSelected: {
    backgroundColor: '#ecfdf5',
    borderColor: '#059669',
  },
  channelIcon: {
    fontSize: 20,
  },
  channelLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  channelLabelSelected: {
    color: '#047857',
    fontWeight: '800',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  phoneInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 16,
  },
  payBtn: {
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  payBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  secureNote: {
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 14,
  },
});
