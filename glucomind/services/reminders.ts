/**
 * Reminders Service — GlucoMind
 *
 * Manages user-created recurring reminders (e.g. "Take Tresiba at 9pm").
 * Uses expo-notifications DAILY trigger for repeating notifications.
 * Stores reminder config in SQLite for persistence across reinstalls.
 */

import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform } from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Reminder {
  id: number;
  title: string;           // e.g. "Night-time insulin"
  message: string;         // e.g. "Take 30 units Tresiba"
  hour: number;            // 0-23
  minute: number;          // 0-59
  enabled: boolean;
  type: 'insulin' | 'meal' | 'check' | 'custom';
  // Optional insulin details for quick-log from notification
  insulinName?: string;
  insulinUnits?: number;
  insulinType?: 'rapid' | 'long';
  notificationId?: string; // expo notification identifier for cancellation
  // Duration: 0 = forever ("until I change it"), >0 = number of days
  durationDays: number;
  expiresAt?: number | null; // Unix ms, null = never
  createdAt: number;
}

// ─── Database helpers (uses main database module) ─────────────────────────────

let _db: any = null;

async function getDB() {
  if (_db) return _db;
  const { getDatabase } = await import('./database');
  _db = await getDatabase();
  return _db;
}

/**
 * Ensure the reminders table exists. Called from initDatabase.
 */
export async function initRemindersTable(): Promise<void> {
  const db = await getDB();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      hour INTEGER NOT NULL,
      minute INTEGER NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      type TEXT NOT NULL DEFAULT 'custom',
      insulin_name TEXT,
      insulin_units REAL,
      insulin_type TEXT,
      notification_id TEXT,
      duration_days INTEGER NOT NULL DEFAULT 0,
      expires_at INTEGER,
      created_at INTEGER NOT NULL
    );
  `);
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function getReminders(): Promise<Reminder[]> {
  const db = await getDB();
  const rows = await db.getAllAsync('SELECT * FROM reminders ORDER BY hour ASC, minute ASC');
  const now = Date.now();
  return (rows as any[]).map(r => ({
    id: r.id,
    title: r.title,
    message: r.message,
    hour: r.hour,
    minute: r.minute,
    enabled: !!r.enabled,
    type: r.type,
    insulinName: r.insulin_name ?? undefined,
    insulinUnits: r.insulin_units ?? undefined,
    insulinType: r.insulin_type ?? undefined,
    notificationId: r.notification_id ?? undefined,
    durationDays: r.duration_days ?? 0,
    expiresAt: r.expires_at ?? null,
    createdAt: r.created_at,
  }));
}

export async function createReminder(reminder: Omit<Reminder, 'id' | 'notificationId' | 'createdAt' | 'expiresAt'>): Promise<Reminder> {
  const db = await getDB();
  const now = Date.now();
  const expiresAt = reminder.durationDays > 0
    ? now + reminder.durationDays * 24 * 60 * 60 * 1000
    : null;

  // Schedule the notification
  const notificationId = await scheduleReminderNotification(reminder);

  const result = await db.runAsync(
    `INSERT INTO reminders (title, message, hour, minute, enabled, type, insulin_name, insulin_units, insulin_type, notification_id, duration_days, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      reminder.title,
      reminder.message,
      reminder.hour,
      reminder.minute,
      reminder.enabled ? 1 : 0,
      reminder.type,
      reminder.insulinName ?? null,
      reminder.insulinUnits ?? null,
      reminder.insulinType ?? null,
      notificationId,
      reminder.durationDays,
      expiresAt,
      now,
    ]
  );

  return {
    ...reminder,
    id: result.lastInsertRowId,
    notificationId,
    expiresAt,
    createdAt: now,
  };
}

export async function toggleReminder(id: number, enabled: boolean): Promise<void> {
  const db = await getDB();

  // Get current reminder
  const rows = await db.getAllAsync('SELECT * FROM reminders WHERE id = ?', [id]);
  const row = (rows as any[])[0];
  if (!row) return;

  if (enabled) {
    // Re-schedule
    const notificationId = await scheduleReminderNotification({
      title: row.title,
      message: row.message,
      hour: row.hour,
      minute: row.minute,
      enabled: true,
      type: row.type,
      insulinName: row.insulin_name,
      insulinUnits: row.insulin_units,
      insulinType: row.insulin_type,
    });
    await db.runAsync('UPDATE reminders SET enabled = 1, notification_id = ? WHERE id = ?', [notificationId, id]);
  } else {
    // Cancel notification
    if (row.notification_id) {
      await Notifications.cancelScheduledNotificationAsync(row.notification_id);
    }
    await db.runAsync('UPDATE reminders SET enabled = 0, notification_id = NULL WHERE id = ?', [id]);
  }
}

export async function deleteReminder(id: number): Promise<void> {
  const db = await getDB();
  const rows = await db.getAllAsync('SELECT notification_id FROM reminders WHERE id = ?', [id]);
  const row = (rows as any[])[0];
  if (row?.notification_id) {
    await Notifications.cancelScheduledNotificationAsync(row.notification_id);
  }
  await db.runAsync('DELETE FROM reminders WHERE id = ?', [id]);
}

// ─── Notification scheduling ──────────────────────────────────────────────────

async function scheduleReminderNotification(reminder: {
  title: string;
  message: string;
  hour: number;
  minute: number;
  enabled: boolean;
  type: string;
  insulinName?: string;
  insulinUnits?: number;
  insulinType?: string;
}): Promise<string> {
  const emoji = reminder.type === 'insulin' ? '💉' : reminder.type === 'meal' ? '🍽️' : reminder.type === 'check' ? '📊' : '⏰';

  const data: any = { type: 'reminder', reminderType: reminder.type };

  // Deep link based on type
  if (reminder.type === 'insulin') {
    data.screen = 'log-insulin';
  } else if (reminder.type === 'meal') {
    data.screen = 'log-meal';
  } else if (reminder.type === 'check') {
    data.screen = 'index';
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `${emoji} ${reminder.title}`,
      body: reminder.message,
      data,
      sound: true,
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DAILY,
      hour: reminder.hour,
      minute: reminder.minute,
      channelId: Platform.OS === 'android' ? 'glucose-alerts' : undefined,
    } as any,
  });

  return id;
}

/**
 * Re-schedule all enabled reminders. Call on app startup in case
 * notifications were cleared by the OS.
 */
export async function rescheduleAllReminders(): Promise<void> {
  const reminders = await getReminders();
  const now = Date.now();
  const db = await getDB();

  for (const r of reminders) {
    // Auto-expire reminders that have passed their duration
    if (r.expiresAt && now > r.expiresAt && r.enabled) {
      if (r.notificationId) {
        try { await Notifications.cancelScheduledNotificationAsync(r.notificationId); } catch {}
      }
      await db.runAsync('UPDATE reminders SET enabled = 0, notification_id = NULL WHERE id = ?', [r.id]);
      continue;
    }

    if (!r.enabled) continue;

    // Cancel old notification if exists
    if (r.notificationId) {
      try { await Notifications.cancelScheduledNotificationAsync(r.notificationId); } catch {}
    }
    // Re-schedule
    const newId = await scheduleReminderNotification(r);
    await db.runAsync('UPDATE reminders SET notification_id = ? WHERE id = ?', [newId, r.id]);
  }
}
