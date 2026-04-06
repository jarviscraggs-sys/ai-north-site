import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });

  const db = getDb();
  const record = db.prepare(`
    SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0 AND expires_at > datetime('now')
  `).get(token) as any;

  if (!record) return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 404 });

  return NextResponse.json({ valid: true });
}

export async function POST(req: NextRequest) {
  const db = getDb();

  try {
    const body = await req.json();
    const { token, password, confirmPassword } = body;

    if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });
    if (!password) return NextResponse.json({ error: 'Password required' }, { status: 400 });
    if (password !== confirmPassword) return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });

    const record = db.prepare(`
      SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0 AND expires_at > datetime('now')
    `).get(token) as any;

    if (!record) {
      return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 404 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, record.user_id);
    db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').run(record.id);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Reset password error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
