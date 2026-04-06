import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;
  if (user.role !== 'employee') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getDb();
  const employee = db.prepare(`
    SELECT e.*, u.email, u.company, u.name as user_name
    FROM employees e
    JOIN users u ON e.user_id = u.id
    WHERE e.id = ?
  `).get(user.employeeId) as any;

  if (!employee) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    ...employee,
    email: employee.email,
    company: employee.company,
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;
  if (user.role !== 'employee') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getDb();
  const body = await req.json();
  const { name } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  // Update name in users table and employees table
  db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name.trim(), user.id);
  db.prepare('UPDATE employees SET name = ? WHERE id = ?').run(name.trim(), user.employeeId);

  return NextResponse.json({ success: true });
}
