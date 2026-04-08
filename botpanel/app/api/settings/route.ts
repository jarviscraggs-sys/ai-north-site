import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  const business = db.prepare(
    'SELECT id, name, type, phone, email, address, bot_token, system_prompt FROM businesses WHERE id = ?'
  ).get(session.businessId);

  return NextResponse.json(business);
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name, type, phone, address, system_prompt } = await request.json();

  const db = getDb();
  db.prepare(
    'UPDATE businesses SET name = ?, type = ?, phone = ?, address = ?, system_prompt = ? WHERE id = ?'
  ).run(name, type, phone || null, address || null, system_prompt || null, session.businessId);

  return NextResponse.json({ success: true });
}
