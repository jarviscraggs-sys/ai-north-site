import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as any;
  const db = getDb();

  let variations;
  if (user.role === 'subcontractor') {
    variations = db.prepare(`
      SELECT v.*, p.name as project_name, u.name as subcontractor_name, u.company as subcontractor_company
      FROM variations v
      LEFT JOIN projects p ON v.project_id = p.id
      LEFT JOIN users u ON v.subcontractor_id = u.id
      WHERE v.subcontractor_id = ?
      ORDER BY v.submitted_at DESC
    `).all(user.id);
  } else if (user.role === 'contractor') {
    const contractor = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id) as any;
    variations = db.prepare(`
      SELECT v.*, p.name as project_name, u.name as subcontractor_name, u.company as subcontractor_company
      FROM variations v
      LEFT JOIN projects p ON v.project_id = p.id
      LEFT JOIN users u ON v.subcontractor_id = u.id
      WHERE v.contractor_id = ?
      ORDER BY v.submitted_at DESC
    `).all(contractor.id);
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ variations });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as any;
  if (user.role !== 'subcontractor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getDb();
  const body = await req.json();
  const { project_id, invoice_id, variation_number, description, value } = body;

  if (!variation_number || !description || !value) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Get the contractor for this subcontractor (via invites or first contractor)
  const contractor = db.prepare(`
    SELECT u.id FROM users u
    JOIN invites i ON i.contractor_id = u.id
    WHERE i.email = (SELECT email FROM users WHERE id = ?)
    LIMIT 1
  `).get(user.id) as any || db.prepare(`SELECT id FROM users WHERE role = 'contractor' LIMIT 1`).get() as any;

  if (!contractor) return NextResponse.json({ error: 'No contractor found' }, { status: 400 });

  const result = db.prepare(`
    INSERT INTO variations (project_id, invoice_id, subcontractor_id, contractor_id, variation_number, description, value)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(project_id || null, invoice_id || null, user.id, contractor.id, variation_number, description, parseFloat(value));

  return NextResponse.json({ success: true, variationId: result.lastInsertRowid });
}
