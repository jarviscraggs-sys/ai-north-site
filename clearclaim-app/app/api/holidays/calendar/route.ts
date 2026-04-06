import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;
  const db = getDb();

  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month'); // YYYY-MM
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'month param required (YYYY-MM)' }, { status: 400 });
  }

  // Determine contractor_id
  let contractorId: number;
  let myEmployeeId: string | undefined;

  if (user.role === 'contractor') {
    contractorId = Number(user.id);
  } else if (user.role === 'employee') {
    myEmployeeId = user.employeeId;
    const emp = db.prepare('SELECT contractor_id FROM employees WHERE id = ?').get(Number(myEmployeeId)) as any;
    if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    contractorId = emp.contractor_id;
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get maxPerDay setting
  const settings = db.prepare('SELECT max_holidays_per_day FROM contractor_settings WHERE contractor_id = ?').get(contractorId) as any;
  const maxPerDay = settings?.max_holidays_per_day ?? 1;

  // Get all approved holidays for this contractor that overlap with the month
  const monthStart = `${month}-01`;
  // Last day of month
  const [yr, mo] = month.split('-').map(Number);
  const lastDay = new Date(yr, mo, 0).getDate();
  const monthEnd = `${month}-${String(lastDay).padStart(2, '0')}`;

  const holidays = db.prepare(`
    SELECT h.*, e.name as employee_name, e.id as emp_id
    FROM holiday_requests h
    JOIN employees e ON e.id = h.employee_id
    WHERE h.contractor_id = ?
      AND h.status = 'approved'
      AND h.start_date <= ?
      AND h.end_date >= ?
  `).all(contractorId, monthEnd, monthStart) as any[];

  // Build day-by-day map
  const days: Record<string, { employees: any[]; count: number; atCapacity: boolean }> = {};

  for (let d = 1; d <= lastDay; d++) {
    const dateStr = `${month}-${String(d).padStart(2, '0')}`;
    const dayOfWeek = new Date(dateStr).getDay(); // 0=Sun, 6=Sat
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // skip weekends

    const empList: any[] = [];
    for (const h of holidays) {
      if (h.start_date <= dateStr && h.end_date >= dateStr) {
        empList.push({
          name: h.employee_name,
          initials: h.employee_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
          status: h.status,
          isMe: myEmployeeId ? String(h.emp_id) === String(myEmployeeId) : false,
        });
      }
    }

    if (empList.length > 0) {
      days[dateStr] = {
        employees: empList,
        count: empList.length,
        atCapacity: empList.length >= maxPerDay,
      };
    }
  }

  return NextResponse.json({ days, maxPerDay });
}
