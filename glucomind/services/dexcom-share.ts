/**
 * Dexcom Share API — GlucoMind
 *
 * Pulls real glucose data using Dexcom Share (same as Nightscout/Sugarmate).
 * Works with personal Dexcom credentials — no developer API approval needed.
 *
 * Supports both US and non-US (EU/UK) Dexcom accounts.
 */

import * as SecureStore from 'expo-secure-store';

const BASE_URL_US = 'https://share2.dexcom.com/ShareWebServices/Services';
const BASE_URL_OUS = 'https://shareous1.dexcom.com/ShareWebServices/Services'; // Outside US (EU/UK)
const APP_ID = 'd89443d2-327c-4a6f-89e5-496bbb0317db'; // Dexcom Share app ID (public, used by all clients)

const STORE_USERNAME = 'dexcom_share_username';
const STORE_PASSWORD = 'dexcom_share_password';
const STORE_LAST_SYNC = 'dexcom_share_last_sync';

export interface ShareGlucoseReading {
  value: number;     // mg/dL from Dexcom
  mmol: number;      // converted to mmol/L
  trend: string;     // trend direction
  timestamp: number; // Unix ms
}

// Trend string to our internal trend mapping
const TREND_MAP: Record<number, string> = {
  0: 'none',
  1: 'rising_fast',
  2: 'rising',
  3: 'rising_slight',
  4: 'stable',
  5: 'falling_slight',
  6: 'falling',
  7: 'falling_fast',
  8: 'not_computable',
  9: 'out_of_range',
};

// Also handle string trend names from Dexcom (e.g. "Flat", "SingleDown")
const TREND_STRING_MAP: Record<string, string> = {
  'None': 'none',
  'DoubleUp': 'rising_fast',
  'SingleUp': 'rising',
  'FortyFiveUp': 'rising_slight',
  'Flat': 'stable',
  'FortyFiveDown': 'falling_slight',
  'SingleDown': 'falling',
  'DoubleDown': 'falling_fast',
  'NotComputable': 'not_computable',
  'RateOutOfRange': 'out_of_range',
};

// ─── Credential Storage ───────────────────────────────────────────────────────

/**
 * Save Dexcom Share credentials to secure storage.
 */
export async function saveShareCredentials(
  username: string,
  password: string,
): Promise<void> {
  await SecureStore.setItemAsync(STORE_USERNAME, username);
  await SecureStore.setItemAsync(STORE_PASSWORD, password);
}

/**
 * Load Dexcom Share credentials from secure storage.
 */
export async function loadShareCredentials(): Promise<{
  username: string | null;
  password: string | null;
}> {
  const username = await SecureStore.getItemAsync(STORE_USERNAME);
  const password = await SecureStore.getItemAsync(STORE_PASSWORD);
  return { username, password };
}

/**
 * Clear stored Dexcom Share credentials.
 */
export async function clearShareCredentials(): Promise<void> {
  await SecureStore.deleteItemAsync(STORE_USERNAME);
  await SecureStore.deleteItemAsync(STORE_PASSWORD);
  await SecureStore.deleteItemAsync(STORE_LAST_SYNC);
}

/**
 * Check if Dexcom Share credentials are stored.
 */
export async function isShareConnected(): Promise<boolean> {
  const { username, password } = await loadShareCredentials();
  return !!(username && password);
}

/**
 * Get the last sync timestamp.
 */
export async function getShareLastSync(): Promise<number | null> {
  const val = await SecureStore.getItemAsync(STORE_LAST_SYNC);
  return val ? parseInt(val, 10) : null;
}

/**
 * Set the last sync timestamp.
 */
export async function setShareLastSync(ts: number): Promise<void> {
  await SecureStore.setItemAsync(STORE_LAST_SYNC, String(ts));
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * Authenticate with Dexcom Share and get a session ID.
 */
async function getSessionId(
  username: string,
  password: string,
  outsideUS: boolean = true, // Default to EU/UK
): Promise<string> {
  const baseUrl = outsideUS ? BASE_URL_OUS : BASE_URL_US;

  // Step 1: Authenticate to get account ID
  const authResp = await fetch(`${baseUrl}/General/AuthenticatePublisherAccount`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accountName: username,
      password: password,
      applicationId: APP_ID,
    }),
  });

  if (!authResp.ok) {
    const text = await authResp.text();
    throw new Error(`Dexcom auth failed: ${authResp.status} ${text}`);
  }

  const accountId = await authResp.json();

  // Step 2: Login to get session
  const loginResp = await fetch(`${baseUrl}/General/LoginPublisherAccountById`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accountId: accountId,
      password: password,
      applicationId: APP_ID,
    }),
  });

  if (!loginResp.ok) {
    const text = await loginResp.text();
    throw new Error(`Dexcom login failed: ${loginResp.status} ${text}`);
  }

  const sessionId = await loginResp.json();
  return sessionId;
}

/**
 * Parse Dexcom's date format: /Date(1234567890000)/ or Date(1234567890000)
 */
function parseDexcomDate(dateStr: string): number {
  const match = dateStr.match(/\d+/);
  return match ? parseInt(match[0], 10) : Date.now();
}

/**
 * Map a Dexcom trend value (number or string) to our internal trend string.
 */
function mapTrend(trend: number | string): string {
  if (typeof trend === 'number') {
    return TREND_MAP[trend] ?? 'unknown';
  }
  return TREND_STRING_MAP[trend] ?? TREND_MAP[Number(trend)] ?? 'unknown';
}

/**
 * Fetch glucose readings from Dexcom Share.
 * Uses stored credentials if username/password not provided.
 */
export async function fetchShareGlucose(
  username?: string,
  password?: string,
  minutes: number = 1440, // 24 hours
  maxCount: number = 288,  // 24h of 5-min readings
  outsideUS: boolean = true,
): Promise<ShareGlucoseReading[]> {
  // Use stored credentials if not provided
  if (!username || !password) {
    const creds = await loadShareCredentials();
    if (!creds.username || !creds.password) {
      throw new Error('No Dexcom Share credentials stored');
    }
    username = creds.username;
    password = creds.password;
  }

  const sessionId = await getSessionId(username, password, outsideUS);
  const baseUrl = outsideUS ? BASE_URL_OUS : BASE_URL_US;

  const resp = await fetch(
    `${baseUrl}/Publisher/ReadPublisherLatestGlucoseValues?` +
    `sessionId=${sessionId}&minutes=${minutes}&maxCount=${maxCount}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Dexcom fetch failed: ${resp.status} ${text}`);
  }

  const data = await resp.json();

  return data.map((r: any) => ({
    value: r.Value,
    mmol: Math.round((r.Value / 18.0182) * 10) / 10,
    trend: mapTrend(r.Trend),
    timestamp: parseDexcomDate(r.WT),
  }));
}

/**
 * Test Dexcom Share credentials — returns true if login works.
 */
export async function testShareCredentials(
  username: string,
  password: string,
  outsideUS: boolean = true,
): Promise<{ success: boolean; error?: string; readings?: number }> {
  try {
    const readings = await fetchShareGlucose(username, password, 30, 6, outsideUS);
    return { success: true, readings: readings.length };
  } catch (e: any) {
    return { success: false, error: e?.message ?? String(e) };
  }
}
