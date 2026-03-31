import {
  CopyObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  type ListObjectsV2CommandOutput,
} from "@aws-sdk/client-s3";
import { s3Client } from "@/lib/s3-client";

function copySourceBucketKey(bucket: string, sourceKey: string) {
  return `${bucket}/${sourceKey.split("/").map(encodeURIComponent).join("/")}`;
}

export async function listCommonPrefixes(prefix: string, delimiter = "/") {
  const client = s3Client();
  const prefixes: string[] = [];
  let ContinuationToken: string | undefined;

  do {
    const out: ListObjectsV2CommandOutput = await client.send(
      new ListObjectsV2Command({
        Bucket: process.env.S3_BUCKET_NAME!,
        Prefix: prefix,
        Delimiter: delimiter,
        ContinuationToken,
      }),
    );
    for (const cp of out.CommonPrefixes ?? []) {
      if (cp.Prefix) prefixes.push(cp.Prefix);
    }
    ContinuationToken = out.IsTruncated ? out.NextContinuationToken : undefined;
  } while (ContinuationToken);

  return prefixes;
}

/** True if any S3 object exists under `prefix` (including a zero-byte “folder” key ending in `/`). */
export async function prefixHasAnyObject(prefix: string): Promise<boolean> {
  const client = s3Client();
  const out = await client.send(
    new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET_NAME!,
      Prefix: prefix,
      MaxKeys: 1,
    }),
  );
  return Boolean(out.Contents?.length);
}

/** All object keys under `prefix` (including keys that end with `/`). */
export async function listAllKeysUnderPrefix(prefix: string): Promise<string[]> {
  const client = s3Client();
  const keys: string[] = [];
  let ContinuationToken: string | undefined;

  do {
    const out = await client.send(
      new ListObjectsV2Command({
        Bucket: process.env.S3_BUCKET_NAME!,
        Prefix: prefix,
        ContinuationToken,
      }),
    );
    for (const obj of out.Contents ?? []) {
      if (obj.Key) keys.push(obj.Key);
    }
    ContinuationToken = out.IsTruncated ? out.NextContinuationToken : undefined;
  } while (ContinuationToken);

  return keys;
}

export async function listObjectsUnderPrefix(prefix: string) {
  const client = s3Client();
  const keys: { key: string; size: number | undefined; lastModified: Date | undefined }[] = [];
  let ContinuationToken: string | undefined;

  do {
    const out = await client.send(
      new ListObjectsV2Command({
        Bucket: process.env.S3_BUCKET_NAME!,
        Prefix: prefix,
        ContinuationToken,
      }),
    );
    for (const obj of out.Contents ?? []) {
      if (!obj.Key || obj.Key.endsWith("/")) continue;
      keys.push({
        key: obj.Key,
        size: obj.Size,
        lastModified: obj.LastModified,
      });
    }
    ContinuationToken = out.IsTruncated ? out.NextContinuationToken : undefined;
  } while (ContinuationToken);

  return keys;
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const client = s3Client();
  const out = await client.send(
    new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: key,
    }),
  );
  const bytes = await out.Body?.transformToByteArray();
  if (!bytes) throw new Error("Empty S3 object body");
  return Buffer.from(bytes);
}

export async function putObjectBuffer(key: string, body: Buffer, contentType = "application/octet-stream") {
  const client = s3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

/** S3 “folder”: key must end with `/`. Listing with delimiter will expose the collection prefix. */
export async function putFolderPlaceholder(keyEndingWithSlash: string) {
  if (!keyEndingWithSlash.endsWith("/")) {
    throw new Error("Folder placeholder key must end with /");
  }
  await putObjectBuffer(keyEndingWithSlash, Buffer.alloc(0), "application/octet-stream");
}

export async function copyObjectInBucket(sourceKey: string, destKey: string) {
  const client = s3Client();
  const bucket = process.env.S3_BUCKET_NAME!;
  await client.send(
    new CopyObjectCommand({
      Bucket: bucket,
      CopySource: copySourceBucketKey(bucket, sourceKey),
      Key: destKey,
    }),
  );
}

export async function deleteObjectsKeys(keys: string[]) {
  if (keys.length === 0) return;
  const client = s3Client();
  const bucket = process.env.S3_BUCKET_NAME!;
  const batchSize = 1000;
  for (let i = 0; i < keys.length; i += batchSize) {
    const batch = keys.slice(i, i + batchSize);
    const out = await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: batch.map((Key) => ({ Key })),
          Quiet: true,
        },
      }),
    );
    const errs = out.Errors ?? [];
    if (errs.length > 0) {
      throw new Error(`S3 delete failed: ${errs.map((e) => e.Message ?? e.Key).join(", ")}`);
    }
  }
}
