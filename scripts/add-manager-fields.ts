import { sql } from '../lib/db';

async function run() {
  console.log('Adding manager fields...');
  await sql`ALTER TABLE talent ADD COLUMN IF NOT EXISTS manager TEXT`;
  await sql`ALTER TABLE talent ADD COLUMN IF NOT EXISTS manager_contact TEXT`;
  console.log('✓ Done.');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
