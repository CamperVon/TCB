import 'dotenv/config';
import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';
import { searchByName } from '../lib/tmdb';

const BAD_SHEPHERD_TALENT = [
  { name: 'Brandon Sklenar',       age: 34, agency: 'WME',  agent: '' },
  { name: 'Glen Powell',            age: 38, agency: 'WME',  agent: 'Elan Ruspoli' },
  { name: 'Chris Evans',            age: 45, agency: '',     agent: '' },
  { name: 'Jeremy Renner',          age: 55, agency: 'CAA',  agent: '' },
  { name: 'Patrick Schwarzenegger', age: 32, agency: 'UTA',  agent: '' },
  { name: 'Dev Patel',              age: 36, agency: 'WME',  agent: '' },
  { name: 'Theo James',             age: 42, agency: '',     agent: '' },
  { name: 'Wyatt Russell',          age: 40, agency: '',     agent: '' },
  { name: 'Austin Butler',          age: 35, agency: 'WME',  agent: 'James Farrell' },
  { name: 'Miles Teller',           age: 39, agency: '',     agent: '' },
  { name: 'Jacob Elordi',           age: 29, agency: 'WME',  agent: '' },
  { name: 'Oscar Isaac',            age: 47, agency: 'WME',  agent: '' },
  { name: 'Pedro Pascal',           age: 51, agency: 'CAA',  agent: '' },
  { name: 'Taylor Kitsch',          age: 45, agency: '',     agent: '' },
  { name: 'Garrett Hedlund',        age: 41, agency: '',     agent: '' },
  { name: 'Scott Eastwood',         age: 40, agency: '',     agent: '' },
  { name: 'Luke Grimes',            age: 42, agency: '',     agent: '' },
  { name: 'Cole Hauser',            age: 51, agency: '',     agent: '' },
  { name: 'Ryan Bingham',           age: 45, agency: '',     agent: '' },
  { name: 'Tim McGraw',             age: 58, agency: 'CAA',  agent: '' },
  { name: 'Josh Brolin',            age: 58, agency: 'CAA',  agent: 'Michael Cooper' },
];

async function main() {
  console.log('Seeding Bad Shepherd...');

  // Check if it already exists
  const existing = await sql`SELECT id FROM projects WHERE slug = 'bad-shepherd' LIMIT 1`;
  if (existing.rows.length > 0) {
    console.log('✓ Bad Shepherd already exists, skipping.');
    return;
  }

  const projectId = 'p_bad_shepherd';
  const tabId = 'tb_anson';
  const password = 'badshep';
  const passwordHash = await bcrypt.hash(password, 10);

  await sql`
    INSERT INTO projects (id, slug, title, role, password_hash, password)
    VALUES (${projectId}, 'bad-shepherd', 'Bad Shepherd', 'Anson Lime', ${passwordHash}, ${password})
  `;
  await sql`
    INSERT INTO tabs (id, project_id, name, sort_order)
    VALUES (${tabId}, ${projectId}, 'Anson Lime', 0)
  `;

  for (let i = 0; i < BAD_SHEPHERD_TALENT.length; i++) {
    const t = BAD_SHEPHERD_TALENT[i];
    const id = `t_bs_${i + 1}`;
    let tmdbData: any = null;
    try {
      tmdbData = await searchByName(t.name);
    } catch (e) {
      console.warn(`Failed to lookup ${t.name} on TMDb`);
    }
    await sql`
      INSERT INTO talent (id, project_id, tab_id, name, age, imdb_id, photo_url, agency, agent, status, sort_order)
      VALUES (${id}, ${projectId}, ${tabId}, ${t.name}, ${t.age || tmdbData?.age || null}, ${tmdbData?.imdb_id || null}, ${tmdbData?.photo_url || null}, ${t.agency || null}, ${t.agent || null}, 'active', ${i})
    `;
  }

  console.log(`✓ Bad Shepherd seeded with ${BAD_SHEPHERD_TALENT.length} talent.`);
  console.log('  Password: badshep');
  console.log('  URL: /bad-shepherd');
}

main().catch(err => { console.error(err); process.exit(1); });
