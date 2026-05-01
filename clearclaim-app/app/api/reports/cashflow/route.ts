import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as any;
  if (user.role !== 'contractor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getDb();

  // Get approved, unpaid invoices with expected payment dates (reviewed_at + 30 days)
  const upcomingPayments = db.prepare(`
    SELECT i.*,
      u.name as subcontractor_name,
      u.company as subcontractor_company,
      date(i.reviewed_at, '+30 days') as expected_payment_date,
      CAST(julianday(date(i.reviewed_at, '+30 days')) - julianday('now') AS INTEGER) as days_until_due
    FROM invoices i
    JOIN users u ON i.subcontractor_id = u.id
    WHERE i.status = 'approved'
      AND i.contractor_id = ?
      AND (i.paid = 0 OR i.paid IS NULL)
      AND i.reviewed_at IS NOT NULL
    ORDER BY expected_payment_date ASC
  `).all(user.id) as any[];

  // Retention schedule
  const retentionSchedule = db.prepare(`
    SELECT i.*,
      u.name as subcontractor_name,
      u.company as subcontractor_company,
      CAST(julianday(i.retention_release_date) - julianday('now') AS INTEGER) as days_until_release
    FROM invoices i
    JOIN users u ON i.subcontractor_id = u.id
    WHERE i.retention_amount > 0
      AND i.contractor_id = ?
      AND i.retention_release_date IS NOT NULL
    ORDER BY i.retention_release_date ASC
  `).all(user.id) as any[];

  // Summary calculations
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  const next30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const next60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const outstandingThisMonth = upcomingPayments
    .filter(p => p.expected_payment_date >= startOfMonth && p.expected_payment_date <= endOfMonth)
    .reduce((s: number, p: any) => s + (p.amount - (p.cis_amount || 0)), 0);

  const retentionThisMonth = retentionSchedule
    .filter(r => r.retention_release_date >= startOfMonth && r.retention_release_date <= endOfMonth)
    .reduce((s: number, r: any) => s + (r.retention_amount - (r.retention_released || 0)), 0);

  const next30Total = upcomingPayments
    .filter(p => p.expected_payment_date <= next30)
    .reduce((s: number, p: any) => s + (p.amount - (p.cis_amount || 0)), 0);

  const next60Total = upcomingPayments
    .filter(p => p.expected_payment_date <= next60)
    .reduce((s: number, p: any) => s + (p.amount - (p.cis_amount || 0)), 0);

  return NextResponse.json({
    upcomingPayments,
    retentionSchedule,
    summary: {
      outstandingThisMonth,
      retentionThisMonth,
      next30Total,
      next60Total,
    }
  });
}
