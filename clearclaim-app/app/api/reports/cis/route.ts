import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const month = parseInt(searchParams.get('month') || `${new Date().getMonth() + 1}`);
  const year = parseInt(searchParams.get('year') || `${new Date().getFullYear()}`);

  const db = getDb();

  // Get approved invoices in the given month/year
  // reviewed_at is when the invoice was approved
  const rows = db.prepare(`
    SELECT
      u.name as subcontractor_name,
      u.company as subcontractor_company,
      u.email as subcontractor_email,
      COALESCE(u.cis_rate, 0) as cis_rate,
      SUM(i.amount) as gross_amount,
      SUM(COALESCE(i.cis_amount, 0)) as cis_deducted,
      SUM(i.amount - COALESCE(i.cis_amount, 0)) as net_amount,
      COUNT(i.id) as invoice_count
    FROM invoices i
    JOIN users u ON i.subcontractor_id = u.id
    WHERE i.status = 'approved'
      AND strftime('%m', COALESCE(i.reviewed_at, i.submitted_at)) = printf('%02d', ?)
      AND strftime('%Y', COALESCE(i.reviewed_at, i.submitted_at)) = ?
    GROUP BY u.id
    ORDER BY u.company, u.name
  `).all(month, String(year)) as any[];

  // Also get UTR from users table if available
  // (we'll just use what we have)

  return NextResponse.json({ rows, month, year });
}
