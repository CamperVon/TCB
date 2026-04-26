'use client';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Project = { id: string; slug: string; title: string; role: string | null; author: string | null };
type Doc = { id: string; name: string; url: string; size: number | null; type: string | null };
type Tab = { id: string; name: string; sort_order: number };
type Talent = {
  id: string; tab_id: string | null; name: string; age: number | null;
  imdb_id: string | null; photo_url: string | null;
  agency: string | null; agent: string | null; agent_contact: string | null;
  deal_status: string | null; availability: string | null; notes: string | null;
  status: 'active' | 'pass'; sort_order: number;
};

export default function ProjectClient({ project, tabs: initialTabs, initialTalent, initialDocs, showBack }: {
  project: Project; tabs: Tab[]; initialTalent: Talent[]; initialDocs: Doc[]; showBack?: boolean;
}) {
  const router = useRouter();
  const [tabs, setTabs] = useState<Tab[]>(initialTabs);
  const [talent, setTalent] = useState<Talent[]>(initialTalent);
  const [activeTabId, setActiveTabId] = useState<string | null>(initialTabs[0]?.id ?? null);
  const [docs, setDocs] = useState<Doc[]>(initialDocs);
  const [showAdd, setShowAdd] = useState(false);
  const [showNewTab, setShowNewTab] = useState(false);
  const [showImportPaste, setShowImportPaste] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [importing, setImporting] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  function toast(msg: string) { setToastMsg(msg); setTimeout(() => setToastMsg(''), 1800); }

  const visibleTalent = useMemo(() => {
    if (!activeTabId) return talent.filter(t => !t.tab_id);
    return talent.filter(t => t.tab_id === activeTabId).sort((a, b) => a.sort_order - b.sort_order);
  }, [talent, activeTabId]);

  async function copyLink() {
    const url = `${window.location.origin}/${project.slug}`;
    try { await navigator.clipboard.writeText(url); toast('Link copied'); }
    catch { prompt('Copy link:', url); }
  }

  async function refreshAll() {
    const res = await fetch(`/api/projects/${project.id}/full`);
    if (res.ok) {
      const data = await res.json();
      setTabs(data.tabs);
      setTalent(data.talent);
    }
  }

  async function importData(file?: File, text?: string) {
    setImporting(true);
    const form = new FormData();
    if (file) form.append('file', file);
    if (text) form.append('text', text);
    if (activeTabId) form.append('tab_id', activeTabId);
    const res = await fetch(`/api/projects/${project.id}/import`, { method: 'POST', body: form });
    setImporting(false);
    if (res.ok) {
      const data = await res.json();
      await refreshAll();
      toast(`Imported ${data.imported} talent`);
      setShowImportPaste(false);
    } else {
      toast('Import failed');
    }
  }

  async function uploadDoc(file: File) {
    setUploadingDoc(true);
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`/api/projects/${project.id}/documents`, { method: 'POST', body: form });
    setUploadingDoc(false);
    if (res.ok) {
      const doc = await res.json();
      setDocs([doc, ...docs]);
      toast('Document uploaded');
    } else {
      toast('Upload failed');
    }
  }

  async function deleteDoc(docId: string) {
    await fetch(`/api/projects/${project.id}/documents`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docId }),
    });
    setDocs(docs.filter(d => d.id !== docId));
    toast('Removed');
  }

  async function addTab(name: string) {
    const res = await fetch(`/api/projects/${project.id}/tabs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const newTab = await res.json();
      setTabs([...tabs, newTab]);
      setActiveTabId(newTab.id);
      toast('Tab added');
    }
  }

  async function renameTab(tabId: string) {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;
    const newName = prompt('Rename tab:', tab.name);
    if (!newName || newName === tab.name) return;
    const res = await fetch(`/api/projects/${project.id}/tabs/${tabId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    if (res.ok) {
      setTabs(tabs.map(t => t.id === tabId ? { ...t, name: newName } : t));
    }
  }

  async function deleteTab(tabId: string) {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;
    const inTab = talent.filter(t => t.tab_id === tabId).length;
    if (inTab > 0) {
      if (!confirm(`Delete tab "${tab.name}"? The ${inTab} talent in it will become unassigned (you can reassign or delete them).`)) return;
    } else {
      if (!confirm(`Delete tab "${tab.name}"?`)) return;
    }
    const res = await fetch(`/api/projects/${project.id}/tabs/${tabId}`, { method: 'DELETE' });
    if (res.ok) {
      const remaining = tabs.filter(t => t.id !== tabId);
      setTabs(remaining);
      setTalent(talent.map(t => t.tab_id === tabId ? { ...t, tab_id: null } : t));
      setActiveTabId(remaining[0]?.id ?? null);
    }
  }

  async function updateTalent(id: string, patch: Partial<Talent>) {
    setTalent(talent.map(t => t.id === id ? { ...t, ...patch } : t));
    const res = await fetch(`/api/talent/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) toast('Update failed');
  }

  async function removeTalent(id: string) {
    if (!confirm('Remove this talent from the list?')) return;
    setTalent(talent.filter(t => t.id !== id));
    await fetch(`/api/talent/${id}`, { method: 'DELETE' });
    toast('Removed');
  }

  async function addTalentRow(payload: any) {
    const res = await fetch(`/api/projects/${project.id}/talent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, tab_id: activeTabId }),
    });
    if (res.ok) {
      const newT = await res.json();
      setTalent([...talent, newT]);
      toast('Added');
      return true;
    }
    return false;
  }

  async function reorderTalent(srcId: string, targetId: string, placeAbove: boolean) {
    const inTab = visibleTalent.slice();
    const srcIdx = inTab.findIndex(t => t.id === srcId);
    const [moved] = inTab.splice(srcIdx, 1);
    let targetIdx = inTab.findIndex(t => t.id === targetId);
    if (!placeAbove) targetIdx += 1;
    inTab.splice(targetIdx, 0, moved);
    // assign new sort_order
    const updates = inTab.map((t, i) => ({ id: t.id, sort_order: i }));
    setTalent(talent.map(t => {
      const u = updates.find(x => x.id === t.id);
      return u ? { ...t, sort_order: u.sort_order } : t;
    }));
    await fetch(`/api/projects/${project.id}/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates }),
    });
  }

  const tabCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of talent) {
      const k = t.tab_id ?? '_unassigned';
      m[k] = (m[k] ?? 0) + 1;
    }
    return m;
  }, [talent]);

  return (
    <div className="shell">
      <div className="topbar">
        <span className="brand">◈ The Camp Brand · Projects</span>
        {showBack && <Link href="/"><button className="btn btn-ghost">← All Projects</button></Link>}
      </div>

      <div className="hero">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1>{project.title}</h1>
            <div className="sub">
              Talent Tracker
              {project.role && <span className="role"> · {project.role}</span>}
              {project.author && <span className="role"> · Written by {project.author}</span>}
            </div>
          </div>
          <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, marginTop: 8 }}>
            <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => setShowDocs(!showDocs)}>
              📄 {docs.length} doc{docs.length !== 1 ? 's' : ''}
            </button>
          </label>
        </div>
        {showDocs && (
          <div style={{ marginTop: 16, padding: '16px 20px', background: 'var(--bg-2)', border: '1px solid var(--rule)', borderRadius: 4 }}>
            {docs.length === 0 && <div style={{ color: 'var(--ink-faint)', fontSize: 13, marginBottom: 12 }}>No documents yet.</div>}
            {docs.map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <a href={d.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, fontSize: 13, color: 'var(--gold-deep)' }}>{d.name}</a>
                <button className="btn btn-ghost" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => deleteDoc(d.id)}>✕</button>
              </div>
            ))}
            <label className="btn btn-ghost" style={{ cursor: 'pointer', fontSize: 11, marginTop: 8 }}>
              {uploadingDoc ? 'Uploading...' : '+ Upload Document'}
              <input type="file" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadDoc(f); e.target.value = ''; }}
              />
            </label>
          </div>
        )}
      </div>

      <div className="tracker-header">
        <div></div>
        <div className="tracker-actions">
          <button className="btn" onClick={() => setShowAdd(!showAdd)}>+ Add Talent</button>
          <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
            {importing ? 'Importing...' : 'Import File'}
            <input type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) importData(f); e.target.value = ''; }}
            />
          </label>
          <button className="btn btn-ghost" onClick={() => setShowImportPaste(!showImportPaste)}>Paste List</button>
          <button className="btn btn-ghost" onClick={copyLink}>Copy Link</button>
        </div>
      </div>

      <div className="tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`tab ${activeTabId === t.id ? 'active' : ''}`}
            onClick={() => setActiveTabId(t.id)}
            onDoubleClick={() => renameTab(t.id)}
            title="Double-click to rename"
          >
            {t.name}
            <span className="tab-count">{tabCounts[t.id] ?? 0}</span>
            {activeTabId === t.id && (
              <span
                style={{ marginLeft: 8, color: 'var(--ink-faint)', fontSize: 11 }}
                onClick={e => { e.stopPropagation(); deleteTab(t.id); }}
                title="Delete tab"
              >✕</span>
            )}
          </button>
        ))}
        <button className="tab tab-add" onClick={() => setShowNewTab(true)}>+ New Tab</button>
      </div>

      {showAdd && (
        <AddTalentForm
          onAdd={async (p) => { const ok = await addTalentRow(p); if (ok) setShowAdd(false); }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      <ul className="talent-list">
        {visibleTalent.length === 0 ? (
          <li className="empty">No talent in this tab yet. Click + Add Talent to start.</li>
        ) : (
          visibleTalent.map(t => (
            <TalentRow
              key={t.id}
              talent={t}
              onUpdate={updateTalent}
              onRemove={removeTalent}
              onReorder={reorderTalent}
            />
          ))
        )}
      </ul>

      {showNewTab && (
        <NewTabModal
          onSave={(name) => { addTab(name); setShowNewTab(false); }}
          onClose={() => setShowNewTab(false)}
        />
      )}

      {showImportPaste && (
        <PasteImportModal
          busy={importing}
          onImport={(text) => importData(undefined, text)}
          onClose={() => setShowImportPaste(false)}
        />
      )}

      {toastMsg && <div className="toast show">{toastMsg}</div>}
    </div>
  );
}

function TalentRow({ talent, onUpdate, onRemove, onReorder }: {
  talent: Talent;
  onUpdate: (id: string, patch: Partial<Talent>) => void;
  onRemove: (id: string) => void;
  onReorder: (srcId: string, targetId: string, placeAbove: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const init = talent.name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const dealTag = talent.deal_status ? <span className="status-tag">{talent.deal_status}</span> : null;

  return (
    <li
      className={`talent-row ${expanded ? 'expanded' : ''}`}
      draggable
      data-id={talent.id}
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', talent.id); }}
      onDragOver={e => {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const above = (e.clientY - rect.top) < rect.height / 2;
        e.currentTarget.classList.remove('drag-over-top', 'drag-over-bot');
        e.currentTarget.classList.add(above ? 'drag-over-top' : 'drag-over-bot');
      }}
      onDragLeave={e => e.currentTarget.classList.remove('drag-over-top', 'drag-over-bot')}
      onDrop={e => {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over-top', 'drag-over-bot');
        const srcId = e.dataTransfer.getData('text/plain');
        if (srcId && srcId !== talent.id) {
          const rect = e.currentTarget.getBoundingClientRect();
          const above = (e.clientY - rect.top) < rect.height / 2;
          onReorder(srcId, talent.id, above);
        }
      }}
    >
      <div className="drag-handle">⋮⋮</div>
      <div className="avatar">
        {talent.photo_url ? <img src={talent.photo_url} alt={talent.name} /> : init}
      </div>
      <div className="talent-info" onClick={() => setExpanded(!expanded)}>
        <div className="talent-name-row">
          <span className="talent-name">{talent.name}</span>
          {(talent.agency || talent.agent) && (
            <span className="talent-agent-inline">
              {talent.agency && <span className="agency">{talent.agency}</span>}
              {talent.agent && <span className="agent-name">· {talent.agent}</span>}
            </span>
          )}
        </div>
        <div className="talent-meta">
          {talent.age ? `Age ${talent.age}` : 'Age —'}
          {dealTag}
        </div>
      </div>
      <div className="status-toggle">
        <button
          className={`status-btn ${talent.status === 'active' ? 'on active' : ''}`}
          onClick={() => onUpdate(talent.id, { status: 'active' })}
        >Active</button>
        <button
          className={`status-btn ${talent.status === 'pass' ? 'on pass' : ''}`}
          onClick={() => onUpdate(talent.id, { status: 'pass' })}
        >Pass</button>
      </div>

      {expanded && (
        <div className="detail-row" style={{ display: 'block' }}>
          <ImdbRefresh talent={talent} onUpdate={onUpdate} />
          <div className="detail-grid">
            <div className="field">
              <label>Agency</label>
              <input
                defaultValue={talent.agency ?? ''}
                onBlur={e => onUpdate(talent.id, { agency: e.target.value })}
                placeholder="CAA / WME / UTA"
              />
            </div>
            <div className="field">
              <label>Agent</label>
              <input
                defaultValue={talent.agent ?? ''}
                onBlur={e => onUpdate(talent.id, { agent: e.target.value })}
                placeholder="First Last"
              />
            </div>
            <div className="field">
              <label>Contact</label>
              <input
                defaultValue={talent.agent_contact ?? ''}
                onBlur={e => onUpdate(talent.id, { agent_contact: e.target.value })}
                placeholder="email / phone"
              />
            </div>
            <div className="field">
              <label>Deal Status</label>
              <select
                defaultValue={talent.deal_status ?? ''}
                onChange={e => onUpdate(talent.id, { deal_status: e.target.value })}
              >
                <option value="">—</option>
                {['Reading', 'Offer Out', 'Negotiating', 'Attached', 'Passed', 'On Hold'].map(s =>
                  <option key={s} value={s}>{s}</option>
                )}
              </select>
            </div>
            <div className="field field-full">
              <label>Availability / Shooting Window</label>
              <input
                defaultValue={talent.availability ?? ''}
                onBlur={e => onUpdate(talent.id, { availability: e.target.value })}
                placeholder="e.g. open Q3 2026 · booked through Feb"
              />
            </div>
            <div className="field field-full">
              <label>Notes</label>
              <textarea
                className="notes"
                defaultValue={talent.notes ?? ''}
                onBlur={e => onUpdate(talent.id, { notes: e.target.value })}
                placeholder="Vibe check, who knows them, conversations had..."
              />
            </div>
          </div>
          <div className="detail-actions">
            <a
              className="btn btn-ghost"
              href={talent.imdb_id ? `https://pro.imdb.com/name/${talent.imdb_id}` : `https://pro.imdb.com/find?q=${encodeURIComponent(talent.name)}`}
              target="_blank"
              rel="noopener noreferrer"
            >IMDbPro ↗</a>
            <button className="btn btn-danger" onClick={() => onRemove(talent.id)}>Remove</button>
          </div>
        </div>
      )}
    </li>
  );
}

function ImdbRefresh({ talent, onUpdate }: { talent: Talent; onUpdate: (id: string, patch: Partial<Talent>) => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function lookupByName() {
    setBusy(true); setMsg('');
    const res = await fetch(`/api/tmdb/search/${encodeURIComponent(talent.name)}`);
    setBusy(false);
    if (!res.ok) { setMsg('Not found on TMDb'); return; }
    const data = await res.json();
    onUpdate(talent.id, {
      imdb_id: data.imdb_id || talent.imdb_id,
      photo_url: data.photo_url ?? talent.photo_url,
      age: data.age ?? talent.age,
    });
    setMsg('Updated ✓');
    setTimeout(() => setMsg(''), 2000);
  }

  return (
    <div className="imdb-lookup">
      <button className="btn btn-ghost" onClick={lookupByName} disabled={busy}>
        {busy ? '...' : 'Pull from TMDb'}
      </button>
      {msg && <small style={{ color: 'var(--gold-deep)', marginLeft: 8 }}>{msg}</small>}
    </div>
  );
}

function AddTalentForm({ onAdd, onCancel }: {
  onAdd: (p: any) => Promise<void> | void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [agency, setAgency] = useState('');
  const [tmdbData, setTmdbData] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);

  async function searchTmdb(n: string) {
    if (!n.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/tmdb/search/${encodeURIComponent(n.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setTmdbData(data);
        if (!age) setAge(data.age?.toString() || '');
      }
    } finally {
      setSearching(false);
    }
  }

  async function handleAdd() {
    if (!name.trim()) return;
    setBusy(true);
    let resolved = tmdbData;
    if (!resolved) {
      try {
        const res = await fetch(`/api/tmdb/search/${encodeURIComponent(name.trim())}`);
        if (res.ok) resolved = await res.json();
      } catch {}
    }
    const payload: any = {
      name: name.trim(),
      age: age ? parseInt(age) : resolved?.age || null,
      agency: agency.trim(),
      imdb_id: resolved?.imdb_id || null,
      photo_url: resolved?.photo_url || null,
    };
    await onAdd(payload);
    setBusy(false);
    setName(''); setAge(''); setAgency(''); setTmdbData(null);
  }

  return (
    <div className="add-form open">
      <div className="add-form-row">
        <div className="field" style={{ flex: 1 }}>
          <label>Name {searching && <span style={{ color: 'var(--ink-faint)', fontSize: 11 }}>searching TMDb...</span>}
            {tmdbData && !searching && <span style={{ color: 'var(--gold-deep)', fontSize: 11 }}>✓ found on TMDb</span>}
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={e => searchTmdb(e.target.value)}
            placeholder="First Last"
            autoFocus
          />
        </div>
        <div className="field" style={{ maxWidth: 100 }}>
          <label>Age</label>
          <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="—" />
        </div>
        <div className="field" style={{ maxWidth: 140 }}>
          <label>Agency</label>
          <input value={agency} onChange={e => setAgency(e.target.value)} placeholder="CAA/WME/UTA" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className="btn" onClick={handleAdd} disabled={busy || !name.trim()}>Add</button>
      </div>
    </div>
  );
}

function PasteImportModal({ onImport, onClose, busy }: { onImport: (text: string) => void; onClose: () => void; busy: boolean }) {
  const [text, setText] = useState('');
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
        <h3>Paste Casting List</h3>
        <div className="field">
          <label>Paste any casting document text below</label>
          <textarea
            className="notes"
            style={{ minHeight: 200 }}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Paste casting list, breakdown, or any talent info here..."
            autoFocus
          />
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn" onClick={() => text.trim() && onImport(text.trim())} disabled={busy || !text.trim()}>
            {busy ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}

function NewTabModal({ onSave, onClose }: { onSave: (name: string) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>New Tab</h3>
        <div className="field">
          <label>Tab Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Anson, Sheriff, Director, Wife"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onSave(name.trim()); }}
          />
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={() => name.trim() && onSave(name.trim())}>Save</button>
        </div>
      </div>
    </div>
  );
}
