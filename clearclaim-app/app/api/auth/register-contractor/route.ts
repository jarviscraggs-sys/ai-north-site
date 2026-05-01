import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { company, name, email, password } = body;

  if (!company || !name || !email || !password) {
    return NextResponse.json({ error: 'company, name, email, and password are required' }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const db = getDb();

  // Check email not already in use
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as any;
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = db.prepare(`
    INSERT INTO users (email, password_hash, name, company, role, email_verified, created_at)
    VALUES (?, ?, ?, ?, 'contractor', 0, datetime('now'))
  `).run(email, passwordHash, name, company);

  const contractorId = Number(result.lastInsertRowid);

  // Create default contractor settings
  db.prepare('INSERT INTO contractor_settings (contractor_id, max_holidays_per_day) VALUES (?, 1)').run(contractorId);

  // Generate email verification token
  const verifyToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`
    INSERT INTO email_verifications (user_id, token, expires_at)
    VALUES (?, ?, ?)
  `).run(contractorId, verifyToken, expiresAt);

  // Send verification email
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://getclearclaim.co.uk';
    const verifyUrl = `${appUrl}/verify-email?token=${verifyToken}`;
    await sendEmail({
      to: email,
      subject: 'Verify your ClearClaim account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0f1e; color: #ffffff; padding: 40px; border-radius: 12px;">
          <h1 style="color: #3b82f6; margin-bottom: 8px;">Welcome to ClearClaim 🏗️</h1>
          <p style="color: #94a3b8; margin-bottom: 8px;">Hi ${name},</p>
          <p style="color: #94a3b8; margin-bottom: 24px;">Thanks for signing up. Please verify your email address to activate your account.</p>
          <a href="${verifyUrl}" style="display: inline-block; background: #3b82f6; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-bottom: 24px;">Verify Email Address</a>
          <p style="color: #64748b; font-size: 14px; margin-top: 24px;">This link expires in 24 hours. If you didn't sign up for ClearClaim, you can ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #1e293b; margin: 32px 0;" />
          <p style="color: #475569; font-size: 12px;">ClearClaim — Construction Invoice Management<br>getclearclaim.co.uk</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('[register-contractor] Verification email failed:', err);
  }

  // Send Telegram notification to Dayne
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken) {
      const now = new Date().toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London'
      });
      const text = `🎉 New ClearClaim signup!\n\nCompany: ${company}\nName: ${name}\nEmail: ${email}\nTime: ${now}`;
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: '1411852635', text }),
      });
    }
  } catch (err) {
    console.error('[register-contractor] Telegram notification failed:', err);
  }

  return NextResponse.json({ success: true });
}
