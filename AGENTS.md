<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

### Overview

Cerberus is an internal secrets management vault (Next.js 16 + tRPC + Prisma + PostgreSQL + AWS S3). Standard commands are in `package.json` scripts: `npm run dev`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.

### Database

PostgreSQL 16 is installed locally. Start it before running the app:

```bash
sudo pg_ctlcluster 16 main start
```

Database: `cerberus`, user: `cerberus`, password: `cerberus` on `localhost:5432`.

### Environment files

- `.env.local` is loaded by Next.js and contains all app env vars.
- `.env` must also exist (or be a copy of `.env.local`) because `prisma.config.ts` uses `dotenv/config` which only loads `.env`. Without it, Prisma CLI commands (`db:push`, `db:migrate`) fail.
- Google OAuth and AWS S3 credentials are placeholders. The app starts and renders without real credentials, but auth flow and S3 operations require valid values.

### Running the dev server

```bash
npm run dev   # Next.js dev server on port 3000
```

Unauthenticated requests redirect to `/login`. The `/vault` route is protected.

### Pre-commit hooks

Husky runs `lint-staged` on commit (ESLint + Prettier on staged JS/TS files, Prettier on JSON/CSS/YAML).
