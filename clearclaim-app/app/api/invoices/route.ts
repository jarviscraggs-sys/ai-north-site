import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { checkDuplicates, checkIntraInvoiceDuplicates, storeDuplicateFlags } from '@/lib/duplicate-detection';
import { logAction } from '@/lib/audit';
import { sendEmail, buildNewInvoiceEmail } from '@/lib/email';
import { createNotification } from '@/lib/notifications';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const user = session.user as any;
  const { searchParams } = new URL(req.url);

  const status = searchParams.get('status');
  const subcontractorId = searchParams.get('subcontractor_id');
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');
  const amountMin = searchParams.get('amount_min');
  const amountMax = searchParams.get('amount_max');

  let query = `
    SELECT i.*, u.name as subcontractor_name, u.company as subcontractor_company,
    (SELECT COUNT(*) FROM ai_flags WHERE invoice_id = i.id) as flag_count,
    (SELECT MAX(confidence_score) FROM ai_flags WHERE invoice_id = i.id) as max_flag_score,
    (SELECT COUNT(*) FROM invoice_lines WHERE invoice_id = i.id) as line_count
    FROM invoices i
    JOIN users u ON i.subcontractor_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (user.role === 'subcontractor') {
    query += ' AND i.subcontractor_id = ?';
    params.push(user.id);
  } else if (subcontractorId) {
    query += ' AND i.subcontractor_id = ?';
    params.push(subcontractorId);
  }

  if (status) {
    query += ' AND i.status = ?';
    params.push(status);
  }
  if (dateFrom) {
    query += ' AND i.submitted_at >= ?';
    params.push(dateFrom);
  }
  if (dateTo) {
    query += ' AND i.submitted_at <= ?';
    params.push(dateTo + ' 23:59:59');
  }
  if (amountMin) {
    query += ' AND i.amount >= ?';
    params.push(parseFloat(amountMin));
  }
  if (amountMax) {
    query += ' AND i.amount <= ?';
    params.push(parseFloat(amountMax));
  }

  query += ' ORDER BY i.submitted_at DESC';

  const invoices = db.prepare(query).all(...params);
  return NextResponse.json({ invoices });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;
  if (user.role !== 'subcontractor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getDb();

  try {
    const formData = await req.formData();

    const invoiceNumber = formData.get('invoice_number') as string;
    const jobDescription = formData.get('job_description') as string;
    // Keep legacy description field mapped to job_description
    const description = jobDescription || (formData.get('description') as string) || '';
    const workFrom = formData.get('work_from') as string;
    const workTo = formData.get('work_to') as string;
    const costCode = formData.get('cost_code') as string;
    const poReference = formData.get('po_reference') as string;
    const notes = formData.get('notes') as string;
    const cisRate = parseInt(formData.get('cis_rate') as string || '0');
    const retentionRate = parseFloat(formData.get('retention_rate') as string || '5.0');
    const retentionReleaseDate = formData.get('retention_release_date') as string || null;
    const cumulativeValue = parseFloat(formData.get('cumulative_value') as string || '0');
    const projectId = formData.get('project_id') ? parseInt(formData.get('project_id') as string) : null;

    // Parse job lines from formData (serialised as JSON string)
    const jobLinesRaw = formData.get('job_lines') as string;
    let jobLines: { job_code: string; area: string; description: string; line_value: number }[] = [];
    if (jobLinesRaw) {
      try {
        jobLines = JSON.parse(jobLinesRaw);
      } catch {
        return NextResponse.json({ error: 'Invalid job_lines JSON' }, { status: 400 });
      }
    }

    // Validate job lines
    if (jobLines.length === 0) {
      return NextResponse.json({ error: 'At least one job line is required' }, { status: 400 });
    }
    for (const line of jobLines) {
      if (!line.job_code || !line.area || !line.description || !line.line_value) {
        return NextResponse.json({ error: 'Each job line must have job_code, area, description and line_value' }, { status: 400 });
      }
    }

    // Calculate totals from lines
    const amount = jobLines.reduce((sum, l) => sum + (parseFloat(String(l.line_value)) || 0), 0);
    const vatRate = parseFloat(formData.get('vat_rate') as string || '0');
    let vatAmount = parseFloat(formData.get('vat_amount') as string || '0');
    if (vatRate > 0) vatAmount = amount * (vatRate / 100);
    const cisAmount = amount * (cisRate / 100);
    const retentionAmount = amount * (retentionRate / 100);

    // Application for payment: get next application number and previous certified
    const lastApproved = db.prepare(`
      SELECT application_number, cumulative_value FROM invoices
      WHERE subcontractor_id = ? AND status = 'approved'
      ORDER BY application_number DESC LIMIT 1
    `).get(user.id) as any;
    const previousCertified = lastApproved ? (lastApproved.cumulative_value || 0) : 0;
    const lastAppNum = db.prepare(`
      SELECT MAX(application_number) as maxApp FROM invoices WHERE subcontractor_id = ?
    `).get(user.id) as any;
    const applicationNumber = (lastAppNum?.maxApp || 0) + 1;
    const effectiveCumulative = cumulativeValue || amount;
    const thisApplication = effectiveCumulative - previousCertified;

    if (!invoiceNumber || !description || !workFrom || !workTo) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = db.prepare(`
      INSERT INTO invoices (subcontractor_id, invoice_number, description, amount, vat_amount, work_from, work_to, cost_code, po_reference, notes, job_description, cis_rate, cis_amount, retention_rate, retention_amount, retention_release_date, application_number, cumulative_value, previous_certified, this_application, project_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(user.id, invoiceNumber, description, amount, vatAmount, workFrom, workTo, costCode || null, poReference || null, notes || null, jobDescription || null, cisRate, cisAmount, retentionRate, retentionAmount, retentionReleaseDate, applicationNumber, effectiveCumulative, previousCertified, thisApplication, projectId);

    const invoiceId = result.lastInsertRowid as number;

    // Insert job lines
    const insertLine = db.prepare(`
      INSERT INTO invoice_lines (invoice_id, job_code, area, description, line_value)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const line of jobLines) {
      insertLine.run(invoiceId, line.job_code, line.area, line.description, parseFloat(String(line.line_value)));
    }

    // Handle file attachments
    const files = formData.getAll('attachments') as File[];
    if (files.length > 0) {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', String(invoiceId));
      await mkdir(uploadDir, { recursive: true });

      for (const file of files) {
        if (file.size > 0) {
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const filePath = path.join(uploadDir, filename);
          await writeFile(filePath, buffer);

          db.prepare(`
            INSERT INTO attachments (invoice_id, filename, file_path)
            VALUES (?, ?, ?)
          `).run(invoiceId, file.name, `/uploads/${invoiceId}/${filename}`);
        }
      }
    }

    // Run intra-invoice duplicate check first (same job code+area appearing twice on same invoice)
    const intraFlags = checkIntraInvoiceDuplicates(jobLines);
    if (intraFlags.length > 0) {
      storeDuplicateFlags(invoiceId, intraFlags);
    }

    // Run cross-invoice duplicate detection at LINE level
    const newInvoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId) as any;
    const flags = checkDuplicates(newInvoice, parseInt(user.id), jobLines);
    if (flags.length > 0) {
      storeDuplicateFlags(invoiceId, flags);
    }

    // Send email notification to contractor(s) about new invoice
    try {
      const contractors = db.prepare(`SELECT * FROM users WHERE role = 'contractor'`).all() as any[];
      const subcontractor = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id) as any;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';

      for (const contractor of contractors) {
        await sendEmail({
          to: contractor.email,
          subject: `New Invoice Submitted \u2014 ${invoiceNumber} from ${subcontractor?.company || subcontractor?.name || 'Subcontractor'}`,
          html: buildNewInvoiceEmail({
            invoiceNumber,
            subcontractorCompany: subcontractor?.company || subcontractor?.name || 'Subcontractor',
            subcontractorName: subcontractor?.name || '',
            amount,
            vatAmount,
            appUrl,
            invoiceId,
            jobLines,
          }),
        });
      }
    } catch (emailErr) {
      console.error('Email notification error (new invoice):', emailErr);
    }

    // Audit log
    try {
      logAction(invoiceId, parseInt(user.id), user.name || user.email, 'submitted', `Invoice ${invoiceNumber} submitted — £${amount.toFixed(2)}`);
    } catch (e) { console.error('Audit log error:', e); }

    // In-app notifications for contractor(s)
    try {
      const contractors2 = db.prepare(`SELECT id FROM users WHERE role = 'contractor'`).all() as any[];
      for (const c of contractors2) {
        createNotification(
          c.id,
          'invoice_submitted',
          'New Invoice Submitted',
          `Invoice ${invoiceNumber} submitted — £${amount.toFixed(2)}`,
          `/contractor/invoice/${invoiceId}`
        );
      }
    } catch (e) { console.error('Notification error:', e); }

    return NextResponse.json({ success: true, invoiceId, flagCount: flags.length });
  } catch (e: any) {
    console.error('Invoice submission error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
