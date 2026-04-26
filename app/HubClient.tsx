'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Project = {
  id: string;
  slug: string;
  title: string;
  role: string | null;
  talent_count: number;
  password: string | null;
};

export default function HubClient({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
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
            <div className="role-tag">{p.role || '—'}</div>
            {p.password && <div className="password-tag">pw: <span className="password">{p.password}</span></div>}
            <div className="meta">
              <span>{p.talent_count} talent</span>
              <button
                className="btn btn-ghost"
                style={{ padding: '3px 8px', fontSize: 9 }}
                onClick={(e) => { e.preventDefault(); copyLink(p.slug, p.password); }}
              >Copy link + pw</button>
            </div>
          </Link>
        ))}
        <div className="new-project" onClick={() => setShowNew(true)}>+ New Project</div>
      </div>

      {showNew && <NewProjectModal onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); router.refresh(); }} />}

      {toastMsg && <div className="toast show">{toastMsg}</div>}
    </div>
  );
}

function NewProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [role, setRole] = useState('');
  const [author, setAuthor] = useState('');
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
      body: JSON.stringify({ title, role, author, slug: autoSlug(slug), password, masterPassword: masterPw }),
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
          <label>Role / Tagline</label>
          <input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Anson Lime · Lead" />
        </div>
        <div className="field">
          <label>Written by</label>
          <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Author name(s)" />
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
