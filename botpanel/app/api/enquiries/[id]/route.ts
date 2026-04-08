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

  if (!['new', 'read', 'replied'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const db = getDb();

  const enquiry = db.prepare('SELECT id FROM enquiries WHERE id = ? AND business_id = ?').get(
    parseInt(id),
    session.businessId
  );

  if (!enquiry) {
    return NextResponse.json({ error: 'Enquiry not found' }, { status: 404 });
  }

  db.prepare('UPDATE enquiries SET status = ? WHERE id = ?').run(status, parseInt(id));

  return NextResponse.json({ success: true });
}
