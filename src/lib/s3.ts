import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  type ListObjectsV2CommandOutput,
} from "@aws-sdk/client-s3";
import { s3Client } from "@/lib/s3-client";

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
