import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { sql } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { searchByName } from '@/lib/tmdb';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function extractText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (file.name.endsWith('.pdf')) {
    const pdfParse = (await import('pdf-parse')).default;
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
  const { id } = await params;

  const formData = await req.formData();
  const file = formData.get('file') as File;
  const tabId = formData.get('tab_id') as string | null;

  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

  const text = await extractText(file);

  // Use Claude to parse talent from casting document
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `Extract all talent/cast entries from this casting document. Return a JSON array only, no other text.

Each entry should have: { "name": string, "age": number|null, "agency": string|null, "agent": string|null }

Document:
${text}`,
    }],
  });

  let parsed: any[] = [];
  try {
    const content = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return NextResponse.json({ error: 'Failed to parse document' }, { status: 422 });
  }

  const results = [];
  for (const entry of parsed) {
    if (!entry.name?.trim()) continue;

    let photo_url = null;
    let imdb_id = null;
    try {
      const tmdb = await searchByName(entry.name);
      photo_url = tmdb?.photo_url || null;
      imdb_id = tmdb?.imdb_id || null;
      if (!entry.age && tmdb?.age) entry.age = tmdb.age;
    } catch {}

    const talentId = generateId('t_');
    const sortRes = await sql`SELECT COUNT(*)::int AS c FROM talent WHERE project_id = ${id}`;
    const sort_order = sortRes.rows[0].c;

    await sql`
      INSERT INTO talent (id, project_id, tab_id, name, age, imdb_id, photo_url, agency, agent, status, sort_order)
      VALUES (${talentId}, ${id}, ${tabId || null}, ${entry.name.trim()}, ${entry.age || null},
              ${imdb_id}, ${photo_url}, ${entry.agency || null}, ${entry.agent || null}, 'active', ${sort_order})
    `;
    results.push({ id: talentId, name: entry.name, photo_url, agency: entry.agency, agent: entry.agent });
  }

  return NextResponse.json({ imported: results.length, talent: results });
}
