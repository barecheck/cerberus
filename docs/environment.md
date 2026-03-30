# Environment variables

Copy [`.env.example`](../.env.example) to `.env.local` for local development.

## Required

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection URL for Prisma. |
| `AUTH_SECRET` | Auth.js encryption key for session cookies. Generate: `npx auth secret`. |
| `AUTH_URL` | Public URL of the app (e.g. `http://localhost:3000`). In production, your canonical HTTPS URL. |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth client. Aliases `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are also supported in this project. |
| `ALLOWED_EMAIL_DOMAIN` | Domain allowlist for Google sign-in (e.g. `acme.com`), without `@`. |
| `AWS_REGION` | Region of the S3 bucket. |
| `S3_BUCKET_NAME` | Bucket storing encrypted objects. |
| `ENCRYPTION_KEY` | 32-byte master key used for AES-256-GCM (see below). |

## Optional

| Variable | Purpose |
| --- | --- |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN` | Static or temporary AWS credentials for the app server. If omitted, the AWS SDK default credential chain applies (useful on EC2/ECS with instance/task roles). |
| `S3_ROOT_PREFIX` | Prefix under which collections live (e.g. `prod/` or `tenants/foo/`). Should not start with `/`; trailing slash is normalized. |

## Generating secrets

### `AUTH_SECRET`

```bash
npx auth secret
```

### `ENCRYPTION_KEY` (32 bytes)

Pick one of:

- **Hex (64 characters)**  
  `openssl rand -hex 32`

- **Base64 (decodes to 32 bytes)**  
  `openssl rand -base64 32`

- **Exactly 32 UTF-8 characters** (discouraged; use random bytes instead)

The same key must be configured for the **CLI** when decrypting objects outside the app.

## Prisma

- Generate client after install: `npm run postinstall` runs `prisma generate`.
- Apply migrations: `npm run db:migrate` (requires `DATABASE_URL`).

## Production checklist

- Store `AUTH_SECRET`, `ENCRYPTION_KEY`, and OAuth secrets in a managed secrets manager.
- Restrict IAM to `s3:ListBucket` on the bucket with prefix condition and `s3:GetObject` / `s3:PutObject` on `arn:aws:s3:::bucket/${prefix}*`.
- Enable TLS termination and set `AUTH_URL` to the HTTPS origin.
