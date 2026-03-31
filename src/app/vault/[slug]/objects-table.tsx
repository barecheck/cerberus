"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { encodeObjectKeyToken } from "@/lib/key-token";
import { api } from "@/trpc/react";

export function ObjectsTable({ collectionSlug }: { collectionSlug: string }) {
  const { data, isLoading, error } = api.objects.list.useQuery({ collectionSlug });

  if (isLoading) return <p className="text-muted-foreground text-sm">Loading…</p>;
  if (error) {
    return <p className="text-destructive text-sm">{error.message}</p>;
  }
  if (!data?.length) {
    return (
      <p className="text-muted-foreground text-sm">
        No files in this collection yet. Create one with &ldquo;New file&rdquo;.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Path</TableHead>
          <TableHead className="hidden sm:table-cell">Type</TableHead>
          <TableHead className="hidden md:table-cell text-right">Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => {
          const token = encodeObjectKeyToken(row.objectKey);
          return (
            <TableRow key={row.objectKey}>
              <TableCell>
                <Link
                  className="font-medium text-primary hover:underline"
                  href={`/vault/${encodeURIComponent(collectionSlug)}/file/${encodeURIComponent(token)}`}
                >
                  {row.relativePath}
                </Link>
              </TableCell>
              <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                {row.isDotenv ? ".env (keys)" : "Raw"}
              </TableCell>
              <TableCell className="hidden md:table-cell text-right text-muted-foreground text-sm">
                {row.lastModified
                  ? row.lastModified.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
                  : "—"}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
