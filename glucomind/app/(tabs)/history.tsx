import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity, RefreshControl, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { GlucoseReading, Meal, InsulinDose } from '../../types';
import {
  getGlucoseReadingsInRange, getMealsInRange, getInsulinDosesInRange, getAllSettings,
  deleteMeal, deleteInsulinDose,
} from '../../services/database';
import GlucoseGraph from '../../components/GlucoseGraph';
import Card from '../../components/Card';

type DayOffset = 0 | 1 | 2;

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function getCategoryColor(category: string): string {
  switch (category) {
    case 'Breakfast': return '#FFC107';
    case 'Lunch': return '#00BFA5';
    case 'Dinner': return '#7C6FFF';
    case 'Snack': return '#FF8C69';
    default: return Colors.textSecondary;
  }
}

export default function History() {
  const [dayOffset, setDayOffset] = useState<DayOffset>(0);
  const [readings, setReadings] = useState<GlucoseReading[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [insulinDoses, setInsulinDoses] = useState<InsulinDose[]>([]);
  const [avgGlucose, setAvgGlucose] = useState(0);
  const [timeInRange, setTimeInRange] = useState(0);
  const [targetLow, setTargetLow] = useState(4);
  const [targetHigh, setTargetHigh] = useState(10);
  const [refreshing, setRefreshing] = useState(false);

  const loadDay = useCallback(async (offset: DayOffset) => {
    try {
      const settings = await getAllSettings();
      setTargetLow(settings.target_low);
      setTargetHigh(settings.target_high);

      const now = new Date();
      const dayStart = new Date(now);
      dayStart.setDate(dayStart.getDate() - offset);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const [dayReadings, dayMeals, dayInsulin] = await Promise.all([
        getGlucoseReadingsInRange(dayStart.getTime(), dayEnd.getTime()),
        getMealsInRange(dayStart.getTime(), dayEnd.getTime()),
        getInsulinDosesInRange(dayStart.getTime(), dayEnd.getTime()),
      ]);

      setReadings(dayReadings);
      setMeals(dayMeals);
      setInsulinDoses(dayInsulin);

      if (dayReadings.length > 0) {
        const avg = dayReadings.reduce((s, r) => s + r.value, 0) / dayReadings.length;
        setAvgGlucose(avg);
        const inRange = dayReadings.filter(
          r => r.value >= settings.target_low && r.value <= settings.target_high
        ).length;
        setTimeInRange(Math.round((inRange / dayReadings.length) * 100));
      } else {
        setAvgGlucose(0);
        setTimeInRange(0);
      }
    } catch (e) {
      console.error('History load error:', e);
    }
  }, []);

  useEffect(() => {
    loadDay(dayOffset);
  }, [dayOffset, loadDay]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDay(dayOffset);
    setRefreshing(false);
  };

  const getDayLabel = (offset: DayOffset) => {
    if (offset === 0) return 'Today';
    if (offset === 1) return 'Yesterday';
    const d = new Date();
    d.setDate(d.getDate() - offset);
    return formatDate(d.getTime());
  };

  const getTimeInRangeColor = () => {
    if (timeInRange >= 70) return Colors.inRange;
    if (timeInRange >= 50) return Colors.borderline;
    return Colors.outOfRange;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
      }
    >
      {/* Day selector */}
      <View style={styles.daySelector}>
        {([2, 1, 0] as DayOffset[]).map(offset => (
          <TouchableOpacity
            key={offset}
            style={[styles.dayButton, dayOffset === offset && styles.dayButtonActive]}
            onPress={() => setDayOffset(offset)}
          >
            <Text style={[styles.dayButtonText, dayOffset === offset && styles.dayButtonTextActive]}>
              {getDayLabel(offset)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Daily stats */}
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{avgGlucose > 0 ? avgGlucose.toFixed(1) : '--'}</Text>
          <Text style={styles.statLabel}>Avg mmol/L</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: getTimeInRangeColor() }]}>
            {timeInRange > 0 ? `${timeInRange}%` : '--'}
          </Text>
          <Text style={styles.statLabel}>In Range</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{readings.length}</Text>
          <Text style={styles.statLabel}>Readings</Text>
        </Card>
      </View>

      {/* Full day graph */}
      <Card>
        <Text style={styles.sectionTitle}>Glucose Trend</Text>
        <View style={{ marginTop: 8 }}>
          <GlucoseGraph readings={readings} height={160} showLabels targetLow={targetLow} targetHigh={targetHigh} />
        </View>
      </Card>

      {/* Meals */}
      {meals.length > 0 && (
        <Card>
          <Text style={styles.sectionTitle}>Meals</Text>
          <Text style={{ color: Colors.textMuted, fontSize: 11, marginBottom: 8 }}>Long-press to delete</Text>
          {meals.map(meal => (
            <TouchableOpacity
              key={meal.id}
              style={styles.logItem}
              onLongPress={() => {
                Alert.alert(
                  'Delete Meal',
                  `Delete "${meal.description}"?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: async () => {
                        await deleteMeal(meal.id);
                        loadDay(dayOffset);
                      },
                    },
                  ]
                );
              }}
            >
              <View style={[styles.logDot, { backgroundColor: getCategoryColor(meal.category) }]} />
              <View style={styles.logContent}>
                <Text style={styles.logTitle}>{meal.description}</Text>
                <Text style={styles.logSub}>
                  {meal.category} · {meal.carbs_estimate}g carbs
                  {meal.calories ? ` · ${Math.round(meal.calories)} kcal` : ''}
                  {meal.gi_rating ? ` · ${meal.gi_rating.toUpperCase()} GI` : ''}
                </Text>
              </View>
              <Text style={styles.logTime}>{formatTime(meal.timestamp)}</Text>
            </TouchableOpacity>
          ))}
        </Card>
      )}

      {/* Insulin */}
      {insulinDoses.length > 0 && (
        <Card>
          <Text style={styles.sectionTitle}>Insulin</Text>
          <Text style={{ color: Colors.textMuted, fontSize: 11, marginBottom: 8 }}>Long-press to delete</Text>
          {insulinDoses.map(dose => (
            <TouchableOpacity
              key={dose.id}
              style={styles.logItem}
              onLongPress={() => {
                Alert.alert(
                  'Delete Insulin Log',
                  `Delete ${dose.units} units ${dose.type}?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: async () => {
                        await deleteInsulinDose(dose.id);
                        loadDay(dayOffset);
                      },
                    },
                  ]
                );
              }}
            >
              <View style={[styles.logDot, { backgroundColor: Colors.amber }]} />
              <View style={styles.logContent}>
                <Text style={styles.logTitle}>{dose.units} units {dose.type === 'rapid' ? 'Rapid-acting' : 'Long-acting'}</Text>
                <Text style={styles.logSub}>{dose.type === 'rapid' ? 'Bolus' : 'Basal'}</Text>
              </View>
              <Text style={styles.logTime}>{formatTime(dose.timestamp)}</Text>
            </TouchableOpacity>
          ))}
        </Card>
      )}

      {readings.length === 0 && (
        <Card>
          <View style={styles.emptyState}>
            <Ionicons name="bar-chart-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No data for this day yet</Text>
          </View>
        </Card>
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
  daySelector: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  dayButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  dayButtonActive: {
    backgroundColor: Colors.primary,
  },
  dayButtonText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  dayButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
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
  },
  sectionTitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    gap: 10,
  },
  logDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  logContent: {
    flex: 1,
  },
  logTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  logSub: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  logTime: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  emptyState: {
    alignItems: 'center',
    gap: 12,
    padding: 20,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
});
