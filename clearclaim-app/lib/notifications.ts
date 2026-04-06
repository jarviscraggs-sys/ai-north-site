import { getDb } from './db';

export function createNotification(
  userId: number,
  type: string,
  title: string,
  message: string,
  link?: string
) {
  try {
    const db = getDb();
    db.prepare(
      `INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)`
    ).run(userId, type, title, message, link || null);
  } catch (e) {
    console.error('Notification error:', e);
  }
}
