'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MasterGate() {
  const router = useRouter();
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setBusy(true);
    const res = await fetch('/api/master/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    });
    setBusy(false);
    if (!res.ok) { setError('Incorrect password'); return; }
    router.refresh();
  }

  return (
    <div className="shell">
      <div className="topbar">
        <span className="brand">◈ The Camp Brand · Projects</span>
      </div>
      <form className="gate" onSubmit={submit}>
        <h2>Projects</h2>
        <p>The Camp Brand</p>
        <input
          type="password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          placeholder="Enter master password"
          autoFocus
        />
        <div className="gate-actions">
          <button type="submit" className="btn" disabled={busy}>{busy ? '...' : 'Enter'}</button>
        </div>
        <div className="gate-error">{error}</div>
      </form>
    </div>
  );
}
