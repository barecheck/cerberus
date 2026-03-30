# tRPC API

Base URL: `/api/trpc` (SuperJSON transformer enabled).

All procedures under `collections`, `objects`, and `secrets` use **`protectedProcedure`**: unauthenticated requests return `UNAUTHORIZED`.

## `collections`

| Procedure | Input | Result |
| --- | --- | --- |
| `list` | — | `{ slug: string }[]` — top-level collection folders under `S3_ROOT_PREFIX`. |
| `exists` | `{ slug: string }` | `boolean` — whether `{root}{slug}/` appears as a common prefix (optional UX helper). |

## `objects`

| Procedure | Input | Result |
| --- | --- | --- |
| `list` | `{ collectionSlug: string }` | Rows with `objectKey`, `relativePath`, `size`, `lastModified`, `isDotenv`. |
| `get` | `{ objectKey: string }` | `{ objectKey, plaintext, isDotenv }`. Validates key under root prefix. |
| `getByPath` | `{ collectionSlug, relativePath }` | Same shape as `get`, builds key via [`fullObjectKey`](../src/lib/paths.ts). |
| `put` | `{ objectKey, content: string }` | Encrypts UTF-8 and overwrites S3 object. |
| `putByPath` | `{ collectionSlug, relativePath, content }` | Same as `put`; returns `{ ok, objectKey }`. |

## `secrets`

| Procedure | Input | Result |
| --- | --- | --- |
| `parse` | `{ objectKey: string }` | `{ objectKey, entries: { key, value }[] }` after decrypt + dotenv parse. |
| `getValue` | `{ objectKey, secretKey: string }` | `{ objectKey, secretKey, value }`. `NOT_FOUND` if key missing. |

## Errors

- `UNAUTHORIZED` — no session.
- `BAD_REQUEST` — decrypt failure or invalid payload.
- `NOT_FOUND` — dotenv key missing (`secrets.getValue`).

Standard Zod validation errors are attached to tRPC error `data.zodError` in development-oriented clients.
