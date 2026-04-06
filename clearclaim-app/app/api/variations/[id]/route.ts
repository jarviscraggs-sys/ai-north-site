import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as any;
  if (user.role !== 'contractor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getDb();
  const body = await req.json();
  const { status, reviewer_comment } = body;

  if (!['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const { id } = await params;

  const variation = db.prepare('SELECT * FROM variations WHERE id = ?').get(id) as any;
  if (!variation) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (variation.contractor_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  db.prepare(`
    UPDATE variations SET status = ?, reviewed_at = datetime('now'), reviewer_comment = ? WHERE id = ?
  `).run(status, reviewer_comment || null, id);

  return NextResponse.json({ success: true });
}
