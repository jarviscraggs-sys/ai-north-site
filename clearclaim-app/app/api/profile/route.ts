import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const user = session.user as any;

  const profile = db.prepare('SELECT id, email, name, company, role, accountant_email, created_at FROM users WHERE id = ?').get(user.id) as any;
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ profile });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const user = session.user as any;

  const { accountant_email } = await req.json();

  db.prepare('UPDATE users SET accountant_email = ? WHERE id = ?').run(accountant_email || null, user.id);

  console.log(`📧 [ClearClaim Profile] User ${user.id} (${user.email}) saved accountant_email: ${accountant_email || '(cleared)'}`);

  return NextResponse.json({ success: true });
}
