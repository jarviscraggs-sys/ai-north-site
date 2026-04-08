import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';

export async function GET() {
  const cookieStore = await cookies();
  if (cookieStore.get('admin_session')?.value !== 'authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();

  const totalInvoices = (db.prepare('SELECT COUNT(*) as c FROM invoices').get() as any).c;
  const totalVolume = (db.prepare('SELECT COALESCE(SUM(amount + vat_amount), 0) as t FROM invoices').get() as any).t;
  const avgValue = totalInvoices > 0 ? totalVolume / totalInvoices : 0;

  const invoicesByStatus = db.prepare(
    'SELECT status, COUNT(*) as count FROM invoices GROUP BY status'
  ).all() as { status: string; count: number }[];

  const invoicesThisMonth = (db.prepare(
    "SELECT COUNT(*) as c FROM invoices WHERE submitted_at >= date('now', 'start of month')"
  ).get() as any).c;

  const invoicesThisWeek = (db.prepare(
    "SELECT COUNT(*) as c FROM invoices WHERE submitted_at >= date('now', '-7 days')"
  ).get() as any).c;

  return NextResponse.json({
    totalInvoices,
    totalVolumeGbp: totalVolume,
    invoicesByStatus,
    averageInvoiceValue: avgValue,
    invoicesThisMonth,
    invoicesThisWeek,
  });
}
