import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sendEmail, buildTimesheetEmail } from '@/lib/email';
import { createNotification } from '@/lib/notifications';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employee_id');
  const status = searchParams.get('status');
  const weekStarting = searchParams.get('week_starting');

  let query: string;
  let args: any[];

  if (user.role === 'employee') {
    query = `SELECT t.*,
                    e.name as employee_name,
                    e.role as employee_role,
                    e.hourly_rate as employee_hourly_rate,
                    p.name as project_name
             FROM timesheets t
             LEFT JOIN employees e ON e.id = t.employee_id
             LEFT JOIN projects p ON p.id = t.project_id
             WHERE t.employee_id = ?`;
    args = [user.employeeId];
    if (status) { query += ` AND t.status = ?`; args.push(status); }
    query += ' ORDER BY t.week_starting DESC';
  } else if (user.role === 'contractor') {
    query = `SELECT t.*,
                    e.name as employee_name,
                    e.role as employee_role,
                    e.hourly_rate as employee_hourly_rate,
                    p.name as project_name
             FROM timesheets t
             LEFT JOIN employees e ON e.id = t.employee_id
             LEFT JOIN projects p ON p.id = t.project_id
             WHERE t.contractor_id = ?`;
    args = [user.id];
    if (employeeId) { query += ` AND t.employee_id = ?`; args.push(employeeId); }
    if (status) { query += ` AND t.status = ?`; args.push(status); }
    if (weekStarting) { query += ` AND t.week_starting = ?`; args.push(weekStarting); }
    query += ' ORDER BY t.submitted_at DESC';
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const timesheets = db.prepare(query).all(...args);
  return NextResponse.json(timesheets);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;
  if (user.role !== 'employee') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { week_starting, project_id, mon_hours, tue_hours, wed_hours, thu_hours, fri_hours, sat_hours, sun_hours, notes } = body;

  if (!week_starting) return NextResponse.json({ error: 'week_starting required' }, { status: 400 });

  const db = getDb();
  const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(user.employeeId) as any;
  if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

  const total = (mon_hours || 0) + (tue_hours || 0) + (wed_hours || 0) + (thu_hours || 0) + (fri_hours || 0) + (sat_hours || 0) + (sun_hours || 0);

  const result = db.prepare(`
    INSERT INTO timesheets (employee_id, contractor_id, week_starting, project_id, mon_hours, tue_hours, wed_hours, thu_hours, fri_hours, sat_hours, sun_hours, total_hours, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(user.employeeId, employee.contractor_id, week_starting, project_id || null, mon_hours || 0, tue_hours || 0, wed_hours || 0, thu_hours || 0, fri_hours || 0, sat_hours || 0, sun_hours || 0, total, notes || null);

  // Email contractor
  try {
    const contractor = db.prepare('SELECT * FROM users WHERE id = ?').get(employee.contractor_id) as any;
    if (contractor?.email) {
      const html = buildTimesheetEmail({
        type: 'submitted',
        employeeName: employee.name,
        weekStarting: week_starting,
        totalHours: total,
        contractorName: contractor.name,
        appUrl: process.env.NEXTAUTH_URL || 'http://localhost:3002',
        timesheetId: Number(result.lastInsertRowid),
      });
      await sendEmail({ to: contractor.email, subject: `Timesheet submitted by ${employee.name}`, html });
    }
    // In-app notification for contractor
    createNotification(
      employee.contractor_id,
      'timesheet_submitted',
      'Timesheet Submitted',
      `${employee.name} submitted a timesheet for week starting ${week_starting}`,
      `/contractor/timesheets/${Number(result.lastInsertRowid)}`
    );
  } catch (e) { console.error('Email error:', e); }

  const timesheet = db.prepare('SELECT * FROM timesheets WHERE id = ?').get(result.lastInsertRowid);
  return NextResponse.json(timesheet, { status: 201 });
}
