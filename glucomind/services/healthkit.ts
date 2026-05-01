/**
 * HealthKit Service — GlucoMind
 *
 * Reads glucose, heart rate, steps, and sleep data from Apple Health.
 * Dexcom/Libre CGM apps automatically write glucose to HealthKit,
 * so this gives us real CGM data without needing their API directly.
 */

import { Platform } from 'react-native';

// Lazy-load HealthKit — NitroModules crash Expo Go.
// The module is only available in native builds (EAS / TestFlight).
let _hkQueryQuantity: any = null;
let _hkQueryCategory: any = null;
let _hkRequestAuth: any = null;

function loadHealthKit() {
  if (_hkQueryQuantity !== null) return;
  if (Platform.OS !== 'ios') {
    _hkQueryQuantity = async () => [];
    _hkQueryCategory = async () => [];
    _hkRequestAuth = async () => false;
    return;
  }
  try {
    const hk = require('@kingstinct/react-native-healthkit');
    _hkQueryQuantity = hk.queryQuantitySamples;
    _hkQueryCategory = hk.queryCategorySamples;
    _hkRequestAuth = hk.requestAuthorization;
    _healthKitLoaded = true;
  } catch {
    // Expo Go — NitroModules not supported
    _hkQueryQuantity = async () => [];
    _hkQueryCategory = async () => [];
    _hkRequestAuth = async () => false;
    _healthKitLoaded = false;
  }
}

const queryQuantitySamples = (...args: any[]) => { loadHealthKit(); return _hkQueryQuantity(...args); };
const queryCategorySamples = (...args: any[]) => { loadHealthKit(); return _hkQueryCategory(...args); };
const requestAuthorization = (...args: any[]) => { loadHealthKit(); return _hkRequestAuth(...args); };

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HealthKitGlucoseReading {
  value: number;       // mmol/L
  timestamp: number;   // Unix ms
  source: string;
}

export interface HealthKitHeartRate {
  bpm: number;
  timestamp: number;
}

export interface HealthKitSteps {
  count: number;
  date: string;
}

export interface HealthKitSleep {
  totalMinutes: number;
  date: string;
}

// ─── HK Identifiers ──────────────────────────────────────────────────────────

const BLOOD_GLUCOSE = 'HKQuantityTypeIdentifierBloodGlucose' as any;
const HEART_RATE = 'HKQuantityTypeIdentifierHeartRate' as any;
const STEP_COUNT = 'HKQuantityTypeIdentifierStepCount' as any;
const SLEEP_ANALYSIS = 'HKCategoryTypeIdentifierSleepAnalysis' as any;

// ─── Availability ─────────────────────────────────────────────────────────────

// Whether HealthKit loaded successfully (set during lazy init)
let _healthKitLoaded = false;

export function isHealthKitAvailable(): boolean {
  if (Platform.OS !== 'ios') return false;
  loadHealthKit(); // Ensure module is loaded before checking
  return _healthKitLoaded;
}

// ─── Permissions ──────────────────────────────────────────────────────────────

export async function requestHealthKitPermissions(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  loadHealthKit(); // Ensure module is loaded
  if (!_healthKitLoaded) return false;

  try {
    const result = await requestAuthorization({
      read: [BLOOD_GLUCOSE, HEART_RATE, STEP_COUNT, SLEEP_ANALYSIS],
    });
    return !!result;
  } catch (error) {
    console.error('HealthKit permission error:', error);
    return false;
  }
}

// ─── Query helpers ────────────────────────────────────────────────────────────

function dateRange(hoursBack: number) {
  const now = new Date();
  return {
    startDate: new Date(now.getTime() - hoursBack * 60 * 60 * 1000),
    endDate: now,
  };
}

// ─── Glucose ──────────────────────────────────────────────────────────────────

export async function getHealthKitGlucose(
  hoursBack: number = 24
): Promise<HealthKitGlucoseReading[]> {
  if (!isHealthKitAvailable()) return [];

  try {
    const { startDate, endDate } = dateRange(hoursBack);

    const samples = await queryQuantitySamples(BLOOD_GLUCOSE, {
      limit: 0, // 0 = all
      ascending: true,
      unit: 'mg/dL',
      filter: { date: { startDate, endDate } },
    });

    return samples.map((sample: any) => ({
      value: Math.round((sample.quantity / 18.0182) * 10) / 10,
      timestamp: new Date(sample.startDate).getTime(),
      source: sample.sourceRevision?.source?.bundleIdentifier ?? 'healthkit',
    }));
  } catch (error) {
    console.error('HealthKit glucose fetch error:', error);
    return [];
  }
}

// ─── Heart Rate ───────────────────────────────────────────────────────────────

export async function getHealthKitHeartRate(
  hoursBack: number = 24
): Promise<HealthKitHeartRate[]> {
  if (!isHealthKitAvailable()) return [];

  try {
    const { startDate, endDate } = dateRange(hoursBack);

    const samples = await queryQuantitySamples(HEART_RATE, {
      limit: 0,
      ascending: true,
      unit: 'count/min',
      filter: { date: { startDate, endDate } },
    });

    return samples.map((sample: any) => ({
      bpm: Math.round(sample.quantity),
      timestamp: new Date(sample.startDate).getTime(),
    }));
  } catch (error) {
    console.error('HealthKit heart rate fetch error:', error);
    return [];
  }
}

// ─── Steps ────────────────────────────────────────────────────────────────────

export async function getHealthKitSteps(
  daysBack: number = 7
): Promise<HealthKitSteps[]> {
  if (!isHealthKitAvailable()) return [];

  try {
    const results: HealthKitSteps[] = [];
    const now = new Date();

    for (let i = 0; i < daysBack; i++) {
      const dayEnd = new Date(now);
      dayEnd.setDate(now.getDate() - i);
      dayEnd.setHours(23, 59, 59, 999);

      const dayStart = new Date(dayEnd);
      dayStart.setHours(0, 0, 0, 0);

      const samples = await queryQuantitySamples(STEP_COUNT, {
        limit: 0,
        ascending: true,
        unit: 'count',
        filter: { date: { startDate: dayStart, endDate: dayEnd } },
      });

      const totalSteps = (samples as any[]).reduce((sum: number, s: any) => sum + s.quantity, 0);
      results.push({ count: Math.round(totalSteps), date: dayStart.toISOString().split('T')[0] });
    }

    return results.reverse();
  } catch (error) {
    console.error('HealthKit steps fetch error:', error);
    return [];
  }
}

// ─── Sleep ────────────────────────────────────────────────────────────────────

export async function getHealthKitSleep(
  daysBack: number = 7
): Promise<HealthKitSleep[]> {
  if (!isHealthKitAvailable()) return [];

  try {
    const { startDate, endDate } = dateRange(daysBack * 24);

    const samples = await queryCategorySamples(SLEEP_ANALYSIS, {
      limit: 0,
      ascending: true,
      filter: { date: { startDate, endDate } },
    });

    const byDate: Record<string, number> = {};
    for (const sample of samples) {
      if (sample.value === 0) continue; // 0 = inBed, skip
      const start = new Date(sample.startDate).getTime();
      const end = new Date(sample.endDate).getTime();
      const mins = (end - start) / 60000;
      const dateStr = new Date(sample.startDate).toISOString().split('T')[0];
      byDate[dateStr] = (byDate[dateStr] || 0) + mins;
    }

    return Object.entries(byDate)
      .map(([date, totalMinutes]) => ({ date, totalMinutes: Math.round(totalMinutes) }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error('HealthKit sleep fetch error:', error);
    return [];
  }
}

// ─── Sync to SQLite ───────────────────────────────────────────────────────────

import { insertGlucoseReading, getLatestGlucoseReading } from './database';

/**
 * Sync glucose from HealthKit into local SQLite.
 * Only inserts readings newer than our latest stored reading.
 * Call periodically (every 5min) or on app foreground.
 */
export async function syncHealthKitGlucoseToDatabase(
  hoursBack: number = 24
): Promise<number> {
  const readings = await getHealthKitGlucose(hoursBack);
  if (readings.length === 0) return 0;

  const latest = await getLatestGlucoseReading();
  const cutoff = latest?.timestamp ?? 0;

  let inserted = 0;
  for (const r of readings) {
    if (r.timestamp > cutoff) {
      await insertGlucoseReading({
        value: r.value,
        trend: 'stable',
        timestamp: r.timestamp,
        source: `healthkit:${r.source}`,
      });
      inserted++;
    }
  }

  return inserted;
}

/**
 * Calculate trend from recent readings.
 */
export function calculateTrendFromReadings(
  readings: HealthKitGlucoseReading[]
): string {
  if (readings.length < 3) return 'stable';

  const recent = readings.slice(-3);
  const delta = recent[recent.length - 1].value - recent[0].value;
  const timeMins = (recent[recent.length - 1].timestamp - recent[0].timestamp) / 60000;

  if (timeMins === 0) return 'stable';
  const rate = delta / timeMins;

  if (rate > 0.15) return 'rising_fast';
  if (rate > 0.05) return 'rising';
  if (rate < -0.15) return 'falling_fast';
  if (rate < -0.05) return 'falling';
  return 'stable';
}

/**
 * Status message for UI display.
 */
export function getHealthKitStatusMessage(connected: boolean = false, lastSync?: number): string {
  if (!isHealthKitAvailable()) return 'HealthKit is only available on iOS.';
  if (!connected) return 'Not connected to Apple Health. Tap to connect.';
  if (lastSync) {
    const minsAgo = Math.round((Date.now() - lastSync) / 60000);
    return `Connected to Apple Health. Last sync: ${minsAgo}min ago.`;
  }
  return 'Connected to Apple Health.';
}
