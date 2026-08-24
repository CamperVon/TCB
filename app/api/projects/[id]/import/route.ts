import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { sql } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { searchByName } from '@/lib/tmdb';

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function extractText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  if (file.name.endsWith('.pdf')) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    return data.text;
  }
  if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  return buffer.toString('utf-8');
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const pastedText = formData.get('text') as string | null;
    const tabId = formData.get('tab_id') as string | null;

    if (!file && !pastedText) {
      return NextResponse.json({ error: 'No file or text provided' }, { status: 400 });
    }

    const text = pastedText || await extractText(file!);

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `Extract all talent/cast entries from this document. Return a JSON array only, no other text.

Each entry: { "name": string, "age": number|null, "agency": string|null, "agent": string|null, "manager": string|null, "notes": string|null }

Document:
${text}`,
      }],
    });

    let parsed: any[] = [];
    const content = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try { parsed = JSON.parse(jsonMatch[0]); } catch { /* leave empty */ }
    }

    const valid = parsed.filter(e => e.name?.trim());
    if (valid.length === 0) {
      return NextResponse.json({ imported: 0, updated: 0, talent: [] });
    }

    // Fetch existing talent in this project + TMDb + cross-project rep in parallel
    const [existingRes, tmdbResults, repResults] = await Promise.all([
      sql`SELECT id, name, age, agency, agent, manager, photo_url, imdb_id FROM talent WHERE project_id = ${id}`,
      Promise.all(valid.map(e => searchByName(e.name).catch(() => null))),
      Promise.all(valid.map(async e => {
        const { rows } = await sql`
          SELECT agency, agent, agent_contact, manager, manager_contact FROM talent
          WHERE LOWER(name) = LOWER(${e.name.trim()})
            AND project_id != ${id}
            AND (agency IS NOT NULL OR agent IS NOT NULL OR manager IS NOT NULL)
          ORDER BY created_at DESC LIMIT 1
        `;
        return rows[0] || null;
      })),
    ]);

    // Build lookup map of existing talent by normalised name
    const existingByName = new Map<string, any>();
    for (const row of existingRes.rows) {
      existingByName.set(row.name.trim().toLowerCase(), row);
    }

    const countRes = await sql`SELECT COUNT(*)::int AS c FROM talent WHERE project_id = ${id}`;
    let sortBase = countRes.rows[0].c;

    let inserted = 0;
    let updated = 0;

    for (let i = 0; i < valid.length; i++) {
      const entry = valid[i];
      const tmdb = tmdbResults[i];
      const rep = repResults[i];
      const existing = existingByName.get(entry.name.trim().toLowerCase()) ?? null;

      // Resolve each field: document value > cross-project rep > TMDb > existing
      const age = entry.age || (existing ? null : tmdb?.age) || null;
      const agency = entry.agency || rep?.agency || null;
      const agent = entry.agent || rep?.agent || null;
      const manager = entry.manager || rep?.manager || null;
      const agent_contact = rep?.agent_contact || null;
      const manager_contact = rep?.manager_contact || null;
      const photo_url = tmdb?.photo_url || null;
      const imdb_id = tmdb?.imdb_id || null;
      const notes = entry.notes || null;

      if (existing) {
        // Update: only overwrite fields that have new non-null values
        const patch: Record<string, any> = {};
        if (age && !existing.age) patch.age = age;
        if (agency && !existing.agency) patch.agency = agency;
        if (agent && !existing.agent) patch.agent = agent;
        if (manager && !existing.manager) patch.manager = manager;
        if (agent_contact) patch.agent_contact = agent_contact;
        if (manager_contact) patch.manager_contact = manager_contact;
        if (photo_url && !existing.photo_url) patch.photo_url = photo_url;
        if (imdb_id && !existing.imdb_id) patch.imdb_id = imdb_id;
        if (notes && !existing.notes) patch.notes = notes;

        if (Object.keys(patch).length > 0) {
          const fields = Object.keys(patch);
          const sets = fields.map((f, idx) => `${f} = $${idx + 1}`).join(', ');
          const values = [...fields.map(f => patch[f]), existing.id];
          await sql.query(`UPDATE talent SET ${sets} WHERE id = $${values.length}`, values);
          updated++;
        }
      } else {
        // Insert new
        const talentId = generateId('t_');
        await sql`
          INSERT INTO talent (id, project_id, tab_id, name, age, imdb_id, photo_url,
                              agency, agent, agent_contact, manager, manager_contact,
                              notes, status, sort_order)
          VALUES (${talentId}, ${id}, ${tabId || null}, ${entry.name.trim()}, ${age},
                  ${imdb_id}, ${photo_url}, ${agency}, ${agent}, ${agent_contact},
                  ${manager}, ${manager_contact}, ${notes}, 'active', ${sortBase})
        `;
        sortBase++;
        inserted++;
      }
    }

    return NextResponse.json({ imported: inserted, updated, talent: [] });
  } catch (e: any) {
    console.error('Import error:', e);
    return NextResponse.json({ error: e?.message || 'Import failed' }, { status: 500 });
  }
}
