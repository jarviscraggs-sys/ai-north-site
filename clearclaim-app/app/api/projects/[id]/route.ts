import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as any;
  if (user.role !== 'contractor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const db = getDb();

  const project = db.prepare(`
    SELECT p.*,
      COALESCE((SELECT SUM(amount) FROM invoices WHERE project_id = p.id), 0) as total_invoiced,
      COALESCE((SELECT SUM(amount) FROM invoices WHERE project_id = p.id AND status='approved'), 0) as total_approved,
      COALESCE((SELECT SUM(value) FROM variations WHERE project_id = p.id AND status='approved'), 0) as total_variations
    FROM projects p
    WHERE p.id = ? AND p.contractor_id = ?
  `).get(id, user.id) as any;

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Get invoices for this project
  const invoices = db.prepare(`
    SELECT i.*, u.name as subcontractor_name, u.company as subcontractor_company
    FROM invoices i
    JOIN users u ON i.subcontractor_id = u.id
    WHERE i.project_id = ?
    ORDER BY i.submitted_at DESC
  `).all(id) as any[];

  return NextResponse.json({ project, invoices });
}
