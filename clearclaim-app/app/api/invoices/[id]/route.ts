import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sendEmail, buildApprovalEmail, buildRejectionEmail, buildQueryEmail, buildResubmitEmail, buildRetentionReleaseEmail } from '@/lib/email';
import { generateInvoicePDF } from '@/lib/pdf';
import { checkDuplicates, storeDuplicateFlags } from '@/lib/duplicate-detection';
import { logAction } from '@/lib/audit';
import { createNotification } from '@/lib/notifications';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const db = getDb();
  const user = session.user as any;

  const invoice = db.prepare(`
    SELECT i.*, u.name as subcontractor_name, u.company as subcontractor_company, u.email as subcontractor_email
    FROM invoices i
    JOIN users u ON i.subcontractor_id = u.id
    WHERE i.id = ?
  `).get(id) as any;

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (user.role === 'subcontractor' && String(invoice.subcontractor_id) !== String(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const attachments = db.prepare('SELECT * FROM attachments WHERE invoice_id = ?').all(id);
  const jobLines = db.prepare('SELECT * FROM invoice_lines WHERE invoice_id = ? ORDER BY id').all(id);
  
  const flags = db.prepare(`
    SELECT f.*, 
      i2.invoice_number as matched_invoice_number,
      i2.amount as matched_amount,
      i2.description as matched_description,
      i2.work_from as matched_work_from,
      i2.work_to as matched_work_to,
      i2.cost_code as matched_cost_code,
      i2.status as matched_status
    FROM ai_flags f
    JOIN invoices i2 ON f.matched_invoice_id = i2.id
    WHERE f.invoice_id = ?
    ORDER BY f.confidence_score DESC
  `).all(id);

  return NextResponse.json({ invoice, attachments, jobLines, flags });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;
  const { id } = await params;
  const db = getDb();
  const body = await req.json();

  // ── Subcontractor edit & resubmit flow ──────────────────────────────────
  if (user.role === 'subcontractor') {
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id) as any;
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (String(invoice.subcontractor_id) !== String(user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!['queried', 'rejected'].includes(invoice.status)) {
      return NextResponse.json({ error: 'Invoice cannot be edited in its current state' }, { status: 400 });
    }

    const {
      job_description,
      work_from,
      work_to,
      cost_code,
      po_reference,
      notes,
      vat_rate,
      cis_rate,
      job_lines,
      retention_rate,
      retention_release_date,
      cumulative_value,
    } = body;

    if (!job_description || !work_from || !work_to || !job_lines?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Calculate financials
    const totalValue = job_lines.reduce((sum: number, l: any) => sum + (parseFloat(l.line_value) || 0), 0);
    const vatRateNum = parseFloat(vat_rate) || 0;
    const cisRateNum = parseFloat(cis_rate) || 0;
    const retentionRateNum = parseFloat(retention_rate) || 5.0;
    const vatAmount = totalValue * (vatRateNum / 100);
    const cisAmount = totalValue * (cisRateNum / 100);
    const retentionAmount = totalValue * (retentionRateNum / 100);

    const previousStatus = invoice.status;

    // Recalculate application data
    const lastApproved = db.prepare(`
      SELECT cumulative_value FROM invoices
      WHERE subcontractor_id = ? AND status = 'approved' AND id != ?
      ORDER BY application_number DESC LIMIT 1
    `).get(invoice.subcontractor_id, id) as any;
    const previousCertified = lastApproved ? (lastApproved.cumulative_value || 0) : 0;
    const effectiveCumulative = cumulative_value || totalValue;
    const thisApplication = effectiveCumulative - previousCertified;

    // Update invoice
    db.prepare(`
      UPDATE invoices SET
        description = ?,
        work_from = ?,
        work_to = ?,
        cost_code = ?,
        po_reference = ?,
        notes = ?,
        vat_rate = ?,
        cis_rate = ?,
        vat_amount = ?,
        cis_amount = ?,
        amount = ?,
        retention_rate = ?,
        retention_amount = ?,
        retention_release_date = ?,
        cumulative_value = ?,
        previous_certified = ?,
        this_application = ?,
        status = 'pending',
        reviewed_at = NULL
      WHERE id = ?
    `).run(
      job_description,
      work_from,
      work_to,
      cost_code || null,
      po_reference || null,
      notes || null,
      vatRateNum,
      cisRateNum,
      vatAmount,
      cisAmount,
      totalValue,
      retentionRateNum,
      retentionAmount,
      retention_release_date || null,
      effectiveCumulative,
      previousCertified,
      thisApplication,
      id,
    );

    // Delete old job lines and re-insert new ones
    db.prepare('DELETE FROM invoice_lines WHERE invoice_id = ?').run(id);
    const insertLine = db.prepare(`
      INSERT INTO invoice_lines (invoice_id, job_code, area, description, line_value)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const line of job_lines) {
      insertLine.run(id, line.job_code, line.area, line.description, parseFloat(line.line_value));
    }

    // Re-run duplicate detection
    try {
      db.prepare('DELETE FROM ai_flags WHERE invoice_id = ?').run(id);
      const updatedInvoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id) as any;
      const flags = checkDuplicates(updatedInvoice, user.id, job_lines.map((l: any) => ({
        job_code: l.job_code,
        area: l.area,
        description: l.description,
        line_value: parseFloat(l.line_value),
      })));
      if (flags.length > 0) storeDuplicateFlags(parseInt(id), flags);
    } catch (err) {
      console.error('Duplicate detection error on resubmit:', err);
    }

    // Send email notification to contractor
    try {
      const fullInvoice = db.prepare(`
        SELECT i.*,
          u.name as subcontractor_name, u.company as subcontractor_company, u.email as subcontractor_email,
          c.name as contractor_name, c.company as contractor_company, c.email as contractor_email
        FROM invoices i
        JOIN users u ON i.subcontractor_id = u.id
        LEFT JOIN users c ON c.role = 'contractor'
        WHERE i.id = ?
        LIMIT 1
      `).get(id) as any;

      if (fullInvoice?.contractor_email) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';
        await sendEmail({
          to: fullInvoice.contractor_email,
          subject: `Invoice ${fullInvoice.invoice_number} has been updated and resubmitted`,
          html: buildResubmitEmail({
            invoiceNumber: fullInvoice.invoice_number,
            subcontractorCompany: fullInvoice.subcontractor_company || fullInvoice.subcontractor_name,
            previousStatus,
            appUrl,
            invoiceId: parseInt(id),
          }),
        });
      }
    } catch (emailErr) {
      console.error('Email notification error on resubmit:', emailErr);
    }

    // Audit log for resubmit
    try {
      logAction(parseInt(id), parseInt(user.id), user.name || user.email, 'resubmitted', `Resubmitted from ${previousStatus}`);
    } catch (e) { console.error('Audit log error:', e); }

    return NextResponse.json({ success: true, flagCount: 0 });
  }

  // ── Contractor review flow ───────────────────────────────────────────────
  if (user.role !== 'contractor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { status, reviewer_comment } = body;

  if (!['approved', 'rejected', 'queried', 'pending'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  db.prepare(`
    UPDATE invoices 
    SET status = ?, reviewer_comment = ?, reviewed_at = datetime('now')
    WHERE id = ?
  `).run(status, reviewer_comment || null, id);

  // Fetch updated invoice with full party details for notifications
  try {
    const invoice = db.prepare(`
      SELECT i.*,
        u.name as subcontractor_name, u.company as subcontractor_company, u.email as subcontractor_email,
        u.accountant_email as subcontractor_accountant_email,
        c.name as contractor_name, c.company as contractor_company, c.email as contractor_email,
        c.accountant_email as contractor_accountant_email
      FROM invoices i
      JOIN users u ON i.subcontractor_id = u.id
      LEFT JOIN users c ON c.role = 'contractor'
      WHERE i.id = ?
      LIMIT 1
    `).get(id) as any;

    const jobLines = db.prepare('SELECT * FROM invoice_lines WHERE invoice_id = ? ORDER BY id').all(id) as any[];
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';

    if (invoice) {
      if (status === 'approved') {
        // Generate PDF for attachment
        const pdfBytes = await generateInvoicePDF(invoice, jobLines);
        const pdfAttachment = [{
          filename: `ClearClaim-Certificate-${invoice.invoice_number}.pdf`,
          content: Buffer.from(pdfBytes),
          contentType: 'application/pdf',
        }];

        const approvalHtml = buildApprovalEmail({
          invoiceNumber: invoice.invoice_number,
          subcontractorCompany: invoice.subcontractor_company || invoice.subcontractor_name,
          contractorCompany: invoice.contractor_company || invoice.contractor_name || 'Contractor',
          amount: invoice.amount,
          vatAmount: invoice.vat_amount,
          cisRate: invoice.cis_rate || 0,
          cisAmount: invoice.cis_amount || 0,
          retentionAmount: invoice.retention_amount || 0,
          retentionRate: invoice.retention_rate || 0,
          appUrl,
          invoiceId: parseInt(id),
          approvedAt: invoice.reviewed_at || new Date().toISOString(),
          jobLines,
        });

        const approvalRecipients = [
          invoice.subcontractor_email,
          invoice.subcontractor_accountant_email,
          invoice.contractor_accountant_email,
          invoice.contractor_email,
        ].filter(Boolean);

        console.log(`📧 [ClearClaim Approval] Sending approval email to: ${approvalRecipients.join(', ')}`);
        console.log(`📧 [ClearClaim Approval] contractor_email=${invoice.contractor_email}, contractor_accountant_email=${invoice.contractor_accountant_email}, subcontractor_email=${invoice.subcontractor_email}, subcontractor_accountant_email=${invoice.subcontractor_accountant_email}`);

        const netPaymentValue = invoice.amount + invoice.vat_amount - (invoice.cis_amount || 0) - (invoice.retention_amount || 0);
        await sendEmail({
          to: approvalRecipients,
          subject: `Invoice Approved — ${invoice.invoice_number} — Net Payment £${netPaymentValue.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`,
          html: approvalHtml,
          attachments: pdfAttachment,
        });

      } else if (status === 'rejected') {
        await sendEmail({
          to: invoice.subcontractor_email,
          subject: `Invoice Requires Attention — ${invoice.invoice_number}`,
          html: buildRejectionEmail({
            invoiceNumber: invoice.invoice_number,
            contractorCompany: invoice.contractor_company || invoice.contractor_name || 'Contractor',
            reason: reviewer_comment || '',
            appUrl,
            invoiceId: parseInt(id),
          }),
        });

      } else if (status === 'queried') {
        await sendEmail({
          to: invoice.subcontractor_email,
          subject: `Query on Invoice ${invoice.invoice_number}`,
          html: buildQueryEmail({
            invoiceNumber: invoice.invoice_number,
            contractorCompany: invoice.contractor_company || invoice.contractor_name || 'Contractor',
            queryText: reviewer_comment || '',
            appUrl,
            invoiceId: parseInt(id),
          }),
        });
      }
    }
  } catch (emailErr) {
    // Email errors should not fail the main request
    console.error('Email notification error:', emailErr);
  }

  // Audit log for contractor review
  try {
    logAction(parseInt(id), parseInt(user.id), user.name || user.email, status, reviewer_comment || undefined);
  } catch (e) { console.error('Audit log error:', e); }

  // In-app notification for subcontractor
  try {
    const notifInvoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id) as any;
    if (notifInvoice) {
      const typeMap: Record<string, string> = {
        approved: 'invoice_approved',
        rejected: 'invoice_rejected',
        queried: 'invoice_queried',
      };
      const titleMap: Record<string, string> = {
        approved: 'Invoice Approved',
        rejected: 'Invoice Rejected',
        queried: 'Query on Invoice',
      };
      const msgMap: Record<string, string> = {
        approved: `Your invoice has been approved`,
        rejected: `Your invoice has been rejected${reviewer_comment ? ': ' + reviewer_comment : ''}`,
        queried: `There is a query on your invoice${reviewer_comment ? ': ' + reviewer_comment : ''}`,
      };
      if (typeMap[status]) {
        createNotification(
          notifInvoice.subcontractor_id,
          typeMap[status],
          titleMap[status],
          msgMap[status],
          `/subcontractor/invoice/${id}`
        );
      }
    }
  } catch (e) { console.error('Notification error:', e); }

  return NextResponse.json({ success: true });
}
