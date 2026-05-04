/**
 * Data Sync Service — GlucoMind
 *
 * Handles pulling glucose data from all supported sources (Dexcom, Nightscout,
 * Tidepool) and storing it in SQLite. Supports foreground interval sync every
 * 5 minutes.
 */

import {
  getEGVs,
  getDevices,
  isConnected as dexcomIsConnected,
  setLastSyncTime,
  getLastSyncTime,
  mapDexcomTrend,
  DeviceRecord,
} from './dexcom';
import {
  fetchShareGlucose,
  isShareConnected,
  setShareLastSync,
} from './dexcom-share';
import {
  loadNightscoutCredentials,
  isNightscoutConnected,
  fetchGlucoseReadings as fetchNightscoutReadings,
  setNightscoutLastSync,
} from './nightscout';
import {
  loadTidepoolSession,
  isTidepoolConnected,
  fetchGlucoseReadings as fetchTidepoolReadings,
  setTidepoolLastSync,
} from './tidepool';
import { syncHealthKitGlucoseToDatabase, isHealthKitAvailable } from './healthkit';
import {
  insertGlucoseReading,
  getGlucoseReadings,
  getAllSettings,
  getSetting,
  getMealsInRange,
  getInsulinDosesInRange,
} from './database';
import {
  sendSpikeAlert, sendHighAlert, sendLowAlert,
  sendSpikePrompt, sendHighWithPrompt, sendLowWithPrompt,
} from './notifications';
import { predictHypo } from './hypo-prediction';
import { GlucoseReading } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DataSource = 'dexcom' | 'dexcom-share' | 'nightscout' | 'tidepool' | 'simulated';

export interface SyncResult {
  inserted: number;
  skipped: number;
  total: number;
  lastReading: GlucoseReading | null;
  deviceInfo: DeviceRecord | null;
  error?: string;
}

// ─── Dexcom Sync ──────────────────────────────────────────────────────────────

/**
 * Pull EGVs from Dexcom and merge into SQLite.
 * Deduplicates by timestamp — won't insert if a reading at that ms already exists.
 */
export async function syncDexcomData(
  options: { hours?: number } = {}
): Promise<SyncResult> {
  const hours = options.hours ?? 24;

  const result: SyncResult = {
    inserted: 0,
    skipped: 0,
    total: 0,
    lastReading: null,
    deviceInfo: null,
  };

  try {
    // Get device info
    try {
      const devicesResp = await getDevices();
      result.deviceInfo = devicesResp.devices?.[0] ?? null;
    } catch {
      // Device info is non-critical
    }

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - hours * 60 * 60 * 1000);

    const egvsResp = await getEGVs(startDate, endDate);
    const egvs = egvsResp.egvs ?? [];
    result.total = egvs.length;

    if (egvs.length === 0) {
      await setLastSyncTime(Date.now());
      return result;
    }

    // Load existing timestamps so we don't duplicate
    const sinceTs = startDate.getTime();
    const existing = await getGlucoseReadings(500, sinceTs);
    const existingTimestamps = new Set(existing.map((r) => r.timestamp));

    for (const egv of egvs) {
      const ts = new Date(egv.systemTime).getTime();

      if (existingTimestamps.has(ts)) {
        result.skipped++;
        continue;
      }

      const reading: Omit<GlucoseReading, 'id'> = {
        value: egv.mmol,
        trend: mapDexcomTrend(egv.trend),
        timestamp: ts,
        source: 'dexcom',
      };

      const id = await insertGlucoseReading(reading);
      result.inserted++;

      if (!result.lastReading || ts > result.lastReading.timestamp) {
        result.lastReading = { ...reading, id };
      }
    }

    // Update last sync time
    await setLastSyncTime(Date.now());

    // Check alert conditions on latest reading
    if (result.lastReading) {
      await checkAlerts(result.lastReading);
    }
  } catch (err: any) {
    result.error = err?.message ?? 'Unknown sync error';
    console.error('[DexcomSync] Error:', err);
  }

  return result;
}

// ─── Nightscout Sync ──────────────────────────────────────────────────────────

/**
 * Pull glucose readings from Nightscout and merge into SQLite.
 */
export async function syncNightscoutData(
  options: { hours?: number } = {}
): Promise<SyncResult> {
  const hours = options.hours ?? 24;
  const minutes = hours * 60;

  const result: SyncResult = {
    inserted: 0,
    skipped: 0,
    total: 0,
    lastReading: null,
    deviceInfo: null,
  };

  try {
    const { url, token } = await loadNightscoutCredentials();
    if (!url) {
      result.error = 'Nightscout URL not configured';
      return result;
    }

    const readings = await fetchNightscoutReadings(url, token, minutes, 500);
    result.total = readings.length;

    if (readings.length === 0) {
      await setNightscoutLastSync(Date.now());
      return result;
    }

    // Load existing timestamps for deduplication
    const sinceTs = Date.now() - hours * 60 * 60 * 1000;
    const existing = await getGlucoseReadings(500, sinceTs);
    const existingTimestamps = new Set(existing.map((r) => r.timestamp));

    for (const ns of readings) {
      if (existingTimestamps.has(ns.timestamp)) {
        result.skipped++;
        continue;
      }

      const reading: Omit<GlucoseReading, 'id'> = {
        value: ns.value,
        trend: ns.trend,
        timestamp: ns.timestamp,
        source: 'nightscout',
      };

      const id = await insertGlucoseReading(reading);
      result.inserted++;

      if (!result.lastReading || ns.timestamp > result.lastReading.timestamp) {
        result.lastReading = { ...reading, id };
      }
    }

    await setNightscoutLastSync(Date.now());

    if (result.lastReading) {
      await checkAlerts(result.lastReading);
    }
  } catch (err: any) {
    result.error = err?.message ?? 'Unknown Nightscout sync error';
    console.error('[NightscoutSync] Error:', err);
  }

  return result;
}

// ─── Tidepool Sync ────────────────────────────────────────────────────────────

/**
 * Pull glucose readings from Tidepool and merge into SQLite.
 */
export async function syncTidepoolData(
  options: { hours?: number } = {}
): Promise<SyncResult> {
  const hours = options.hours ?? 24;

  const result: SyncResult = {
    inserted: 0,
    skipped: 0,
    total: 0,
    lastReading: null,
    deviceInfo: null,
  };

  try {
    const session = await loadTidepoolSession();
    if (!session) {
      result.error = 'Tidepool session not available — please reconnect';
      return result;
    }

    const readings = await fetchTidepoolReadings(
      session.sessionToken,
      session.userId,
      hours
    );
    result.total = readings.length;

    if (readings.length === 0) {
      await setTidepoolLastSync(Date.now());
      return result;
    }

    // Load existing timestamps for deduplication
    const sinceTs = Date.now() - hours * 60 * 60 * 1000;
    const existing = await getGlucoseReadings(500, sinceTs);
    const existingTimestamps = new Set(existing.map((r) => r.timestamp));

    for (const tp of readings) {
      if (existingTimestamps.has(tp.timestamp)) {
        result.skipped++;
        continue;
      }

      const reading: Omit<GlucoseReading, 'id'> = {
        value: tp.value,
        trend: tp.trend,
        timestamp: tp.timestamp,
        source: 'tidepool',
      };

      const id = await insertGlucoseReading(reading);
      result.inserted++;

      if (!result.lastReading || tp.timestamp > result.lastReading.timestamp) {
        result.lastReading = { ...reading, id };
      }
    }

    await setTidepoolLastSync(Date.now());

    if (result.lastReading) {
      await checkAlerts(result.lastReading);
    }
  } catch (err: any) {
    result.error = err?.message ?? 'Unknown Tidepool sync error';
    console.error('[TidepoolSync] Error:', err);
  }

  return result;
}

// ─── Dexcom Share Sync ────────────────────────────────────────────────────────

/**
 * Pull glucose readings from Dexcom Share API and merge into SQLite.
 * Uses stored credentials from SecureStore.
 */
export async function syncDexcomShareData(
  options: { hours?: number } = {}
): Promise<SyncResult> {
  const hours = options.hours ?? 24;
  const minutes = hours * 60;

  const result: SyncResult = {
    inserted: 0,
    skipped: 0,
    total: 0,
    lastReading: null,
    deviceInfo: null,
  };

  try {
    const readings = await fetchShareGlucose(
      undefined, // use stored credentials
      undefined,
      minutes,
      Math.min(Math.ceil(hours * 12), 288), // 12 readings per hour, max 288
    );
    result.total = readings.length;

    if (readings.length === 0) {
      await setShareLastSync(Date.now());
      return result;
    }

    // Load existing timestamps for deduplication
    const sinceTs = Date.now() - hours * 60 * 60 * 1000;
    const existing = await getGlucoseReadings(500, sinceTs);
    const existingTimestamps = new Set(existing.map((r) => r.timestamp));

    for (const sr of readings) {
      if (existingTimestamps.has(sr.timestamp)) {
        result.skipped++;
        continue;
      }

      // Map extended Share trends to our 5 supported values
      const trendMap: Record<string, GlucoseReading['trend']> = {
        'rising_fast': 'rising_fast',
        'rising': 'rising',
        'rising_slight': 'rising',
        'stable': 'stable',
        'falling_slight': 'falling',
        'falling': 'falling',
        'falling_fast': 'falling_fast',
        'none': 'stable',
        'not_computable': 'stable',
        'out_of_range': 'stable',
        'unknown': 'stable',
      };

      const reading: Omit<GlucoseReading, 'id'> = {
        value: sr.mmol,
        trend: trendMap[sr.trend] ?? 'stable',
        timestamp: sr.timestamp,
        source: 'dexcom-share',
      };

      const id = await insertGlucoseReading(reading);
      result.inserted++;

      if (!result.lastReading || sr.timestamp > result.lastReading.timestamp) {
        result.lastReading = { ...reading, id };
      }
    }

    await setShareLastSync(Date.now());

    if (result.lastReading) {
      await checkAlerts(result.lastReading);
    }
  } catch (err: any) {
    result.error = err?.message ?? 'Unknown Dexcom Share sync error';
    console.error('[DexcomShareSync] Error:', err);
  }

  return result;
}

// ─── Unified Sync ─────────────────────────────────────────────────────────────

/**
 * Detect which data source is active and run the appropriate sync.
 */
async function getActiveDataSource(): Promise<DataSource> {
  try {
    const source = await getSetting('data_source', 'simulated');
    if (['dexcom', 'dexcom-share', 'nightscout', 'tidepool', 'simulated'].includes(source)) {
      return source as DataSource;
    }
  } catch {
    // Fall through
  }
  return 'simulated';
}

/**
 * Sync data from the active data source.
 */
async function syncActiveSource(hours: number): Promise<SyncResult> {
  const source = await getActiveDataSource();

  console.log(`[Sync] Active data source: ${source}, syncing last ${hours}h`);

  switch (source) {
    case 'dexcom':
      return syncDexcomData({ hours });
    case 'dexcom-share':
      return syncDexcomShareData({ hours });
    case 'nightscout':
      return syncNightscoutData({ hours });
    case 'tidepool':
      return syncTidepoolData({ hours });
    case 'simulated':
    default:
      // No remote sync for simulated data
      return {
        inserted: 0,
        skipped: 0,
        total: 0,
        lastReading: null,
        deviceInfo: null,
      };
  }
}

/**
 * Initial sync when user first connects — pulls 24h of history.
 */
export async function initialSync(): Promise<SyncResult> {
  // Sync HealthKit data first (if available)
  try {
    if (isHealthKitAvailable()) {
      const hkInserted = await syncHealthKitGlucoseToDatabase(24);
      if (hkInserted > 0) {
        console.log(`HealthKit sync: inserted ${hkInserted} readings`);
      }
    }
  } catch (e) {
    console.error('HealthKit sync error:', e);
  }
  // Then sync from the active data source
  return syncActiveSource(24);
}

/**
 * Periodic sync for foreground interval (pulls last 30 min to catch new readings).
 */
export async function periodicSync(): Promise<SyncResult> {
  return syncActiveSource(0.5); // 30 minutes window
}

// ─── Alert Checking ──────────────────────────────────────────────────────────

let _lastHighAlert = 0;
let _lastLowAlert = 0;
let _lastSpikeAlert = 0;
let _lastValue: number | null = null;

async function checkAlerts(reading: GlucoseReading): Promise<void> {
  const now = Date.now();

  try {
    const settings = await getAllSettings();
    const thirtyMinsAgo = now - 30 * 60 * 1000;
    const twoHoursAgo = now - 2 * 60 * 60 * 1000;

    // Check for recent meals and insulin (for contextual prompts)
    const recentMeals = await getMealsInRange(twoHoursAgo, now);
    const recentInsulin = await getInsulinDosesInRange(twoHoursAgo, now);
    const hasRecentMeal = recentMeals.length > 0;
    const hasRecentInsulin = recentInsulin.length > 0;

    // ── HYPO PREDICTION ───────────────────────────────────────────────
    // Predict low BEFORE it happens
    try {
      const prediction = await predictHypo();
      if (prediction.predicted && prediction.severity !== 'none') {
        if (now - _lastLowAlert > 15 * 60 * 1000) {
          await sendLowWithPrompt(reading.value);
          _lastLowAlert = now;
        }
      }
    } catch {}

    // ── LOW GLUCOSE (already low) ──────────────────────────────────────
    // Critical: prompt to eat fast carbs
    if (reading.value < settings.target_low && settings.notify_low) {
      if (now - _lastLowAlert > 15 * 60 * 1000) {
        await sendLowWithPrompt(reading.value);
        _lastLowAlert = now;
      }
    }

    // ── HIGH GLUCOSE ─────────────────────────────────────────────────
    // Smart: check if they've already taken insulin
    if (reading.value > settings.target_high && settings.notify_high) {
      if (now - _lastHighAlert > 30 * 60 * 1000) {
        await sendHighWithPrompt(reading.value, hasRecentInsulin);
        _lastHighAlert = now;
      }
    }

    // ── RAPID RISE / SPIKE ───────────────────────────────────────────
    // Smart: ask if they've eaten (likely cause of the spike)
    if (_lastValue !== null && settings.notify_spike) {
      const rise = reading.value - _lastValue;
      if (rise > 1.0 && now - _lastSpikeAlert > 30 * 60 * 1000) {
        if (!hasRecentMeal) {
          // No meal logged — prompt them to log what they ate
          await sendSpikePrompt(reading.value, rise);
        } else {
          // Meal logged — just a standard spike alert
          await sendSpikeAlert(reading.value);
        }
        _lastSpikeAlert = now;
      }
    }

    // ── RAPID DROP ────────────────────────────────────────────────────
    // Ask if they've taken insulin (likely cause of the drop)
    if (_lastValue !== null) {
      const drop = _lastValue - reading.value;
      if (drop > 1.5 && reading.value > settings.target_low) {
        // Dropping fast but not yet low — informational
        if (!hasRecentInsulin && now - _lastLowAlert > 30 * 60 * 1000) {
          // Unusual fast drop without logged insulin — could be exercise, delayed insulin, etc.
          // Don't alert yet, just track. Will trigger low alert if it keeps dropping.
        }
      }
    }

    _lastValue = reading.value;
  } catch (err) {
    console.error('[Sync] Alert check error:', err);
  }
}

// ─── Foreground Interval Manager ─────────────────────────────────────────────

let _syncInterval: ReturnType<typeof setInterval> | null = null;
const SYNC_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes — tighter sync for real-time feel

/**
 * Start background-style periodic sync using a foreground interval.
 * Call this when app mounts and a data source is connected.
 */
export function startSyncInterval(
  onSync?: (result: SyncResult) => void
): void {
  if (_syncInterval) return; // Already running

  _syncInterval = setInterval(async () => {
    const source = await getActiveDataSource();
    if (source === 'simulated') {
      stopSyncInterval();
      return;
    }

    const result = await periodicSync();
    onSync?.(result);
  }, SYNC_INTERVAL_MS);
}

/**
 * Stop the sync interval.
 */
export function stopSyncInterval(): void {
  if (_syncInterval) {
    clearInterval(_syncInterval);
    _syncInterval = null;
  }
}

/**
 * Returns true if the sync interval is currently running.
 */
export function isSyncRunning(): boolean {
  return _syncInterval !== null;
}
