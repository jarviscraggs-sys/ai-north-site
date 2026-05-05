import * as SQLite from 'expo-sqlite';
import { GlucoseReading, Meal, InsulinDose, Correlation, NotificationRecord, Settings, Factor, FactorType, ChatMessage, EmergencyContact, DailyStat, Challenge } from '../types';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('glucomind.db');
  }
  return db;
}

export async function initDatabase(): Promise<void> {
  const database = await getDatabase();

  await database.execAsync(`
    PRAGMA journal_mode = WAL;
  `);

  // Clear all simulated/demo data on startup so only real HealthKit data shows
  try {
    await database.execAsync(`DELETE FROM glucose_readings WHERE source = 'simulated' OR source = 'demo';`);
  } catch {}

  await database.execAsync(`

    CREATE TABLE IF NOT EXISTS glucose_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      value REAL NOT NULL,
      trend TEXT NOT NULL DEFAULT 'stable',
      timestamp INTEGER NOT NULL,
      source TEXT NOT NULL DEFAULT 'simulated'
    );

    CREATE TABLE IF NOT EXISTS meals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      carbs_estimate REAL NOT NULL DEFAULT 0,
      category TEXT NOT NULL DEFAULT 'Snack',
      photo_uri TEXT,
      timestamp INTEGER NOT NULL,
      fat REAL,
      protein REAL,
      calories REAL,
      fibre REAL,
      gi_rating TEXT,
      glucose_impact_estimate REAL
    );

    CREATE TABLE IF NOT EXISTS insulin_doses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      units REAL NOT NULL,
      timestamp INTEGER NOT NULL,
      meal_id INTEGER DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS correlations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meal_id INTEGER NOT NULL,
      pre_glucose REAL NOT NULL,
      peak_glucose REAL NOT NULL,
      insulin_id INTEGER,
      time_to_peak INTEGER NOT NULL DEFAULT 60,
      time_to_normal INTEGER NOT NULL DEFAULT 120,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      read INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS factors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      value TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS emergency_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS daily_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      tir_percentage REAL NOT NULL DEFAULT 0,
      avg_glucose REAL NOT NULL DEFAULT 0,
      readings_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS challenges (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL,
      target REAL NOT NULL,
      current REAL NOT NULL DEFAULT 0,
      unit TEXT NOT NULL,
      reward TEXT NOT NULL,
      icon TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `);

  // Migrate existing meals table to add nutritional columns if not present
  await migrateMealsTable(database);

  // Migrate insulin_doses to add meal_id column if not present
  try {
    await database.runAsync('ALTER TABLE insulin_doses ADD COLUMN meal_id INTEGER DEFAULT NULL');
  } catch {
    // Column already exists — ignore
  }
}

// Glucose Readings
export async function insertGlucoseReading(reading: Omit<GlucoseReading, 'id'>): Promise<number> {
  const database = await getDatabase();
  const result = await database.runAsync(
    'INSERT INTO glucose_readings (value, trend, timestamp, source) VALUES (?, ?, ?, ?)',
    [reading.value, reading.trend, reading.timestamp, reading.source]
  );
  return result.lastInsertRowId;
}

export async function getGlucoseReadings(limit = 200, since?: number): Promise<GlucoseReading[]> {
  const database = await getDatabase();
  if (since) {
    return await database.getAllAsync<GlucoseReading>(
      'SELECT * FROM glucose_readings WHERE timestamp > ? ORDER BY timestamp ASC LIMIT ?',
      [since, limit]
    );
  }
  return await database.getAllAsync<GlucoseReading>(
    'SELECT * FROM glucose_readings ORDER BY timestamp DESC LIMIT ?',
    [limit]
  );
}

export async function getLatestGlucoseReading(): Promise<GlucoseReading | null> {
  const database = await getDatabase();
  const result = await database.getFirstAsync<GlucoseReading>(
    'SELECT * FROM glucose_readings ORDER BY timestamp DESC LIMIT 1'
  );
  return result ?? null;
}

export async function getGlucoseReadingsInRange(start: number, end: number): Promise<GlucoseReading[]> {
  const database = await getDatabase();
  return await database.getAllAsync<GlucoseReading>(
    'SELECT * FROM glucose_readings WHERE timestamp BETWEEN ? AND ? ORDER BY timestamp ASC',
    [start, end]
  );
}

// Meal column migration (run once at init to add new nutritional columns)
async function migrateMealsTable(database: SQLite.SQLiteDatabase): Promise<void> {
  const newColumns: Array<{ col: string; def: string }> = [
    { col: 'fat', def: 'REAL' },
    { col: 'protein', def: 'REAL' },
    { col: 'calories', def: 'REAL' },
    { col: 'fibre', def: 'REAL' },
    { col: 'gi_rating', def: 'TEXT' },
    { col: 'glucose_impact_estimate', def: 'REAL' },
  ];
  for (const { col, def } of newColumns) {
    try {
      await database.execAsync(`ALTER TABLE meals ADD COLUMN ${col} ${def}`);
    } catch {
      // Column already exists — ignore
    }
  }
}

// Meals
export async function insertMeal(meal: Omit<Meal, 'id'>): Promise<number> {
  const database = await getDatabase();
  const result = await database.runAsync(
    `INSERT INTO meals
      (description, carbs_estimate, category, photo_uri, timestamp,
       fat, protein, calories, fibre, gi_rating, glucose_impact_estimate)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      meal.description,
      meal.carbs_estimate,
      meal.category,
      meal.photo_uri ?? null,
      meal.timestamp,
      meal.fat ?? null,
      meal.protein ?? null,
      meal.calories ?? null,
      meal.fibre ?? null,
      meal.gi_rating ?? null,
      meal.glucose_impact_estimate ?? null,
    ]
  );
  return result.lastInsertRowId;
}

export async function getMeals(limit = 50): Promise<Meal[]> {
  const database = await getDatabase();
  return await database.getAllAsync<Meal>(
    'SELECT * FROM meals ORDER BY timestamp DESC LIMIT ?',
    [limit]
  );
}

export async function deleteMeal(id: number): Promise<void> {
  if (!db) throw new Error('Database not initialised');
  db.runSync('DELETE FROM meals WHERE id = ?', [id]);
}

export async function deleteInsulinDose(id: number): Promise<void> {
  if (!db) throw new Error('Database not initialised');
  db.runSync('DELETE FROM insulin_doses WHERE id = ?', [id]);
}

export async function getMealById(id: number): Promise<Meal | null> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Meal>('SELECT * FROM meals WHERE id = ?', [id]);
  return rows.length > 0 ? rows[0] : null;
}

export async function updateMeal(id: number, updates: Partial<Pick<Meal, 'description' | 'carbs_estimate' | 'fat' | 'protein' | 'calories' | 'fibre' | 'gi_rating' | 'category'>>): Promise<void> {
  const database = await getDatabase();
  const fields: string[] = [];
  const values: any[] = [];
  if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
  if (updates.carbs_estimate !== undefined) { fields.push('carbs_estimate = ?'); values.push(updates.carbs_estimate); }
  if (updates.fat !== undefined) { fields.push('fat = ?'); values.push(updates.fat); }
  if (updates.protein !== undefined) { fields.push('protein = ?'); values.push(updates.protein); }
  if (updates.calories !== undefined) { fields.push('calories = ?'); values.push(updates.calories); }
  if (updates.fibre !== undefined) { fields.push('fibre = ?'); values.push(updates.fibre); }
  if (updates.gi_rating !== undefined) { fields.push('gi_rating = ?'); values.push(updates.gi_rating); }
  if (updates.category !== undefined) { fields.push('category = ?'); values.push(updates.category); }
  if (fields.length === 0) return;
  values.push(id);
  await database.runAsync(`UPDATE meals SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function getInsulinDoseById(id: number): Promise<InsulinDose | null> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<InsulinDose>('SELECT * FROM insulin_doses WHERE id = ?', [id]);
  return rows.length > 0 ? rows[0] : null;
}

export async function updateInsulinDose(id: number, updates: Partial<Pick<InsulinDose, 'units' | 'type'>>): Promise<void> {
  const database = await getDatabase();
  const fields: string[] = [];
  const values: any[] = [];
  if (updates.units !== undefined) { fields.push('units = ?'); values.push(updates.units); }
  if (updates.type !== undefined) { fields.push('type = ?'); values.push(updates.type); }
  if (fields.length === 0) return;
  values.push(id);
  await database.runAsync(`UPDATE insulin_doses SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function getMealsInRange(start: number, end: number): Promise<Meal[]> {
  const database = await getDatabase();
  return await database.getAllAsync<Meal>(
    'SELECT * FROM meals WHERE timestamp BETWEEN ? AND ? ORDER BY timestamp ASC',
    [start, end]
  );
}

// Insulin Doses
export async function insertInsulinDose(dose: Omit<InsulinDose, 'id'>): Promise<number> {
  const database = await getDatabase();
  const result = await database.runAsync(
    'INSERT INTO insulin_doses (type, units, timestamp, meal_id) VALUES (?, ?, ?, ?)',
    [dose.type, dose.units, dose.timestamp, dose.meal_id ?? null]
  );
  return result.lastInsertRowId;
}

export async function getInsulinDoses(limit = 50): Promise<InsulinDose[]> {
  const database = await getDatabase();
  return await database.getAllAsync<InsulinDose>(
    'SELECT * FROM insulin_doses ORDER BY timestamp DESC LIMIT ?',
    [limit]
  );
}

export async function getInsulinDosesInRange(start: number, end: number): Promise<InsulinDose[]> {
  const database = await getDatabase();
  return await database.getAllAsync<InsulinDose>(
    'SELECT * FROM insulin_doses WHERE timestamp BETWEEN ? AND ? ORDER BY timestamp ASC',
    [start, end]
  );
}

// Correlations
export async function insertCorrelation(corr: Omit<Correlation, 'id'>): Promise<number> {
  const database = await getDatabase();
  const result = await database.runAsync(
    'INSERT INTO correlations (meal_id, pre_glucose, peak_glucose, insulin_id, time_to_peak, time_to_normal, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [corr.meal_id, corr.pre_glucose, corr.peak_glucose, corr.insulin_id ?? null, corr.time_to_peak, corr.time_to_normal, corr.notes ?? null]
  );
  return result.lastInsertRowId;
}

export async function getCorrelations(): Promise<Correlation[]> {
  const database = await getDatabase();
  return await database.getAllAsync<Correlation>('SELECT * FROM correlations ORDER BY id DESC');
}

// Notifications
export async function insertNotification(notif: Omit<NotificationRecord, 'id'>): Promise<number> {
  const database = await getDatabase();
  const result = await database.runAsync(
    'INSERT INTO notifications (type, message, timestamp, read) VALUES (?, ?, ?, ?)',
    [notif.type, notif.message, notif.timestamp, notif.read ? 1 : 0]
  );
  return result.lastInsertRowId;
}

export async function getNotifications(limit = 30): Promise<NotificationRecord[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>(
    'SELECT * FROM notifications ORDER BY timestamp DESC LIMIT ?',
    [limit]
  );
  return rows.map(r => ({ ...r, read: r.read === 1 }));
}

export async function markNotificationRead(id: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('UPDATE notifications SET read = 1 WHERE id = ?', [id]);
}

// Settings
export async function getSetting(key: string, defaultValue: string): Promise<string> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [key]
  );
  return row?.value ?? defaultValue;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [key, value]
  );
}

export async function getAllSettings(): Promise<Settings> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const map: Record<string, string> = {};
  rows.forEach(r => { map[r.key] = r.value; });

  return {
    target_low: parseFloat(map['target_low'] ?? '4'),
    target_high: parseFloat(map['target_high'] ?? '10'),
    notify_spike: (map['notify_spike'] ?? 'true') === 'true',
    notify_high: (map['notify_high'] ?? 'true') === 'true',
    notify_low: (map['notify_low'] ?? 'true') === 'true',
    notify_meal_reminder: (map['notify_meal_reminder'] ?? 'true') === 'true',
    notify_insulin_reminder: (map['notify_insulin_reminder'] ?? 'true') === 'true',
    insulin_types: JSON.parse(map['insulin_types'] ?? '["NovoRapid","Tresiba"]'),
    user_name: map['user_name'] ?? 'Dayne',
    diagnosis_date: map['diagnosis_date'] ?? '2018-03-15',
  };
}

// App State
export async function getAppState(key: string): Promise<string | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_state WHERE key = ?',
    [key]
  );
  return row?.value ?? null;
}

export async function setAppState(key: string, value: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)',
    [key, value]
  );
}

export async function getGlucoseCount(): Promise<number> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM glucose_readings');
  return row?.count ?? 0;
}

// Factors
export async function insertFactor(factor: Omit<Factor, 'id'>): Promise<number> {
  const database = await getDatabase();
  const result = await database.runAsync(
    'INSERT INTO factors (type, value, timestamp) VALUES (?, ?, ?)',
    [factor.type, factor.value, factor.timestamp]
  );
  return result.lastInsertRowId;
}

export async function getFactors(limit = 50): Promise<Factor[]> {
  const database = await getDatabase();
  return await database.getAllAsync<Factor>(
    'SELECT * FROM factors ORDER BY timestamp DESC LIMIT ?',
    [limit]
  );
}

export async function getFactorsSince(since: number): Promise<Factor[]> {
  const database = await getDatabase();
  return await database.getAllAsync<Factor>(
    'SELECT * FROM factors WHERE timestamp > ? ORDER BY timestamp DESC',
    [since]
  );
}

export async function getFactorsByType(type: FactorType, limit = 20): Promise<Factor[]> {
  const database = await getDatabase();
  return await database.getAllAsync<Factor>(
    'SELECT * FROM factors WHERE type = ? ORDER BY timestamp DESC LIMIT ?',
    [type, limit]
  );
}

// ─── Chat Messages ────────────────────────────────────────────────────────────

export async function insertChatMessage(msg: Omit<ChatMessage, 'id'>): Promise<number> {
  const database = await getDatabase();
  const result = await database.runAsync(
    'INSERT INTO chat_messages (role, content, timestamp) VALUES (?, ?, ?)',
    [msg.role, msg.content, msg.timestamp]
  );
  return result.lastInsertRowId;
}

export async function getChatHistory(limit = 100): Promise<ChatMessage[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ id: number; role: string; content: string; timestamp: number }>(
    'SELECT * FROM chat_messages ORDER BY timestamp ASC LIMIT ?',
    [limit]
  );
  return rows.map(r => ({ ...r, role: r.role as 'user' | 'assistant' }));
}

export async function clearChatHistory(): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM chat_messages');
}

// ─── Emergency Contacts ───────────────────────────────────────────────────────

export async function insertEmergencyContact(contact: Omit<EmergencyContact, 'id'>): Promise<number> {
  const database = await getDatabase();
  const result = await database.runAsync(
    'INSERT INTO emergency_contacts (name, phone, enabled, created_at) VALUES (?, ?, ?, ?)',
    [contact.name, contact.phone, contact.enabled ? 1 : 0, contact.created_at]
  );
  return result.lastInsertRowId;
}

export async function getEmergencyContacts(): Promise<EmergencyContact[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>(
    'SELECT * FROM emergency_contacts ORDER BY created_at ASC'
  );
  return rows.map(r => ({ ...r, enabled: r.enabled === 1 }));
}

export async function updateEmergencyContactEnabled(id: number, enabled: boolean): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE emergency_contacts SET enabled = ? WHERE id = ?',
    [enabled ? 1 : 0, id]
  );
}

export async function deleteEmergencyContact(id: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM emergency_contacts WHERE id = ?', [id]);
}

// ─── Daily Stats ──────────────────────────────────────────────────────────────

export async function insertDailyStat(stat: Omit<DailyStat, 'id'>): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO daily_stats (date, tir_percentage, avg_glucose, readings_count)
     VALUES (?, ?, ?, ?)`,
    [stat.date, stat.tir_percentage, stat.avg_glucose, stat.readings_count]
  );
}

export async function getDailyStats(limit = 90): Promise<DailyStat[]> {
  const database = await getDatabase();
  return await database.getAllAsync<DailyStat>(
    'SELECT * FROM daily_stats ORDER BY date DESC LIMIT ?',
    [limit]
  );
}

// ─── Challenges ──────────────────────────────────────────────────────────────

function rowToChallenge(r: any): Challenge {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    type: r.type as Challenge['type'],
    target: r.target,
    current: r.current,
    unit: r.unit,
    reward: r.reward,
    icon: r.icon,
    expiresAt: r.expires_at,
    completed: r.completed === 1,
  };
}

export async function getActiveChallenges(): Promise<Challenge[]> {
  const database = await getDatabase();
  const now = Date.now();
  const rows = await database.getAllAsync<any>(
    'SELECT * FROM challenges WHERE expires_at > ? ORDER BY created_at ASC',
    [now]
  );
  return rows.map(rowToChallenge);
}

export async function insertChallenge(challenge: Challenge): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO challenges
      (id, title, description, type, target, current, unit, reward, icon, expires_at, completed, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      challenge.id,
      challenge.title,
      challenge.description,
      challenge.type,
      challenge.target,
      challenge.current,
      challenge.unit,
      challenge.reward,
      challenge.icon,
      challenge.expiresAt,
      challenge.completed ? 1 : 0,
      Date.now(),
    ]
  );
}

export async function updateChallengeProgress(id: string, current: number, completed: boolean): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE challenges SET current = ?, completed = ? WHERE id = ?',
    [current, completed ? 1 : 0, id]
  );
}

export async function clearExpiredChallenges(): Promise<void> {
  const database = await getDatabase();
  const now = Date.now();
  await database.runAsync('DELETE FROM challenges WHERE expires_at <= ?', [now]);
}

export async function getCurrentStreak(): Promise<number> {
  const database = await getDatabase();
  const stats = await database.getAllAsync<DailyStat>(
    'SELECT * FROM daily_stats ORDER BY date DESC LIMIT 90'
  );

  if (stats.length === 0) return 0;

  // A day counts toward streak if TIR >= 50%
  const TIR_STREAK_THRESHOLD = 50;

  let streak = 0;
  const today = new Date();

  for (let i = 0; i < stats.length; i++) {
    const statDate = new Date(stats[i].date);
    const expectedDate = new Date(today);
    expectedDate.setDate(today.getDate() - i);
    expectedDate.setHours(0, 0, 0, 0);
    statDate.setHours(0, 0, 0, 0);

    // Date must match expected sequential day
    if (statDate.getTime() !== expectedDate.getTime()) break;
    if (stats[i].tir_percentage < TIR_STREAK_THRESHOLD) break;
    streak++;
  }

  return streak;
}
