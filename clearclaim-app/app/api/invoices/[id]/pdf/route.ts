import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { generateInvoicePDF } from '@/lib/pdf';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const db = getDb();
  const user = session.user as any;

  // Fetch invoice with both party details
  const invoice = db.prepare(`
    SELECT i.*,
      u.name as subcontractor_name, u.company as subcontractor_company, u.email as subcontractor_email,
      c.name as contractor_name, c.company as contractor_company, c.logo_path as contractor_logo_path
    FROM invoices i
    JOIN users u ON i.subcontractor_id = u.id
    LEFT JOIN users c ON c.role = 'contractor'
    WHERE i.id = ?
    LIMIT 1
  `).get(id) as any;

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Only approved invoices get a PDF
  if (invoice.status !== 'approved') {
    return NextResponse.json({ error: 'PDF only available for approved invoices' }, { status: 400 });
  }

  // Access control: subcontractors can only fetch their own
  if (user.role === 'subcontractor' && String(invoice.subcontractor_id) !== String(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const jobLines = db.prepare('SELECT * FROM invoice_lines WHERE invoice_id = ? ORDER BY id').all(id) as any[];

  const pdfBytes = await generateInvoicePDF(invoice, jobLines);

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="ClearClaim-Certificate-${invoice.invoice_number}.pdf"`,
      'Content-Length': String(pdfBytes.length),
    },
  });
}
