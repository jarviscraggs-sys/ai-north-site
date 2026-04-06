import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format') || 'xero';

  const invoice = db.prepare(`
    SELECT i.*, u.name as sub_name, u.company as sub_company, u.email as sub_email
    FROM invoices i JOIN users u ON i.subcontractor_id = u.id
    WHERE i.id = ?
  `).get(parseInt(id)) as any;

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (invoice.status !== 'approved') return NextResponse.json({ error: 'Only approved invoices can be exported' }, { status: 400 });

  const date = invoice.reviewed_at ? invoice.reviewed_at.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const net = invoice.amount - invoice.cis_amount;

  if (format === 'quickbooks') {
    const iif = `!TRNS\tTRNSID\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO
!SPL\tSPLID\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO
!ENDTRNS
TRNS\t${invoice.id}\tBILL\t${date}\tAccounts Payable\t${invoice.sub_company}\t${net.toFixed(2)}\t${invoice.invoice_number}
SPL\t${invoice.id}\tBILL\t${date}\tSubcontractor Costs\t${invoice.sub_company}\t-${net.toFixed(2)}\t${invoice.invoice_number}
ENDTRNS`;

    return new NextResponse(iif, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="clearclaim-${invoice.invoice_number}-quickbooks.iif"`,
      },
    });
  }

  // Xero CSV
  const csv = `ContactName,EmailAddress,Description,Quantity,UnitAmount,AccountCode,TaxType,TaxAmount\n${invoice.sub_company},${invoice.sub_email},"${invoice.description.replace(/"/g, '""')}",1,${invoice.amount.toFixed(2)},200,OUTPUT2,${invoice.vat_amount.toFixed(2)}`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="clearclaim-${invoice.invoice_number}-xero.csv"`,
    },
  });
}
