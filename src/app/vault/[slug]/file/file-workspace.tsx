"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";
import { toast } from "sonner";

type Props = { collectionSlug: string; objectKey: string };

/** Remount on `objectKey` so draft text resets when navigating between files. */
export function FileWorkspace(props: Props) {
  return <FileWorkspaceInner key={props.objectKey} {...props} />;
}

function FileWorkspaceInner({ collectionSlug, objectKey }: Props) {
  const router = useRouter();
  const { data, isLoading, error, refetch } = api.objects.get.useQuery({ objectKey });
  const [draft, setDraft] = useState<string | undefined>(undefined);
  const [mode, setMode] = useState<"raw" | "keys">("raw");

  const isDotenv = useMemo(
    () => data?.isDotenv ?? objectKey.split("/").pop()?.endsWith(".env"),
    [data, objectKey],
  );

  const secretsQuery = api.secrets.parse.useQuery(
    { objectKey },
    { enabled: !!data && !!isDotenv && mode === "keys" },
  );

  const text = draft ?? data?.plaintext ?? "";
  const utils = api.useUtils();
  const save = api.objects.put.useMutation({
    onSuccess: async () => {
      toast.success("Saved");
      setDraft(undefined);
      await utils.objects.get.invalidate({ objectKey });
      if (isDotenv) await utils.secrets.parse.invalidate({ objectKey });
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = api.objects.delete.useMutation({
    onSuccess: async () => {
      toast.success("File removed");
      await utils.objects.list.invalidate({ collectionSlug });
      router.push(`/vault/${encodeURIComponent(collectionSlug)}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    if (!data) return;
    save.mutate({ objectKey, content: text });
  };

  const handleDelete = () => {
    if (
      !confirm(
        `Delete "${objectKey.split("/").pop() ?? "this file"}"? This cannot be undone.`,
      )
    ) {
      return;
    }
    remove.mutate({ objectKey });
  };

  const copyValue = async (secretKey: string) => {
    try {
      const res = await utils.secrets.getValue.fetch({ objectKey, secretKey });
      await navigator.clipboard.writeText(res.value);
      toast.success(`Copied ${secretKey}`);
    } catch {
      toast.error("Could not copy value");
    }
  };

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Decrypting…</p>;
  }
  if (error || !data) {
    return (
      <div className="space-y-3">
        <p className="text-destructive text-sm">{error?.message ?? "Not found"}</p>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link className="hover:text-foreground" href="/vault">
            Collections
          </Link>
          <span>/</span>
          <Link className="hover:text-foreground" href={`/vault/${encodeURIComponent(collectionSlug)}`}>
            {collectionSlug}
          </Link>
        </div>
        <h1 className="mt-2 text-xl font-semibold tracking-tight break-all">
          {objectKey.split("/").pop()}
        </h1>
        <p className="text-muted-foreground mt-1 max-w-prose text-xs break-all">{objectKey}</p>
      </div>

      {!isDotenv ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Editor</CardTitle>
            <CardDescription>Content is encrypted with the server master key before leaving the app.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              className="min-h-[320px] font-mono text-sm"
              value={text}
              onChange={(e) => setDraft(e.target.value)}
            />
          </CardContent>
          <CardFooter className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleDelete}
              disabled={save.isPending || remove.isPending}
            >
              {remove.isPending ? "Deleting…" : "Delete"}
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={save.isPending || remove.isPending}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {mode === "keys" ? "Dotenv keys" : "Editor"}
            </CardTitle>
            <CardDescription>
              {mode === "keys"
                ? "Parsed from decrypted content. Edit raw text to change keys."
                : "Content is encrypted with the server master key before leaving the app."}
            </CardDescription>
            <CardAction>
              <div
                className="flex w-fit shrink-0 rounded-lg border bg-muted/50 p-0.5"
                role="tablist"
                aria-label="View mode"
              >
                <Button
                  type="button"
                  variant={mode === "raw" ? "outline" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-7 rounded-md px-3 shadow-none",
                    mode === "raw" &&
                      "font-semibold shadow-sm ring-1 ring-primary/25 dark:ring-primary/40",
                    mode !== "raw" && "text-muted-foreground",
                  )}
                  onClick={() => setMode("raw")}
                  role="tab"
                  aria-selected={mode === "raw"}
                >
                  Raw
                </Button>
                <Button
                  type="button"
                  variant={mode === "keys" ? "outline" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-7 rounded-md px-3 shadow-none",
                    mode === "keys" &&
                      "font-semibold shadow-sm ring-1 ring-primary/25 dark:ring-primary/40",
                    mode !== "keys" && "text-muted-foreground",
                  )}
                  onClick={() => setMode("keys")}
                  role="tab"
                  aria-selected={mode === "keys"}
                >
                  Keys
                </Button>
              </div>
            </CardAction>
          </CardHeader>
          <CardContent>
            {mode === "raw" ? (
              <Textarea
                className="min-h-[320px] font-mono text-sm"
                value={text}
                onChange={(e) => setDraft(e.target.value)}
              />
            ) : secretsQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">Parsing…</p>
            ) : secretsQuery.error ? (
              <p className="text-destructive text-sm">{secretsQuery.error.message}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(secretsQuery.data?.entries ?? []).map((row) => (
                    <TableRow key={row.key}>
                      <TableCell className="font-mono text-sm">{row.key}</TableCell>
                      <TableCell>
                        <Input readOnly className="font-mono text-xs" value={row.value} />
                      </TableCell>
                      <TableCell>
                        <Button type="button" size="sm" variant="secondary" onClick={() => copyValue(row.key)}>
                          Copy
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
          <CardFooter className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleDelete}
              disabled={save.isPending || remove.isPending}
            >
              {remove.isPending ? "Deleting…" : "Delete"}
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={save.isPending || remove.isPending}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
