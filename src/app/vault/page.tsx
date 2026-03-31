import { CollectionsList } from "@/app/vault/collections-list";
import { NewCollectionDialog } from "@/app/vault/new-collection-dialog";

export default function VaultHomePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Collections</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Each collection is a top-level folder in your S3 prefix. You can
            manage folders here or in the S3 console.
          </p>
        </div>
        <NewCollectionDialog />
      </div>
      <CollectionsList />
    </div>
  );
}
