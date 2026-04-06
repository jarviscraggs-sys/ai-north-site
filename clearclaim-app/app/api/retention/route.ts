import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sendEmail, buildRetentionReleaseEmail } from '@/lib/email';

// GET — list all retention records (contractor only)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;
  if (user.role !== 'contractor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getDb();
  const { searchParams } = new URL(req.url);

  const subcontractorId = searchParams.get('subcontractor_id');
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');

  let query = `
    SELECT i.id, i.invoice_number, i.amount, i.retention_rate, i.retention_amount,
           i.retention_released, i.retention_release_date, i.status, i.submitted_at,
           u.name as subcontractor_name, u.company as subcontractor_company, u.email as subcontractor_email,
           i.subcontractor_id
    FROM invoices i
    JOIN users u ON i.subcontractor_id = u.id
    WHERE i.retention_amount > 0 AND i.status = 'approved'
  `;
  const params: any[] = [];

  if (subcontractorId) {
    query += ' AND i.subcontractor_id = ?';
    params.push(subcontractorId);
  }
  if (dateFrom) {
    query += ' AND i.submitted_at >= ?';
    params.push(dateFrom);
  }
  if (dateTo) {
    query += ' AND i.submitted_at <= ?';
    params.push(dateTo + ' 23:59:59');
  }

  query += ' ORDER BY i.submitted_at DESC';

  const rows = db.prepare(query).all(...params) as any[];

  const totalHeld = rows.reduce((sum, r) => sum + ((r.retention_amount || 0) - (r.retention_released || 0)), 0);
  const now = new Date().toISOString();
  const overdueRows = rows.filter(r =>
    r.retention_release_date &&
    r.retention_release_date < now &&
    (r.retention_released || 0) < (r.retention_amount || 0)
  );

  return NextResponse.json({ rows, totalHeld, overdueCount: overdueRows.length });
}
