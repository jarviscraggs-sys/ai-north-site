import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { unlink } from 'fs/promises';
import path from 'path';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;
  if (user.role !== 'contractor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id, docId } = await params;
  const db = getDb();

  const doc = db.prepare(
    'SELECT * FROM project_documents WHERE id = ? AND project_id = ? AND contractor_id = ?'
  ).get(docId, id, user.id) as any;

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Delete file from disk
  try {
    const normalizedPath = String(doc.file_path || '')
      .replace(/^\/+/, '')
      .replace(/^uploads[\\/]+/, '');
    const filePath = path.join(process.cwd(), 'uploads', normalizedPath);
    await unlink(filePath);
  } catch {
    // File might not exist on disk; continue
  }

  db.prepare('DELETE FROM project_documents WHERE id = ?').run(docId);

  return NextResponse.json({ success: true });
}
