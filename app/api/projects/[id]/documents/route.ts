import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { sql } from '@/lib/db';
import { generateId } from '@/lib/utils';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { rows } = await sql`SELECT * FROM documents WHERE project_id = ${id} ORDER BY created_at DESC`;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const formData = await req.formData();
  const file = formData.get('file') as File;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const blob = await put(`projects/${id}/${file.name}`, file, { access: 'public' });

  const docId = generateId('doc_');
  await sql`
    INSERT INTO documents (id, project_id, name, url, size, type)
    VALUES (${docId}, ${id}, ${file.name}, ${blob.url}, ${file.size}, ${file.type})
  `;

  return NextResponse.json({ id: docId, name: file.name, url: blob.url });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { docId } = await req.json();
  await sql`DELETE FROM documents WHERE id = ${docId} AND project_id = ${id}`;
  return NextResponse.json({ ok: true });
}
