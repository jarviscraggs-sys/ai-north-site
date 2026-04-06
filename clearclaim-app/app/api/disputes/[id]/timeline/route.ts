import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const db = getDb();

  const entries = db.prepare(`
    SELECT * FROM dispute_timeline WHERE dispute_id = ? ORDER BY created_at DESC
  `).all(id) as any[];

  return NextResponse.json({ entries });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as any;
  const { id } = await params;
  const db = getDb();

  try {
    const body = await req.json();
    const { action, detail } = body;

    if (!action) return NextResponse.json({ error: 'action is required' }, { status: 400 });

    db.prepare(`
      INSERT INTO dispute_timeline (dispute_id, user_id, user_name, action, detail)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, user.id, user.name || user.email, action, detail || null);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
