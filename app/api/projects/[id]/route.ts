import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { hasMasterAccess } from '@/lib/session';
import bcrypt from 'bcryptjs';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!(await hasMasterAccess())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { title, author, details, password } = await req.json();
  if (!title || !password) {
    return NextResponse.json({ error: 'Title and password required' }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 10);
  await sql`
    UPDATE projects
    SET title = ${title}, author = ${author || null}, details = ${details || null},
        password = ${password}, password_hash = ${hash}
    WHERE id = ${id}
  `;

  return NextResponse.json({ ok: true });
}
