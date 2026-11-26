import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../../theme/theme';

export default function SubscriptionPaywallScreen() {
  const { user, subscription, refreshProfile } = useAuth();
  const { showAlert } = useAlert();
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
      showAlert({
        type: 'warning',
        title: 'Phone Required',
        message: 'Please enter your Mobile Money phone number.',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const res = await apiClient.post('/billing/pay-subscription', {
        phoneNumber: phone.trim(),
        channel: selectedChannel,
      });

      const clientReference = res.data.clientReference;

      showAlert({
        type: 'info',
        title: 'Mobile Money Prompt Sent',
        message: `A GHS 10.00 debit prompt has been sent to ${phone}. Authorize the prompt on your handset, then tap "Confirm Payment" below.`,
        actions: [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setIsProcessing(false),
          },
          {
            text: 'Confirm Payment',
            style: 'primary',
            onPress: async () => {
              try {
                const verifyRes = await apiClient.get(
                  `/billing/verify-transaction/${clientReference}`
                );
                if (verifyRes.data.status === 'SUCCESS' || verifyRes.data.status === 'PAID') {
                  await refreshProfile();
                  await fetchStatus();
                  showAlert({
                    type: 'success',
                    title: 'Subscription Active',
                    message:
                      'Your GHS 10 monthly TeleDoc subscription has been activated via Mobile Money.',
                  });
                } else {
                  showAlert({
                    type: 'info',
                    title: 'Payment Pending',
                    message: 'Your transaction is still awaiting confirmation.',
                  });
                }
              } catch {
                showAlert({
                  type: 'error',
                  title: 'Verification Error',
                  message: 'Could not verify Mobile Money payment.',
                });
              } finally {
                setIsProcessing(false);
              }
            },
          },
        ],
      });
    } catch (err: any) {
      setIsProcessing(false);
      showAlert({
        type: 'error',
        title: 'Payment Error',
        message: err.response?.data?.message || 'Could not initiate payment.',
      });
    }
  };

  const isTrial = (subData?.status || subscription?.status) === 'TRIAL';
  const daysLeft = subData?.daysRemainingInTrial ?? subscription?.trialDaysRemaining ?? 90;

  const channels = [
    { id: 'mtn-gh', label: 'MTN MoMo', accent: '#EAB308', icon: 'smartphone' as const },
    { id: 'vodafone-gh', label: 'Telecel Cash', accent: '#DC2626', icon: 'smartphone' as const },
    { id: 'tigo-gh', label: 'AT Money', accent: '#0284C7', icon: 'smartphone' as const },
    { id: 'card', label: 'Visa / Card', accent: '#0F172A', icon: 'credit-card' as const },
  ];

  const perks = [
    'Unlimited HD Video & Audio Consultations',
    'Direct in-platform chat with MDC doctors',
    'Instant e-Prescriptions synced to your phone',
    'Lab results & diagnostic imaging uploads',
    'Instant SMS & push appointment reminders',
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Status Banner */}
      <View style={styles.tierBanner}>
        <View style={styles.badgeCircle}>
          <MaterialIcons name="verified-user" size={26} color={COLORS.primary} />
        </View>
        <Text style={styles.tierTitle}>
          {isTrial ? '90-Day Free Trial Active' : 'Monthly Unlimited Plan'}
        </Text>
        <Text style={styles.tierSubtitle}>
          {isTrial
            ? `You have ${daysLeft} days remaining in your complimentary 3-month trial.`
            : 'Your subscription is active and renews monthly via Mobile Money.'}
        </Text>
      </View>

      {/* Pricing Card */}
      <View style={styles.card}>
        <View style={styles.priceRow}>
          <Text style={styles.priceCurrency}>GHS</Text>
          <Text style={styles.priceAmount}>10</Text>
          <Text style={styles.priceFrequency}>/ month</Text>
        </View>
        <Text style={styles.priceDesc}>
          Full access to accredited Ghanaian physicians across all 16 regions.
        </Text>

        <View style={styles.perksList}>
          {perks.map((perk) => (
            <View key={perk} style={styles.perkRow}>
              <MaterialIcons name="check-circle" size={16} color={COLORS.primary} />
              <Text style={styles.perkItem}>{perk}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Payment Channels */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Payment Method (Hubtel Ghana)</Text>

        <View style={styles.channelsGrid}>
          {channels.map((ch) => {
            const isSelected = selectedChannel === ch.id;
            return (
              <TouchableOpacity
                key={ch.id}
                style={[styles.channelCard, isSelected && styles.channelCardSelected]}
                onPress={() => setSelectedChannel(ch.id as any)}
                activeOpacity={0.8}
              >
                <View style={[styles.channelDot, { backgroundColor: ch.accent }]}>
                  <MaterialIcons name={ch.icon} size={16} color={COLORS.white} />
                </View>
                <Text style={[styles.channelLabel, isSelected && styles.channelLabelSelected]}>
                  {ch.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.inputLabel}>Mobile Money Number</Text>
        <View style={styles.inputWrap}>
          <MaterialIcons name="phone-android" size={18} color={COLORS.textSubtle} />
          <TextInput
            style={styles.phoneInput}
            placeholder="+233 24 000 0000"
            placeholderTextColor={COLORS.textSubtle}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        <TouchableOpacity
          style={[styles.payBtn, isProcessing && styles.btnDisabled]}
          onPress={handlePaySubscription}
          disabled={isProcessing}
          activeOpacity={0.85}
        >
          {isProcessing ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.payBtnText}>
              {isTrial && daysLeft > 0
                ? 'Pre-pay Next Month (GHS 10)'
                : 'Subscribe Now (GHS 10 / MoMo)'}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.secureRow}>
          <MaterialIcons name="lock" size={13} color={COLORS.textSubtle} />
          <Text style={styles.secureNote}>
            Secured by Hubtel Ghana PCI-DSS Certified Gateway. Cancel anytime.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: 18,
    gap: 16,
    paddingBottom: 32,
  },
  tierBanner: {
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    borderRadius: RADIUS.xl,
    padding: 20,
    alignItems: 'center',
  },
  badgeCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    ...SHADOWS.card,
  },
  tierTitle: {
    fontSize: 18,
    fontFamily: FONTS.extraBold,
    color: COLORS.primaryDark,
  },
  tierSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceCurrency: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    marginRight: 4,
  },
  priceAmount: {
    fontSize: 38,
    fontFamily: FONTS.extraBold,
    color: COLORS.text,
  },
  priceFrequency: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
    marginLeft: 6,
  },
  priceDesc: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  perksList: {
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceMuted,
    paddingTop: 14,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  perkItem: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: 14,
  },
  channelsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  channelCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  channelCardSelected: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primary,
  },
  channelDot: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelLabel: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
  },
  channelLabelSelected: {
    color: COLORS.primaryDark,
    fontFamily: FONTS.bold,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 16,
  },
  phoneInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  payBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  payBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontFamily: FONTS.bold,
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 12,
  },
  secureNote: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textSubtle,
  },
});
