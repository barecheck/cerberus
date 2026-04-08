# Architecture

## Overview

```mermaid
flowchart LR
  subgraph browser [Browser]
    UI[React_shadcn]
  end
  subgraph next [Nextjs_App_Router]
    Auth[Authjs_Google_JWT]
    TRPC[tRPC_Router]
    CI[GET_api_ci_file]
    Crypto[AES256GCM]
  end
  subgraph aws [AWS]
    S3[S3_bucket]
  end
  subgraph db [Postgres]
    Prisma[Prisma_users_collections_tokens]
  end
  UI --> Auth
  UI --> TRPC
  TRPC --> Crypto
  TRPC --> S3
  Auth --> Prisma
  CI --> Prisma
  CI --> Crypto
  CI --> S3
```

## Request flow

1. User hits `/login`, completes Google OAuth. Auth.js issues a **JWT** session; Prisma **upserts** a `users` row for ACLs.
2. The `signIn` callback rejects sign-ins whose email is not on `ALLOWED_EMAIL_DOMAIN`.
3. Authenticated users use tRPC (`/api/trpc`) from React Query. All vault procedures are **protected** and require a session.
4. For reads/writes, the server downloads or uploads S3 objects. Payloads are **decrypted only in memory** on the server using `ENCRYPTION_KEY`, then returned to the browser (plaintext in transit must be protected with TLS in production).
5. **CI / GitHub Action**: [`src/app/api/ci/file/route.ts`](../src/app/api/ci/file/route.ts) accepts `Authorization: Bearer <access_token>` and `?secret=collection/relative/path`, verifies the token against Postgres (`access_tokens` + collection scope), then returns decrypted file content as JSON. The bundled composite action calls this route (see [README](../README.md) and [`action.yml`](../action.yml)).

## Trust boundaries

| Component | Trust |
| --- | --- |
| `ENCRYPTION_KEY` | Server-only. Anyone who holds it can decrypt all vault objects. |
| AWS IAM credentials | Server (and operators running the CLI). Scope to `S3_ROOT_PREFIX` when possible. |
| PostgreSQL | Users, collection metadata, grants, and **hashed** access tokens for CI; does not store secret **file** contents (those live in S3). |
| Browser | Sees decrypted content after successful auth and TLS. |

## Source of truth

- **S3** is the source of truth for secret **file blobs**. The app does not mirror object listings or contents in Postgres.
- **Postgres** stores users, per-collection access grants, collection rows (for rename/delete and grants), and CI access tokens (lookup hash + encrypted secret for optional reveal in the UI).

## Scaling notes

Listing collections and objects calls S3 `ListObjectsV2` on demand. Large buckets or high request volume may need caching or a secondary index; this MVP documents the tradeoff in [environment.md](environment.md) operational guidance.
