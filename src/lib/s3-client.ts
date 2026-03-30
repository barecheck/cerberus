import { S3Client } from "@aws-sdk/client-s3";

let cached: S3Client | undefined;

export function s3Client(): S3Client {
  if (cached) return cached;
  const region = process.env.AWS_REGION?.trim();
  if (!region) throw new Error("AWS_REGION is not set");
  cached = new S3Client({
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
  return cached;
}
