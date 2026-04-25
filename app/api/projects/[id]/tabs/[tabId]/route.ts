import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { hasProjectAccess } from '@/lib/session';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; tabId: string }> }) {
  const { id, tabId } = await params;
  if (!(await hasProjectAccess(id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });
  await sql`UPDATE tabs SET name = ${name} WHERE id = ${tabId} AND project_id = ${id}`;
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; tabId: string }> }) {
  const { id, tabId } = await params;
  if (!(await hasProjectAccess(id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await sql`DELETE FROM tabs WHERE id = ${tabId} AND project_id = ${id}`;
  return NextResponse.json({ ok: true });
}
