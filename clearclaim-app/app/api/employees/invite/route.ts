import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;
  if (user.role !== 'contractor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { name, email, role, hourly_rate, weekly_hours, holiday_allowance, start_date } = body;

  if (!name || !email) {
    return NextResponse.json({ error: 'name and email are required' }, { status: 400 });
  }

  const db = getDb();

  // Create employee record
  const empResult = db.prepare(`
    INSERT INTO employees (contractor_id, name, email, role, hourly_rate, weekly_hours, holiday_allowance, start_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
  `).run(
    Number(user.id),
    name,
    email,
    role || 'Site Worker',
    parseFloat(hourly_rate) || 0,
    parseFloat(weekly_hours) || 40,
    parseInt(holiday_allowance) || 28,
    start_date || null,
  );

  const employeeId = Number(empResult.lastInsertRowid);

  // Generate invite token
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  db.prepare(`
    INSERT INTO employee_invites (token, email, name, employee_id, contractor_id, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(token, email, name, employeeId, Number(user.id), expiresAt);

  const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3002';
  const inviteLink = `${appUrl}/register/employee?token=${token}`;

  // Send invite email
  try {
    const contractorName = user.company || user.name || 'Your employer';
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You've been invited to join ${contractorName} on ClearClaim</h2>
        <p>Hi ${name},</p>
        <p>${contractorName} has set up an account for you on ClearClaim — a platform for managing timesheets and holidays.</p>
        <p>Click the button below to set up your password and access your account:</p>
        <p style="margin: 24px 0;">
          <a href="${inviteLink}" style="background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Set up my account
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">This link expires in 7 days. If you weren't expecting this, you can ignore this email.</p>
        <p style="color: #999; font-size: 12px;">${inviteLink}</p>
      </div>
    `;
    await sendEmail({ to: email, subject: `You've been invited to join ${contractorName} on ClearClaim`, html });
  } catch (e) {
    console.error('Invite email error:', e);
  }

  return NextResponse.json({ inviteLink, employeeId }, { status: 201 });
}
