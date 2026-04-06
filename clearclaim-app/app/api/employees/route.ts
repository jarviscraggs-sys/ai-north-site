import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;
  if (user.role !== 'contractor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getDb();
  const employees = db.prepare(`
    SELECT e.*,
      (SELECT COALESCE(SUM(t.total_hours),0) FROM timesheets t 
       WHERE t.employee_id = e.id AND t.week_starting >= date('now','weekday 0','-6 days')) as hours_this_week
    FROM employees e
    WHERE e.contractor_id = ?
    ORDER BY e.name ASC
  `).all(user.id);

  return NextResponse.json(employees);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;
  if (user.role !== 'contractor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { name, email, role, hourly_rate, weekly_hours, holiday_allowance, start_date } = body;

  if (!name || !email) return NextResponse.json({ error: 'Name and email required' }, { status: 400 });

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO employees (contractor_id, name, email, role, hourly_rate, weekly_hours, holiday_allowance, start_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(user.id, name, email, role || 'employee', hourly_rate || 0, weekly_hours || 40, holiday_allowance || 28, start_date || null);

  const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(result.lastInsertRowid);
  return NextResponse.json(employee, { status: 201 });
}
