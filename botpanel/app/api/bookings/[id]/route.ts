import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { status } = await request.json();

  if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const db = getDb();

  // Verify the booking belongs to this business
  const booking = db.prepare('SELECT id FROM bookings WHERE id = ? AND business_id = ?').get(
    parseInt(id),
    session.businessId
  );

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, parseInt(id));

  return NextResponse.json({ success: true });
}
