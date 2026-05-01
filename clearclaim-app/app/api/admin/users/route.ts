import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { cookies } from 'next/headers';

function maskEmail(email: string): string {
  if (email.toLowerCase().endsWith('@getclearclaim.co.uk')) return email;
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const masked = local.length > 2
    ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
    : local[0] + '*';
  return `${masked}@${domain}`;
}

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const adminSession = cookieStore.get('admin_session');
  if (!adminSession || adminSession.value !== 'authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  const users = db.prepare(`
    SELECT id, name, company, email, role, created_at
    FROM users
    ORDER BY created_at DESC
  `).all() as Array<Record<string, any>>;

  const maskedUsers = users.map((user) => ({
    ...user,
    email: typeof user.email === 'string' ? maskEmail(user.email) : user.email,
  }));

  return NextResponse.json({ users: maskedUsers });
}
