import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const adminSession = cookieStore.get('admin_session');
  if (!adminSession || adminSession.value !== 'authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();

  const totalContractors = (db.prepare(`SELECT COUNT(*) as c FROM users WHERE role = 'contractor'`).get() as any).c;
  const totalSubcontractors = (db.prepare(`SELECT COUNT(*) as c FROM users WHERE role = 'subcontractor'`).get() as any).c;
  const totalEmployees = (db.prepare(`SELECT COUNT(*) as c FROM employees`).get() as any).c;
  const totalInvoices = (db.prepare(`SELECT COUNT(*) as c FROM invoices`).get() as any).c;
  const totalInvoiceValue = (db.prepare(`SELECT COALESCE(SUM(amount), 0) as v FROM invoices`).get() as any).v;

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const invoicesThisMonth = (db.prepare(`SELECT COUNT(*) as c FROM invoices WHERE submitted_at >= ?`).get(monthStart) as any).c;

  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const newSignupsThisWeek = (db.prepare(`SELECT COUNT(*) as c FROM users WHERE created_at >= ?`).get(weekAgo) as any).c;

  const recentSignups = db.prepare(`
    SELECT id, name, company, role, email, created_at
    FROM users
    ORDER BY created_at DESC
    LIMIT 10
  `).all();

  return NextResponse.json({
    totalContractors,
    totalSubcontractors,
    totalEmployees,
    totalInvoices,
    totalInvoiceValue,
    invoicesThisMonth,
    newSignupsThisWeek,
    recentSignups,
  });
}
