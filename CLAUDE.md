# TCB Projects — Talent Tracker

## What this is
A web app for Brandon Camp / The Camp Brand to manage talent lists for film/TV development projects. Each project has its own password-gated page with a list of actors (and other roles like Director, DP, Writer) being considered, with rep info, deal status, availability, and notes.

## Stack
- Next.js 15 (App Router, TypeScript)
- Vercel Postgres for storage
- TMDb API for IMDb ID lookups (headshot, bio, age)
- bcryptjs for password hashing
- Deployed to Vercel at `projects.thecampbrand.com`

## Design principles
- Editorial/magazine aesthetic, not SaaS dashboard
- Cormorant Garamond for headlines, JetBrains Mono for labels
- Cream/parchment palette (light theme, charcoal text, warm gold accents)
- Drag-to-reorder talent within tabs
- Mobile-friendly

## Data model
- `projects`: id, slug, title, role, password_hash, hero_image, created_at
- `tabs`: id, project_id, name, sort_order (e.g. "Anson", "Sheriff", "Director")
- `talent`: id, project_id, tab_id, name, age, imdb_id, photo_url, agency, agent, agent_contact, deal_status, availability, notes, status (active/pass), sort_order, created_at

## Routes
- `/` — project hub (list all, add/delete, no password to view list, password required to add)
- `/[slug]` — project detail with tabs and talent rows
- `/api/projects` — CRUD for projects (GET list, POST new)
- `/api/projects/[id]` — single project (PUT, DELETE)
- `/api/projects/[id]/auth` — password check
- `/api/projects/[id]/tabs` — tab CRUD
- `/api/talent/[id]` — talent CRUD
- `/api/tmdb/by-imdb/[imdbId]` — TMDb lookup proxy

## Auth model
- Each project has its own password (set on creation, bcrypt-hashed in DB).
- Anyone with the link + password can view AND edit. Simple shared-secret model.
- Master password (env var `MASTER_PASSWORD`) lets BC create/delete projects from the hub.

## Environment variables
- `POSTGRES_URL` — provided by Vercel Postgres integration
- `TMDB_API_KEY` — for IMDb-to-photo lookups (free at themoviedb.org)
- `MASTER_PASSWORD` — for project creation/deletion at the hub level

## Setup steps for new dev
1. `npm install`
2. Create Vercel Postgres database, link it: `vercel env pull .env.local`
3. Get TMDb v4 read access token, add to `.env.local`
4. Set `MASTER_PASSWORD` in `.env.local`
5. `npm run db:setup` to create tables
6. `npm run db:seed` to seed Bad Shepherd
7. `npm run dev`

## Common tasks (for future Claude Code sessions)
- Add a new field to talent: edit schema in `lib/db.ts`, run migration, update `app/[slug]/page.tsx` and `components/TalentRow.tsx`
- Add a new API route: drop into `app/api/...`
- Change theme: edit CSS variables in `app/globals.css`
- Add a feature: build it, commit, Vercel auto-deploys

## Owner
Brandon Camp · bc@thecampbrand.com
