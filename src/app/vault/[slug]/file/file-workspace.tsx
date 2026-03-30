"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  const handleSave = () => {
    if (!data) return;
    save.mutate({ objectKey, content: text });
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
      <div className="flex flex-wrap items-center justify-between gap-3">
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
        <div className="flex flex-wrap gap-2">
          {isDotenv ? (
            <>
              <Button
                type="button"
                variant={mode === "raw" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("raw")}
              >
                Raw
              </Button>
              <Button
                type="button"
                variant={mode === "keys" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("keys")}
              >
                Keys
              </Button>
            </>
          ) : null}
          <Button type="button" size="sm" onClick={handleSave} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {mode === "raw" || !isDotenv ? (
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
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dotenv keys</CardTitle>
            <CardDescription>Parsed from decrypted content. Edit raw text to change keys.</CardDescription>
          </CardHeader>
          <CardContent>
            {secretsQuery.isLoading ? (
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
        </Card>
      )}
    </div>
  );
}
