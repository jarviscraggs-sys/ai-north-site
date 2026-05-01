import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const db = getDb();

  const user = session.user as any;

  const dispute = db.prepare(`
    SELECT d.*, 
      i.invoice_number, i.amount as invoice_amount, i.submitted_at as invoice_date,
      i.work_from, i.work_to,
      u_sub.name as subcontractor_name, u_sub.company as subcontractor_company
    FROM disputes d
    JOIN invoices i ON d.invoice_id = i.id
    JOIN users u_sub ON d.subcontractor_id = u_sub.id
    WHERE d.id = ?
  `).get(id) as any;

  if (!dispute) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Ownership check
  if (user.role === 'contractor' && dispute.contractor_id !== Number(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (user.role === 'subcontractor' && dispute.subcontractor_id !== Number(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ dispute });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as any;
  const { id } = await params;
  const db = getDb();

  try {
    const body = await req.json();
    const { status, resolution_notes, pay_less_notice_date, payment_due_date } = body;

    const updates: string[] = [];
    const values: any[] = [];

    if (status) { updates.push('status = ?'); values.push(status); }
    if (resolution_notes !== undefined) { updates.push('resolution_notes = ?'); values.push(resolution_notes); }
    if (pay_less_notice_date !== undefined) { updates.push('pay_less_notice_date = ?'); values.push(pay_less_notice_date); }
    if (payment_due_date !== undefined) { updates.push('payment_due_date = ?'); values.push(payment_due_date); }
    if (status === 'resolved') { updates.push("resolved_at = datetime('now')"); }

    if (updates.length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

    values.push(id);
    db.prepare(`UPDATE disputes SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    if (status) {
      db.prepare(`
        INSERT INTO dispute_timeline (dispute_id, user_id, user_name, action, detail)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, user.id, user.name || user.email, `status_changed_to_${status}`, resolution_notes || `Status updated to ${status}`);
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
