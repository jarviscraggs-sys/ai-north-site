import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as any;
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);

  if (user.role === 'contractor') {
    const rows = db.prepare(`
      SELECT strftime('%Y-%m', submitted_at) AS ym,
             COUNT(*) AS invoice_count,
             SUM(amount) AS gross,
             SUM(vat_amount) AS vat,
             SUM(cis_amount) AS cis,
             SUM(retention_amount) AS retention
      FROM invoices
      WHERE strftime('%Y-%m', submitted_at) = ?
      GROUP BY ym
    `).all(month);

    const bySub = db.prepare(`
      SELECT u.company, COUNT(*) AS invoices,
             SUM(amount) AS gross,
             SUM(cis_amount) AS cis,
             SUM(retention_amount) AS retention,
             SUM(amount - cis_amount - retention_amount) AS net
      FROM invoices i
      JOIN users u ON i.subcontractor_id = u.id
      WHERE strftime('%Y-%m', i.submitted_at) = ?
      GROUP BY u.id
    `).all(month);

    return NextResponse.json({ month, rows, bySub });
  }

  // subcontractor view
  const summary = db.prepare(`
    SELECT COUNT(*) AS invoices,
           SUM(amount) AS gross,
           SUM(vat_amount) AS vat,
           SUM(cis_amount) AS cis,
           SUM(retention_amount) AS retention,
           SUM(amount - cis_amount - retention_amount) AS net
    FROM invoices
    WHERE subcontractor_id = ? AND strftime('%Y-%m', submitted_at) = ?
  `).get(user.id, month);

  const list = db.prepare(`
    SELECT invoice_number, status, submitted_at, amount, cis_amount, retention_amount
    FROM invoices
    WHERE subcontractor_id = ? AND strftime('%Y-%m', submitted_at) = ?
    ORDER BY submitted_at DESC
  `).all(user.id, month);

  return NextResponse.json({ month, summary, list });
}
