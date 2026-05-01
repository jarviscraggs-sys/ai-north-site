/**
 * Dexcom API Service
 * Handles OAuth 2.0 authentication and API calls to Dexcom CGM data.
 * Uses sandbox environment for development.
 */

import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';

WebBrowser.maybeCompleteAuthSession();

// ─── Config ──────────────────────────────────────────────────────────────────

const DEXCOM_CLIENT_ID = 'oulQCboievxUTiefZYua65910YuvUSsu';
const DEXCOM_CLIENT_SECRET = 'Y3bqlGyMWQ4AwJt6';
const DEXCOM_REDIRECT_URI = 'glucomind://auth/callback';
const DEXCOM_BASE_URL = 'https://sandbox-api.dexcom.com';
const DEXCOM_AUTH_URL = 'https://sandbox-api.dexcom.com/v2/oauth2/login';
const DEXCOM_TOKEN_URL = 'https://sandbox-api.dexcom.com/v2/oauth2/token';

const SECURE_STORE_ACCESS_TOKEN = 'dexcom_access_token';
const SECURE_STORE_REFRESH_TOKEN = 'dexcom_refresh_token';
const SECURE_STORE_TOKEN_EXPIRY = 'dexcom_token_expiry';
const SECURE_STORE_LAST_SYNC = 'dexcom_last_sync';

// ─── TypeScript Interfaces ───────────────────────────────────────────────────

export interface DexcomTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix ms
}

export interface EGVRecord {
  systemTime: string;
  displayTime: string;
  value: number; // mg/dL
  mmol: number;  // converted
  trend: string;
  trendRate: number | null;
  unit: string;
  rateUnit: string;
  displayDevice: string;
  transmitterGeneration: string;
}

export interface EGVsResponse {
  unit: string;
  rateUnit: string;
  egvs: EGVRecord[];
}

export interface EventRecord {
  systemTime: string;
  displayTime: string;
  eventType: string;
  eventSubType: string | null;
  value: number | null;
  unit: string | null;
}

export interface EventsResponse {
  events: EventRecord[];
}

export interface DeviceRecord {
  transmitterGeneration: string;
  displayDevice: string;
  lastUploadDate: string;
  alertScheduleList: any[];
}

export interface DevicesResponse {
  devices: DeviceRecord[];
}

export interface StatisticsResponse {
  highGlucoseThreshold: number;
  lowGlucoseThreshold: number;
  unit: string;
  meanGlucose: { value: number; unit: string };
  median: { value: number; unit: string };
  variance: number;
  coefficientOfVariation: number;
  hyperglycemiaMinutes: number;
  hyperglycemiaPercentage: number;
  hypoglycemiaMinutes: number;
  hypoglycemiaPercentage: number;
  min: { value: number; unit: string };
  max: { value: number; unit: string };
  timeInRangeRecords: Array<{
    name: string;
    display: string;
    percentage: number;
    minutes: number;
  }>;
}

export interface DataRangeResponse {
  calibrations: { start: { systemTime: string; displayTime: string }; end: { systemTime: string; displayTime: string } } | null;
  egvs: { start: { systemTime: string; displayTime: string }; end: { systemTime: string; displayTime: string } } | null;
  events: { start: { systemTime: string; displayTime: string }; end: { systemTime: string; displayTime: string } } | null;
}

// Map Dexcom trend strings to our internal trend type
export function mapDexcomTrend(
  dexcomTrend: string
): 'rising_fast' | 'rising' | 'stable' | 'falling' | 'falling_fast' {
  switch (dexcomTrend) {
    case 'doubleUp':
    case 'singleUp':
      return 'rising_fast';
    case 'fortyFiveUp':
      return 'rising';
    case 'flat':
      return 'stable';
    case 'fortyFiveDown':
      return 'falling';
    case 'singleDown':
    case 'doubleDown':
      return 'falling_fast';
    default:
      return 'stable';
  }
}

// Convert mg/dL to mmol/L
export function mgdlToMmol(mgdl: number): number {
  return Math.round((mgdl / 18.0182) * 10) / 10;
}

// ─── Token Storage ───────────────────────────────────────────────────────────

export async function saveTokens(tokens: DexcomTokens): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(SECURE_STORE_ACCESS_TOKEN, tokens.accessToken),
    SecureStore.setItemAsync(SECURE_STORE_REFRESH_TOKEN, tokens.refreshToken),
    SecureStore.setItemAsync(SECURE_STORE_TOKEN_EXPIRY, tokens.expiresAt.toString()),
  ]);
}

export async function loadTokens(): Promise<DexcomTokens | null> {
  const [accessToken, refreshToken, expiresAtStr] = await Promise.all([
    SecureStore.getItemAsync(SECURE_STORE_ACCESS_TOKEN),
    SecureStore.getItemAsync(SECURE_STORE_REFRESH_TOKEN),
    SecureStore.getItemAsync(SECURE_STORE_TOKEN_EXPIRY),
  ]);

  if (!accessToken || !refreshToken || !expiresAtStr) return null;

  return {
    accessToken,
    refreshToken,
    expiresAt: parseInt(expiresAtStr, 10),
  };
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(SECURE_STORE_ACCESS_TOKEN),
    SecureStore.deleteItemAsync(SECURE_STORE_REFRESH_TOKEN),
    SecureStore.deleteItemAsync(SECURE_STORE_TOKEN_EXPIRY),
    SecureStore.deleteItemAsync(SECURE_STORE_LAST_SYNC),
  ]);
}

export async function isConnected(): Promise<boolean> {
  const tokens = await loadTokens();
  return tokens !== null;
}

export async function getLastSyncTime(): Promise<number | null> {
  const val = await SecureStore.getItemAsync(SECURE_STORE_LAST_SYNC);
  return val ? parseInt(val, 10) : null;
}

export async function setLastSyncTime(ts: number): Promise<void> {
  await SecureStore.setItemAsync(SECURE_STORE_LAST_SYNC, ts.toString());
}

// ─── OAuth Flow ──────────────────────────────────────────────────────────────

/**
 * Build the Dexcom authorization URL for OAuth 2.0
 */
export function buildAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: DEXCOM_CLIENT_ID,
    redirect_uri: DEXCOM_REDIRECT_URI,
    response_type: 'code',
    scope: 'offline_access',
  });
  return `${DEXCOM_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange an authorization code for access + refresh tokens.
 */
export async function exchangeCodeForTokens(code: string): Promise<DexcomTokens> {
  const body = new URLSearchParams({
    client_id: DEXCOM_CLIENT_ID,
    client_secret: DEXCOM_CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
    redirect_uri: DEXCOM_REDIRECT_URI,
  });

  const resp = await fetch(DEXCOM_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Token exchange failed: ${resp.status} — ${err}`);
  }

  const data = await resp.json();
  const tokens: DexcomTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    // Dexcom access tokens expire after 2 hours (7200 seconds)
    expiresAt: Date.now() + (data.expires_in ?? 7200) * 1000,
  };
  await saveTokens(tokens);
  return tokens;
}

/**
 * Refresh access token using stored refresh token.
 */
export async function refreshAccessToken(): Promise<DexcomTokens> {
  const tokens = await loadTokens();
  if (!tokens?.refreshToken) {
    throw new Error('No refresh token available');
  }

  const body = new URLSearchParams({
    client_id: DEXCOM_CLIENT_ID,
    client_secret: DEXCOM_CLIENT_SECRET,
    refresh_token: tokens.refreshToken,
    grant_type: 'refresh_token',
    redirect_uri: DEXCOM_REDIRECT_URI,
  });

  const resp = await fetch(DEXCOM_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!resp.ok) {
    // Refresh token is also expired or revoked — disconnect
    await clearTokens();
    throw new Error(`Token refresh failed: ${resp.status}`);
  }

  const data = await resp.json();
  const newTokens: DexcomTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? tokens.refreshToken,
    expiresAt: Date.now() + (data.expires_in ?? 7200) * 1000,
  };
  await saveTokens(newTokens);
  return newTokens;
}

/**
 * Get a valid access token, refreshing if needed.
 */
export async function getValidAccessToken(): Promise<string> {
  let tokens = await loadTokens();
  if (!tokens) throw new Error('Not connected to Dexcom');

  // Refresh if expiring within 5 minutes
  if (Date.now() >= tokens.expiresAt - 5 * 60 * 1000) {
    tokens = await refreshAccessToken();
  }

  return tokens.accessToken;
}

/**
 * Launch the Dexcom OAuth flow in a browser.
 * Returns the authorization code on success.
 */
export async function launchDexcomAuth(): Promise<string> {
  const authUrl = buildAuthUrl();

  const result = await WebBrowser.openAuthSessionAsync(authUrl, DEXCOM_REDIRECT_URI);

  if (result.type !== 'success') {
    throw new Error(`Auth cancelled or failed: ${result.type}`);
  }

  // Parse the code from the redirect URL
  const url = result.url;
  const match = url.match(/[?&]code=([^&]+)/);
  if (!match) {
    throw new Error('No authorization code in redirect URL');
  }

  return decodeURIComponent(match[1]);
}

// ─── API Wrapper ─────────────────────────────────────────────────────────────

/**
 * Make an authenticated request to Dexcom API.
 * Automatically refreshes token on 401.
 */
async function dexcomFetch(path: string, retried = false): Promise<any> {
  const accessToken = await getValidAccessToken();

  const resp = await fetch(`${DEXCOM_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (resp.status === 401 && !retried) {
    // Force token refresh and retry once
    await refreshAccessToken();
    return dexcomFetch(path, true);
  }

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Dexcom API error ${resp.status}: ${err}`);
  }

  return resp.json();
}

/**
 * Format a date for Dexcom API (ISO 8601 without timezone offset, local time)
 */
function formatDate(date: Date): string {
  return date.toISOString().replace('Z', '');
}

// ─── API Methods ─────────────────────────────────────────────────────────────

/**
 * Get Estimated Glucose Values (EGVs) for a date range.
 */
export async function getEGVs(startDate: Date, endDate: Date): Promise<EGVsResponse> {
  const start = formatDate(startDate);
  const end = formatDate(endDate);
  const data = await dexcomFetch(`/v3/users/self/egvs?startDate=${start}&endDate=${end}`);
  // Convert mg/dL to mmol/L
  if (data.egvs) {
    data.egvs = data.egvs.map((egv: any) => ({
      ...egv,
      mmol: mgdlToMmol(egv.value),
    }));
  }
  return data;
}

/**
 * Get user events (meals, insulin, exercise, etc.) for a date range.
 */
export async function getEvents(startDate: Date, endDate: Date): Promise<EventsResponse> {
  const start = formatDate(startDate);
  const end = formatDate(endDate);
  return dexcomFetch(`/v3/users/self/events?startDate=${start}&endDate=${end}`);
}

/**
 * Get connected CGM devices.
 */
export async function getDevices(): Promise<DevicesResponse> {
  return dexcomFetch('/v3/users/self/devices');
}

/**
 * Get glucose statistics for a date range.
 */
export async function getStatistics(startDate: Date, endDate: Date): Promise<StatisticsResponse> {
  const start = formatDate(startDate);
  const end = formatDate(endDate);
  return dexcomFetch(`/v3/users/self/statistics?startDate=${start}&endDate=${end}`);
}

/**
 * Get the date range of available CGM data.
 */
export async function getDataRange(): Promise<DataRangeResponse> {
  return dexcomFetch('/v3/users/self/dataRange');
}
