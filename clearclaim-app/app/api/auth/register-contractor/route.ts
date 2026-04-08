import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';

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
    INSERT INTO users (email, password_hash, name, company, role, created_at)
    VALUES (?, ?, ?, ?, 'contractor', datetime('now'))
  `).run(email, passwordHash, name, company);

  const contractorId = Number(result.lastInsertRowid);

  // Create default contractor settings
  db.prepare('INSERT INTO contractor_settings (contractor_id, max_holidays_per_day) VALUES (?, 1)').run(contractorId);

  // Send Telegram notification
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
