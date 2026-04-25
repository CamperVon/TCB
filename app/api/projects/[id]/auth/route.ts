import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { setProjectAccess } from '@/lib/session';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { password } = await req.json();
  if (!password) return NextResponse.json({ error: 'Password required' }, { status: 400 });

  const { rows } = await sql`SELECT password_hash FROM projects WHERE id = ${id} LIMIT 1`;
  if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const ok = await bcrypt.compare(password, rows[0].password_hash);
  if (!ok) return NextResponse.json({ error: 'Wrong password' }, { status: 401 });

  await setProjectAccess(id);
  return NextResponse.json({ ok: true });
}
