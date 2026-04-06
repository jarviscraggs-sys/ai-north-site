import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');

  const db = getDb();
  let query = `
    SELECT pd.*, u.name as uploaded_by_name
    FROM project_documents pd
    LEFT JOIN users u ON u.id = pd.uploaded_by
    WHERE pd.project_id = ?
  `;
  const args: any[] = [id];
  if (category) {
    query += ' AND pd.category = ?';
    args.push(category);
  }
  query += ' ORDER BY pd.uploaded_at DESC';

  const docs = db.prepare(query).all(...args);
  return NextResponse.json({ documents: docs });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;
  if (user.role !== 'contractor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const db = getDb();

  // Check project belongs to contractor
  const project = db.prepare('SELECT * FROM projects WHERE id = ? AND contractor_id = ?').get(id, user.id) as any;
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const category = (formData.get('category') as string) || 'general';
  const description = (formData.get('description') as string) || null;

  const safeFilename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const uploadDir = path.join(process.cwd(), 'public', 'project-docs', id);
  await mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, safeFilename);
  const bytes = await file.arrayBuffer();
  await writeFile(filePath, Buffer.from(bytes));

  const dbPath = `/project-docs/${id}/${safeFilename}`;

  const result = db.prepare(`
    INSERT INTO project_documents (project_id, contractor_id, uploaded_by, filename, original_name, file_path, file_size, mime_type, category, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, user.id, user.id, safeFilename, file.name, dbPath, file.size, file.type || null, category, description);

  const doc = db.prepare('SELECT * FROM project_documents WHERE id = ?').get(result.lastInsertRowid);
  return NextResponse.json({ document: doc }, { status: 201 });
}
