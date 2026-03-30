import { CollectionsList } from "@/app/vault/collections-list";

export default function VaultHomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Collections</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Each collection is a top-level folder in your S3 prefix. Create folders in the bucket to
          see them here.
        </p>
      </div>
      <CollectionsList />
    </div>
  );
}
