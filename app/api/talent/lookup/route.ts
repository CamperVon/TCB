import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name');
  if (!name?.trim()) return NextResponse.json(null);

  // Find the most recent talent record with this name that has rep info
  const { rows } = await sql`
    SELECT agency, agent, agent_contact, manager, manager_contact
    FROM talent
    WHERE LOWER(name) = LOWER(${name.trim()})
      AND (agency IS NOT NULL OR agent IS NOT NULL OR manager IS NOT NULL)
    ORDER BY created_at DESC
    LIMIT 1
  `;

  return NextResponse.json(rows[0] || null);
}
