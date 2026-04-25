import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="shell">
      <div className="topbar">
        <span className="brand">◈ The Camp Brand · Projects</span>
      </div>
      <div className="hero">
        <h1>404</h1>
        <div className="sub">Project not found</div>
      </div>
      <Link href="/"><button className="btn">← All Projects</button></Link>
    </div>
  );
}
