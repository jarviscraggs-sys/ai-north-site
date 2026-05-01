import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as any;
  const db = getDb();

  let contractor: any;
  if (user.role === 'contractor') {
    contractor = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  } else {
    // For subcontractors - find their linked contractor via subcontractor_contractors
    const link = db.prepare(`
      SELECT u.* FROM subcontractor_contractors sc
      JOIN users u ON u.id = sc.contractor_id
      WHERE sc.subcontractor_id = ?
      LIMIT 1
    `).get(user.id);
    contractor = link;
  }

  if (!contractor) return NextResponse.json({ projects: [] });

  const projects = db.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM invoices WHERE project_id = p.id) as invoice_count,
      (SELECT COALESCE(SUM(amount), 0) FROM invoices WHERE project_id = p.id AND status = 'approved') as total_approved
    FROM projects p
    WHERE p.contractor_id = ?
    ORDER BY p.created_at DESC
  `).all(contractor.id);

  return NextResponse.json({ projects });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as any;
  if (user.role !== 'contractor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getDb();
  const body = await req.json();
  const { name, reference, address, contract_value, start_date, end_date } = body;

  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  const result = db.prepare(`
    INSERT INTO projects (contractor_id, name, reference, address, contract_value, start_date, end_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(user.id, name, reference || null, address || null, contract_value || 0, start_date || null, end_date || null);

  return NextResponse.json({ success: true, projectId: result.lastInsertRowid });
}
