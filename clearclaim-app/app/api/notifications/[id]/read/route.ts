import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;
  const { id } = await params;
  const db = getDb();

  db.prepare(`UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?`).run(id, user.id);

  return NextResponse.json({ success: true });
}
