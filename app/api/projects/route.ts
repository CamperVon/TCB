import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { generateId, slugify } from '@/lib/utils';
import bcrypt from 'bcryptjs';

export async function GET() {
  const { rows } = await sql`SELECT id, slug, title, role FROM projects ORDER BY created_at DESC`;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, role, author, slug, password, masterPassword } = body;

  if (!title || !slug || !password || !masterPassword) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  if (masterPassword !== process.env.MASTER_PASSWORD) {
    return NextResponse.json({ error: 'Wrong master password' }, { status: 403 });
  }

  const cleanSlug = slugify(slug);
  // Check uniqueness
  const existing = await sql`SELECT id FROM projects WHERE slug = ${cleanSlug} LIMIT 1`;
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: 'Slug already taken' }, { status: 400 });
  }

  const id = generateId('p_');
  const hash = await bcrypt.hash(password, 10);
  await sql`
    INSERT INTO projects (id, slug, title, role, author, password_hash, password)
    VALUES (${id}, ${cleanSlug}, ${title}, ${role || null}, ${author || null}, ${hash}, ${password})
  `;

  // Seed a default tab
  const tabId = generateId('tb_');
  await sql`
    INSERT INTO tabs (id, project_id, name, sort_order)
    VALUES (${tabId}, ${id}, 'The List', 0)
  `;

  return NextResponse.json({ id, slug: cleanSlug, title, role });
}
