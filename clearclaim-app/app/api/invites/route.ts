import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sendEmail, buildInviteEmail } from '@/lib/email';
import { randomBytes } from 'crypto';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;
  if (user.role !== 'contractor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getDb();

  try {
    const body = await req.json();
    const { name, company, email, cis_rate } = body;

    if (!name || !company || !email) {
      return NextResponse.json({ error: 'Name, company and email are required' }, { status: 400 });
    }

    const cisRateNum = parseInt(cis_rate || '20');
    if (![0, 20, 30].includes(cisRateNum)) {
      return NextResponse.json({ error: 'CIS rate must be 0, 20 or 30' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    }

    // Generate token
    const token = randomBytes(32).toString('hex');
    // Use SQLite-compatible datetime format (space not T, no Z)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').replace('Z', '').split('.')[0];

    // Invalidate any existing unused invites for this email
    db.prepare('UPDATE invites SET used = 1 WHERE email = ? AND used = 0').run(email);

    // Insert invite
    db.prepare(`
      INSERT INTO invites (token, email, name, company, cis_rate, contractor_id, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(token, email, name, company, cisRateNum, user.id, expiresAt);

    // Send invite email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';
    const inviteLink = `${appUrl}/register?token=${token}`;

    const contractor = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id) as any;
    const contractorCompany = contractor?.company || contractor?.name || 'Your Contractor';

    try {
      await sendEmail({
        to: email,
        subject: `You've been invited to join ClearClaim by ${contractorCompany}`,
        html: buildInviteEmail({ contractorCompany, inviteLink }),
      });
    } catch (emailErr) {
      console.error('Invite email error:', emailErr);
    }

    return NextResponse.json({ success: true, token, inviteLink });
  } catch (e: any) {
    console.error('Invite creation error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;
  if (user.role !== 'contractor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getDb();
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (token) {
    // Validate a specific token (for registration page)
    const invite = db.prepare(`
      SELECT * FROM invites WHERE token = ? AND used = 0 
      AND (expires_at > datetime('now') OR expires_at > strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    `).get(token) as any;
    if (!invite) return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 404 });
    return NextResponse.json({ invite });
  }

  // List invites for this contractor
  const invites = db.prepare(`
    SELECT * FROM invites WHERE contractor_id = ? ORDER BY created_at DESC
  `).all(user.id);

  return NextResponse.json({ invites });
}
