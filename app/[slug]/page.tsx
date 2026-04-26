import { sql } from '@/lib/db';
import { hasProjectAccess, hasMasterAccess } from '@/lib/session';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Gate from './Gate';
import ProjectClient from './ProjectClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const projRes = await sql`SELECT id, slug, title, role FROM projects WHERE slug = ${slug} LIMIT 1`;
  const project = projRes.rows[0];

  if (!project) return {};

  const title = project.title;
  const description = `Talent tracker for ${project.title}${project.role ? ' — ' + project.role : ''}`;
  const url = `https://projects.thecampbrand.com/${slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      siteName: '◈ The Camp Brand · Projects',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const projRes = await sql`SELECT id, slug, title, role FROM projects WHERE slug = ${slug} LIMIT 1`;
  const project = projRes.rows[0];
  if (!project) notFound();

  const [hasAccess, masterAccess] = await Promise.all([
    hasProjectAccess(project.id),
    hasMasterAccess(),
  ]);

  if (!hasAccess) {
    return <Gate projectId={project.id} title={project.title} role={project.role} showBack={masterAccess} />;
  }

  // Load tabs and talent
  const tabsRes = await sql`SELECT id, name, sort_order FROM tabs WHERE project_id = ${project.id} ORDER BY sort_order, created_at`;
  const talentRes = await sql`
    SELECT id, tab_id, name, age, imdb_id, photo_url, agency, agent, agent_contact,
           deal_status, availability, notes, status, sort_order
    FROM talent WHERE project_id = ${project.id}
    ORDER BY sort_order, created_at
  `;

  return (
    <ProjectClient
      project={project as any}
      tabs={tabsRes.rows as any}
      initialTalent={talentRes.rows as any}
      showBack={masterAccess}
    />
  );
}
