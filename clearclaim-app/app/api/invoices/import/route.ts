import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as any;
  if (user.role !== 'contractor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const text = await file.text();
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) return NextResponse.json({ error: 'CSV must have header + at least one data row' }, { status: 400 });

    const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    const expectedCols = ['invoice_number', 'description', 'amount', 'vat_amount', 'subcontractor_email', 'work_from', 'work_to'];

    const rows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      const row: any = { _row: i };
      for (let j = 0; j < header.length; j++) {
        row[header[j]] = cols[j] || '';
      }

      const errors: string[] = [];
      if (!row.invoice_number) errors.push('Missing invoice_number');
      if (!row.description) errors.push('Missing description');
      if (!row.amount || isNaN(parseFloat(row.amount))) errors.push('Invalid amount');
      if (row.vat_amount && isNaN(parseFloat(row.vat_amount))) errors.push('Invalid vat_amount');
      if (!row.subcontractor_email) errors.push('Missing subcontractor_email');
      if (!row.work_from) errors.push('Missing work_from');
      if (!row.work_to) errors.push('Missing work_to');

      rows.push({
        row: i,
        invoice_number: row.invoice_number || '',
        description: row.description || '',
        amount: row.amount ? parseFloat(row.amount) : 0,
        vat_amount: row.vat_amount ? parseFloat(row.vat_amount) : 0,
        subcontractor_email: row.subcontractor_email || '',
        work_from: row.work_from || '',
        work_to: row.work_to || '',
        valid: errors.length === 0,
        errors,
      });
    }

    return NextResponse.json({ rows, total: rows.length, valid: rows.filter(r => r.valid).length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
