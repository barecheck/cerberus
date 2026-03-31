import { notFound } from "next/navigation";
import { assertValidCollectionSlug, collectionPrefix } from "@/lib/paths";
import { decodeObjectKeyToken } from "@/lib/key-token";
import { FileWorkspace } from "@/app/vault/[slug]/file/file-workspace";

type Props = {
  params: Promise<{ slug: string; file: string }>;
};

export default async function FilePage(props: Props) {
  const { slug: raw, file: rawFile } = await props.params;
  const slug = decodeURIComponent(raw);
  try {
    assertValidCollectionSlug(slug);
  } catch {
    notFound();
  }

  const k = decodeURIComponent(rawFile);

  let objectKey: string;
  try {
    objectKey = decodeObjectKeyToken(k);
  } catch {
    notFound();
  }

  const prefix = collectionPrefix(slug);
  if (!objectKey.startsWith(prefix)) {
    notFound();
  }

  return <FileWorkspace collectionSlug={slug} objectKey={objectKey} />;
}
