import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sendEmail, buildPasswordResetEmail } from '@/lib/email';
import { randomBytes } from 'crypto';

export async function POST(req: NextRequest) {
  const db = getDb();

  try {
    const body = await req.json();
    const { email } = body;

    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;

    // Always return success to prevent user enumeration
    if (!user) {
      return NextResponse.json({ success: true });
    }

    // Invalidate existing tokens
    db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0').run(user.id);

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    db.prepare(`
      INSERT INTO password_reset_tokens (token, user_id, expires_at)
      VALUES (?, ?, ?)
    `).run(token, user.id, expiresAt);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';
    const resetLink = `${appUrl}/reset-password?token=${token}`;

    try {
      await sendEmail({
        to: email,
        subject: 'Reset your ClearClaim password',
        html: buildPasswordResetEmail({ resetLink }),
      });
    } catch (emailErr) {
      console.error('Password reset email error:', emailErr);
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Forgot password error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
