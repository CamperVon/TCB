import 'dotenv/config';
import { sql } from '@/lib/db';

async function main() {
  console.log('Adding documents table...');
  await sql`
    CREATE TABLE IF NOT EXISTS documents (
      id          TEXT PRIMARY KEY,
      project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      url         TEXT NOT NULL,
      size        INTEGER,
      type        TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('✓ Done.');
}

main().catch(err => { console.error(err); process.exit(1); });
