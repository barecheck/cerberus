"use client";

import Link from "next/link";
import { CollectionActions } from "@/app/vault/collection-actions";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/trpc/react";

export function CollectionsList() {
  const { data, isLoading, error } = api.collections.list.useQuery();

  if (isLoading) {
    return (
      <p className="text-muted-foreground text-sm">Loading collections…</p>
    );
  }
  if (error) {
    return (
      <p className="text-destructive text-sm">
        {error.message ||
          "Failed to load collections. Check AWS and S3 configuration."}
      </p>
    );
  }
  if (!data?.length) {
    return (
      <p className="text-muted-foreground text-sm">
        No collections yet. Create one above or add a folder under your S3 root
        prefix in the console.
      </p>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {data.map((c) => (
        <li key={c.slug}>
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center gap-2 space-y-0">
              <Link
                href={`/vault/${encodeURIComponent(c.slug)}`}
                className="min-w-0 flex-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CardTitle className="text-base">{c.slug}</CardTitle>
              </Link>
              <CollectionActions slug={c.slug} />
            </CardHeader>
          </Card>
        </li>
      ))}
    </ul>
  );
}
