import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { token, password } = body;

  if (!token || !password) {
    return NextResponse.json({ error: 'token and password are required' }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const db = getDb();

  // Validate token
  const invite = db.prepare(`
    SELECT * FROM employee_invites WHERE token = ? AND used = 0 AND expires_at > datetime('now')
  `).get(token) as any;

  if (!invite) {
    return NextResponse.json({ error: 'Invalid or expired invite link' }, { status: 400 });
  }

  // Check email not already in use
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(invite.email) as any;
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
  }

  // Create user
  const passwordHash = await bcrypt.hash(password, 12);
  const userResult = db.prepare(`
    INSERT INTO users (email, password_hash, name, role, employee_id, created_at)
    VALUES (?, ?, ?, 'employee', ?, datetime('now'))
  `).run(invite.email, passwordHash, invite.name, invite.employee_id);

  const userId = Number(userResult.lastInsertRowid);

  // Link employee record to user
  db.prepare('UPDATE employees SET user_id = ? WHERE id = ?').run(userId, invite.employee_id);

  // Mark invite used
  db.prepare('UPDATE employee_invites SET used = 1 WHERE id = ?').run(invite.id);

  return NextResponse.json({ success: true });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'token required' }, { status: 400 });
  }

  const db = getDb();
  const invite = db.prepare(`
    SELECT name, email FROM employee_invites WHERE token = ? AND used = 0 AND expires_at > datetime('now')
  `).get(token) as any;

  if (!invite) {
    return NextResponse.json({ error: 'Invalid or expired invite link' }, { status: 400 });
  }

  return NextResponse.json(invite);
}
