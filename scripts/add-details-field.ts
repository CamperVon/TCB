import { sql } from '../lib/db';

async function run() {
  console.log('Adding details field...');
  try {
    await sql`ALTER TABLE projects ADD COLUMN details TEXT`;
    console.log('✓ Done.');
  } catch (e: any) {
    if (e.message?.includes('already exists')) console.log('✓ Already exists.');
    else throw e;
  }
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
