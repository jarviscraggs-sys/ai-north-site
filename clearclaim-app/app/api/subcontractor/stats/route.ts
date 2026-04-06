import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;
  if (user.role !== 'subcontractor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getDb();
  const userId = parseInt(user.id);

  const totalGross = (db.prepare(
    `SELECT SUM(amount) as v FROM invoices WHERE subcontractor_id = ?`
  ).get(userId) as any)?.v ?? 0;

  const totalApproved = (db.prepare(
    `SELECT SUM(amount) as v FROM invoices WHERE subcontractor_id = ? AND status='approved'`
  ).get(userId) as any)?.v ?? 0;

  const pendingCount = (db.prepare(
    `SELECT COUNT(*) as v FROM invoices WHERE subcontractor_id = ? AND status='pending'`
  ).get(userId) as any)?.v ?? 0;

  const retentionHeld = (db.prepare(
    `SELECT SUM(retention_amount - retention_released) as v FROM invoices WHERE subcontractor_id = ? AND status='approved'`
  ).get(userId) as any)?.v ?? 0;

  const financial = db.prepare(`
    SELECT
      SUM(amount) as gross,
      SUM(CASE WHEN status='approved' THEN cis_amount ELSE 0 END) as cis,
      SUM(CASE WHEN status='approved' THEN vat_amount ELSE 0 END) as vat,
      SUM(CASE WHEN status='approved' THEN retention_amount - retention_released ELSE 0 END) as retention,
      SUM(CASE WHEN status='approved' THEN amount + vat_amount - cis_amount - retention_amount ELSE 0 END) as net
    FROM invoices WHERE subcontractor_id = ?
  `).get(userId) as any;

  const monthly = db.prepare(`
    SELECT strftime('%Y-%m', submitted_at) as month,
           SUM(amount) as gross,
           SUM(CASE WHEN status='approved' THEN amount ELSE 0 END) as approved
    FROM invoices
    WHERE subcontractor_id = ? AND submitted_at >= date('now', '-6 months')
    GROUP BY month ORDER BY month
  `).all(userId);

  const statusCounts = db.prepare(
    `SELECT status, COUNT(*) as cnt FROM invoices WHERE subcontractor_id = ? GROUP BY status`
  ).all(userId);

  const alerts: { type: string; message: string; invoiceId?: number }[] = [];

  const queried = db.prepare(
    `SELECT id, invoice_number FROM invoices WHERE subcontractor_id = ? AND status='queried'`
  ).all(userId) as any[];
  queried.forEach(inv => {
    alerts.push({ type: 'warning', message: `Invoice ${inv.invoice_number} has been queried — action needed`, invoiceId: inv.id });
  });

  const retentionDue = db.prepare(`
    SELECT id, invoice_number FROM invoices
    WHERE subcontractor_id = ? AND retention_release_date IS NOT NULL
      AND retention_release_date < date('now')
      AND retention_released < retention_amount
  `).all(userId) as any[];
  retentionDue.forEach(inv => {
    alerts.push({ type: 'info', message: `Retention from Invoice ${inv.invoice_number} is due for release`, invoiceId: inv.id });
  });

  const lastSubmitted = (db.prepare(
    `SELECT submitted_at FROM invoices WHERE subcontractor_id = ? ORDER BY submitted_at DESC LIMIT 1`
  ).get(userId) as any)?.submitted_at;

  if (lastSubmitted) {
    const daysSince = Math.floor((Date.now() - new Date(lastSubmitted).getTime()) / 86400000);
    if (daysSince >= 30) {
      alerts.push({ type: 'info', message: `You haven't submitted an invoice in ${daysSince} days` });
    }
  } else {
    alerts.push({ type: 'info', message: 'You have not submitted any invoices yet' });
  }

  return NextResponse.json({
    summary: { totalGross, totalApproved, pendingCount, retentionHeld },
    financial,
    monthly,
    statusCounts,
    alerts,
  });
}
