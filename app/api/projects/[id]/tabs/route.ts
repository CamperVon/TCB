import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { hasProjectAccess } from '@/lib/session';
import { generateId } from '@/lib/utils';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await hasProjectAccess(id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  // Calculate sort_order as max+1
  const { rows: maxRows } = await sql`SELECT COALESCE(MAX(sort_order), -1) AS max FROM tabs WHERE project_id = ${id}`;
  const nextOrder = (maxRows[0]?.max ?? -1) + 1;

  const tabId = generateId('tb_');
  await sql`
    INSERT INTO tabs (id, project_id, name, sort_order)
    VALUES (${tabId}, ${id}, ${name}, ${nextOrder})
  `;
  return NextResponse.json({ id: tabId, project_id: id, name, sort_order: nextOrder });
}
