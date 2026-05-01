/**
 * Connections Screen — GlucoMind
 *
 * Manage data source integrations: HealthKit, Dexcom CGM, and future providers.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import {
  isHealthKitAvailable,
  requestHealthKitPermissions,
  getHealthKitStatusMessage,
} from '../services/healthkit';
import {
  isConnected as dexcomIsConnected,
  getLastSyncTime as dexcomGetLastSyncTime,
  launchDexcomAuth,
  exchangeCodeForTokens,
  clearTokens,
} from '../services/dexcom';
import { initialSync } from '../services/sync';
import { setSetting } from '../services/database';

// ─── Types ────────────────────────────────────────────────────────────────────

type ConnectionStatus = 'connected' | 'disconnected' | 'coming_soon' | 'unavailable';

interface ConnectionCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  name: string;
  description: string;
  status: ConnectionStatus;
  dataTypes?: string[];
  lastSync?: number | null;
  statusMessage?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  loading?: boolean;
}

// ─── Connection Card Component ────────────────────────────────────────────────

function ConnectionCard({
  icon,
  iconColor,
  name,
  description,
  status,
  dataTypes,
  lastSync,
  statusMessage,
  onConnect,
  onDisconnect,
  loading = false,
}: ConnectionCardProps) {
  const isComingSoon = status === 'coming_soon';
  const isUnavailable = status === 'unavailable';
  const isConnected = status === 'connected';
  const muted = isComingSoon || isUnavailable;

  const statusDotColor =
    isConnected ? '#22C55E' :
    muted ? Colors.cardBorder :
    Colors.textMuted;

  const formatLastSync = (ts: number) => {
    const minsAgo = Math.round((Date.now() - ts) / 60000);
    if (minsAgo < 1) return 'Just now';
    if (minsAgo < 60) return `${minsAgo}m ago`;
    const hrsAgo = Math.floor(minsAgo / 60);
    return `${hrsAgo}h ago`;
  };

  return (
    <View style={[styles.card, muted && styles.cardMuted]}>
      {/* Header row */}
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrap, { backgroundColor: muted ? Colors.cardBorder : iconColor + '22' }]}>
          <Ionicons name={icon} size={22} color={muted ? Colors.textMuted : iconColor} />
        </View>

        <View style={styles.cardInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.cardName, muted && styles.cardNameMuted]}>{name}</Text>
            {isComingSoon && (
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>Coming Soon</Text>
              </View>
            )}
          </View>
          <Text style={[styles.cardDesc, muted && styles.cardDescMuted]}>{description}</Text>
        </View>

        {/* Status dot */}
        <View style={[styles.statusDot, { backgroundColor: statusDotColor }]} />
      </View>

      {/* Status message */}
      {statusMessage && !muted && (
        <Text style={styles.statusMessage}>{statusMessage}</Text>
      )}

      {/* Data types when connected */}
      {isConnected && dataTypes && dataTypes.length > 0 && (
        <View style={styles.dataTypesRow}>
          {dataTypes.map((dt) => (
            <View key={dt} style={styles.dataTypePill}>
              <Text style={styles.dataTypePillText}>{dt}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Last sync */}
      {isConnected && lastSync != null && (
        <Text style={styles.lastSyncText}>Last sync: {formatLastSync(lastSync)}</Text>
      )}

      {/* Action button */}
      {!muted && (
        <View style={styles.cardFooter}>
          {isConnected ? (
            <TouchableOpacity
              style={styles.disconnectBtn}
              onPress={onDisconnect}
              disabled={loading}
            >
              <Text style={styles.disconnectBtnText}>Disconnect</Text>
            </TouchableOpacity>
          ) : isUnavailable ? (
            <View style={styles.unavailableBtn}>
              <Ionicons name="phone-portrait-outline" size={13} color={Colors.textMuted} />
              <Text style={styles.unavailableBtnText}>iOS only</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.connectBtn}
              onPress={onConnect}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <>
                  <Ionicons name="link-outline" size={14} color={Colors.primary} />
                  <Text style={styles.connectBtnText}>Connect</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Coming soon footer placeholder */}
      {isComingSoon && (
        <View style={styles.comingSoonFooter}>
          <Text style={styles.comingSoonFooterText}>Stay tuned for future updates</Text>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ConnectionsScreen() {
  // HealthKit state
  const [hkConnected, setHkConnected] = useState(false);
  const [hkLoading, setHkLoading] = useState(false);

  // Dexcom state
  const [dexConnected, setDexConnected] = useState(false);
  const [dexLoading, setDexLoading] = useState(false);
  const [dexLastSync, setDexLastSync] = useState<number | null>(null);

  // Always show HealthKit as available on iOS builds — the native check
  // may fail in some EAS builds but permissions still work
  const hkAvailable = Platform.OS === 'ios' || isHealthKitAvailable();

  const loadStatuses = useCallback(async () => {
    // HealthKit — we optimistically consider it connected if available + iOS
    // In a real build, you'd persist a "permissions granted" flag
    // For now, reflect platform availability only
    setHkConnected(false); // Will update after permission check below

    // Dexcom
    try {
      const [dexConn, dexSync] = await Promise.all([
        dexcomIsConnected(),
        dexcomGetLastSyncTime(),
      ]);
      setDexConnected(dexConn);
      setDexLastSync(dexSync);
    } catch {
      setDexConnected(false);
      setDexLastSync(null);
    }
  }, []);

  useEffect(() => {
    loadStatuses();
  }, [loadStatuses]);

  // ─── HealthKit Handlers ────────────────────────────────────────────────────

  const handleConnectHealthKit = async () => {
    setHkLoading(true);
    try {
      const granted = await requestHealthKitPermissions();
      if (granted) {
        setHkConnected(true);
        await setSetting('healthkit_connected', 'true');
        Alert.alert(
          'Apple Health Connected ✅',
          'GlucoMind can now read Glucose, Heart Rate, Steps, and Sleep from Apple Health.'
        );
      } else {
        Alert.alert(
          'Permission Denied',
          'Please grant Apple Health permissions in Settings > Privacy > Health.'
        );
      }
    } catch (err: any) {
      // HealthKit native module may not be available — still allow UI
      Alert.alert('HealthKit Unavailable', 'Apple Health integration requires a device with HealthKit support. Please check your device settings.');
    } finally {
      setHkLoading(false);
    }
  };

  const handleDisconnectHealthKit = () => {
    Alert.alert(
      'Disconnect Apple Health',
      'You can manage HealthKit permissions in Settings > Privacy > Health.',
      [
        { text: 'Open Settings', onPress: () => {
          // On iOS, Linking to app-prefs is handled by the OS
          Alert.alert('Tip', 'Go to Settings > Privacy & Security > Health > GlucoMind to manage permissions.');
        }},
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // ─── Dexcom Handlers ──────────────────────────────────────────────────────

  const handleConnectDexcom = async () => {
    setDexLoading(true);
    try {
      const code = await launchDexcomAuth();
      await exchangeCodeForTokens(code);
      await initialSync();
      await setSetting('data_source', 'dexcom');
      await loadStatuses();
      Alert.alert(
        'Dexcom Connected ✅',
        'Your last 24 hours of CGM data has been imported.'
      );
    } catch (err: any) {
      Alert.alert('Connection Failed', err?.message ?? 'Could not connect to Dexcom.');
    } finally {
      setDexLoading(false);
    }
  };

  const handleDisconnectDexcom = () => {
    Alert.alert(
      'Disconnect Dexcom',
      'This will remove your Dexcom access tokens and switch back to demo mode.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await clearTokens();
            await setSetting('data_source', 'simulated');
            setDexConnected(false);
            setDexLastSync(null);
          },
        },
      ]
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.pageSubtitle}>
        Connect your devices and health apps to bring all your data into one place.
      </Text>

      {/* ── Active Connections ── */}
      <Text style={styles.sectionLabel}>Active Connections</Text>

      {/* HealthKit */}
      <ConnectionCard
        icon="heart"
        iconColor="#FF3B5C"
        name="Apple Health"
        description="Read glucose, heart rate, steps, and sleep from HealthKit"
        status={
          !hkAvailable ? 'unavailable' :
          hkConnected ? 'connected' :
          'disconnected'
        }
        dataTypes={hkConnected ? ['Glucose', 'Heart Rate', 'Steps', 'Sleep'] : undefined}
        statusMessage={getHealthKitStatusMessage(hkConnected)}
        onConnect={handleConnectHealthKit}
        onDisconnect={handleDisconnectHealthKit}
        loading={hkLoading}
      />

      {/* Dexcom CGM */}
      <ConnectionCard
        icon="pulse"
        iconColor={Colors.primary}
        name="Dexcom CGM"
        description="Real-time continuous glucose monitoring via Dexcom API"
        status={dexConnected ? 'connected' : 'disconnected'}
        dataTypes={dexConnected ? ['CGM Readings', 'Trend Data'] : undefined}
        lastSync={dexConnected ? dexLastSync : null}
        statusMessage={
          dexConnected
            ? 'Syncing glucose readings from your Dexcom sensor'
            : 'Connect your Dexcom receiver or transmitter'
        }
        onConnect={handleConnectDexcom}
        onDisconnect={handleDisconnectDexcom}
        loading={dexLoading}
      />

      {/* ── Coming Soon ── */}
      <Text style={styles.sectionLabel}>Coming Soon</Text>

      <ConnectionCard
        icon="radio-outline"
        iconColor="#8B5CF6"
        name="Oura Ring"
        description="Sleep quality, HRV, and readiness scores"
        status="coming_soon"
      />

      <ConnectionCard
        icon="fitness-outline"
        iconColor="#F97316"
        name="WHOOP"
        description="Strain, recovery, and sleep performance data"
        status="coming_soon"
      />

      <ConnectionCard
        icon="water-outline"
        iconColor="#3B82F6"
        name="Libre / FreeStyle"
        description="Alternative CGM readings from Abbott's sensor range"
        status="coming_soon"
      />

      <View style={styles.footer}>
        <Ionicons name="lock-closed-outline" size={13} color={Colors.textMuted} />
        <Text style={styles.footerText}>
          All data is stored locally on your device and never shared.
        </Text>
      </View>
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  pageSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 8,
    paddingHorizontal: 4,
  },

  // Card
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    gap: 10,
  },
  cardMuted: {
    opacity: 0.65,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  cardName: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  cardNameMuted: {
    color: Colors.textSecondary,
  },
  cardDesc: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  cardDescMuted: {
    color: Colors.textMuted,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    alignSelf: 'flex-start',
    marginTop: 4,
  },

  // Status message
  statusMessage: {
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    paddingTop: 2,
  },

  // Data types
  dataTypesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dataTypePill: {
    backgroundColor: Colors.primary + '18',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.primary + '33',
  },
  dataTypePillText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '600',
  },

  // Last sync
  lastSyncText: {
    color: Colors.textMuted,
    fontSize: 11,
  },

  // Footer / actions
  cardFooter: {
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary + '18',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.primary + '44',
  },
  connectBtnText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  disconnectBtn: {
    backgroundColor: Colors.red + '18',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.red + '33',
  },
  disconnectBtnText: {
    color: Colors.red,
    fontSize: 13,
    fontWeight: '600',
  },
  unavailableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  unavailableBtnText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },

  // Coming soon badge
  comingSoonBadge: {
    backgroundColor: Colors.cardBorder,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  comingSoonText: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  comingSoonFooter: {
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  comingSoonFooterText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
  },

  // Page footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },
  footerText: {
    color: Colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
});
