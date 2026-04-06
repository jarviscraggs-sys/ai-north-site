import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sendEmail, buildHolidayEmail } from '@/lib/email';
import { createNotification } from '@/lib/notifications';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employee_id');
  const status = searchParams.get('status');
  const type = searchParams.get('type');

  let query: string;
  let args: any[];

  if (user.role === 'employee') {
    query = `SELECT h.*, e.name as employee_name FROM holiday_requests h
             LEFT JOIN employees e ON e.id = h.employee_id
             WHERE h.employee_id = ?`;
    args = [user.employeeId];
    if (status) { query += ` AND h.status = ?`; args.push(status); }
    query += ' ORDER BY h.start_date DESC';
  } else if (user.role === 'contractor') {
    query = `SELECT h.*, e.name as employee_name FROM holiday_requests h
             LEFT JOIN employees e ON e.id = h.employee_id
             WHERE h.contractor_id = ?`;
    args = [user.id];
    if (employeeId) { query += ` AND h.employee_id = ?`; args.push(employeeId); }
    if (status) { query += ` AND h.status = ?`; args.push(status); }
    if (type) { query += ` AND h.type = ?`; args.push(type); }
    query += ' ORDER BY h.start_date DESC';
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const holidays = db.prepare(query).all(...args);
  return NextResponse.json(holidays);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;
  if (user.role !== 'employee') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { start_date, end_date, days_requested, type, notes } = body;

  if (!start_date || !end_date || !days_requested) {
    return NextResponse.json({ error: 'start_date, end_date, days_requested required' }, { status: 400 });
  }

  const db = getDb();
  const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(user.employeeId) as any;
  if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

  const result = db.prepare(`
    INSERT INTO holiday_requests (employee_id, contractor_id, start_date, end_date, days_requested, type, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(user.employeeId, employee.contractor_id, start_date, end_date, days_requested, type || 'annual', notes || null);

  // Email contractor + in-app notification
  try {
    const contractor = db.prepare('SELECT * FROM users WHERE id = ?').get(employee.contractor_id) as any;
    if (contractor?.email) {
      const html = buildHolidayEmail({
        type: 'submitted',
        employeeName: employee.name,
        startDate: start_date,
        endDate: end_date,
        daysRequested: days_requested,
        holidayType: type || 'annual',
        contractorName: contractor.name,
        appUrl: process.env.NEXTAUTH_URL || 'http://localhost:3002',
        requestId: Number(result.lastInsertRowid),
      });
      await sendEmail({ to: contractor.email, subject: `Holiday request from ${employee.name}`, html });
    }
    // In-app notification for contractor
    createNotification(
      employee.contractor_id,
      'holiday_requested',
      'Holiday Request',
      `${employee.name} requested ${days_requested} day(s) off from ${start_date} to ${end_date}`,
      `/contractor/holidays/${Number(result.lastInsertRowid)}`
    );
  } catch (e) { console.error('Email error:', e); }

  const holiday = db.prepare('SELECT * FROM holiday_requests WHERE id = ?').get(result.lastInsertRowid);
  return NextResponse.json(holiday, { status: 201 });
}
