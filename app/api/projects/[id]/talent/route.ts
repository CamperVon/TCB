import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { hasProjectAccess } from '@/lib/session';
import { generateId } from '@/lib/utils';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await hasProjectAccess(id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const {
    tab_id, name, age, agency, agent, agent_contact,
    deal_status, availability, notes, imdb_id, photo_url, status,
  } = body;
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  // Sort order: max+1 within tab
  const { rows: maxRows } = await sql`
    SELECT COALESCE(MAX(sort_order), -1) AS max FROM talent
    WHERE project_id = ${id} AND (tab_id = ${tab_id || null} OR (tab_id IS NULL AND ${tab_id || null}::text IS NULL))
  `;
  const nextOrder = (maxRows[0]?.max ?? -1) + 1;

  const talentId = generateId('t_');
  const { rows } = await sql`
    INSERT INTO talent (
      id, project_id, tab_id, name, age, imdb_id, photo_url,
      agency, agent, agent_contact, deal_status, availability, notes, status, sort_order
    )
    VALUES (
      ${talentId}, ${id}, ${tab_id || null}, ${name}, ${age || null}, ${imdb_id || null}, ${photo_url || null},
      ${agency || null}, ${agent || null}, ${agent_contact || null},
      ${deal_status || null}, ${availability || null}, ${notes || null},
      ${status || 'active'}, ${nextOrder}
    )
    RETURNING id, tab_id, name, age, imdb_id, photo_url, agency, agent, agent_contact,
              deal_status, availability, notes, status, sort_order
  `;
  return NextResponse.json(rows[0]);
}
