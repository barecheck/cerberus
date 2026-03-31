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
| [action.yml](action.yml) | GitHub Action inputs (CI pull) |

## GitHub Action

Pull decrypted files or `.env` keys in workflows using the action in this repo. Create an **access token** in the collection’s **Access tokens** dialog, add it as a repository secret (for example `CERBERUS_TOKEN`). The `secret` input is always `collection-slug/path/under/collection` (same path you see in the vault, not the raw S3 key).

Examples use `uses: ./` after a checkout of this repository; for a published composite action, replace with `uses: your-org/cerberus@v1` (or the path that hosts `action.yml` and `dist/github-action`).

**Export a file** (`mode: export`, default): writes decrypted content to `output-path`.

```yaml
jobs:
  example:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: ./
        with:
          hostname: https://vault.example.com
          api-key: ${{ secrets.CERBERUS_TOKEN }}
          secret: my-team/prod/app.env
          output-path: ${{ github.workspace }}/.env.ci

      - run: wc -l .env.ci
        working-directory: ${{ github.workspace }}
```

**Export environment variables** (`mode: env`): sets variables for the current step and appends to `GITHUB_ENV` so **later steps** in the same job can read them. Each `with` input is a **string**, so embed a normal YAML list using a **block scalar** (`|`) and one `- key` per line (the same syntax as `pick:\n  - …` elsewhere in YAML). Optional `env_prefix` is prepended to every exported name (e.g. `CERBERUS_` → `CERBERUS_API_KEY`). You can also use a **comma-separated** line instead of a block.

```yaml
jobs:
  example:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: ./
        with:
          hostname: https://vault.example.com
          api-key: ${{ secrets.CERBERUS_TOKEN }}
          secret: my-team/prod/.env
          mode: env
          env_prefix: CERBERUS_
          pick: |
            - API_KEY
            - DATABASE_URL

      - name: Next step sees prefixed names
        run: node -e 'console.log(process.env.CERBERUS_API_KEY ? "ok" : "missing")'
```

For a **non-`.env` file**, `pick` must be a **single** name; the file contents are exported as `env_prefix` + that name.

```yaml
      - uses: ./
        with:
          hostname: https://vault.example.com
          api-key: ${{ secrets.CERBERUS_TOKEN }}
          secret: my-team/certs/ca.pem
          mode: env
          env_prefix: TLS_
          pick: CA_BUNDLE
```

Build the bundled entrypoint after changing action source: `npm run build:github-action`.

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
