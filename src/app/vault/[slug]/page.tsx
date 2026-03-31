import Link from "next/link";
import { notFound } from "next/navigation";
import { CollectionAccessTokens } from "@/app/vault/[slug]/collection-access-tokens";
import { CollectionManageAccess } from "@/app/vault/[slug]/collection-manage-access";
import { ObjectsTable } from "@/app/vault/[slug]/objects-table";
import { NewObjectDialog } from "@/app/vault/[slug]/new-object-dialog";
import { assertValidCollectionSlug } from "@/lib/paths";

type Props = { params: Promise<{ slug: string }> };

export default async function CollectionPage(props: Props) {
  const { slug: raw } = await props.params;
  const slug = decodeURIComponent(raw);
  try {
    assertValidCollectionSlug(slug);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/vault" className="hover:text-foreground">
              Collections
            </Link>
            <span>/</span>
            <span className="text-foreground">{slug}</span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Secrets & files</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Objects are encrypted with AES-256-GCM before upload. Files ending in{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">.env</code> open in key/value
            mode.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CollectionManageAccess collectionSlug={slug} />
          <CollectionAccessTokens collectionSlug={slug} />
          <NewObjectDialog collectionSlug={slug} />
        </div>
      </div>
      <ObjectsTable collectionSlug={slug} />
    </div>
  );
}
