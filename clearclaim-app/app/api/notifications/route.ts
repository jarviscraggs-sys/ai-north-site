import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;
  const db = getDb();

  const notifications = db.prepare(
    `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`
  ).all(user.id);

  const unreadCount = (db.prepare(
    `SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND read = 0`
  ).get(user.id) as any).c;

  return NextResponse.json({ notifications, unreadCount });
}
