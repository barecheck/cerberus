# CLI: `pull-secret`

The script [`scripts/pull-secret.mjs`](../scripts/pull-secret.mjs) downloads an encrypted object from S3, decrypts it with the **same** `ENCRYPTION_KEY` as the app, parses dotenv lines, and prints output.

## Executable entry points

- **npm script**: `npm run pull-secret -- <args>`
- **package bin**: `cerberus-pull-secret` (after `npm install -g .` or `npm link` in this repo)

Ensure the script is executable (`chmod +x scripts/pull-secret.mjs`) if you invoke it directly.

## AWS credentials (environment)

As required by your security model, pass AWS credentials via **environment variables** (not flags):

| Variable | Required | Notes |
| --- | --- | --- |
| `AWS_REGION` | Yes | Matches bucket region. |
| `AWS_ACCESS_KEY_ID` | Usually yes | Omit only if using instance/profile default chain and your runtime provides it. |
| `AWS_SECRET_ACCESS_KEY` | Usually yes | Pair with access key. |
| `AWS_SESSION_TOKEN` | Optional | For STS temporary credentials. |

## Encryption

| Variable / flag | Description |
| --- | --- |
| `ENCRYPTION_KEY` | Same 32-byte master key as the server. |
| `--encryption-key` | Overrides `ENCRYPTION_KEY` for one run (avoid shell history if possible). |

## Arguments

| Flag | Description |
| --- | --- |
| `-b`, `--bucket` | S3 bucket name. |
| `-k`, `--key` | Full object key (must match what Cerberus wrote), including `S3_ROOT_PREFIX` if used. |
| `-n`, `--name` | Dotenv variable name: print **value only** (single line, no trailing extras). |
| `--json` | Print JSON object of all `KEY` → `value`. |
| `-h`, `--help` | Help text. |

If neither `--name` nor `--json` is set, the script prints `KEY=value` lines for all entries.

## Examples

```bash
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=AKIA...
export AWS_SECRET_ACCESS_KEY=...
export ENCRYPTION_KEY=...

# All keys (dotenv lines)
npm run pull-secret -- -b my-co-vault -k prod/platform/api/.env

# JSON export
npm run pull-secret -- -b my-co-vault -k prod/platform/api/.env --json

# CI: inject one secret into a job
export API_KEY="$(npm run pull-secret -- -b my-co-vault -k prod/platform/api/.env -n API_KEY)"
```

## Operational safety

- Treat decrypted output like secret material: avoid logging, restrict CI visibility, and prefer ephemeral environments.
- Prefer **narrow IAM** policies scoped to the vault prefix.
- Rotating AWS keys used by automation should be routine; rotating `ENCRYPTION_KEY` requires re-encrypting every object.
