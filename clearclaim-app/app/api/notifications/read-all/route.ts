import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;
  const db = getDb();

  db.prepare(`UPDATE notifications SET read = 1 WHERE user_id = ?`).run(user.id);

  return NextResponse.json({ success: true });
}
