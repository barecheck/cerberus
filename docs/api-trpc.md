# tRPC API

Base URL: `/api/trpc` (SuperJSON transformer enabled).

Procedures under `collections`, `objects`, `secrets`, and `accessTokens` use **`protectedProcedure`** unless noted: unauthenticated requests return `UNAUTHORIZED`.

## `collections`

Defined in [`src/server/trpc/routers/collections.ts`](../src/server/trpc/routers/collections.ts). **Owners** (see [`src/lib/owners.ts`](../src/lib/owners.ts)) see every S3 prefix as a collection; other users only see collections they **created** or have a **grant** for (and only if the S3 prefix still has objects).

| Procedure | Input | Result / notes |
| --- | --- | --- |
| `accessMeta` | `{ slug: string }` | `{ canManageAccess, canRenameDelete }` for UI. |
| `list` | — | `{ slug: string }[]` under `S3_ROOT_PREFIX`. |
| `exists` | `{ slug: string }` | `boolean` — prefix exists in S3 and caller may access it. |
| `create` | `{ slug: string }` | Creates DB row + S3 placeholder under prefix; `CONFLICT` if prefix already used. |
| `delete` | `{ slug: string }` | Deletes all objects under the collection prefix and the DB row. Requires creator, grant, or owner per [`canRenameOrDeleteCollection`](../src/server/access/collections.ts). |
| `rename` | `{ fromSlug, toSlug }` | Copies all objects to the new prefix, deletes old keys, updates DB slug. Same permission rules as `delete`. |
| `listGrants` | `{ slug: string }` | **`ownerProcedure`** — emails granted access to the collection. |
| `listDomainUsers` | — | **`ownerProcedure`** — users in `ALLOWED_EMAIL_DOMAIN` (for grant picker). |
| `setGrant` | `{ slug, userEmail }` | **`ownerProcedure`** — upserts `collection_access` for that user. |
| `revokeGrant` | `{ slug, userEmail }` | **`ownerProcedure`** — removes grant. |

## `objects`

| Procedure | Input | Result |
| --- | --- | --- |
| `list` | `{ collectionSlug: string }` | Rows with `objectKey`, `relativePath`, `size`, `lastModified`, `isDotenv`. |
| `get` | `{ objectKey: string }` | `{ objectKey, plaintext, isDotenv }`. Validates key under root prefix. |
| `getByPath` | `{ collectionSlug, relativePath }` | Same shape as `get`, builds key via [`fullObjectKey`](../src/lib/paths.ts). |
| `put` | `{ objectKey, content: string }` | Encrypts UTF-8 and overwrites S3 object. |
| `putByPath` | `{ collectionSlug, relativePath, content }` | Same as `put`; returns `{ ok, objectKey }`. |
| `delete` | `{ objectKey: string }` | Deletes the object in S3. Requires collection access (`FORBIDDEN` if none). |

## `secrets`

| Procedure | Input | Result |
| --- | --- | --- |
| `parse` | `{ objectKey: string }` | `{ objectKey, entries: { key, value }[] }` after decrypt + dotenv parse. |
| `getValue` | `{ objectKey, secretKey: string }` | `{ objectKey, secretKey, value }`. `NOT_FOUND` if key missing. |

## `accessTokens`

Implements collection-scoped **CI bearer tokens** stored in Postgres ([`src/server/trpc/routers/accessTokens.ts`](../src/server/trpc/routers/accessTokens.ts)). The plaintext secret is shown **once** on create; [`src/app/api/ci/file/route.ts`](../src/app/api/ci/file/route.ts) accepts only a **hash** of the bearer value for lookup.

| Procedure | Input | Result / notes |
| --- | --- | --- |
| `list` | `{ slug?: string }` optional | Tokens the caller may see: any token linked to a collection they can access; optional `slug` filters to tokens tied to that collection. Rows include `displayToken` (masked), `collectionSlugs`, `canManage` (creator or owner). |
| `create` | `{ name?: string, collectionIds: string[] }` | Creates token scoped to those collections. Caller must have access to every `collectionId`. Returns `{ id, token }` (**plaintext `token` — store immediately**). |
| `createForCollectionSlug` | `{ slug: string, name?: string }` | Same as `create` for one collection, keyed by slug. |
| `revoke` | `{ id: string }` | Deletes token. **Only** the creator or an [owner](../src/lib/owners.ts) email. |
| `reveal` | `{ id: string }` | Returns `{ token }` decrypted from DB. Same permission as `revoke`. |

## Errors

- `UNAUTHORIZED` — no session.
- `FORBIDDEN` — no collection access, or not allowed to manage tokens/grants.
- `BAD_REQUEST` — decrypt failure or invalid payload.
- `NOT_FOUND` — dotenv key missing (`secrets.getValue`), or missing collection/token where applicable.
- `CONFLICT` — duplicate collection slug on create, or rename target already in use.

Standard Zod validation errors are attached to tRPC error `data.zodError` in development-oriented clients.
