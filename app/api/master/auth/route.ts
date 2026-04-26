import { NextRequest, NextResponse } from 'next/server';
import { setMasterAccess } from '@/lib/session';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (!password || password !== process.env.MASTER_PASSWORD) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }
  await setMasterAccess();
  return NextResponse.json({ ok: true });
}
