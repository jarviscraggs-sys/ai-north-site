import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Colors } from '../../constants/colors';
import { getGlucoseReadings, getCorrelations, getMeals, getAllSettings, getNotifications, markNotificationRead } from '../../services/database';
import { getMealTimingStats, getBestMealTimes, MealTimingStat, BestMealTime } from '../../services/meal-intelligence';
import { getWeeklyInsight, getPatternInsight } from '../../services/ai';
import { estimateAllA1C, getA1CColor, getA1CTrend } from '../../services/a1c';
import { analyseAndDetectAll, GlucosePattern } from '../../services/patterns';
import { A1CEstimate } from '../../types';
import Card from '../../components/Card';

export default function Insights() {
  const [weeklyInsight, setWeeklyInsight] = useState('');
  const [patternInsight, setPatternInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [avgGlucose, setAvgGlucose] = useState(0);
  const [timeInRange, setTimeInRange] = useState(0);
  const [highCount, setHighCount] = useState(0);
  const [lowCount, setLowCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [correlations, setCorrelations] = useState<any[]>([]);
  const [meals, setMeals] = useState<any[]>([]);
  const [mealTimingStats, setMealTimingStats] = useState<MealTimingStat[]>([]);
  const [bestMealTimes, setBestMealTimes] = useState<BestMealTime[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [a1c30, setA1c30] = useState<A1CEstimate | null>(null);
  const [a1c60, setA1c60] = useState<A1CEstimate | null>(null);
  const [a1c90, setA1c90] = useState<A1CEstimate | null>(null);
  const [a1cTrend, setA1cTrend] = useState<'up' | 'down' | 'stable'>('stable');
  const [patterns, setPatterns] = useState<GlucosePattern[]>([]);
  const [loadingPatterns, setLoadingPatterns] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const settings = await getAllSettings();
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const readings = await getGlucoseReadings(2000, weekAgo);

      if (readings.length > 0) {
        const avg = readings.reduce((s, r) => s + r.value, 0) / readings.length;
        setAvgGlucose(avg);
        const inRange = readings.filter(r => r.value >= settings.target_low && r.value <= settings.target_high).length;
        setTimeInRange(Math.round((inRange / readings.length) * 100));
        setHighCount(readings.filter(r => r.value > settings.target_high + 3).length);
        setLowCount(readings.filter(r => r.value < settings.target_low).length);
      }

      const notifs = await getNotifications(20);
      setNotifications(notifs);

      const corrs = await getCorrelations();
      setCorrelations(corrs);

      const mealList = await getMeals(100);
      setMeals(mealList);

      // Meal timing intelligence
      try {
        const [timingStats, bestTimes] = await Promise.all([
          getMealTimingStats(),
          getBestMealTimes(),
        ]);
        setMealTimingStats(timingStats);
        setBestMealTimes(bestTimes);
      } catch (me) {
        console.warn('Meal timing stats error:', me);
      }

      // A1C estimates
      const { a1c30, a1c60, a1c90 } = await estimateAllA1C();
      setA1c30(a1c30);
      setA1c60(a1c60);
      setA1c90(a1c90);
      const trend = await getA1CTrend();
      setA1cTrend(trend);
    } catch (e) {
      console.error('Insights load error:', e);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadPatterns = useCallback(async () => {
    setLoadingPatterns(true);
    try {
      const detected = await analyseAndDetectAll();
      setPatterns(detected);
    } catch (e) {
      console.error('Pattern detection error:', e);
    } finally {
      setLoadingPatterns(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPatterns();
    }, [loadPatterns]),
  );

  const generateInsight = async () => {
    setLoadingInsight(true);
    try {
      const insight = await getWeeklyInsight(avgGlucose, timeInRange, highCount, lowCount);
      setWeeklyInsight(insight);
      const pattern = await getPatternInsight();
      setPatternInsight(pattern);
    } catch (e) {
      console.error('Insight error:', e);
      setWeeklyInsight('Unable to generate insight right now. Check your connection.');
    } finally {
      setLoadingInsight(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadData(), loadPatterns()]);
    setRefreshing(false);
  };

  const getTimeInRangeColor = () => {
    if (timeInRange >= 70) return Colors.inRange;
    if (timeInRange >= 50) return Colors.borderline;
    return Colors.outOfRange;
  };

  const getMealById = (id: number) => meals.find(m => m.id === id);

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'spike': return { icon: 'trending-up', color: Colors.amber };
      case 'high': return { icon: 'arrow-up-circle', color: Colors.outOfRange };
      case 'low': return { icon: 'arrow-down-circle', color: Colors.outOfRange };
      case 'insulin_reminder': return { icon: 'medical', color: Colors.amber };
      case 'pattern': return { icon: 'bulb', color: Colors.primary };
      default: return { icon: 'notifications', color: Colors.textSecondary };
    }
  };

  const getPatternIcon = (type: GlucosePattern['type']): string => {
    switch (type) {
      case 'dawn_phenomenon': return 'sunny';
      case 'somogyi': return 'repeat';
      case 'overnight_stable': return 'checkmark-circle';
      case 'overnight_high': return 'moon';
      case 'overnight_low': return 'moon-outline';
      case 'post_meal_spike': return 'restaurant';
      case 'extended_high': return 'arrow-up-circle';
      case 'rapid_drop': return 'trending-down';
      default: return 'analytics';
    }
  };

  const getPatternSeverityColor = (severity: GlucosePattern['severity']): string => {
    switch (severity) {
      case 'alert': return Colors.outOfRange;
      case 'warning': return Colors.amber;
      case 'info': return Colors.primary;
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
      }
    >
      {/* Pattern Alerts */}
      <Text style={styles.heading}>Pattern Alerts</Text>
      {loadingPatterns ? (
        <Card style={patternStyles.emptyCard}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={patternStyles.emptyText}>Analysing your glucose patterns…</Text>
        </Card>
      ) : patterns.length === 0 ? (
        <Card style={patternStyles.emptyCard}>
          <Ionicons name="checkmark-circle" size={24} color={Colors.inRange} />
          <Text style={patternStyles.emptyText}>No patterns detected — your glucose looks stable! ✅</Text>
        </Card>
      ) : (
        patterns.map((pattern, index) => {
          const color = getPatternSeverityColor(pattern.severity);
          const icon = getPatternIcon(pattern.type);
          return (
            <Card
              key={`${pattern.type}-${index}`}
              style={[patternStyles.card, { borderColor: color + '44' }]}
            >
              <View style={patternStyles.cardHeader}>
                <View style={[patternStyles.iconBadge, { backgroundColor: color + '22' }]}>
                  <Ionicons name={icon as any} size={18} color={color} />
                </View>
                <View style={patternStyles.cardHeaderText}>
                  <Text style={[patternStyles.cardTitle, { color }]}>{pattern.title}</Text>
                  <Text style={patternStyles.severityLabel}>
                    {pattern.severity.charAt(0).toUpperCase() + pattern.severity.slice(1)}
                  </Text>
                </View>
              </View>
              <Text style={patternStyles.description}>{pattern.description}</Text>
              <View style={patternStyles.recommendationRow}>
                <Ionicons name="bulb-outline" size={13} color={Colors.textMuted} />
                <Text style={patternStyles.recommendation}>{pattern.recommendation}</Text>
              </View>
            </Card>
          );
        })
      )}

      {/* Weekly summary */}
      <Text style={styles.heading}>Weekly Summary</Text>
      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{avgGlucose > 0 ? avgGlucose.toFixed(1) : '--'}</Text>
          <Text style={styles.statLabel}>Avg Glucose</Text>
          <Text style={styles.statUnit}>mmol/L</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: getTimeInRangeColor() }]}>
            {timeInRange > 0 ? `${timeInRange}%` : '--'}
          </Text>
          <Text style={styles.statLabel}>Time in Range</Text>
          <Text style={styles.statUnit}>target: 70%+</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: highCount > 10 ? Colors.outOfRange : Colors.textPrimary }]}>
            {highCount}
          </Text>
          <Text style={styles.statLabel}>High Events</Text>
          <Text style={styles.statUnit}>{'>'}13 mmol/L</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: lowCount > 3 ? Colors.outOfRange : Colors.textPrimary }]}>
            {lowCount}
          </Text>
          <Text style={styles.statLabel}>Low Events</Text>
          <Text style={styles.statUnit}>{'<'}4 mmol/L</Text>
        </Card>
      </View>

      {/* AI Weekly Insight */}
      <Card style={styles.insightCard}>
        <View style={styles.insightHeader}>
          <Ionicons name="sparkles" size={18} color={Colors.primary} />
          <Text style={styles.insightTitle}>AI Weekly Insight</Text>
        </View>
        {weeklyInsight ? (
          <Text style={styles.insightText}>{weeklyInsight}</Text>
        ) : (
          <Text style={styles.insightPlaceholder}>
            Tap below to generate your personalised weekly AI analysis
          </Text>
        )}
        <TouchableOpacity
          style={[styles.insightButton, loadingInsight && styles.insightButtonLoading]}
          onPress={generateInsight}
          disabled={loadingInsight}
        >
          {loadingInsight ? (
            <ActivityIndicator size="small" color={Colors.background} />
          ) : (
            <>
              <Ionicons name="sparkles" size={14} color={Colors.background} />
              <Text style={styles.insightButtonText}>
                {weeklyInsight ? 'Regenerate' : 'Generate Insight'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </Card>

      {/* Estimated A1C */}
      {(a1c30 || a1c60 || a1c90) && (
        <>
          <Text style={styles.heading}>Estimated A1c</Text>
          <Card style={a1cStyles.card}>
            <View style={a1cStyles.header}>
              <Ionicons name="analytics" size={16} color={Colors.primary} />
              <Text style={a1cStyles.cardTitle}>eA1c Estimates</Text>
              <Text style={a1cStyles.trendArrow}>
                {a1cTrend === 'up' ? '↑ Worsening' : a1cTrend === 'down' ? '↓ Improving' : '→ Stable'}
              </Text>
            </View>
            <View style={a1cStyles.row}>
              {a1c30 && (
                <View style={a1cStyles.col}>
                  <Text style={[a1cStyles.value, { color: getA1CColor(a1c30.value) }]}>
                    {a1c30.value.toFixed(1)}%
                  </Text>
                  <Text style={a1cStyles.period}>30 days</Text>
                  <Text style={a1cStyles.sub}>avg {a1c30.avgGlucose} mmol/L</Text>
                </View>
              )}
              {a1c60 && (
                <View style={[a1cStyles.col, a1cStyles.colBorder]}>
                  <Text style={[a1cStyles.value, { color: getA1CColor(a1c60.value) }]}>
                    {a1c60.value.toFixed(1)}%
                  </Text>
                  <Text style={a1cStyles.period}>60 days</Text>
                  <Text style={a1cStyles.sub}>avg {a1c60.avgGlucose} mmol/L</Text>
                </View>
              )}
              {a1c90 && (
                <View style={[a1cStyles.col, a1cStyles.colBorder]}>
                  <Text style={[a1cStyles.value, { color: getA1CColor(a1c90.value) }]}>
                    {a1c90.value.toFixed(1)}%
                  </Text>
                  <Text style={a1cStyles.period}>90 days</Text>
                  <Text style={a1cStyles.sub}>avg {a1c90.avgGlucose} mmol/L</Text>
                </View>
              )}
            </View>
            <Text style={a1cStyles.disclaimer}>
              Estimated using ADAG formula. Not a substitute for lab HbA1c.
            </Text>
          </Card>
        </>
      )}

      {/* Pattern Alert */}
      {patternInsight && (
        <Card style={styles.patternCard}>
          <View style={styles.insightHeader}>
            <Ionicons name="analytics" size={18} color={Colors.amber} />
            <Text style={[styles.insightTitle, { color: Colors.amber }]}>Pattern Detected</Text>
          </View>
          <Text style={styles.patternText}>{patternInsight}</Text>
        </Card>
      )}

      {/* Meal correlations */}
      {correlations.length > 0 && (
        <>
          <Text style={styles.heading}>Meal Patterns</Text>
          {correlations.slice(0, 5).map(corr => {
            const meal = getMealById(corr.meal_id);
            if (!meal) return null;
            const spike = corr.peak_glucose - corr.pre_glucose;
            return (
              <Card key={corr.id} style={styles.corrCard}>
                <View style={styles.corrHeader}>
                  <Ionicons name="restaurant" size={14} color={Colors.primary} />
                  <Text style={styles.corrMeal} numberOfLines={1}>{meal.description}</Text>
                  <Text style={styles.corrCategory}>{meal.category}</Text>
                </View>
                <View style={styles.corrStats}>
                  <View style={styles.corrStat}>
                    <Text style={styles.corrStatValue}>{corr.pre_glucose}</Text>
                    <Text style={styles.corrStatLabel}>Before</Text>
                  </View>
                  <View style={styles.corrArrow}>
                    <Text style={[styles.corrArrowText, { color: spike > 3 ? Colors.outOfRange : Colors.amber }]}>
                      +{spike.toFixed(1)} →
                    </Text>
                  </View>
                  <View style={styles.corrStat}>
                    <Text style={[styles.corrStatValue, { color: spike > 3 ? Colors.outOfRange : Colors.amber }]}>
                      {corr.peak_glucose}
                    </Text>
                    <Text style={styles.corrStatLabel}>Peak</Text>
                  </View>
                </View>
                {corr.notes && <Text style={styles.corrNotes}>{corr.notes}</Text>}
              </Card>
            );
          })}
        </>
      )}

      {/* Meal Timing Intelligence */}
      {mealTimingStats.length > 0 && (
        <>
          <Text style={styles.heading}>Meal Timing</Text>
          <Card style={mealTimingStyles.card}>
            <View style={mealTimingStyles.cardHeader}>
              <Ionicons name="restaurant" size={16} color={Colors.primary} />
              <Text style={mealTimingStyles.cardTitle}>Post-Meal Glucose by Time</Text>
            </View>
            {mealTimingStats.map(stat => {
              const isBest = bestMealTimes.length > 0 && bestMealTimes[0].bucket === stat.bucket;
              const spikeColor =
                stat.avgSpike <= 2.5 ? Colors.inRange :
                stat.avgSpike <= 4   ? Colors.amber :
                Colors.outOfRange;
              return (
                <View key={stat.bucket} style={mealTimingStyles.row}>
                  <View style={mealTimingStyles.bucketLabel}>
                    <Text style={mealTimingStyles.bucketName}>{stat.bucket}</Text>
                    <Text style={mealTimingStyles.bucketCount}>{stat.count} meals</Text>
                  </View>
                  <View style={mealTimingStyles.bucketStats}>
                    <View style={mealTimingStyles.statCol}>
                      <Text style={[mealTimingStyles.statValue, { color: spikeColor }]}>
                        +{stat.avgSpike.toFixed(1)}
                      </Text>
                      <Text style={mealTimingStyles.statLabel}>avg spike</Text>
                    </View>
                    <View style={mealTimingStyles.statCol}>
                      <Text style={mealTimingStyles.statValue}>{stat.avgCarbs}g</Text>
                      <Text style={mealTimingStyles.statLabel}>avg carbs</Text>
                    </View>
                    <View style={mealTimingStyles.statCol}>
                      <Text style={[mealTimingStyles.statValue, {
                        color: stat.postMealTIR >= 70 ? Colors.inRange :
                               stat.postMealTIR >= 50 ? Colors.amber : Colors.outOfRange,
                      }]}>
                        {stat.postMealTIR}%
                      </Text>
                      <Text style={mealTimingStyles.statLabel}>post-TIR</Text>
                    </View>
                    <Text style={mealTimingStyles.bestBadge}>{isBest ? '✅' : '  '}</Text>
                  </View>
                </View>
              );
            })}
            {bestMealTimes.length > 0 && (
              <Text style={mealTimingStyles.footerNote}>
                ✅ Best meal time: {bestMealTimes[0].bucket} ({bestMealTimes[0].postMealTIR}% post-meal TIR)
              </Text>
            )}
          </Card>
        </>
      )}

      {/* Notification history */}
      {notifications.length > 0 && (
        <>
          <Text style={styles.heading}>Alert History</Text>
          <Card>
            {notifications.slice(0, 10).map((notif, index) => {
              const { icon, color } = getNotifIcon(notif.type);
              return (
                <View key={notif.id} style={[styles.notifItem, index > 0 && styles.notifBorder]}>
                  <Ionicons name={icon as any} size={16} color={color} />
                  <Text style={[styles.notifText, notif.read && styles.notifRead]} numberOfLines={2}>
                    {notif.message}
                  </Text>
                  <Text style={styles.notifTime}>
                    {new Date(notif.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              );
            })}
          </Card>
        </>
      )}
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
  heading: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCard: {
    width: '47%',
    alignItems: 'center',
    padding: 14,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statUnit: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 1,
  },
  insightCard: {
    borderColor: Colors.primary + '33',
    borderWidth: 1,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  insightText: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 14,
  },
  insightPlaceholder: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
    fontStyle: 'italic',
  },
  insightButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  insightButtonLoading: {
    opacity: 0.7,
  },
  insightButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  patternCard: {
    borderColor: Colors.amber + '33',
    borderWidth: 1,
  },
  patternText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  corrCard: {
    padding: 12,
  },
  corrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  corrMeal: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  corrCategory: {
    color: Colors.textMuted,
    fontSize: 11,
    backgroundColor: Colors.cardBorder,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  corrStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  corrStat: {
    alignItems: 'center',
  },
  corrStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  corrStatLabel: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  corrArrow: {
    flex: 1,
    alignItems: 'center',
  },
  corrArrowText: {
    fontSize: 14,
    fontWeight: '600',
  },
  corrNotes: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 6,
    fontStyle: 'italic',
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    gap: 8,
  },
  notifBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  notifText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  notifRead: {
    color: Colors.textMuted,
  },
  notifTime: {
    color: Colors.textMuted,
    fontSize: 10,
    marginTop: 1,
  },
});

const patternStyles = StyleSheet.create({
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 13,
    flex: 1,
  },
  card: {
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  severityLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  description: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 8,
  },
  recommendationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 8,
  },
  recommendation: {
    flex: 1,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
  },
});

const mealTimingStyles = StyleSheet.create({
  card: {
    borderColor: Colors.primary + '33',
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  bucketLabel: {
    width: 80,
  },
  bucketName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  bucketCount: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 1,
  },
  bucketStats: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: 1,
  },
  bestBadge: {
    fontSize: 14,
    width: 20,
    textAlign: 'center',
  },
  footerNote: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    fontSize: 11,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

const a1cStyles = StyleSheet.create({
  card: {
    borderColor: Colors.primary + '33',
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  cardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  trendArrow: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 0,
  },
  col: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  colBorder: {
    borderLeftWidth: 1,
    borderLeftColor: Colors.cardBorder,
  },
  value: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  period: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  sub: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  disclaimer: {
    fontSize: 10,
    color: Colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
});
