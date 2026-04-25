import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { hasProjectAccess } from '@/lib/session';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await hasProjectAccess(id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { updates } = await req.json() as { updates: { id: string; sort_order: number }[] };
  if (!Array.isArray(updates)) return NextResponse.json({ error: 'Bad payload' }, { status: 400 });

  // Run updates in parallel
  await Promise.all(updates.map(u =>
    sql`UPDATE talent SET sort_order = ${u.sort_order} WHERE id = ${u.id} AND project_id = ${id}`
  ));

  return NextResponse.json({ ok: true });
}
