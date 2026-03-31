#!/usr/bin/env node
/**
 * Decrypt a Cerberus S3 object and print dotenv keys/values.
 * AWS credentials: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN (optional), AWS_REGION.
 *
 * Usage:
 *   node scripts/pull-secret.mjs --bucket my-bucket --key prod/team/api/.env [--name API_KEY] [--json]
 *   ENCRYPTION_KEY=... node scripts/pull-secret.mjs -b my-bucket -k prod/team/api/.env -n API_KEY
 */

import { parseArgs } from "node:util";
import { createDecipheriv, timingSafeEqual } from "node:crypto";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const MAGIC = Buffer.from("CRB1", "utf8");
const VERSION = 1;
const IV_LEN = 12;
const TAG_LEN = 16;

function usage() {
  console.error(`Cerberus pull-secret

Environment (AWS):
  AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
  Optional: AWS_SESSION_TOKEN

Environment (crypto):
  ENCRYPTION_KEY   Master key (or pass --encryption-key)

Options:
  -b, --bucket           S3 bucket name
  -k, --key              Full object key (including S3_ROOT_PREFIX if used)
  -n, --name             Dotenv key: print value only
      --json             Print JSON map of all keys
      --encryption-key   Override ENCRYPTION_KEY for this run
  -h, --help             Show this help
`);
}

function getEncryptionKey(raw) {
  if (!raw?.trim())
    throw new Error("ENCRYPTION_KEY or --encryption-key is required");
  const trimmed = raw.trim();
  if (trimmed.length === 64 && /^[0-9a-fA-F]+$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }
  try {
    const fromB64 = Buffer.from(trimmed, "base64");
    if (fromB64.length === 32) return fromB64;
  } catch {
    /* ignore */
  }
  const utf8 = Buffer.from(trimmed, "utf8");
  if (utf8.length === 32) return utf8;
  throw new Error(
    "ENCRYPTION_KEY must be 32 bytes (hex 64 chars, base64 of 32 bytes, or UTF-8 length 32)",
  );
}

function decryptToUtf8(blob, key) {
  if (blob.length < MAGIC.length + 1 + IV_LEN + TAG_LEN) {
    throw new Error("Invalid encrypted payload: too short");
  }
  if (!timingSafeEqual(blob.subarray(0, MAGIC.length), MAGIC)) {
    throw new Error("Invalid encrypted payload: bad magic");
  }
  const version = blob[MAGIC.length];
  if (version !== VERSION) {
    throw new Error(`Unsupported envelope version: ${version}`);
  }
  const ivStart = MAGIC.length + 1;
  const iv = blob.subarray(ivStart, ivStart + IV_LEN);
  const tagStart = blob.length - TAG_LEN;
  const ciphertext = blob.subarray(ivStart + IV_LEN, tagStart);
  const tag = blob.subarray(tagStart);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

function parseDotenv(content) {
  const lines = content.split(/\r?\n/);
  const out = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!key) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out.push({ key, value });
  }
  return out;
}

async function main() {
  const {
    values: { bucket, key, name, json, "encryption-key": encArg, help },
  } = parseArgs({
    args: process.argv.slice(2),
    options: {
      bucket: { type: "string", short: "b" },
      key: { type: "string", short: "k" },
      name: { type: "string", short: "n" },
      json: { type: "boolean", default: false },
      "encryption-key": { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: false,
  });

  if (help) {
    usage();
    process.exit(0);
  }

  if (!bucket || !key) {
    usage();
    process.exit(1);
  }

  const region = process.env.AWS_REGION?.trim();
  if (!region) {
    console.error("AWS_REGION is required");
    process.exit(1);
  }

  const encKey = getEncryptionKey(encArg ?? process.env.ENCRYPTION_KEY ?? "");

  const client = new S3Client({
    region,
    credentials:
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            sessionToken: process.env.AWS_SESSION_TOKEN,
          }
        : undefined,
  });

  const out = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  const bytes = await out.Body?.transformToByteArray();
  if (!bytes?.length) {
    console.error("Empty object body");
    process.exit(1);
  }

  const plaintext = decryptToUtf8(Buffer.from(bytes), encKey);
  const entries = parseDotenv(plaintext);

  if (json) {
    const map = Object.fromEntries(entries.map((e) => [e.key, e.value]));
    process.stdout.write(`${JSON.stringify(map, null, 2)}\n`);
    return;
  }

  if (name) {
    const hit = entries.find((e) => e.key === name);
    if (!hit) {
      console.error(`Key not found: ${name}`);
      process.exit(1);
    }
    process.stdout.write(`${hit.value}\n`);
    return;
  }

  for (const e of entries) {
    process.stdout.write(`${e.key}=${e.value}\n`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
