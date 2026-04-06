import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as any;
  const db = getDb();

  const disputes = db.prepare(`
    SELECT d.*, 
      i.invoice_number, i.amount as invoice_amount, i.submitted_at as invoice_date,
      u_sub.name as subcontractor_name, u_sub.company as subcontractor_company
    FROM disputes d
    JOIN invoices i ON d.invoice_id = i.id
    JOIN users u_sub ON d.subcontractor_id = u_sub.id
    WHERE d.contractor_id = ?
    ORDER BY CASE d.status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 WHEN 'escalated' THEN 2 ELSE 3 END, d.created_at DESC
  `).all(user.id) as any[];

  return NextResponse.json({ disputes });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as any;

  const db = getDb();
  try {
    const body = await req.json();
    let { invoice_id, subcontractor_id, dispute_type, description, amount_disputed, pay_less_notice_date, payment_due_date } = body;

    if (!invoice_id || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Subcontractors can raise disputes on their own invoices
    if (user.role === 'subcontractor') {
      const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? AND subcontractor_id = ?').get(invoice_id, user.id) as any;
      if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      subcontractor_id = user.id;
      const contractor = db.prepare("SELECT * FROM users WHERE role = 'contractor' LIMIT 1").get() as any;
      const paymentDue = new Date(invoice.submitted_at);
      paymentDue.setDate(paymentDue.getDate() + 30);
      const payLessDeadline = new Date(paymentDue);
      payLessDeadline.setDate(payLessDeadline.getDate() - 7);
      const result = db.prepare(`
        INSERT INTO disputes (invoice_id, raised_by, contractor_id, subcontractor_id, dispute_type, description, amount_disputed, payment_due_date, pay_less_notice_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(invoice_id, user.id, contractor?.id || 1, user.id, dispute_type || 'payment', description, amount_disputed || invoice.amount, paymentDue.toISOString().split('T')[0], payLessDeadline.toISOString().split('T')[0]);
      db.prepare('INSERT INTO dispute_timeline (dispute_id, user_id, user_name, action, detail) VALUES (?, ?, ?, ?, ?)').run(result.lastInsertRowid, user.id, user.name || user.email, 'Dispute Raised', `Raised by subcontractor: ${description}`);
      return NextResponse.json({ success: true, id: result.lastInsertRowid });
    }

    if (user.role !== 'contractor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (!subcontractor_id) return NextResponse.json({ error: 'Missing subcontractor_id' }, { status: 400 });

    const result = db.prepare(`
      INSERT INTO disputes (invoice_id, raised_by, contractor_id, subcontractor_id, dispute_type, description, amount_disputed, pay_less_notice_date, payment_due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(invoice_id, user.id, user.id, subcontractor_id, dispute_type || 'payment', description, amount_disputed || null, pay_less_notice_date || null, payment_due_date || null);

    const disputeId = result.lastInsertRowid as number;

    // Add initial timeline entry
    db.prepare(`
      INSERT INTO dispute_timeline (dispute_id, user_id, user_name, action, detail)
      VALUES (?, ?, ?, ?, ?)
    `).run(disputeId, user.id, user.name || user.email, 'raised', `Dispute raised: ${description}`);

    return NextResponse.json({ success: true, disputeId });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
