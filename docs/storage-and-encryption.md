# Storage and encryption

## S3 layout

- **Bucket**: `S3_BUCKET_NAME`
- **Root prefix** (optional): `S3_ROOT_PREFIX` — normalized to either empty or a string ending with `/`.

A **collection** is the first path segment after the root prefix. Example with `S3_ROOT_PREFIX=prod/`:

| Object key | Collection | Relative path |
| --- | --- | --- |
| `prod/team-a/api/.env` | `team-a` | `api/.env` |
| `team-b/notes.txt` (no root) | `team-b` | `notes.txt` |

Listing collections uses `ListObjectsV2` with `Delimiter: '/'` on the root prefix. Listing files in a collection uses `Prefix: {root}{collection}/`.

## Envelope format (v1)

All objects are stored as a **single binary blob** in S3 (content-type `application/octet-stream`). The plaintext is UTF-8 text (raw file or dotenv text).

Layout:

| Offset | Length | Content |
| --- | --- | --- |
| 0 | 4 | Magic ASCII `CRB1` |
| 4 | 1 | Version byte `0x01` |
| 5 | 12 | AES-GCM IV |
| 17 | _n_ | Ciphertext |
| end-16 | 16 | GCM authentication tag |

Algorithm: **AES-256-GCM** with the key derived from `ENCRYPTION_KEY` ([`src/lib/crypto.ts`](../src/lib/crypto.ts)).

The CLI ([`scripts/pull-secret.mjs`](../scripts/pull-secret.mjs)) implements the same envelope so operators can decrypt outside the app.

## Raw vs dotenv

- **Raw file**: Arbitrary UTF-8 text; the UI uses a textarea and saves the string back through the same envelope.
- **Dotenv**: Same storage. If the relative path ends with `.env`, the UI offers a **Keys** view: lines are parsed as `KEY=value` with `#` comments and blank lines ignored ([`src/lib/dotenv-parse.ts`](../src/lib/dotenv-parse.ts)). Individual values can be fetched via tRPC `secrets.getValue` or the CLI `--name` flag.

There is no separate per-key storage in S3: “line items” are a **view** over the decrypted file.

### Keys view: add, remove, save

In [`src/app/vault/[slug]/file/file-workspace.tsx`](../src/app/vault/[slug]/file/file-workspace.tsx), **Add** appends a new `KEY=value` line using [`appendDotenvKey`](../src/lib/dotenv-parse.ts): duplicate keys (as the parser would see them), keys containing `=`, keys starting with `#`, and values containing line breaks are rejected. **Remove** strips every line the parser would attribute to that key via [`removeDotenvKey`](../src/lib/dotenv-parse.ts) (comments and blank lines stay). Changes live in a **draft** until **Save** runs `objects.put` and overwrites the whole object in S3.

**Copy** uses `secrets.getValue` (server-side decrypt + parse) so the clipboard gets the value only, not surrounding file text.

## Security notes

- S3 at-rest encryption (SSE-S3 or SSE-KMS) is recommended in addition to application-layer encryption.
- Never log decrypted payloads.
- Rotate `ENCRYPTION_KEY` only with a defined re-encryption migration (not included in this MVP).
