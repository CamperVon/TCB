import 'dotenv/config';
import { sql } from '@/lib/db';

async function main() {
  console.log('Adding plaintext password column...');
  try {
    await sql`ALTER TABLE projects ADD COLUMN password TEXT`;
    console.log('✓ Column added.');
  } catch (err: any) {
    if (err.message?.includes('already exists')) {
      console.log('✓ Column already exists.');
    } else {
      throw err;
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
