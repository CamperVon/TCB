# TCB Projects

Talent tracker for The Camp Brand.

## Quick start

```bash
npm install
cp .env.example .env.local
# Fill in env vars (see below)
npm run db:setup
npm run db:seed
npm run dev
```

Open http://localhost:3000.

## Environment variables

Required in `.env.local`:

```
POSTGRES_URL=                # From Vercel Postgres → .env.local tab
TMDB_API_KEY=                # https://www.themoviedb.org/settings/api (v4 Read Access Token)
MASTER_PASSWORD=             # Pick anything — used to create/delete projects at the hub
```

## Deploy to Vercel

1. Push this repo to GitHub.
2. Go to vercel.com/new, import the repo.
3. In Storage tab, create a new Postgres database, link it (auto-fills `POSTGRES_URL`).
4. In Environment Variables, add `TMDB_API_KEY` and `MASTER_PASSWORD`.
5. Deploy.
6. After first deploy, run `npm run db:setup` and `npm run db:seed` against the production DB:
   ```bash
   vercel env pull .env.production.local
   POSTGRES_URL=$(grep POSTGRES_URL .env.production.local | cut -d= -f2-) npm run db:setup
   POSTGRES_URL=$(grep POSTGRES_URL .env.production.local | cut -d= -f2-) npm run db:seed
   ```

## Domain setup

In Vercel → Project Settings → Domains, add `projects.thecampbrand.com`. Vercel will give you a CNAME to add in Cloudflare DNS.

In Cloudflare DNS for `thecampbrand.com`:
- Type: `CNAME`
- Name: `projects`
- Target: `cname.vercel-dns.com`
- Proxy status: DNS only (gray cloud, not orange — important)

SSL is automatic.

## TMDb setup

1. Make a free account at themoviedb.org.
2. Settings → API → request a v4 API key (instant approval).
3. Copy the **API Read Access Token** (the long one), not the API key.
4. Paste into `TMDB_API_KEY`.

## Bad Shepherd seed password

`badshep`
