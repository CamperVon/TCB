import 'dotenv/config';
import { setupSchema } from '../lib/db';

async function main() {
  console.log('Setting up DB schema...');
  await setupSchema();
  console.log('✓ Schema created.');
}

main().catch(err => { console.error(err); process.exit(1); });
