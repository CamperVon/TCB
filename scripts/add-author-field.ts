import 'dotenv/config';
import { sql } from '@/lib/db';

async function main() {
  console.log('Adding author field...');
  try {
    await sql`ALTER TABLE projects ADD COLUMN author TEXT`;
    console.log('✓ Done.');
  } catch (err: any) {
    if (err.message?.includes('already exists')) console.log('✓ Already exists.');
    else throw err;
  }
}

main().catch(err => { console.error(err); process.exit(1); });
