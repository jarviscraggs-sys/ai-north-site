import { getDb } from './db';

export function logAction(
  invoiceId: number | null,
  userId: number,
  userName: string,
  action: string,
  detail?: string
) {
  try {
    const db = getDb();
    db.prepare(
      `INSERT INTO audit_log (invoice_id, user_id, user_name, action, detail) VALUES (?, ?, ?, ?, ?)`
    ).run(invoiceId, userId, userName, action, detail || null);
  } catch (e) {
    console.error('Audit log error:', e);
  }
}
