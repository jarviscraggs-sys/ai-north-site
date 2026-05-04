/**
 * Background Sync Service — GlucoMind
 *
 * Registers a background fetch task that pulls Dexcom Share data
 * and fires smart notifications even when the app is closed.
 *
 * iOS wakes the app roughly every 15-30 minutes (system-controlled).
 * Each wake: pull latest glucose → check alerts → send notifications.
 */

import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { isShareConnected, fetchShareGlucose, setShareLastSync } from './dexcom-share';
import {
  insertGlucoseReading,
  getGlucoseReadings,
  getAllSettings,
  getSetting,
  getMealsInRange,
  getInsulinDosesInRange,
} from './database';
import {
  sendSpikePrompt, sendHighWithPrompt, sendLowWithPrompt,
  sendSpikeAlert,
} from './notifications';
import type { GlucoseReading } from '../types';

const BACKGROUND_SYNC_TASK = 'GLUCOMIND_BACKGROUND_SYNC';

// ─── Background alert state (persisted in memory per app lifecycle) ──────────
let _bgLastValue: number | null = null;
let _bgLastHighAlert = 0;
let _bgLastLowAlert = 0;
let _bgLastSpikeAlert = 0;

// ─── The background task ─────────────────────────────────────────────────────

TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    const source = await getSetting('data_source', 'simulated');
    if (source !== 'dexcom-share') {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const connected = await isShareConnected();
    if (!connected) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Pull last 30 minutes of data
    const readings = await fetchShareGlucose(undefined, undefined, 30, 6);
    if (readings.length === 0) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Deduplicate and insert
    const sinceTs = Date.now() - 30 * 60 * 1000;
    const existing = await getGlucoseReadings(100, sinceTs);
    const existingTimestamps = new Set(existing.map(r => r.timestamp));

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

    let latestReading: GlucoseReading | null = null;
    let inserted = 0;

    for (const sr of readings) {
      if (existingTimestamps.has(sr.timestamp)) continue;

      const reading: Omit<GlucoseReading, 'id'> = {
        value: sr.mmol,
        trend: trendMap[sr.trend] ?? 'stable',
        timestamp: sr.timestamp,
        source: 'dexcom-share',
      };

      const id = await insertGlucoseReading(reading);
      inserted++;

      if (!latestReading || sr.timestamp > latestReading.timestamp) {
        latestReading = { ...reading, id };
      }
    }

    // Run smart alert checks on the latest reading
    if (latestReading) {
      await backgroundCheckAlerts(latestReading);
    }

    await setShareLastSync(Date.now());

    return inserted > 0
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;

  } catch (err) {
    console.error('[BackgroundSync] Error:', err);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// ─── Alert checking (same logic as foreground but self-contained) ────────────

async function backgroundCheckAlerts(reading: GlucoseReading): Promise<void> {
  const now = Date.now();

  try {
    const settings = await getAllSettings();
    const twoHoursAgo = now - 2 * 60 * 60 * 1000;

    const recentMeals = await getMealsInRange(twoHoursAgo, now);
    const recentInsulin = await getInsulinDosesInRange(twoHoursAgo, now);
    const hasRecentMeal = recentMeals.length > 0;
    const hasRecentInsulin = recentInsulin.length > 0;

    // LOW — prompt to eat fast carbs
    if (reading.value < settings.target_low && settings.notify_low) {
      if (now - _bgLastLowAlert > 15 * 60 * 1000) {
        await sendLowWithPrompt(reading.value);
        _bgLastLowAlert = now;
      }
    }

    // HIGH — check if insulin already taken
    if (reading.value > settings.target_high && settings.notify_high) {
      if (now - _bgLastHighAlert > 30 * 60 * 1000) {
        await sendHighWithPrompt(reading.value, hasRecentInsulin);
        _bgLastHighAlert = now;
      }
    }

    // SPIKE — ask if they've eaten
    if (_bgLastValue !== null && settings.notify_spike) {
      const rise = reading.value - _bgLastValue;
      if (rise > 1.0 && now - _bgLastSpikeAlert > 30 * 60 * 1000) {
        if (!hasRecentMeal) {
          await sendSpikePrompt(reading.value, rise);
        } else {
          await sendSpikeAlert(reading.value);
        }
        _bgLastSpikeAlert = now;
      }
    }

    _bgLastValue = reading.value;
  } catch (err) {
    console.error('[BackgroundSync] Alert check error:', err);
  }
}

// ─── Registration ────────────────────────────────────────────────────────────

/**
 * Register the background sync task. Call once on app startup.
 * iOS controls the actual wake interval (~15-30 min minimum).
 */
export async function registerBackgroundSync(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    if (isRegistered) {
      console.log('[BackgroundSync] Already registered');
      return;
    }

    await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 15 * 60, // 15 minutes (iOS minimum)
      stopOnTerminate: false,
      startOnBoot: true,
    });

    console.log('[BackgroundSync] Registered successfully');
  } catch (err) {
    console.error('[BackgroundSync] Registration failed:', err);
  }
}

/**
 * Unregister background sync (e.g. when user disconnects data source).
 */
export async function unregisterBackgroundSync(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
      console.log('[BackgroundSync] Unregistered');
    }
  } catch (err) {
    console.error('[BackgroundSync] Unregister failed:', err);
  }
}

/**
 * Check current background fetch status.
 */
export async function getBackgroundSyncStatus(): Promise<string> {
  const status = await BackgroundFetch.getStatusAsync();
  switch (status) {
    case BackgroundFetch.BackgroundFetchStatus.Available:
      return 'available';
    case BackgroundFetch.BackgroundFetchStatus.Restricted:
      return 'restricted';
    case BackgroundFetch.BackgroundFetchStatus.Denied:
      return 'denied';
    default:
      return 'unknown';
  }
}
