import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { hasProjectAccess } from '@/lib/session';

export const dynamic = 'force-dynamic';

type Talent = {
  id: string; name: string; age: number | null; photo_url: string | null;
  agency: string | null; agent: string | null; agent_contact: string | null;
  manager: string | null; manager_contact: string | null;
  deal_status: string | null; availability: string | null; notes: string | null;
  status: string; tab_id: string | null;
};
type Tab = { id: string; name: string };

function initials(name: string) {
  return name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function talentRow(t: Talent): string {
  const init = initials(t.name);
  const avatar = t.photo_url
    ? `<img class="avatar-img" src="${t.photo_url}" alt="${t.name}">`
    : `<div class="avatar-init">${init}</div>`;

  const agentBlock = (t.agency || t.agent)
    ? `<div class="rep-line">${t.agency ? `<div class="rep-co">${t.agency}</div>` : ''}${t.agent ? `<div class="rep-person">${t.agent}</div>` : ''}${t.agent_contact ? `<div class="rep-contact">${t.agent_contact}</div>` : ''}</div>`
    : `<span class="empty">—</span>`;

  const managerBlock = t.manager
    ? `<div class="rep-line"><div class="rep-person">${t.manager}</div>${t.manager_contact ? `<div class="rep-contact">${t.manager_contact}</div>` : ''}</div>`
    : `<span class="empty">—</span>`;

  const statusTag = t.deal_status ? `<span class="deal-tag">${t.deal_status}</span>` : '';

  const notesBlock = [
    t.notes ? `<div class="notes-text">${t.notes}</div>` : '',
    t.availability ? `<div class="avail-text">${t.availability}</div>` : '',
  ].join('');

  return `
    <tr class="${t.status === 'pass' ? 'pass' : ''}">
      <td class="td-avatar">${avatar}</td>
      <td><div class="name">${t.name}</div>${t.age ? `<div class="age">Age ${t.age}</div>` : ''}</td>
      <td>${agentBlock}</td>
      <td>${managerBlock}</td>
      <td>${statusTag}</td>
      <td>${notesBlock}</td>
    </tr>`;
}

function buildHtml(params: {
  title: string;
  author: string | null;
  today: string;
  sections: { tabName: string; talent: Talent[]; showHeader: boolean }[];
}): string {
  const { title, author, today, sections } = params;

  const sectionsHtml = sections.map(({ tabName, talent, showHeader }) => `
    <div class="section">
      ${showHeader ? `<div class="section-title">${tabName} — ${talent.length} ${talent.length === 1 ? 'name' : 'names'}</div>` : ''}
      <table>
        <thead>
          <tr>
            <th class="td-avatar"></th>
            <th style="width:17%">Name</th>
            <th style="width:26%">Agent / Agency</th>
            <th style="width:20%">Manager</th>
            <th style="width:11%">Status</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${talent.map(talentRow).join('')}
        </tbody>
      </table>
    </div>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11pt; color: #1a1a1a; background: #fff; padding: 40px 48px; }

    .no-print { background: #f5f2ec; padding: 10px 16px; margin-bottom: 24px; border-radius: 4px; font-size: 12px; color: #555; display: flex; justify-content: space-between; align-items: center; }
    .no-print button { padding: 4px 14px; cursor: pointer; border: 1px solid #ccc; background: #fff; border-radius: 3px; font-size: 12px; }

    .doc-header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #1a1a1a; padding-bottom: 14px; margin-bottom: 28px; }
    .brand { font-size: 9pt; letter-spacing: 2px; text-transform: uppercase; color: #7a6a4a; font-weight: 600; }
    .project-title { font-size: 22pt; font-weight: 700; letter-spacing: -0.5px; line-height: 1.1; margin-top: 4px; }
    .project-meta { font-size: 9.5pt; color: #666; margin-top: 4px; }
    .doc-date { font-size: 9pt; color: #888; text-align: right; white-space: nowrap; }

    .section { margin-bottom: 32px; }
    .section-title { font-size: 8pt; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; color: #7a6a4a; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #ddd; }

    table { width: 100%; border-collapse: collapse; }
    thead th { font-size: 8pt; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #888; text-align: left; padding: 6px 10px 6px 0; border-bottom: 1px solid #e0e0e0; }
    tbody tr { border-bottom: 1px solid #f0f0f0; vertical-align: top; }
    tbody tr:last-child { border-bottom: none; }
    tbody tr.pass { opacity: 0.45; }
    td { padding: 9px 10px 9px 0; font-size: 10pt; line-height: 1.4; }

    .td-avatar { width: 38px; padding-right: 10px; }
    .avatar-img { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }
    .avatar-init { width: 32px; height: 32px; border-radius: 50%; background: #e8e0d0; color: #7a6a4a; font-size: 10pt; font-weight: 700; display: flex; align-items: center; justify-content: center; }

    .name { font-weight: 600; font-size: 11pt; }
    .age { color: #555; font-size: 9.5pt; margin-top: 2px; }
    .rep-line { font-size: 9.5pt; line-height: 1.5; }
    .rep-co { font-weight: 600; }
    .rep-person { color: #444; }
    .rep-contact { color: #888; font-size: 9pt; }
    .empty { color: #ccc; }
    .deal-tag { display: inline-block; font-size: 8pt; font-weight: 700; letter-spacing: 0.5px; padding: 2px 7px; border-radius: 3px; background: #f0ece4; color: #5a4a2a; white-space: nowrap; }
    .notes-text { font-size: 9.5pt; color: #555; line-height: 1.45; }
    .avail-text { font-size: 9pt; color: #777; margin-top: 2px; }

    .doc-footer { margin-top: 36px; padding-top: 10px; border-top: 1px solid #e0e0e0; display: flex; justify-content: space-between; font-size: 8pt; color: #aaa; letter-spacing: 0.5px; }

    @media print {
      body { padding: 0; }
      @page { margin: 14mm 16mm; size: letter portrait; }
      .no-print { display: none !important; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <script>window.addEventListener('load', () => setTimeout(() => window.print(), 400));</script>

  <div class="no-print">
    <span>Save as PDF using your browser's print dialog (Destination → Save as PDF).</span>
    <button onclick="window.print()">Print / Save PDF</button>
  </div>

  <div class="doc-header">
    <div>
      <div class="brand">◈ The Camp Brand · Talent</div>
      <div class="project-title">${title}</div>
      ${author ? `<div class="project-meta">Written by ${author}</div>` : ''}
    </div>
    <div class="doc-date">${today}</div>
  </div>

  ${sectionsHtml}

  <div class="doc-footer">
    <span>◈ The Camp Brand · projects.thecampbrand.com</span>
    <span>Confidential</span>
  </div>
</body>
</html>`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const tabId = req.nextUrl.searchParams.get('tab');

  const projRes = await sql`SELECT id, title, author FROM projects WHERE slug = ${slug} LIMIT 1`;
  const project = projRes.rows[0];
  if (!project) return new NextResponse('Not found', { status: 404 });
  if (!(await hasProjectAccess(project.id))) {
    return NextResponse.redirect(new URL(`/${slug}`, req.url));
  }

  const tabsRes = await sql`SELECT id, name FROM tabs WHERE project_id = ${project.id} ORDER BY sort_order, created_at`;
  const tabs: Tab[] = tabsRes.rows as Tab[];

  const talentRes = await sql`
    SELECT id, tab_id, name, age, photo_url, agency, agent, agent_contact,
           manager, manager_contact, deal_status, availability, notes, status
    FROM talent WHERE project_id = ${project.id} ORDER BY sort_order, created_at
  `;
  const allTalent: Talent[] = talentRes.rows as Talent[];

  const activeTabs = tabId ? tabs.filter(t => t.id === tabId) : tabs;
  const sections = activeTabs
    .map(t => ({ tabName: t.name, talent: allTalent.filter(x => x.tab_id === t.id), showHeader: !tabId || activeTabs.length > 1 }))
    .filter(s => s.talent.length > 0);

  if (!tabId) {
    const unassigned = allTalent.filter(x => !x.tab_id);
    if (unassigned.length > 0) sections.push({ tabName: 'Unassigned', talent: unassigned, showHeader: true });
  }

  const exportTitle = tabId && activeTabs[0] ? `${project.title} · ${activeTabs[0].name}` : project.title;
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const html = buildHtml({ title: exportTitle, author: project.author, today, sections });
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
