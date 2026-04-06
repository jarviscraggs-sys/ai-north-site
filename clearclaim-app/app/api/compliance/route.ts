import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as any;
  const db = getDb();
  const { searchParams } = new URL(req.url);

  // Subcontractors can view their own compliance docs
  if (user.role === 'subcontractor') {
    const compliance = db.prepare(`SELECT * FROM subcontractor_compliance WHERE subcontractor_id = ? ORDER BY expiry_date ASC`).all(user.id);
    return NextResponse.json({ compliance });
  }

  if (user.role !== 'contractor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const subcontractorId = searchParams.get('subcontractor_id');

  let query = `
    SELECT sc.*, u.name as subcontractor_name, u.company as subcontractor_company
    FROM subcontractor_compliance sc
    JOIN users u ON sc.subcontractor_id = u.id
    WHERE sc.contractor_id = ?
  `;
  const params: any[] = [user.id];

  if (subcontractorId) {
    query += ' AND sc.subcontractor_id = ?';
    params.push(subcontractorId);
  }

  query += ' ORDER BY sc.expiry_date ASC NULLS LAST';

  const compliance = db.prepare(query).all(...params) as any[];

  // Auto-update statuses based on expiry dates
  const today = new Date().toISOString().split('T')[0];
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  for (const item of compliance) {
    if (item.expiry_date) {
      let newStatus = 'valid';
      if (item.expiry_date < today) newStatus = 'expired';
      else if (item.expiry_date <= in30Days) newStatus = 'expiring_soon';

      if (newStatus !== item.status) {
        db.prepare('UPDATE subcontractor_compliance SET status = ? WHERE id = ?').run(newStatus, item.id);
        item.status = newStatus;
      }
    }
  }

  return NextResponse.json({ compliance });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as any;
  const db = getDb();
  const body = await req.json();

  const today = new Date().toISOString().split('T')[0];
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Subcontractors can add their own compliance docs
  if (user.role === 'subcontractor') {
    const { document_type, document_name, expiry_date, notes } = body;
    if (!document_type || !document_name) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

    // Find contractor for this subcontractor
    const contractor = db.prepare(`SELECT * FROM users WHERE role = 'contractor' LIMIT 1`).get() as any;

    let status = 'valid';
    if (expiry_date) {
      if (expiry_date < today) status = 'expired';
      else if (expiry_date <= in30Days) status = 'expiring_soon';
    }

    const result = db.prepare(`
      INSERT INTO subcontractor_compliance (subcontractor_id, contractor_id, document_type, document_name, expiry_date, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(user.id, contractor?.id || 1, document_type, document_name, expiry_date || null, notes || null, status);

    return NextResponse.json({ success: true, id: result.lastInsertRowid });
  }

  if (user.role !== 'contractor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { subcontractor_id, document_type, document_name, expiry_date, notes } = body;

  if (!subcontractor_id || !document_type || !document_name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  let status = 'valid';
  if (expiry_date) {
    if (expiry_date < today) status = 'expired';
    else if (expiry_date <= in30Days) status = 'expiring_soon';
  }

  const result = db.prepare(`
    INSERT INTO subcontractor_compliance (subcontractor_id, contractor_id, document_type, document_name, expiry_date, notes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(subcontractor_id, user.id, document_type, document_name, expiry_date || null, notes || null, status);

  return NextResponse.json({ success: true, id: result.lastInsertRowid });
}
