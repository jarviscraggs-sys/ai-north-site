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

    // Read the PDF as text (best-effort: some PDFs have extractable text)
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    // Attempt to extract readable text from the PDF binary
    let text = '';
    try {
      // Decode bytes as latin-1 to get raw PDF text streams
      text = Buffer.from(bytes).toString('latin1');
      // Extract text from PDF stream objects - look for BT...ET blocks
      const streamMatches = text.match(/stream[\r\n]([\s\S]*?)endstream/gi) || [];
      const readable: string[] = [];
      for (const stream of streamMatches) {
        // Extract text operators (Tj, TJ, ')
        const tjMatches = stream.match(/\(([^)]{1,200})\)\s*Tj/gi) || [];
        for (const m of tjMatches) {
          const inner = m.match(/\(([^)]+)\)/);
          if (inner) readable.push(inner[1]);
        }
        const tjArrayMatches = stream.match(/\[([^\]]+)\]\s*TJ/gi) || [];
        for (const m of tjArrayMatches) {
          const parts = m.match(/\(([^)]+)\)/g) || [];
          readable.push(parts.map(p => p.slice(1, -1)).join(''));
        }
      }
      text = readable.join(' ');
    } catch {
      text = '';
    }

    const result: any = {
      invoice_number: null,
      amount: null,
      vat_amount: null,
      work_from: null,
      work_to: null,
      company_name: null,
      description: null,
    };

    // Invoice number
    const invNumMatch = text.match(/(?:Invoice\s*(?:No|Number|#|Num)[:\s#]*)([\w\-\/]+)/i)
      || text.match(/\b(INV[-\/][\w\-\/]+)/i)
      || text.match(/\b(SI[-\/][\w\-\/]+)/i);
    if (invNumMatch) result.invoice_number = invNumMatch[1].trim();

    // Amount / Total
    const amountMatch = text.match(/(?:Total|Amount\s*Due|Grand\s*Total|Net\s*Total)[:\s]*[£$]?\s*([\d,]+\.?\d{0,2})/i)
      || text.match(/[£$]\s*([\d,]+\.\d{2})/);
    if (amountMatch) result.amount = parseFloat(amountMatch[1].replace(/,/g, ''));

    // VAT
    const vatMatch = text.match(/(?:VAT|Tax)[:\s]*[£$]?\s*([\d,]+\.?\d{0,2})/i);
    if (vatMatch) result.vat_amount = parseFloat(vatMatch[1].replace(/,/g, ''));

    // Dates
    const datePattern = /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}-\d{2}-\d{2})\b/g;
    const dates = text.match(datePattern) || [];
    const parsedDates = dates.map(d => {
      const parts = d.split(/[\/\-\.]/);
      if (parts.length === 3) {
        const y = parts[2].length === 2 ? '20' + parts[2] : parts[2];
        const m = parts[1].padStart(2, '0');
        const day = parts[0].padStart(2, '0');
        if (d.includes('-') && parts[0].length === 4) return `${parts[0]}-${m}-${day}`;
        return `${y}-${m}-${day}`;
      }
      return null;
    }).filter(Boolean);

    if (parsedDates.length >= 1) result.work_from = parsedDates[0];
    if (parsedDates.length >= 2) result.work_to = parsedDates[parsedDates.length - 1];

    // Company name
    const companyMatch = text.match(/(?:From|Bill\s*From|Issued\s*By|Company)[:\s]+([A-Z][A-Za-z\s&\.]{2,50})/);
    if (companyMatch) result.company_name = companyMatch[1].trim();

    return NextResponse.json({ parsed: result, rawTextLength: text.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
