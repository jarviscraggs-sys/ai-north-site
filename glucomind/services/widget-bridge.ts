/**
 * Widget Bridge — GlucoMind
 *
 * Pushes latest glucose data to iOS App Group shared UserDefaults
 * so the home screen widget can display it.
 *
 * Called after every sync to keep the widget up to date.
 */

import { Platform } from 'react-native';
import { getSetting } from './database';

const APP_GROUP = 'group.com.glucomind.app.widget';

let SharedPreferences: any = null;

function loadBridge() {
  if (SharedPreferences !== null) return;
  if (Platform.OS !== 'ios') {
    SharedPreferences = { setItem: async () => {} };
    return;
  }
  try {
    SharedPreferences = require('react-native-shared-group-preferences').default;
  } catch {
    SharedPreferences = { setItem: async () => {} };
  }
}

/**
 * Push latest glucose reading to the widget via shared UserDefaults.
 */
export async function updateWidget(glucose: {
  value: number;
  trend: string;
  timestamp: number;
  source: string;
}): Promise<void> {
  if (Platform.OS !== 'ios') return;

  // Respect user preference — don't push data if widget is disabled
  try {
    const widgetEnabled = await getSetting('widget_enabled', 'true');
    if (widgetEnabled === 'false') return;
  } catch {
    // If we can't read setting, default to pushing (widget on)
  }

  loadBridge();

  try {
    await SharedPreferences.setItem(
      'glucoseData',
      {
        glucose_value: glucose.value,
        glucose_trend: glucose.trend,
        glucose_timestamp: glucose.timestamp,
        glucose_source: glucose.source,
      },
      APP_GROUP
    );
  } catch (e) {
    // Widget bridge is non-critical — don't crash the app
    console.warn('[WidgetBridge] Failed to update widget:', e);
  }
}

/**
 * Clear widget data (e.g. when user disconnects data source).
 */
export async function clearWidget(): Promise<void> {
  if (Platform.OS !== 'ios') return;

  loadBridge();

  try {
    await SharedPreferences.setItem(
      'glucoseData',
      {
        glucose_value: 0,
        glucose_trend: 'stable',
        glucose_timestamp: 0,
        glucose_source: 'none',
      },
      APP_GROUP
    );
  } catch (e) {
    console.warn('[WidgetBridge] Failed to clear widget:', e);
  }
}
