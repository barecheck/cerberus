# Cerberus

Three heads. Zero leaks. One vault.

Cerberus is an internal secrets UI: **Google sign-in** (restricted to one email domain), **PostgreSQL** for Auth.js identities, **AWS S3** for encrypted blobs, and **tRPC** for type-safe APIs. File content is encrypted at the app layer with **AES-256-GCM** using a single master key before it is written to S3.

## Features

- Google OAuth with **allowlisted domain** (`ALLOWED_EMAIL_DOMAIN`)
- **Collections** as top-level folders under an optional `S3_ROOT_PREFIX`
- **Encrypted objects** in S3 (raw text or `.env` dotenv-style key/value view)
- Web editor with **raw** mode; `.env` files also expose a **Keys** table and per-key copy via tRPC
- **CLI** to download, decrypt, and print dotenv entries (`scripts/pull-secret.mjs`)

## Documentation

Full documentation lives in [`docs/`](docs/):

| Doc | Description |
| --- | --- |
| [architecture.md](docs/architecture.md) | Components, data flow, trust boundaries |
| [environment.md](docs/environment.md) | Environment variables and key generation |
| [auth.md](docs/auth.md) | Google OAuth and domain restriction |
| [storage-and-encryption.md](docs/storage-and-encryption.md) | S3 layout, envelope format, raw vs dotenv |
| [api-trpc.md](docs/api-trpc.md) | tRPC routers and procedures |
| [cli.md](docs/cli.md) | `pull-secret` usage and safety notes |

## Prerequisites

- Node.js 20+
- PostgreSQL
- AWS account with an S3 bucket and IAM credentials (S3 read/write for your prefix)
- Google Cloud OAuth client (Web application)

## Quick start

1. Clone and install:

   ```bash
   npm install
   ```

2. Copy environment template and fill in values:

   ```bash
   cp .env.example .env.local
   ```

3. Create database schema:

   ```bash
   npm run db:migrate
   ```

   (Requires a valid `DATABASE_URL`. For local iteration you may use `npm run db:push` instead.)

4. Run the dev server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000), sign in with Google (allowed domain only), then open **Collections**.

## CLI (pull one dotenv value)

AWS credentials must be present in the environment (see [docs/cli.md](docs/cli.md)):

```bash
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export ENCRYPTION_KEY=...   # same as the app

npm run pull-secret -- --bucket your-bucket --key your/prefix/team/app/.env --name API_KEY
```

Or after `npm link` / global install: `cerberus-pull-secret -b ... -k ... -n API_KEY`.

## License

Private / use per your organization.
