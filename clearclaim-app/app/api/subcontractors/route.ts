import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;
  if (user.role !== 'contractor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getDb();

  const subcontractors = db.prepare(`
    SELECT u.id, u.name, u.company, u.email, u.created_at, u.cis_rate, u.utr,
      COUNT(i.id) as invoice_count,
      SUM(CASE WHEN i.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
      SUM(CASE WHEN i.status = 'approved' THEN 1 ELSE 0 END) as approved_count,
      SUM(CASE WHEN i.status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
      SUM(CASE WHEN i.status = 'queried' THEN 1 ELSE 0 END) as queried_count,
      SUM(CASE WHEN i.status = 'approved' THEN i.amount ELSE 0 END) as total_approved_value
    FROM users u
    JOIN subcontractor_contractors sc ON sc.subcontractor_id = u.id AND sc.contractor_id = ?
    LEFT JOIN invoices i ON u.id = i.subcontractor_id AND i.contractor_id = ?
    WHERE u.role = 'subcontractor'
    GROUP BY u.id
    ORDER BY u.company
  `).all(user.id, user.id);

  return NextResponse.json({ subcontractors });
}
