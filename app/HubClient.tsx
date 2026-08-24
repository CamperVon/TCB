'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Project = {
  id: string;
  slug: string;
  title: string;
  author: string | null;
  details: string | null;
  talent_count: number;
  password: string | null;
};

export default function HubClient({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [toastMsg, setToastMsg] = useState('');

  function toast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 1800);
  }

  async function copyLink(slug: string, password: string | null) {
    const url = `${window.location.origin}/${slug}`;
    const text = password ? `${url}\nPassword: ${password}` : url;
    try {
      await navigator.clipboard.writeText(text);
      toast('Link + password copied');
    } catch {
      prompt('Copy link + password:', text);
    }
  }

  return (
    <div className="shell">
      <div className="topbar">
        <span className="brand">◈ The Camp Brand · Projects</span>
      </div>

      <div className="hero">
        <h1>Projects</h1>
        <div className="sub">The Camp Brand · Still Typing</div>
      </div>

      <div className="section-label">
        <span>Active Slate</span>
        <span className="count">({projects.length})</span>
      </div>

      <div className="projects">
        {projects.map(p => (
          <Link key={p.id} href={`/${p.slug}`} className="project-card">
            <h3>{p.title}</h3>
            {p.author && <div className="role-tag" style={{ fontSize: 11, marginTop: 2 }}>Written by {p.author}</div>}
            {p.details && <div className="role-tag" style={{ fontSize: 11, marginTop: 2 }}>{p.details}</div>}
            {p.password && <div className="password-tag">pw: <span className="password">{p.password}</span></div>}
            <div className="meta">
              <span>{p.talent_count} talent</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  className="btn btn-ghost"
                  style={{ padding: '3px 8px', fontSize: 9 }}
                  onClick={(e) => { e.preventDefault(); setEditProject(p); }}
                >Edit</button>
                <button
                  className="btn btn-ghost"
                  style={{ padding: '3px 8px', fontSize: 9 }}
                  onClick={(e) => { e.preventDefault(); copyLink(p.slug, p.password); }}
                >Copy link + pw</button>
              </div>
            </div>
          </Link>
        ))}
        <div className="new-project" onClick={() => setShowNew(true)}>+ New Project</div>
      </div>

      {showNew && <NewProjectModal onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); router.refresh(); }} />}
      {editProject && (
        <EditProjectModal
          project={editProject}
          onClose={() => setEditProject(null)}
          onSaved={() => { setEditProject(null); router.refresh(); toast('Project updated'); }}
        />
      )}

      {toastMsg && <div className="toast show">{toastMsg}</div>}
    </div>
  );
}

function EditProjectModal({ project, onClose, onSaved }: { project: Project; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(project.title);
  const [author, setAuthor] = useState(project.author || '');
  const [details, setDetails] = useState(project.details || '');
  const [password, setPassword] = useState(project.password || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    setError('');
    if (!title || !password) { setError('Title and password required'); return; }
    setBusy(true);
    const res = await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, author, details, password }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || 'Failed to save');
      return;
    }
    onSaved();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Edit Project</h3>
        <div className="field">
          <label>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} autoFocus />
        </div>
        <div className="field">
          <label>Written by</label>
          <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Author name(s)" />
        </div>
        <div className="field">
          <label>Details</label>
          <input value={details} onChange={e => setDetails(e.target.value)} placeholder="Website, logline, or any notes" />
        </div>
        <div className="field">
          <label>Project Password</label>
          <input type="text" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        {error && <div className="gate-error" style={{ textAlign: 'left' }}>{error}</div>}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn" onClick={save} disabled={busy}>{busy ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

function NewProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [details, setDetails] = useState('');
  const [slug, setSlug] = useState('');
  const [password, setPassword] = useState('');
  const [masterPw, setMasterPw] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function autoSlug(t: string) {
    return t.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
  }

  async function save() {
    setError('');
    if (!title || !slug || !password || !masterPw) {
      setError('All fields required');
      return;
    }
    setBusy(true);
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, author, details, slug: autoSlug(slug), password, masterPassword: masterPw }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || 'Failed to create project');
      return;
    }
    onCreated();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>New Project</h3>
        <div className="field">
          <label>Title</label>
          <input value={title} onChange={e => { setTitle(e.target.value); setSlug(autoSlug(e.target.value)); }} placeholder="e.g. Peaches" autoFocus />
        </div>
        <div className="field">
          <label>Written by</label>
          <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Author name(s)" />
        </div>
        <div className="field">
          <label>Details</label>
          <input value={details} onChange={e => setDetails(e.target.value)} placeholder="Website, logline, or any notes" />
        </div>
        <div className="field">
          <label>Slug (used in URL)</label>
          <input value={slug} onChange={e => setSlug(autoSlug(e.target.value))} placeholder="peaches" />
        </div>
        <div className="field">
          <label>Project Password</label>
          <input type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="Set a password to share with the team" />
        </div>
        <div className="field">
          <label>Master Password</label>
          <input type="password" value={masterPw} onChange={e => setMasterPw(e.target.value)} placeholder="Required to create projects" />
        </div>
        {error && <div className="gate-error" style={{ textAlign: 'left' }}>{error}</div>}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn" onClick={save} disabled={busy}>{busy ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}
