import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sendEmail, buildRetentionReleaseEmail } from '@/lib/email';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;
  if (user.role !== 'contractor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const db = getDb();

  const body = await req.json();
  const { release_amount } = body;

  if (!release_amount || isNaN(parseFloat(release_amount)) || parseFloat(release_amount) <= 0) {
    return NextResponse.json({ error: 'Valid release amount required' }, { status: 400 });
  }

  const invoice = db.prepare(`
    SELECT i.*, u.name as subcontractor_name, u.company as subcontractor_company,
           u.email as subcontractor_email, c.company as contractor_company, c.name as contractor_name
    FROM invoices i
    JOIN users u ON i.subcontractor_id = u.id
    LEFT JOIN users c ON c.role = 'contractor'
    WHERE i.id = ?
    LIMIT 1
  `).get(id) as any;

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const currentReleased = invoice.retention_released || 0;
  const totalRetention = invoice.retention_amount || 0;
  const remaining = totalRetention - currentReleased;

  const releaseAmount = Math.min(parseFloat(release_amount), remaining);

  if (releaseAmount <= 0) {
    return NextResponse.json({ error: 'No retention remaining to release' }, { status: 400 });
  }

  const newReleased = currentReleased + releaseAmount;

  db.prepare(`
    UPDATE invoices SET retention_released = ? WHERE id = ?
  `).run(newReleased, id);

  // Notify subcontractor
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';
    await sendEmail({
      to: invoice.subcontractor_email,
      subject: `Retention Released — Invoice ${invoice.invoice_number}`,
      html: buildRetentionReleaseEmail({
        invoiceNumber: invoice.invoice_number,
        contractorCompany: invoice.contractor_company || invoice.contractor_name || 'Contractor',
        retentionReleased: releaseAmount,
        retentionRemaining: totalRetention - newReleased,
        appUrl,
        invoiceId: parseInt(id),
      }),
    });
  } catch (emailErr) {
    console.error('Retention release email error:', emailErr);
  }

  return NextResponse.json({ success: true, retention_released: newReleased });
}
