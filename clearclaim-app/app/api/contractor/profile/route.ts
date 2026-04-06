import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;
  if (user.role !== 'contractor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getDb();
  const profile = db.prepare('SELECT id, name, email, company, logo_path, accountant_email FROM users WHERE id = ?').get(user.id) as any;
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ profile });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;
  if (user.role !== 'contractor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getDb();
  const contentType = req.headers.get('content-type') || '';

  let companyName: string | null = null;
  let logoPath: string | null = null;

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    companyName = formData.get('company') as string | null;

    const file = formData.get('logo') as File | null;
    if (file && file.size > 0) {
      if (file.size > 2 * 1024 * 1024) {
        return NextResponse.json({ error: 'Logo file must be under 2MB' }, { status: 400 });
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ error: 'Only JPG, PNG, GIF, or WebP images are allowed' }, { status: 400 });
      }

      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'logos');
      await mkdir(uploadDir, { recursive: true });

      const ext = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : file.type === 'image/gif' ? 'gif' : 'webp';
      const filename = `${user.id}.${ext}`;
      const filePath = path.join(uploadDir, filename);

      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);

      logoPath = `/uploads/logos/${filename}`;
    }
  } else {
    const body = await req.json();
    companyName = body.company ?? null;
  }

  const updates: string[] = [];
  const values: any[] = [];

  if (companyName !== null) {
    updates.push('company = ?');
    values.push(companyName);
  }
  if (logoPath !== null) {
    updates.push('logo_path = ?');
    values.push(logoPath);
  }

  if (updates.length > 0) {
    values.push(user.id);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }

  const updated = db.prepare('SELECT id, name, email, company, logo_path FROM users WHERE id = ?').get(user.id) as any;
  return NextResponse.json({ success: true, profile: updated });
}
