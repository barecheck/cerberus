"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/trpc/react";

export function CollectionsList() {
  const { data, isLoading, error } = api.collections.list.useQuery();

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Loading collections…</p>;
  }
  if (error) {
    return (
      <p className="text-destructive text-sm">
        {error.message || "Failed to load collections. Check AWS and S3 configuration."}
      </p>
    );
  }
  if (!data?.length) {
    return (
      <p className="text-muted-foreground text-sm">
        No collections found. Add a folder under your S3 root prefix to get started.
      </p>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {data.map((c) => (
        <li key={c.slug}>
          <Link href={`/vault/${encodeURIComponent(c.slug)}`}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="text-base">{c.slug}</CardTitle>
              </CardHeader>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
