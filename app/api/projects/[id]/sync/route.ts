import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { hasProjectAccess } from '@/lib/session';
import { searchByName } from '@/lib/tmdb';

export const maxDuration = 60;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await hasProjectAccess(id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { rows: talent } = await sql`
    SELECT id, name, age, photo_url, imdb_id, agency, agent, agent_contact, manager, manager_contact
    FROM talent WHERE project_id = ${id}
  `;

  if (talent.length === 0) return NextResponse.json({ updated: 0 });

  // Run TMDb lookups and cross-project rep lookups in parallel for all talent
  const [tmdbResults, repResults] = await Promise.all([
    Promise.all(talent.map(t => searchByName(t.name).catch(() => null))),
    Promise.all(talent.map(async t => {
      const { rows } = await sql`
        SELECT agency, agent, agent_contact, manager, manager_contact FROM talent
        WHERE LOWER(name) = LOWER(${t.name})
          AND project_id != ${id}
          AND (agency IS NOT NULL OR agent IS NOT NULL OR manager IS NOT NULL)
        ORDER BY created_at DESC LIMIT 1
      `;
      return rows[0] || null;
    })),
  ]);

  let updated = 0;

  for (let i = 0; i < talent.length; i++) {
    const t = talent[i];
    const tmdb = tmdbResults[i];
    const rep = repResults[i];

    const patch: Record<string, any> = {};

    // Always refresh age from TMDb (birthday-based, stays current)
    if (tmdb?.age && tmdb.age !== t.age) patch.age = tmdb.age;
    // Fill photo if missing
    if (tmdb?.photo_url && !t.photo_url) patch.photo_url = tmdb.photo_url;
    if (tmdb?.imdb_id && !t.imdb_id) patch.imdb_id = tmdb.imdb_id;

    // Fill rep fields from other projects only if blank
    if (rep?.agency && !t.agency) patch.agency = rep.agency;
    if (rep?.agent && !t.agent) patch.agent = rep.agent;
    if (rep?.agent_contact && !t.agent_contact) patch.agent_contact = rep.agent_contact;
    if (rep?.manager && !t.manager) patch.manager = rep.manager;
    if (rep?.manager_contact && !t.manager_contact) patch.manager_contact = rep.manager_contact;

    if (Object.keys(patch).length > 0) {
      const fields = Object.keys(patch);
      const sets = fields.map((f, idx) => `${f} = $${idx + 1}`).join(', ');
      const values = [...fields.map(f => patch[f]), t.id];
      await sql.query(`UPDATE talent SET ${sets} WHERE id = $${values.length}`, values);
      updated++;
    }
  }

  return NextResponse.json({ updated, total: talent.length });
}
