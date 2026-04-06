import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as any;
  const db = getDb();

  const { searchParams } = new URL(req.url);
  const subcontractorId = searchParams.get('subcontractor_id');

  let query = `SELECT * FROM cis_verifications WHERE contractor_id = ?`;
  const params: any[] = [user.id];

  if (subcontractorId) {
    query += ' AND subcontractor_id = ?';
    params.push(subcontractorId);
  }

  query += ' ORDER BY created_at DESC';

  const verifications = db.prepare(query).all(...params) as any[];
  return NextResponse.json({ verifications });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as any;
  if (user.role !== 'contractor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getDb();
  try {
    const body = await req.json();
    const { subcontractor_id, verified_date, hmrc_reference, confirmed_rate, verified_by, notes } = body;

    if (!subcontractor_id || !verified_date || confirmed_rate === undefined || confirmed_rate === null) {
      return NextResponse.json({ error: 'Missing required fields: subcontractor_id, verified_date, confirmed_rate' }, { status: 400 });
    }

    if (![0, 20, 30].includes(Number(confirmed_rate))) {
      return NextResponse.json({ error: 'confirmed_rate must be 0, 20, or 30' }, { status: 400 });
    }

    const result = db.prepare(`
      INSERT INTO cis_verifications (subcontractor_id, contractor_id, verified_date, hmrc_reference, confirmed_rate, verified_by, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(subcontractor_id, user.id, verified_date, hmrc_reference || null, Number(confirmed_rate), verified_by || null, notes || null);

    // Update the subcontractor's CIS rate in users table
    db.prepare('UPDATE users SET cis_rate = ? WHERE id = ?').run(Number(confirmed_rate), subcontractor_id);

    return NextResponse.json({ success: true, id: result.lastInsertRowid });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
