/**
 * Push Token Registration — GlucoMind
 *
 * Gets the Expo push token and registers it with the GlucoMind push server
 * so we receive real APNs notifications for glucose alerts.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { getSetting, setSetting } from './database';

// The push server URL — set this to your Railway deployment
const PUSH_SERVER_URL_KEY = 'push_server_url';
const DEFAULT_PUSH_SERVER_URL = 'https://push-server-production-7832.up.railway.app';

/**
 * Get the Expo push token for this device.
 */
async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[Push] Not a physical device — skipping push token');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Push] Notification permissions not granted');
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'glucomind', // EAS project slug
    });
    return tokenData.data;
  } catch (err) {
    console.error('[Push] Failed to get Expo push token:', err);
    return null;
  }
}

/**
 * Register this device's push token with the GlucoMind push server.
 * Call once on app startup after data source is connected.
 */
export async function registerPushToken(): Promise<boolean> {
  try {
    const token = await getExpoPushToken();
    if (!token) return false;

    const serverUrl = await getSetting(PUSH_SERVER_URL_KEY, DEFAULT_PUSH_SERVER_URL);
    const userName = await getSetting('user_name', 'user');

    const resp = await fetch(`${serverUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pushToken: token,
        userId: userName,
      }),
    });

    if (!resp.ok) {
      console.error('[Push] Registration failed:', resp.status);
      return false;
    }

    await setSetting('push_token_registered', 'true');
    await setSetting('push_token', token);
    console.log('[Push] Token registered with push server');
    return true;
  } catch (err) {
    console.error('[Push] Registration error:', err);
    return false;
  }
}

/**
 * Unregister this device's push token from the push server.
 */
export async function unregisterPushToken(): Promise<void> {
  try {
    const token = await getSetting('push_token', '');
    if (!token) return;

    const serverUrl = await getSetting(PUSH_SERVER_URL_KEY, DEFAULT_PUSH_SERVER_URL);

    await fetch(`${serverUrl}/unregister`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pushToken: token }),
    });

    await setSetting('push_token_registered', 'false');
    console.log('[Push] Token unregistered from push server');
  } catch (err) {
    console.error('[Push] Unregister error:', err);
  }
}
