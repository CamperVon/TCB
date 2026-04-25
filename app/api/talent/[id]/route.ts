import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { hasProjectAccess } from '@/lib/session';

const ALLOWED_FIELDS = [
  'tab_id', 'name', 'age', 'imdb_id', 'photo_url', 'agency', 'agent',
  'agent_contact', 'deal_status', 'availability', 'notes', 'status',
];

async function getProjectIdForTalent(talentId: string): Promise<string | null> {
  const { rows } = await sql`SELECT project_id FROM talent WHERE id = ${talentId} LIMIT 1`;
  return rows[0]?.project_id ?? null;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const projectId = await getProjectIdForTalent(id);
  if (!projectId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!(await hasProjectAccess(projectId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const fields = Object.keys(body).filter(k => ALLOWED_FIELDS.includes(k));
  if (fields.length === 0) return NextResponse.json({ ok: true });

  // Build dynamic UPDATE — using sql.query for parameterized dynamic SQL
  const sets = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
  const values = fields.map(f => body[f] === '' ? null : body[f]);
  values.push(id);
  await sql.query(`UPDATE talent SET ${sets} WHERE id = $${values.length}`, values);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const projectId = await getProjectIdForTalent(id);
  if (!projectId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!(await hasProjectAccess(projectId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await sql`DELETE FROM talent WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
