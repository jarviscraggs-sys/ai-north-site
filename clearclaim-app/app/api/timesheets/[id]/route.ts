import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sendEmail, buildTimesheetEmail } from '@/lib/email';
import { createNotification } from '@/lib/notifications';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;
  const { id } = await params;
  const db = getDb();

  const timesheet = db.prepare(`
    SELECT t.*, e.name as employee_name, e.email as employee_email, p.name as project_name
    FROM timesheets t
    LEFT JOIN employees e ON e.id = t.employee_id
    LEFT JOIN projects p ON p.id = t.project_id
    WHERE t.id = ?
  `).get(id) as any;

  if (!timesheet) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (user.role === 'employee' && timesheet.employee_id !== Number(user.employeeId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (user.role === 'contractor' && timesheet.contractor_id !== Number(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(timesheet);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;
  const { id } = await params;
  const db = getDb();

  const timesheet = db.prepare('SELECT * FROM timesheets WHERE id = ?').get(id) as any;
  if (!timesheet) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();

  if (user.role === 'contractor') {
    if (timesheet.contractor_id !== Number(user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { status, reviewer_comment } = body;
    if (!['approved', 'rejected'].includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });

    db.prepare(`UPDATE timesheets SET status = ?, reviewer_comment = ?, reviewed_at = datetime('now') WHERE id = ?`)
      .run(status, reviewer_comment || null, id);

    // Email employee + in-app notification
    try {
      const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(timesheet.employee_id) as any;
      if (employee?.email) {
        const html = buildTimesheetEmail({
          type: status as 'approved' | 'rejected',
          employeeName: employee.name,
          weekStarting: timesheet.week_starting,
          totalHours: timesheet.total_hours,
          contractorName: (db.prepare('SELECT name FROM users WHERE id = ?').get(timesheet.contractor_id) as any)?.name || '',
          comment: reviewer_comment,
          appUrl: process.env.NEXTAUTH_URL || 'http://localhost:3002',
          timesheetId: Number(id),
        });
        await sendEmail({ to: employee.email, subject: `Timesheet ${status}`, html });
      }
      // In-app notification for employee
      if (employee?.user_id) {
        createNotification(
          employee.user_id,
          'timesheet_approved',
          `Timesheet ${status === 'approved' ? 'Approved' : 'Rejected'}`,
          `Your timesheet for week starting ${timesheet.week_starting} has been ${status}${reviewer_comment ? ': ' + reviewer_comment : ''}`,
          `/employee/timesheets/${id}`
        );
      }
    } catch (e) { console.error('Email error:', e); }

  } else if (user.role === 'employee') {
    if (timesheet.employee_id !== Number(user.employeeId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (timesheet.status !== 'pending') return NextResponse.json({ error: 'Cannot edit non-pending timesheet' }, { status: 400 });

    const { mon_hours, tue_hours, wed_hours, thu_hours, fri_hours, sat_hours, sun_hours, notes, project_id } = body;
    const total = (mon_hours || 0) + (tue_hours || 0) + (wed_hours || 0) + (thu_hours || 0) + (fri_hours || 0) + (sat_hours || 0) + (sun_hours || 0);

    db.prepare(`UPDATE timesheets SET mon_hours=?, tue_hours=?, wed_hours=?, thu_hours=?, fri_hours=?, sat_hours=?, sun_hours=?, total_hours=?, notes=?, project_id=? WHERE id=?`)
      .run(mon_hours, tue_hours, wed_hours, thu_hours, fri_hours, sat_hours, sun_hours, total, notes, project_id, id);
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const updated = db.prepare(`
    SELECT t.*, e.name as employee_name, p.name as project_name
    FROM timesheets t LEFT JOIN employees e ON e.id = t.employee_id LEFT JOIN projects p ON p.id = t.project_id
    WHERE t.id = ?
  `).get(id);
  return NextResponse.json(updated);
}
