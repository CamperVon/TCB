import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { hasProjectAccess } from '@/lib/session';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await hasProjectAccess(id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const tabs = await sql`SELECT id, name, sort_order FROM tabs WHERE project_id = ${id} ORDER BY sort_order, created_at`;
  const talent = await sql`
    SELECT id, tab_id, name, age, imdb_id, photo_url, agency, agent, agent_contact,
           deal_status, availability, notes, status, sort_order
    FROM talent WHERE project_id = ${id}
    ORDER BY sort_order, created_at
  `;
  return NextResponse.json({ tabs: tabs.rows, talent: talent.rows });
}
