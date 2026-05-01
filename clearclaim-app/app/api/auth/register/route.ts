import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';

// GET — validate token and return prefill data
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });

  const db = getDb();
  const invite = db.prepare(`
    SELECT * FROM invites WHERE token = ? AND used = 0 
    AND (expires_at > datetime('now') OR expires_at > strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  `).get(token) as any;

  if (!invite) {
    return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 404 });
  }

  return NextResponse.json({
    name: invite.name,
    company: invite.company,
    email: invite.email,
    cis_rate: invite.cis_rate,
  });
}

// POST — complete registration
export async function POST(req: NextRequest) {
  const db = getDb();

  try {
    const body = await req.json();
    const { token, password, name, company } = body;

    if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });
    if (!password) return NextResponse.json({ error: 'Password required' }, { status: 400 });
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const invite = db.prepare(`
      SELECT * FROM invites WHERE token = ? AND used = 0
      AND (expires_at > datetime('now') OR expires_at > strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    `).get(token) as any;

    if (!invite) {
      return NextResponse.json({ error: 'Invalid or expired invite. Contact your contractor for a new invite.' }, { status: 404 });
    }

    // Check user doesn't already exist
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(invite.email);
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const result = db.prepare(`
      INSERT INTO users (email, password_hash, name, company, role, cis_rate)
      VALUES (?, ?, ?, ?, 'subcontractor', ?)
    `).run(invite.email, passwordHash, name || invite.name, company || invite.company, invite.cis_rate);

    // Link subcontractor to contractor
    try {
      db.prepare(`INSERT OR IGNORE INTO subcontractor_contractors (subcontractor_id, contractor_id, cis_rate) VALUES (?, ?, ?)`)
        .run(result.lastInsertRowid, invite.contractor_id, invite.cis_rate);
    } catch(e) { /* ignore */ }

    // Mark invite as used
    db.prepare('UPDATE invites SET used = 1 WHERE id = ?').run(invite.id);

    return NextResponse.json({ success: true, userId: result.lastInsertRowid });
  } catch (e: any) {
    console.error('Registration error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
