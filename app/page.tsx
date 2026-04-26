import { sql } from '@/lib/db';
import { hasMasterAccess } from '@/lib/session';
import HubClient from './HubClient';
import MasterGate from './MasterGate';

export const dynamic = 'force-dynamic';

export default async function HubPage() {
  const hasAccess = await hasMasterAccess();
  if (!hasAccess) return <MasterGate />;

  const { rows } = await sql<{
    id: string; slug: string; title: string; role: string | null;
    talent_count: number; password: string | null;
  }>`
    SELECT p.id, p.slug, p.title, p.role, p.password,
      (SELECT COUNT(*)::int FROM talent t WHERE t.project_id = p.id) AS talent_count
    FROM projects p
    ORDER BY p.created_at DESC
  `;

  return <HubClient projects={rows} />;
}
