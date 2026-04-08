# Authentication

## Provider

Cerberus uses **Google** OAuth via [Auth.js v5](https://authjs.dev/) (`next-auth` beta). The app uses a **JWT session strategy** (no Auth.js `Session` / `Account` tables in Prisma).

## Routes

- **Login UI**: `/login` — client calls `signIn("google", { callbackUrl: "/vault" })`.
- **Auth API**: `/api/auth/*` — OAuth callback, session, etc.

Configure the Google Cloud Console OAuth client with authorized redirect URI:

`{AUTH_URL}/api/auth/callback/google`

## Domain restriction

In [`src/auth.ts`](../src/auth.ts), the `signIn` callback allows users only if:

```
user.email.toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)
```

Set `ALLOWED_EMAIL_DOMAIN` to your workspace domain (e.g. `acme.com`). Subdomains are **not** treated specially: `user@mail.acme.com` matches `acme.com`; adjust the callback if you need `endsWith` behavior for exact host parts only.

## Sessions and database users

- **Sessions**: JWT cookies. `auth()` resolves `session.user.id` and `session.user.isOwner` without reading a session table.
- **Users**: On first sign-in, [`src/auth.ts`](../src/auth.ts) **upserts** a row in PostgreSQL (`users`) so vault ACLs and access tokens can reference stable user IDs.

Protected tRPC procedures require `ctx.session.user` from `auth()`.

## Vault route protection

`/vault/**` layouts call `auth()` on the server and `redirect("/login")` when unauthenticated. There is no Edge middleware in this repo to avoid running the Prisma client on the Edge runtime.
