import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as any;

  const db = getDb();

  const unpaid = db.prepare(`
    SELECT i.*, u.name as subcontractor_name, u.company as subcontractor_company, u.email as subcontractor_email
    FROM invoices i
    JOIN users u ON i.subcontractor_id = u.id
    WHERE i.status = 'approved'
      AND i.contractor_id = ?
      AND (i.paid_date IS NULL OR i.paid_date = '')
    ORDER BY i.reviewed_at DESC
  `).all(user.id) as any[];

  const paid = db.prepare(`
    SELECT i.*, u.name as subcontractor_name, u.company as subcontractor_company, u.email as subcontractor_email
    FROM invoices i
    JOIN users u ON i.subcontractor_id = u.id
    WHERE i.status = 'approved'
      AND i.contractor_id = ?
      AND i.paid_date IS NOT NULL
      AND i.paid_date != ''
    ORDER BY i.paid_date DESC
    LIMIT 50
  `).all(user.id) as any[];

  return NextResponse.json({ unpaid, paid });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as any;

  const body = await req.json();
  const { invoice_ids } = body;

  if (!Array.isArray(invoice_ids) || invoice_ids.length === 0) {
    return NextResponse.json({ error: 'No invoice IDs provided' }, { status: 400 });
  }

  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  const stmt = db.prepare(`
    UPDATE invoices
    SET paid_date = ?
    WHERE id = ?
      AND status = 'approved'
      AND contractor_id = ?
  `);
  const markPaid = db.transaction((ids: number[]) => {
    for (const id of ids) {
      stmt.run(today, id, user.id);
    }
  });

  markPaid(invoice_ids.map(Number));

  return NextResponse.json({ success: true, paid_date: today, count: invoice_ids.length });
}
