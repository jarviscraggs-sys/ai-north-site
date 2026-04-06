import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as any;
  if (user.role !== 'contractor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const db = getDb();
  const body = await req.json();
  const { document_type, document_name, expiry_date, notes } = body;

  const item = db.prepare('SELECT * FROM subcontractor_compliance WHERE id = ?').get(id) as any;
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (item.contractor_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const today = new Date().toISOString().split('T')[0];
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  let status = 'valid';
  const effectiveExpiry = expiry_date !== undefined ? expiry_date : item.expiry_date;
  if (effectiveExpiry) {
    if (effectiveExpiry < today) status = 'expired';
    else if (effectiveExpiry <= in30Days) status = 'expiring_soon';
  }

  db.prepare(`
    UPDATE subcontractor_compliance
    SET document_type = ?, document_name = ?, expiry_date = ?, notes = ?, status = ?
    WHERE id = ?
  `).run(
    document_type ?? item.document_type,
    document_name ?? item.document_name,
    effectiveExpiry ?? null,
    notes ?? item.notes,
    status,
    id
  );

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as any;
  if (user.role !== 'contractor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const db = getDb();
  const item = db.prepare('SELECT * FROM subcontractor_compliance WHERE id = ?').get(id) as any;
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (item.contractor_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  db.prepare('DELETE FROM subcontractor_compliance WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
