import nodemailer from 'nodemailer';

// Email transporter — uses Ethereal for dev/demo (no real emails, shows preview URL in console)
let transporter: nodemailer.Transporter | null = null;

async function getTransporter() {
  if (transporter) return transporter;

  // If real SMTP config provided, use it
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    return transporter;
  }

  // Default: Ethereal (test mode) — auto-creates a disposable account
  const testAccount = await nodemailer.createTestAccount();
  console.log('📧 [ClearClaim Email] Using Ethereal test account:', testAccount.user);

  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  return transporter;
}

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer | Uint8Array; contentType: string }[];
}

export async function sendEmail({ to, subject, html, attachments }: SendEmailOptions) {
  const transport = await getTransporter();

  const recipients = Array.isArray(to) ? to : [to];
  const validRecipients = recipients.filter(Boolean);
  if (validRecipients.length === 0) return;

  try {
    const info = await transport.sendMail({
      from: '"ClearClaim" <noreply@getclearclaim.co.uk>',
      to: validRecipients.join(', '),
      subject,
      html,
      attachments: attachments?.map(a => ({
        filename: a.filename,
        content: Buffer.from(a.content),
        contentType: a.contentType,
      })),
    });

    console.log('📧 [ClearClaim Email] Sent:', subject);
    console.log('📧 [ClearClaim Email] Recipients:', validRecipients.join(', '));

    // Show Ethereal preview URL for testing
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log('📧 [ClearClaim Email] Preview URL (Ethereal):', previewUrl);
    }

    return info;
  } catch (err) {
    console.error('📧 [ClearClaim Email] Failed to send:', err);
  }
}

// ─── Email HTML Template ───────────────────────────────────────────────────

function emailWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ClearClaim</title>
  <style>
    body { margin: 0; padding: 0; background: #eef2f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
    .outer { padding: 32px 16px; }
    .wrapper { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.10); }
    .header { background: linear-gradient(135deg, #0d1f4e 0%, #1a3a7c 60%, #1e4a9a 100%); padding: 28px 36px; position: relative; }
    .header-inner { display: flex; align-items: center; gap: 14px; }
    .logo-box { width: 40px; height: 40px; background: rgba(255,255,255,0.15); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
    .brand-name { margin: 0; color: #fff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .brand-tagline { margin: 2px 0 0; color: rgba(180,210,255,0.85); font-size: 12px; font-weight: 400; }
    .header-accent { position: absolute; right: 0; top: 0; bottom: 0; width: 120px; background: linear-gradient(to right, transparent, rgba(255,255,255,0.04)); border-radius: 0 16px 16px 0; }
    .body { padding: 36px; color: #1a1a2e; }
    .body p { margin: 0 0 16px; font-size: 15px; line-height: 1.7; color: #374151; }
    .summary-box { background: #f5f8ff; border: 1px solid #d6e4ff; border-radius: 10px; padding: 20px 24px; margin: 20px 0; }
    .summary-box h3 { margin: 0 0 14px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; font-weight: 700; }
    .row { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151; }
    .row:last-child { border-bottom: none; }
    .row.total { font-weight: 700; font-size: 16px; color: #0d1f4e; padding-top: 12px; margin-top: 6px; border-top: 2px solid #0d1f4e; }
    .row.deduction { color: #dc2626; }
    table.lines { width: 100%; border-collapse: collapse; font-size: 13px; margin: 16px 0; border-radius: 8px; overflow: hidden; }
    table.lines th { background: #0d1f4e; color: #e0eaff; padding: 9px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600; }
    table.lines td { padding: 9px 12px; border-bottom: 1px solid #f0f0f0; color: #374151; }
    table.lines tr:nth-child(even) td { background: #fafbff; }
    table.lines td:last-child { text-align: right; font-weight: 600; color: #0d1f4e; }
    .cta { text-align: center; margin: 32px 0; }
    .cta a { background: linear-gradient(135deg, #1a3a7c, #2563eb); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 14px rgba(37,99,235,0.35); letter-spacing: 0.2px; }
    .footer { background: #f5f7fb; padding: 22px 36px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
    .footer .footer-brand { font-weight: 700; color: #0d1f4e; font-size: 13px; margin-bottom: 6px; }
    .footer a { color: #4b6cb7; text-decoration: none; }
    .footer .unsubscribe { margin-top: 10px; font-size: 11px; color: #c0c8d8; }
    .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .tag-approved { background: #dcfce7; color: #166534; }
    .tag-rejected { background: #fee2e2; color: #991b1b; }
    .tag-queried { background: #dbeafe; color: #1e40af; }
    .divider { height: 1px; background: #e5e7eb; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="outer">
  <div class="wrapper">
    <div class="header">
      <div class="header-inner">
        <div class="logo-box">📊</div>
        <div>
          <h1 class="brand-name">ClearClaim</h1>
          <p class="brand-tagline">Construction Payment Management</p>
        </div>
      </div>
      <div class="header-accent"></div>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <div class="footer-brand">ClearClaim</div>
      <p>Questions? Contact your contractor or visit <a href="https://getclearclaim.co.uk">getclearclaim.co.uk</a></p>
      <p class="unsubscribe">This is an automated notification from ClearClaim. Please do not reply directly to this email.</p>
    </div>
  </div>
  </div>
</body>
</html>`;
}

function jobLinesTable(lines: any[]): string {
  if (!lines || lines.length === 0) return '';
  const rows = lines.map(l => `
    <tr>
      <td>${l.job_code}</td>
      <td>${l.area}</td>
      <td>${l.description}</td>
      <td>£${Number(l.line_value).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</td>
    </tr>`).join('');
  return `
    <table class="lines">
      <thead>
        <tr><th>Job Code</th><th>Area</th><th>Description</th><th>Value</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function fmt(n: number): string {
  return Number(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Email Builders ───────────────────────────────────────────────────────

export function buildNewInvoiceEmail(opts: {
  invoiceNumber: string;
  subcontractorCompany: string;
  subcontractorName: string;
  amount: number;
  vatAmount: number;
  appUrl: string;
  invoiceId: number;
  jobLines: any[];
}): string {
  const { invoiceNumber, subcontractorCompany, subcontractorName, amount, vatAmount, appUrl, invoiceId, jobLines } = opts;
  const gross = amount + vatAmount;

  return emailWrapper(`
    <p>A new invoice has been submitted and is awaiting your review.</p>

    <div class="summary-box">
      <h3>Invoice Summary</h3>
      <div class="row"><span>Invoice Number</span><span><strong>${invoiceNumber}</strong></span></div>
      <div class="row"><span>Submitted by</span><span>${subcontractorCompany} (${subcontractorName})</span></div>
      <div class="row"><span>Total (ex VAT)</span><span>£${fmt(amount)}</span></div>
      <div class="row"><span>VAT</span><span>£${fmt(vatAmount)}</span></div>
      <div class="row total"><span>Total (inc VAT)</span><span>£${fmt(gross)}</span></div>
    </div>

    <h3 style="font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin:20px 0 8px;">Job Lines</h3>
    ${jobLinesTable(jobLines)}

    <div class="cta">
      <a href="${appUrl}/contractor/invoice/${invoiceId}">Review Invoice →</a>
    </div>

    <p style="font-size:13px;color:#6b7280;">Log in to ClearClaim to approve, query, or reject this invoice.</p>
  `);
}

export function buildApprovalEmail(opts: {
  invoiceNumber: string;
  subcontractorCompany: string;
  contractorCompany: string;
  amount: number;
  vatAmount: number;
  cisRate: number;
  cisAmount: number;
  retentionAmount?: number;
  retentionRate?: number;
  appUrl: string;
  invoiceId: number;
  approvedAt: string;
  jobLines: any[];
}): string {
  const { invoiceNumber, subcontractorCompany, contractorCompany, amount, vatAmount, cisRate, cisAmount, retentionAmount, retentionRate, appUrl, invoiceId, approvedAt, jobLines } = opts;
  const retentionHeld = retentionAmount || 0;
  const effectiveRetentionRate = typeof retentionRate === 'number' ? retentionRate : 5;
  const net = amount + vatAmount - (cisAmount || 0) - retentionHeld;

  return emailWrapper(`
    <p>Great news! Your invoice has been approved by ${contractorCompany}.</p>

    <div class="summary-box">
      <h3>Payment Certificate — ${invoiceNumber}</h3>
      <div class="row"><span>Invoice Number</span><span><strong>${invoiceNumber}</strong></span></div>
      <div class="row"><span>Approved</span><span>${new Date(approvedAt).toLocaleDateString('en-GB')}</span></div>
      <div class="row"><span>Contractor</span><span>${contractorCompany}</span></div>
      <div class="row"><span>Subcontractor</span><span>${subcontractorCompany}</span></div>
    </div>

    <div class="summary-box">
      <h3>Financial Breakdown</h3>
      <div class="row"><span>Gross Amount (ex VAT)</span><span>£${fmt(amount)}</span></div>
      <div class="row"><span>VAT (20%)</span><span>£${fmt(vatAmount)}</span></div>
      ${cisAmount > 0 ? `<div class="row deduction"><span>CIS Deduction (${cisRate}%)</span><span>−£${fmt(cisAmount)}</span></div>` : ''}
      ${retentionHeld > 0 ? `<div class="row deduction"><span>Retention (${effectiveRetentionRate}%)</span><span>−£${fmt(retentionHeld)}</span></div>` : ''}
      <div class="row total"><span>Net Payment Due</span><span>£${fmt(net)}</span></div>
    </div>

    <h3 style="font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin:20px 0 8px;">Approved Job Lines</h3>
    ${jobLinesTable(jobLines)}

    <p style="font-size:13px;color:#374151;">A payment certificate PDF is attached to this email for your records.</p>

    <div class="cta">
      <a href="${appUrl}/subcontractor/invoice/${invoiceId}">View Certificate →</a>
    </div>
  `);
}

export function buildRejectionEmail(opts: {
  invoiceNumber: string;
  contractorCompany: string;
  reason: string;
  appUrl: string;
  invoiceId: number;
}): string {
  const { invoiceNumber, contractorCompany, reason, appUrl, invoiceId } = opts;

  return emailWrapper(`
    <p>Your invoice <strong>${invoiceNumber}</strong> requires attention.</p>
    <p>${contractorCompany} has rejected this invoice and provided the following reason:</p>

    <div class="summary-box" style="border-color: #fca5a5; background: #fff5f5;">
      <h3 style="color:#991b1b;">Rejection Reason</h3>
      <p style="margin:0;color:#7f1d1d;font-size:14px;">${reason || 'No reason provided.'}</p>
    </div>

    <p>Please review the details, make any necessary corrections, and resubmit a revised invoice.</p>

    <div class="cta">
      <a href="${appUrl}/subcontractor/invoice/${invoiceId}">View Invoice →</a>
    </div>
  `);
}

export function buildResubmitEmail(opts: {
  invoiceNumber: string;
  subcontractorCompany: string;
  previousStatus: string;
  appUrl: string;
  invoiceId: number;
}): string {
  const { invoiceNumber, subcontractorCompany, previousStatus, appUrl, invoiceId } = opts;
  const prevLabel = previousStatus === 'queried' ? 'query' : 'rejection';

  return emailWrapper(`
    <p><strong>${subcontractorCompany}</strong> has updated and resubmitted invoice <strong>${invoiceNumber}</strong> following your ${prevLabel}.</p>
    <p>The invoice is now back in <strong>Pending Review</strong> status and requires your attention.</p>

    <div class="summary-box" style="border-color: #fcd34d; background: #fffbeb;">
      <h3 style="color:#92400e;">Action Required</h3>
      <p style="margin:0;color:#78350f;font-size:14px;">Please review the updated invoice and approve, query, or reject it.</p>
    </div>

    <div class="cta">
      <a href="${appUrl}/contractor/invoice/${invoiceId}">Review Updated Invoice &rarr;</a>
    </div>
  `);
}

export function buildInviteEmail(opts: {
  contractorCompany: string;
  inviteLink: string;
}): string {
  const { contractorCompany, inviteLink } = opts;

  return emailWrapper(`
    <p>You've been invited to join <strong>ClearClaim</strong> by <strong>${contractorCompany}</strong>.</p>
    <p>ClearClaim is a construction payment management platform used to submit and track invoices electronically.</p>

    <div class="cta">
      <a href="${inviteLink}">Set Up Your Account →</a>
    </div>

    <p style="font-size:13px;color:#6b7280;">This invite link will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.</p>
  `);
}

export function buildPasswordResetEmail(opts: {
  resetLink: string;
}): string {
  const { resetLink } = opts;

  return emailWrapper(`
    <p>We received a request to reset your ClearClaim password.</p>
    <p>Click the button below to set a new password. This link expires in 1 hour.</p>

    <div class="cta">
      <a href="${resetLink}">Reset Password →</a>
    </div>

    <p style="font-size:13px;color:#6b7280;">If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
  `);
}

export function buildRetentionReleaseEmail(opts: {
  invoiceNumber: string;
  contractorCompany: string;
  retentionReleased: number;
  retentionRemaining: number;
  appUrl: string;
  invoiceId: number;
}): string {
  const { invoiceNumber, contractorCompany, retentionReleased, retentionRemaining, appUrl, invoiceId } = opts;

  return emailWrapper(`
    <p><strong>${contractorCompany}</strong> has released retention funds on invoice <strong>${invoiceNumber}</strong>.</p>

    <div class="summary-box">
      <h3>Retention Release</h3>
      <div class="row"><span>Invoice Number</span><span><strong>${invoiceNumber}</strong></span></div>
      <div class="row"><span>Retention Released</span><span><strong style="color:#166534;">£${fmt(retentionReleased)}</strong></span></div>
      ${retentionRemaining > 0 ? `<div class="row"><span>Remaining Retention Held</span><span>£${fmt(retentionRemaining)}</span></div>` : '<div class="row"><span>Status</span><span style="color:#166534;"><strong>All retention released</strong></span></div>'}
    </div>

    <div class="cta">
      <a href="${appUrl}/subcontractor/invoice/${invoiceId}">View Invoice →</a>
    </div>
  `);
}

export function buildTimesheetEmail(opts: {
  type: 'submitted' | 'approved' | 'rejected';
  employeeName: string;
  weekStarting: string;
  totalHours: number;
  contractorName: string;
  comment?: string;
  appUrl: string;
  timesheetId: number;
}): string {
  const { type, employeeName, weekStarting, totalHours, contractorName, comment, appUrl, timesheetId } = opts;
  const dateStr = new Date(weekStarting).toLocaleDateString('en-GB');

  if (type === 'submitted') {
    return emailWrapper(`
      <p><strong>${employeeName}</strong> has submitted a timesheet for the week starting <strong>${dateStr}</strong>.</p>
      <div class="summary-box">
        <h3>Timesheet Summary</h3>
        <div class="row"><span>Employee</span><span>${employeeName}</span></div>
        <div class="row"><span>Week Starting</span><span>${dateStr}</span></div>
        <div class="row total"><span>Total Hours</span><span>${totalHours}h</span></div>
      </div>
      <div class="cta"><a href="${appUrl}/contractor/timesheets/${timesheetId}">Review Timesheet →</a></div>
    `);
  }

  const statusLabel = type === 'approved' ? 'approved ✓' : 'rejected ✗';
  const statusColor = type === 'approved' ? '#166534' : '#991b1b';
  return emailWrapper(`
    <p>Your timesheet for the week starting <strong>${dateStr}</strong> has been <strong style="color:${statusColor}">${statusLabel}</strong> by ${contractorName}.</p>
    <div class="summary-box">
      <h3>Timesheet Details</h3>
      <div class="row"><span>Week Starting</span><span>${dateStr}</span></div>
      <div class="row"><span>Total Hours</span><span>${totalHours}h</span></div>
      <div class="row"><span>Status</span><span style="color:${statusColor};font-weight:600;">${type.toUpperCase()}</span></div>
      ${comment ? `<div class="row"><span>Comment</span><span>${comment}</span></div>` : ''}
    </div>
    <div class="cta"><a href="${appUrl}/employee/timesheets/${timesheetId}">View Timesheet →</a></div>
  `);
}

export function buildHolidayEmail(opts: {
  type: 'submitted' | 'approved' | 'rejected';
  employeeName: string;
  startDate: string;
  endDate: string;
  daysRequested: number;
  holidayType: string;
  contractorName: string;
  comment?: string;
  appUrl: string;
  requestId: number;
}): string {
  const { type, employeeName, startDate, endDate, daysRequested, holidayType, contractorName, comment, appUrl, requestId } = opts;
  const startStr = new Date(startDate).toLocaleDateString('en-GB');
  const endStr = new Date(endDate).toLocaleDateString('en-GB');

  if (type === 'submitted') {
    return emailWrapper(`
      <p><strong>${employeeName}</strong> has submitted a holiday request.</p>
      <div class="summary-box">
        <h3>Holiday Request</h3>
        <div class="row"><span>Employee</span><span>${employeeName}</span></div>
        <div class="row"><span>Start Date</span><span>${startStr}</span></div>
        <div class="row"><span>End Date</span><span>${endStr}</span></div>
        <div class="row"><span>Type</span><span style="text-transform:capitalize">${holidayType}</span></div>
        <div class="row total"><span>Days Requested</span><span>${daysRequested} days</span></div>
      </div>
      <div class="cta"><a href="${appUrl}/contractor/holidays/${requestId}">Review Request →</a></div>
    `);
  }

  const statusLabel = type === 'approved' ? 'approved ✓' : 'rejected ✗';
  const statusColor = type === 'approved' ? '#166534' : '#991b1b';
  return emailWrapper(`
    <p>Your holiday request has been <strong style="color:${statusColor}">${statusLabel}</strong> by ${contractorName}.</p>
    <div class="summary-box">
      <h3>Holiday Request Details</h3>
      <div class="row"><span>Dates</span><span>${startStr} → ${endStr}</span></div>
      <div class="row"><span>Days</span><span>${daysRequested} days</span></div>
      <div class="row"><span>Type</span><span style="text-transform:capitalize">${holidayType}</span></div>
      <div class="row"><span>Status</span><span style="color:${statusColor};font-weight:600;">${type.toUpperCase()}</span></div>
      ${comment ? `<div class="row"><span>Comment</span><span>${comment}</span></div>` : ''}
    </div>
    <div class="cta"><a href="${appUrl}/employee/holidays/${requestId}">View Request →</a></div>
  `);
}

export function buildQueryEmail(opts: {
  invoiceNumber: string;
  contractorCompany: string;
  queryText: string;
  appUrl: string;
  invoiceId: number;
}): string {
  const { invoiceNumber, contractorCompany, queryText, appUrl, invoiceId } = opts;

  return emailWrapper(`
    <p>${contractorCompany} has raised a query on your invoice <strong>${invoiceNumber}</strong>.</p>
    <p>Please review their query and respond as soon as possible.</p>

    <div class="summary-box" style="border-color: #93c5fd; background: #eff6ff;">
      <h3 style="color:#1e40af;">Query from ${contractorCompany}</h3>
      <p style="margin:0;color:#1e3a8a;font-size:14px;">${queryText || 'Please contact the contractor for details.'}</p>
    </div>

    <div class="cta">
      <a href="${appUrl}/subcontractor/invoice/${invoiceId}">View Invoice →</a>
    </div>
  `);
}
