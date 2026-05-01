import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as any;

  const db = getDb();
  const { searchParams } = new URL(req.url);
  const invoiceId = searchParams.get('invoice_id');
  const action = searchParams.get('action');
  const limit = parseInt(searchParams.get('limit') || '100');

  let query = `SELECT * FROM audit_log WHERE contractor_id = ?`;
  const params: any[] = [user.id];

  if (invoiceId) {
    query += ` AND invoice_id = ?`;
    params.push(parseInt(invoiceId));
  }
  if (action) {
    query += ` AND action = ?`;
    params.push(action);
  }

  query += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(limit);

  const entries = db.prepare(query).all(...params);
  return NextResponse.json({ entries });
}
