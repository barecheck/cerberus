/** Normalize root prefix: no leading slash issues, trailing slash optional (we normalize to trailing slash or empty). */
export function getRootPrefix(): string {
  const raw = process.env.S3_ROOT_PREFIX ?? "";
  const trimmed = raw.replace(/^\/+/, "").trim();
  if (!trimmed) return "";
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

export function getBucket(): string {
  const b = process.env.S3_BUCKET_NAME?.trim();
  if (!b) throw new Error("S3_BUCKET_NAME is not set");
  return b;
}

/** Collection folder must be a single path segment (no slashes, no ..). */
export function assertValidCollectionSlug(slug: string) {
  if (
    !slug ||
    slug.includes("/") ||
    slug.includes("..") ||
    slug === "." ||
    slug === ".."
  ) {
    throw new Error("Invalid collection");
  }
}

/** Relative path within collection: no absolute, no `..` segments. */
export function assertSafeRelativePath(relativePath: string) {
  if (!relativePath || relativePath.startsWith("/")) {
    throw new Error("Invalid object path");
  }
  const parts = relativePath.split("/");
  for (const p of parts) {
    if (p === ".." || p === ".") throw new Error("Invalid object path");
  }
}

export function collectionPrefix(collectionSlug: string): string {
  assertValidCollectionSlug(collectionSlug);
  return `${getRootPrefix()}${collectionSlug}/`;
}

export function fullObjectKey(
  collectionSlug: string,
  relativePath: string,
): string {
  assertValidCollectionSlug(collectionSlug);
  assertSafeRelativePath(relativePath);
  return `${getRootPrefix()}${collectionSlug}/${relativePath}`;
}

/** First path segment after root = collection slug; remainder = path within collection. */
export function splitObjectKeyAfterRoot(objectKey: string): {
  slug: string;
  relativePath: string;
} {
  assertKeyUnderRoot(objectKey);
  const root = getRootPrefix();
  const rest = root ? objectKey.slice(root.length) : objectKey;
  const slash = rest.indexOf("/");
  if (slash === -1) {
    return { slug: rest, relativePath: "" };
  }
  return { slug: rest.slice(0, slash), relativePath: rest.slice(slash + 1) };
}

/** Ensure an arbitrary S3 key is under the configured root prefix (for get by full key). */
export function assertKeyUnderRoot(objectKey: string) {
  if (!objectKey || objectKey.startsWith("/") || objectKey.includes("..")) {
    throw new Error("Invalid object key");
  }
  const root = getRootPrefix();
  if (root && !objectKey.startsWith(root)) {
    throw new Error("Object key outside configured root");
  }
}
