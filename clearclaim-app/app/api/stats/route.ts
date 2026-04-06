import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;
  if (user.role !== 'contractor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getDb();

  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_invoices,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
      SUM(CASE WHEN status = 'queried' THEN 1 ELSE 0 END) as queried_count,
      SUM(amount + vat_amount) as total_value,
      SUM(CASE WHEN status = 'approved' AND strftime('%Y-%m', submitted_at) = strftime('%Y-%m', 'now') THEN amount ELSE 0 END) as approved_this_month
    FROM invoices
  `).get() as any;

  const flaggedCount = db.prepare(`
    SELECT COUNT(DISTINCT invoice_id) as count FROM ai_flags
  `).get() as any;

  return NextResponse.json({ ...stats, flagged_count: flaggedCount.count });
}
