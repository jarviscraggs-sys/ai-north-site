import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;
  if (user.role !== 'contractor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getDb();
  let settings = db.prepare('SELECT * FROM contractor_settings WHERE contractor_id = ?').get(Number(user.id)) as any;

  if (!settings) {
    db.prepare('INSERT INTO contractor_settings (contractor_id, max_holidays_per_day) VALUES (?, 1)').run(Number(user.id));
    settings = db.prepare('SELECT * FROM contractor_settings WHERE contractor_id = ?').get(Number(user.id));
  }

  return NextResponse.json(settings);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;
  if (user.role !== 'contractor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { max_holidays_per_day } = body;

  if (typeof max_holidays_per_day !== 'number' || max_holidays_per_day < 1) {
    return NextResponse.json({ error: 'max_holidays_per_day must be a positive number' }, { status: 400 });
  }

  const db = getDb();
  db.prepare(`
    INSERT INTO contractor_settings (contractor_id, max_holidays_per_day)
    VALUES (?, ?)
    ON CONFLICT(contractor_id) DO UPDATE SET max_holidays_per_day = excluded.max_holidays_per_day, updated_at = CURRENT_TIMESTAMP
  `).run(Number(user.id), max_holidays_per_day);

  const settings = db.prepare('SELECT * FROM contractor_settings WHERE contractor_id = ?').get(Number(user.id));
  return NextResponse.json(settings);
}
