import { sql } from '@vercel/postgres';

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS projects (
  id            TEXT PRIMARY KEY,
  slug          TEXT UNIQUE NOT NULL,
  title         TEXT NOT NULL,
  role          TEXT,
  password_hash TEXT NOT NULL,
  hero_image    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tabs (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS talent (
  id              TEXT PRIMARY KEY,
  project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tab_id          TEXT REFERENCES tabs(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  age             INTEGER,
  imdb_id         TEXT,
  photo_url       TEXT,
  agency          TEXT,
  agent           TEXT,
  agent_contact   TEXT,
  deal_status     TEXT,
  availability    TEXT,
  notes           TEXT,
  status          TEXT DEFAULT 'active',
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_talent_project ON talent(project_id);
CREATE INDEX IF NOT EXISTS idx_talent_tab ON talent(tab_id);
CREATE INDEX IF NOT EXISTS idx_tabs_project ON tabs(project_id);
`;

export async function setupSchema() {
  // sql.query takes parameterized queries; for raw schema use unsafe
  const statements = SCHEMA.split(';').map(s => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    await sql.query(stmt);
  }
}

export { sql };

export type Project = {
  id: string;
  slug: string;
  title: string;
  role: string | null;
  password_hash: string;
  hero_image: string | null;
  created_at: string;
};

export type Tab = {
  id: string;
  project_id: string;
  name: string;
  sort_order: number;
};

export type Talent = {
  id: string;
  project_id: string;
  tab_id: string | null;
  name: string;
  age: number | null;
  imdb_id: string | null;
  photo_url: string | null;
  agency: string | null;
  agent: string | null;
  agent_contact: string | null;
  deal_status: string | null;
  availability: string | null;
  notes: string | null;
  status: 'active' | 'pass';
  sort_order: number;
};
