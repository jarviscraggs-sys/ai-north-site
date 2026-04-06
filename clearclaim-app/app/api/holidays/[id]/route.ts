import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sendEmail, buildHolidayEmail } from '@/lib/email';
import { createNotification } from '@/lib/notifications';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;
  const { id } = await params;
  const db = getDb();

  const holiday = db.prepare(`
    SELECT h.*, e.name as employee_name, e.email as employee_email
    FROM holiday_requests h LEFT JOIN employees e ON e.id = h.employee_id
    WHERE h.id = ?
  `).get(id) as any;

  if (!holiday) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (user.role === 'employee' && holiday.employee_id !== Number(user.employeeId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (user.role === 'contractor' && holiday.contractor_id !== Number(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(holiday);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;
  const { id } = await params;
  const db = getDb();

  const holiday = db.prepare('SELECT * FROM holiday_requests WHERE id = ?').get(id) as any;
  if (!holiday) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();

  if (user.role === 'contractor') {
    if (holiday.contractor_id !== Number(user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { status, reviewer_comment } = body;
    if (!['approved', 'rejected'].includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });

    db.prepare(`UPDATE holiday_requests SET status = ?, reviewer_comment = ?, reviewed_at = datetime('now') WHERE id = ?`)
      .run(status, reviewer_comment || null, id);

    // Update holiday_used on employee if approved
    if (status === 'approved' && holiday.type === 'annual') {
      db.prepare(`UPDATE employees SET holiday_used = holiday_used + ? WHERE id = ?`)
        .run(holiday.days_requested, holiday.employee_id);
    }

    // Email employee + in-app notification
    try {
      const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(holiday.employee_id) as any;
      if (employee?.email) {
        const html = buildHolidayEmail({
          type: status as 'approved' | 'rejected',
          employeeName: employee.name,
          startDate: holiday.start_date,
          endDate: holiday.end_date,
          daysRequested: holiday.days_requested,
          holidayType: holiday.type,
          contractorName: (db.prepare('SELECT name FROM users WHERE id = ?').get(holiday.contractor_id) as any)?.name || '',
          comment: reviewer_comment,
          appUrl: process.env.NEXTAUTH_URL || 'http://localhost:3002',
          requestId: Number(id),
        });
        await sendEmail({ to: employee.email, subject: `Holiday request ${status}`, html });
      }
      // In-app notification for employee
      if (employee?.user_id) {
        createNotification(
          employee.user_id,
          'holiday_approved',
          `Holiday Request ${status === 'approved' ? 'Approved' : 'Rejected'}`,
          `Your holiday request (${holiday.start_date} - ${holiday.end_date}) has been ${status}${reviewer_comment ? ': ' + reviewer_comment : ''}`,
          `/employee/holidays/${id}`
        );
      }
    } catch (e) { console.error('Email error:', e); }

  } else if (user.role === 'employee') {
    if (holiday.employee_id !== Number(user.employeeId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (holiday.status !== 'pending') return NextResponse.json({ error: 'Cannot cancel non-pending request' }, { status: 400 });
    db.prepare(`UPDATE holiday_requests SET status = 'rejected', reviewer_comment = 'Cancelled by employee' WHERE id = ?`).run(id);
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const updated = db.prepare('SELECT * FROM holiday_requests WHERE id = ?').get(id);
  return NextResponse.json(updated);
}
