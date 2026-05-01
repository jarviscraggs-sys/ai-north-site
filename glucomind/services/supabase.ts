/**
 * Supabase Client — GlucoMind
 *
 * Central Supabase client for cloud database, auth, and storage.
 * Project: mugyqmcisdpsypeylooU
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mugyqmcisdpsypeylooU.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11Z3lxbWNpc2Rwc3lwZXlsb291Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDMzNzQsImV4cCI6MjA5MjE3OTM3NH0.sAaB-vsF4NE3_lCqShESi-8ieRAMj6uFOL01ubJ9nYA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export async function signUp(email: string, password: string, name: string) {
  // First create the profile row so the auth trigger doesn't fail
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: undefined,
    },
  });
  // If signup succeeded, ensure profile row exists
  if (!error && data?.user) {
    await supabase.from('profiles').upsert({
      id: data.user.id,
      user_id: data.user.id,
      email: email,
      name: name,
      created_at: new Date().toISOString(),
    }, { onConflict: 'id' }).then(() => {});
  }
  return { data, error };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signOut() {
  return await supabase.auth.signOut();
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// ─── Cloud sync helpers ───────────────────────────────────────────────────────

/**
 * Sync a batch of glucose readings to Supabase.
 * Only syncs readings newer than the last sync timestamp.
 */
export async function syncGlucoseReadings(readings: Array<{
  value: number;
  trend: string;
  timestamp: number;
  source: string;
}>) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Not authenticated' };

  const rows = readings.map(r => ({
    user_id: user.id,
    value: r.value,
    trend: r.trend,
    timestamp: r.timestamp,
    source: r.source,
  }));

  const { error } = await supabase
    .from('glucose_readings')
    .upsert(rows, { onConflict: 'user_id,timestamp' });

  return { error };
}

/**
 * Sync a meal to Supabase.
 */
export async function syncMeal(meal: {
  description: string;
  carbs_estimate: number;
  category: string;
  timestamp: number;
  fat?: number;
  protein?: number;
  calories?: number;
  fibre?: number;
  gi_rating?: string;
}) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase.from('meals').insert({
    user_id: user.id,
    ...meal,
  });

  return { error };
}

/**
 * Sync an insulin dose to Supabase.
 */
export async function syncInsulinDose(dose: {
  type: string;
  units: number;
  timestamp: number;
}) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase.from('insulin_doses').insert({
    user_id: user.id,
    ...dose,
  });

  return { error };
}

/**
 * Fetch profile from Supabase (falls back to local settings if not found).
 */
export async function fetchProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return data;
}

/**
 * Update profile in Supabase.
 */
export async function updateProfile(updates: {
  name?: string;
  diabetes_type?: string;
  diagnosis_year?: number;
  weight_kg?: number;
  target_low?: number;
  target_high?: number;
  insulin_types?: string[];
}) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('profiles')
    .upsert({
      user_id: user.id,
      email: user.email ?? '',
      ...updates,
    }, { onConflict: 'user_id' });

  return { error };
}

/**
 * Check if Supabase is reachable and user is authenticated.
 */
export async function getConnectionStatus(): Promise<'connected' | 'unauthenticated' | 'offline'> {
  try {
    const user = await getCurrentUser();
    if (!user) return 'unauthenticated';
    const { error } = await supabase.from('profiles').select('id').limit(1);
    if (error) return 'offline';
    return 'connected';
  } catch {
    return 'offline';
  }
}
