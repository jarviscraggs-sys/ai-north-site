import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity, useWindowDimensions,
  RefreshControl, Alert
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { GlucoseReading } from '../../types';
import {
  getLatestGlucoseReading, getGlucoseReadings, getAllSettings,
  insertGlucoseReading, getGlucoseCount, getSetting,
  getMealsInRange, getInsulinDosesInRange, getFactorsSince,
} from '../../services/database';
import { generateNextReading } from '../../services/simulator';
import { sendSpikeAlert, sendHighAlert, sendLowAlert, sendSpikePrompt, sendHighWithPrompt, sendLowWithPrompt } from '../../services/notifications';
import { isConnected, getLastSyncTime } from '../../services/dexcom';
import { isShareConnected, getShareLastSync } from '../../services/dexcom-share';
import { startSyncInterval, stopSyncInterval, periodicSync, initialSync, SyncResult } from '../../services/sync';
import GlucoseHero from '../../components/GlucoseHero';
import GlucoseGraph from '../../components/GlucoseGraph';
import Card from '../../components/Card';
import TIRStreak from '../../components/TIRStreak';
import { calculateIOB, formatIOB, calculateBasalIOB, BasalIOBResult } from '../../services/iob';
import { predictHypo, HypoPrediction } from '../../services/hypo-prediction';
import { startPatternAnalysisInterval, stopPatternAnalysisInterval } from '../../services/pattern-ai';
import { IOBResult } from '../../types';

export default function Dashboard() {
  const [latest, setLatest] = useState<GlucoseReading | null>(null);
  const [readings6h, setReadings6h] = useState<GlucoseReading[]>([]);
  const [timeInRange, setTimeInRange] = useState(0);
  const [targetLow, setTargetLow] = useState(4);
  const [targetHigh, setTargetHigh] = useState(10);
  const [refreshing, setRefreshing] = useState(false);
  const [lastHighAlert, setLastHighAlert] = useState(0);
  const [lastLowAlert, setLastLowAlert] = useState(0);
  const [lastSpikeAlert, setLastSpikeAlert] = useState(0);
  const [iobResult, setIobResult] = useState<IOBResult | null>(null);
  const [basalIOB, setBasalIOB] = useState<BasalIOBResult | null>(null);
  const [hypoPrediction, setHypoPrediction] = useState<HypoPrediction | null>(null);
  // Dexcom state
  const [dexcomConnected, setDexcomConnected] = useState(false);
  const [dataSource, setDataSource] = useState<string>('simulated');
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  // New stat cards
  const [a1cEstimate, setA1cEstimate] = useState<number | null>(null);
  const [dailyPoints, setDailyPoints] = useState(0);

  const loadDexcomStatus = useCallback(async () => {
    const source = await getSetting('data_source', 'simulated');
    // Check Dexcom Share first (primary), then legacy Dexcom API
    const shareConn = await isShareConnected();
    const legacyConn = await isConnected();
    setDexcomConnected(shareConn || legacyConn);
    setDataSource(source);
    if (shareConn) {
      const lastSync = await getShareLastSync();
      setLastSyncTime(lastSync);
    } else if (legacyConn) {
      const lastSync = await getLastSyncTime();
      setLastSyncTime(lastSync);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const settings = await getAllSettings();
      setTargetLow(settings.target_low);
      setTargetHigh(settings.target_high);

      const latestReading = await getLatestGlucoseReading();
      setLatest(latestReading);

      const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
      const recent = await getGlucoseReadings(100, sixHoursAgo);
      setReadings6h(recent);

      // Calculate time in range for today
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      const dayStartTs = dayStart.getTime();
      const todayReadings = await getGlucoseReadings(300, dayStartTs);
      if (todayReadings.length > 0) {
        const inRange = todayReadings.filter(
          r => r.value >= settings.target_low && r.value <= settings.target_high
        ).length;
        setTimeInRange(Math.round((inRange / todayReadings.length) * 100));
      }

      // Load IOB (rapid + basal)
      const iob = await calculateIOB();
      setIobResult(iob);
      const bob = await calculateBasalIOB();
      setBasalIOB(bob);

      // Hypo prediction
      const hypo = await predictHypo();
      setHypoPrediction(hypo);

      // ── A1C Estimate (30-day) ──
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const readings30d = await getGlucoseReadings(5000, thirtyDaysAgo);
      if (readings30d.length > 0) {
        const avg30 = readings30d.reduce((s, r) => s + r.value, 0) / readings30d.length;
        setA1cEstimate((avg30 + 2.59) / 1.59);
      } else {
        setA1cEstimate(null);
      }

      // ── Daily Points (gamification) ──
      const now = Date.now();
      const [todayMeals, todayInsulin, todayFactors] = await Promise.all([
        getMealsInRange(dayStartTs, now),
        getInsulinDosesInRange(dayStartTs, now),
        getFactorsSince(dayStartTs),
      ]);

      // Hours in range: readings are ~5min apart, so 12 readings ≈ 1 hour
      const readingsPerHour = 12;
      const inRangeReadings = todayReadings.filter(
        r => r.value >= settings.target_low && r.value <= settings.target_high
      ).length;
      const hoursInRange = Math.floor(inRangeReadings / readingsPerHour);

      const pts =
        todayMeals.length * 5 +
        todayInsulin.length * 5 +
        todayFactors.length * 3 +
        hoursInRange * 2;
      setDailyPoints(Math.min(pts, 50));
    } catch (e) {
      console.error('Load error:', e);
    }
  }, []);

  // Simulate new readings every 5 minutes (demo mode only)
  // Simulation disabled — using real HealthKit/Dexcom data only
  const simulateReading = useCallback(async () => {
    // No-op: real data comes from HealthKit sync
  }, []);

  // Refresh data + status when tab gains focus (returning from other screens or app foreground)
  useFocusEffect(
    useCallback(() => {
      loadDexcomStatus();
      // Trigger a sync on focus so data is fresh when user opens the app
      periodicSync().then(() => loadData()).catch(() => {});
    }, [loadDexcomStatus, loadData])
  );

  useEffect(() => {
    // Sync HealthKit data on dashboard load
    // Sync real data from HealthKit then refresh dashboard
    initialSync().then(() => loadData()).catch(() => {});
    loadData();
    loadDexcomStatus();

    // Re-sync HealthKit every 5 minutes
    const simInterval = setInterval(() => {
      initialSync().then(() => loadData()).catch(() => {});
    }, 5 * 60 * 1000);

    // Start Dexcom sync interval
    startSyncInterval(async (result: SyncResult) => {
      if (result.inserted > 0) {
        await loadData();
        await loadDexcomStatus();
      }
    });

    // Start AI pattern analysis interval (every ~60 minutes)
    startPatternAnalysisInterval();

    return () => {
      clearInterval(simInterval);
      stopSyncInterval();
      stopPatternAnalysisInterval();
    };
  }, [loadData, loadDexcomStatus, simulateReading]);

  const onRefresh = async () => {
    setRefreshing(true);
    const source = await getSetting('data_source', 'simulated');
    if (source !== 'simulated') {
      await periodicSync();
      await loadDexcomStatus();
    }
    await loadData();
    setRefreshing(false);
  };

  const quickActions = [
    { label: 'Log Meal', icon: 'restaurant', route: '/log-meal', color: Colors.primary },
    { label: 'Log Insulin', icon: 'medical', route: '/log-insulin', color: Colors.amber },
    { label: 'Scan Food', icon: 'camera', route: '/food-scanner', color: '#4DD9C8' },
    { label: 'Log Factors', icon: 'pulse', route: '/log-factors', color: '#FF8C69' },
    { label: 'Log Activity', icon: 'fitness', route: '/log-activity', color: '#7C6FFF' },
  ];

  const getTimeInRangeColor = () => {
    if (timeInRange >= 70) return Colors.inRange;
    if (timeInRange >= 50) return Colors.borderline;
    return Colors.outOfRange;
  };

  const getA1CColor = (a1c: number) => {
    if (a1c < 7.0) return Colors.inRange;
    if (a1c < 8.0) return Colors.borderline;
    return Colors.outOfRange;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: 100 }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
      }
    >
      {/* SOS Button */}
      <View style={styles.sosRow}>
        <Text style={styles.sosLabel}>GlucoMind</Text>
        <TouchableOpacity
          style={[styles.sosBtn, latest && latest.value < 4 && styles.sosBtnActive]}
          onPress={() => router.push('/sos' as any)}
        >
          <Text style={styles.sosBtnText}>SOS</Text>
        </TouchableOpacity>
      </View>

      {/* Hero glucose display */}
      <Card style={styles.heroCard}>
        <GlucoseHero reading={latest} targetLow={targetLow} targetHigh={targetHigh} />
        <View style={styles.graphContainer}>
          <GlucoseGraph readings={readings6h} height={100} targetLow={targetLow} targetHigh={targetHigh} />
        </View>
        <Text style={styles.graphLabel}>Last 6 hours</Text>
      </Card>

      {/* Hypo Prediction Banner */}
      {hypoPrediction && hypoPrediction.severity !== 'none' && (
        <Card style={{ backgroundColor: hypoPrediction.severity === 'urgent' ? '#FF3B5C15' : hypoPrediction.severity === 'warning' ? '#FFC10715' : Colors.card, borderWidth: 1, borderColor: hypoPrediction.severity === 'urgent' ? '#FF3B5C44' : hypoPrediction.severity === 'warning' ? '#FFC10744' : Colors.cardBorder }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons
              name={hypoPrediction.severity === 'urgent' ? 'warning' : 'trending-down'}
              size={20}
              color={hypoPrediction.severity === 'urgent' ? '#FF3B5C' : '#FFC107'}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: hypoPrediction.severity === 'urgent' ? '#FF3B5C' : '#FFC107' }}>
                {hypoPrediction.severity === 'urgent' ? 'Low Glucose Predicted' : hypoPrediction.severity === 'warning' ? 'Trending Low' : 'Watch'}
              </Text>
              <Text style={{ fontSize: 13, color: Colors.textSecondary, marginTop: 2 }}>
                {hypoPrediction.message}
              </Text>
              {hypoPrediction.predictedLowIn > 0 && (
                <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 4 }}>
                  Projected in 30min: {hypoPrediction.predictedValue30min} mmol/L · Rate: {(hypoPrediction.rateOfChange * 60).toFixed(1)} mmol/h
                </Text>
              )}
            </View>
          </View>
        </Card>
      )}

      {/* IOB Card */}
      {iobResult && iobResult.totalIOB > 0.05 && (
        <Card style={styles.iobCard}>
          <View style={styles.iobRow}>
            <View style={styles.iobLeft}>
              <Ionicons
                name="medical"
                size={16}
                color={iobResult.isHigh ? Colors.amber : Colors.primary}
              />
              <Text style={styles.iobLabel}>Active Insulin</Text>
            </View>
            <View style={styles.iobRight}>
              <Text style={[styles.iobValue, { color: iobResult.isHigh ? Colors.amber : Colors.primary }]}>
                {formatIOB(iobResult.totalIOB)}
              </Text>
              {iobResult.isHigh && (
                <Text style={styles.iobWarning}>⚠️ stacking risk</Text>
              )}
            </View>
          </View>
          {/* Progress bar + clear time */}
          {iobResult.clearTimeMs > 0 && (
            <>
              <View style={styles.iobProgressBg}>
                <View
                  style={[
                    styles.iobProgressFill,
                    {
                      width: `${Math.min(100, (iobResult.peakDoseElapsedMs / (iobResult.peakDoseElapsedMs + iobResult.clearTimeMs)) * 100)}%` as any,
                      backgroundColor: iobResult.isHigh ? Colors.amber : Colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={styles.iobClearTime}>
                Clears in ~{iobResult.clearTimeMs < 3600000
                  ? `${Math.round(iobResult.clearTimeMs / 60000)}min`
                  : `${Math.floor(iobResult.clearTimeMs / 3600000)}h ${Math.round((iobResult.clearTimeMs % 3600000) / 60000)}min`}
              </Text>
            </>
          )}
        </Card>
      )}

      {/* Basal IOB Card */}
      {basalIOB && basalIOB.totalBOB > 0.1 && (
        <Card style={styles.iobCard}>
          <View style={styles.iobRow}>
            <View style={styles.iobLeft}>
              <Ionicons name="water" size={16} color="#7C6FFF" />
              <Text style={styles.iobLabel}>Basal Insulin ({basalIOB.insulinName})</Text>
            </View>
            <View style={styles.iobRight}>
              <Text style={[styles.iobValue, { color: '#7C6FFF' }]}>
                {basalIOB.totalBOB.toFixed(1)}u
              </Text>
            </View>
          </View>
          {/* Progress bar showing how much has been absorbed */}
          <View style={styles.iobProgressBg}>
            <View
              style={[
                styles.iobProgressFill,
                {
                  width: `${basalIOB.percentUsed}%` as any,
                  backgroundColor: '#7C6FFF',
                },
              ]}
            />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={styles.iobClearTime}>
              {basalIOB.lastDoseUnits}u taken {basalIOB.hoursAgo < 1
                ? `${Math.round(basalIOB.hoursAgo * 60)}min ago`
                : `${Math.floor(basalIOB.hoursAgo)}h ago`}
            </Text>
            <Text style={styles.iobClearTime}>
              {basalIOB.percentRemaining}% remaining
            </Text>
          </View>
        </Card>
      )}

      {/* TIR Streak */}
      <TIRStreak />

      {/* Stats row */}
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: getTimeInRangeColor() }]}>{timeInRange}%</Text>
          <Text style={styles.statLabel}>Time in Range</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>
            {readings6h.length > 0
              ? (readings6h.reduce((s, r) => s + r.value, 0) / readings6h.length).toFixed(1)
              : '--'}
          </Text>
          <Text style={styles.statLabel}>6h Average</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{readings6h.length}</Text>
          <Text style={styles.statLabel}>Readings</Text>
        </Card>
      </View>

      {/* A1C Estimate + Daily Points row */}
      <View style={styles.statsRow}>
        {/* Estimated A1C */}
        {a1cEstimate !== null && (
          <Card style={[styles.a1cCard, { borderColor: getA1CColor(a1cEstimate) + '33' }]}>
            <View style={styles.a1cIconRow}>
              <Ionicons name="analytics" size={14} color={getA1CColor(a1cEstimate)} />
            </View>
            <Text style={[styles.a1cValue, { color: getA1CColor(a1cEstimate) }]}>
              {a1cEstimate.toFixed(1)}%
            </Text>
            <Text style={styles.a1cLabel}>Estimated A1C{'\n'}(30d)</Text>
          </Card>
        )}

        {/* Daily Points */}
        <Card style={styles.pointsCard}>
          <View style={styles.pointsHeader}>
            <Ionicons name="trophy" size={14} color={Colors.amber} />
            <Text style={styles.pointsTitle}>Daily Points</Text>
          </View>
          <Text style={styles.pointsValue}>{dailyPoints}<Text style={styles.pointsMax}>/50</Text></Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min((dailyPoints / 50) * 100, 100)}%` as any,
                  backgroundColor: dailyPoints >= 40 ? Colors.inRange : dailyPoints >= 20 ? Colors.amber : Colors.primary,
                },
              ]}
            />
          </View>
          <Text style={styles.pointsLabel}>pts today</Text>
        </Card>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Log</Text>
      <View style={styles.actionsGrid}>
        {quickActions.map(action => (
          <TouchableOpacity
            key={action.label}
            style={[styles.actionButton, { borderColor: action.color + '33' }]}
            onPress={() => router.push(action.route as any)}
          >
            <View style={[styles.actionIcon, { backgroundColor: action.color + '18' }]}>
              <Ionicons name={action.icon as any} size={22} color={action.color} />
            </View>
            <Text style={[styles.actionLabel, { color: action.color }]}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Status indicator */}
      <Card style={styles.statusCard}>
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: dexcomConnected && dataSource === 'dexcom' ? Colors.primary : Colors.amber }]} />
          {dexcomConnected && dataSource === 'dexcom' ? (
            <View style={{ flex: 1 }}>
              <View style={styles.liveRow}>
                <View style={styles.liveBadge}>
                  <Text style={styles.liveBadgeText}>LIVE</Text>
                </View>
                <Text style={styles.statusText}>Dexcom CGM Connected</Text>
              </View>
              {lastSyncTime && (
                <Text style={styles.statusSub}>
                  Last sync: {new Date(lastSyncTime).toLocaleTimeString()}
                </Text>
              )}
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <Text style={styles.statusText}>Demo Mode — Simulated CGM</Text>
              {dexcomConnected && (
                <Text style={styles.statusSub}>Dexcom connected — enable in Settings</Text>
              )}
              {!dexcomConnected && (
                <Text style={styles.statusSub}>Connect Dexcom in Settings for live data</Text>
              )}
            </View>
          )}
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
    gap: 12,
  },
  sosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 8,
  },
  sosLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  sosBtn: {
    backgroundColor: '#CC0000',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sosBtnActive: {
    backgroundColor: '#CC0000',
    shadowColor: '#CC0000',
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  sosBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  heroCard: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  graphContainer: {
    marginTop: 16,
    width: '100%',
  },
  graphLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  // A1C card
  a1cCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
  },
  a1cIconRow: {
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  a1cValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  a1cLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
    letterSpacing: 0.3,
    lineHeight: 14,
  },
  // Points card
  pointsCard: {
    flex: 1,
    padding: 12,
  },
  pointsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  pointsTitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  pointsValue: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  pointsMax: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  progressTrack: {
    height: 5,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  pointsLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    width: '30%',
    flexGrow: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  statusCard: {
    padding: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  statusSub: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  iobCard: {
    padding: 12,
  },
  iobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iobLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iobLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  iobRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  iobValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  iobWarning: {
    color: Colors.amber,
    fontSize: 10,
    fontWeight: '600',
  },
  iobProgressBg: {
    height: 4,
    backgroundColor: Colors.cardBorder,
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  iobProgressFill: {
    height: 4,
    borderRadius: 2,
  },
  iobClearTime: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  liveBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
