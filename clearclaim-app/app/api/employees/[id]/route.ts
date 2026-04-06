import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;
  const { id } = await params;
  const db = getDb();

  const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(id) as any;
  if (!employee) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (user.role === 'contractor' && employee.contractor_id !== Number(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (user.role === 'employee' && employee.id !== Number(user.employeeId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(employee);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;
  if (user.role !== 'contractor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const db = getDb();
  const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(id) as any;
  if (!employee) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (employee.contractor_id !== Number(user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { name, email, role, hourly_rate, weekly_hours, holiday_allowance, holiday_used, start_date, status } = body;

  db.prepare(`
    UPDATE employees SET
      name = COALESCE(?, name),
      email = COALESCE(?, email),
      role = COALESCE(?, role),
      hourly_rate = COALESCE(?, hourly_rate),
      weekly_hours = COALESCE(?, weekly_hours),
      holiday_allowance = COALESCE(?, holiday_allowance),
      holiday_used = COALESCE(?, holiday_used),
      start_date = COALESCE(?, start_date),
      status = COALESCE(?, status)
    WHERE id = ?
  `).run(name, email, role, hourly_rate, weekly_hours, holiday_allowance, holiday_used, start_date, status, id);

  const updated = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;
  if (user.role !== 'contractor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const db = getDb();
  const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(id) as any;
  if (!employee) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (employee.contractor_id !== Number(user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  db.prepare(`UPDATE employees SET status = 'inactive' WHERE id = ?`).run(id);
  return NextResponse.json({ success: true });
}
