import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;
  if (user.role !== 'subcontractor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getDb();
  const userId = parseInt(user.id);
  const { searchParams } = new URL(req.url);
  const type  = searchParams.get('type')  ?? 'cis';
  const month = searchParams.get('month') ?? new Date().toISOString().slice(0, 7);

  if (type === 'cis') {
    const rows = db.prepare(`
      SELECT invoice_number, submitted_at, amount, cis_rate, cis_amount
      FROM invoices
      WHERE subcontractor_id = ?
        AND status = 'approved'
        AND strftime('%Y-%m', submitted_at) = ?
      ORDER BY submitted_at ASC
    `).all(userId, month);

    const totalGross = (rows as any[]).reduce((s, r) => s + (r.amount ?? 0), 0);
    const totalCIS   = (rows as any[]).reduce((s, r) => s + (r.cis_amount ?? 0), 0);
    const totalNet   = totalGross - totalCIS;

    return NextResponse.json({ type: 'cis', month, rows, totals: { gross: totalGross, cis: totalCIS, net: totalNet } });
  }

  if (type === 'vat') {
    const rows = db.prepare(`
      SELECT invoice_number, submitted_at, amount, vat_amount
      FROM invoices
      WHERE subcontractor_id = ?
        AND status = 'approved'
        AND vat_amount > 0
        AND strftime('%Y-%m', submitted_at) = ?
      ORDER BY submitted_at ASC
    `).all(userId, month);

    const totalNet = (rows as any[]).reduce((s, r) => s + (r.amount ?? 0), 0);
    const totalVAT = (rows as any[]).reduce((s, r) => s + (r.vat_amount ?? 0), 0);

    // Derive VAT rate from amounts (20% standard)
    const rowsWithRate = (rows as any[]).map(r => ({
      ...r,
      vat_rate: r.amount > 0 ? Math.round((r.vat_amount / r.amount) * 100) : 20,
    }));

    return NextResponse.json({ type: 'vat', month, rows: rowsWithRate, totals: { net: totalNet, vat: totalVAT } });
  }

  if (type === 'retention') {
    const rows = db.prepare(`
      SELECT invoice_number, submitted_at, amount, retention_rate,
             retention_amount, retention_released, retention_release_date
      FROM invoices
      WHERE subcontractor_id = ? AND retention_amount > 0
      ORDER BY submitted_at DESC
    `).all(userId);

    const totalHeld        = (rows as any[]).reduce((s, r) => s + (r.retention_amount ?? 0), 0);
    const totalReleased    = (rows as any[]).reduce((s, r) => s + (r.retention_released ?? 0), 0);
    const totalOutstanding = totalHeld - totalReleased;

    return NextResponse.json({
      type: 'retention',
      rows,
      totals: { held: totalHeld, released: totalReleased, outstanding: totalOutstanding },
    });
  }

  return NextResponse.json({ error: 'Invalid type. Use cis, vat, or retention.' }, { status: 400 });
}
