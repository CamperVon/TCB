import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';

const SECRET = process.env.MASTER_PASSWORD || 'change-me-in-production';

function sign(payload: string): string {
  const sig = createHmac('sha256', SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

function verify(token: string): string | null {
  const idx = token.lastIndexOf('.');
  if (idx < 0) return null;
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = createHmac('sha256', SECRET).update(payload).digest('hex');
  try {
    if (sig.length !== expected.length) return null;
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function setProjectAccess(projectId: string) {
  const c = await cookies();
  c.set(`pa_${projectId}`, sign(projectId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });
}

export async function hasProjectAccess(projectId: string): Promise<boolean> {
  const c = await cookies();
  const tok = c.get(`pa_${projectId}`)?.value;
  if (!tok) return false;
  return verify(tok) === projectId;
}

export async function setMasterAccess() {
  const c = await cookies();
  c.set('master', sign('master'), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
}

export async function hasMasterAccess(): Promise<boolean> {
  const c = await cookies();
  const tok = c.get('master')?.value;
  if (!tok) return false;
  return verify(tok) === 'master';
}
