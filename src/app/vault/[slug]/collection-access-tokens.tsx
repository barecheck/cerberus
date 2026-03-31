"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/trpc/react";
import { toast } from "sonner";

type Props = { collectionSlug: string };

export function CollectionAccessTokens({ collectionSlug }: Props) {
  const { status } = useSession();
  const utils = api.useUtils();
  const listQuery = api.accessTokens.list.useQuery(
    { slug: collectionSlug },
    { enabled: status === "authenticated" },
  );

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [newTokenPlain, setNewTokenPlain] = useState<string | null>(null);

  const [revealOpen, setRevealOpen] = useState(false);
  const [revealTargetId, setRevealTargetId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<string | null>(null);

  const create = api.accessTokens.createForCollectionSlug.useMutation({
    onSuccess: async (data) => {
      toast.success(
        "Token created — copy it now; you can reveal it later if you’re an owner or creator.",
      );
      setNewTokenPlain(data.token);
      setName("");
      await utils.accessTokens.list.invalidate({ slug: collectionSlug });
    },
    onError: (e) => toast.error(e.message),
  });

  const revoke = api.accessTokens.revoke.useMutation({
    onSuccess: async () => {
      toast.success("Token revoked");
      await utils.accessTokens.list.invalidate({ slug: collectionSlug });
    },
    onError: (e) => toast.error(e.message),
  });

  const reveal = api.accessTokens.reveal.useMutation({
    onSuccess: (data) => {
      setRevealed(data.token);
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (!revealOpen || !revealTargetId) return;
    setRevealed(null);
    reveal.mutate({ id: revealTargetId });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run when dialog target changes
  }, [revealOpen, revealTargetId]);

  if (status !== "authenticated") return null;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setNewTokenPlain(null);
            setName("");
          }
        }}
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
        >
          Access tokens
        </Button>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Automations / API tokens</DialogTitle>
            <DialogDescription>
              Tokens can read decrypted files in this collection via the HTTP
              API (e.g. GitHub Actions). Store the value in your CI secrets.
            </DialogDescription>
          </DialogHeader>

          {newTokenPlain ? (
            <div className="grid gap-3 py-2">
              <p className="text-destructive text-sm font-medium">
                Copy this token now.
              </p>
              <code className="bg-muted max-h-32 overflow-auto break-all rounded-md p-3 text-xs">
                {newTokenPlain}
              </code>
              <DialogFooter>
                <Button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(newTokenPlain);
                      toast.success("Copied");
                    } catch {
                      toast.error("Could not copy");
                    }
                  }}
                >
                  Copy token
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setNewTokenPlain(null)}
                >
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form
              className="grid gap-4 py-2"
              onSubmit={(e) => {
                e.preventDefault();
                create.mutate({
                  slug: collectionSlug,
                  name: name.trim() || undefined,
                });
              }}
            >
              <div className="grid gap-2">
                <Label htmlFor={`access-token-name-${collectionSlug}`}>
                  Label (optional)
                </Label>
                <Input
                  id={`access-token-name-${collectionSlug}`}
                  value={name}
                  onChange={(ev) => setName(ev.target.value)}
                  placeholder="GitHub Actions — prod"
                  autoComplete="off"
                />
              </div>
              <DialogFooter className="sm:justify-start">
                <Button type="submit" disabled={create.isPending}>
                  {create.isPending ? "Creating…" : "Create token"}
                </Button>
              </DialogFooter>
            </form>
          )}

          <div className="border-t pt-4">
            <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
              Tokens for this collection
            </p>
            {listQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">Loading…</p>
            ) : !listQuery.data?.length ? (
              <p className="text-muted-foreground text-sm">No tokens yet.</p>
            ) : (
              <ul className="flex max-h-56 flex-col gap-2 overflow-y-auto text-sm">
                {listQuery.data.map((t) => (
                  <li
                    key={t.id}
                    className="bg-muted/50 flex flex-col gap-2 rounded-md px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {t.name ?? "Unnamed token"}
                      </div>
                      <code className="text-muted-foreground text-xs">
                        {t.displayToken}
                      </code>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {t.canManage ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setRevealTargetId(t.id);
                              setRevealed(null);
                              reveal.reset();
                              setRevealOpen(true);
                            }}
                          >
                            Reveal
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            disabled={revoke.isPending}
                            onClick={() => {
                              if (
                                confirm(
                                  "Revoke this token? CI jobs using it will fail to authenticate.",
                                )
                              ) {
                                revoke.mutate({ id: t.id });
                              }
                            }}
                          >
                            Revoke
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={revealOpen}
        onOpenChange={(v) => {
          setRevealOpen(v);
          if (!v) {
            setRevealTargetId(null);
            setRevealed(null);
            reveal.reset();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Reveal token</DialogTitle>
            <DialogDescription>
              Do not paste this into logs or public issues. Use your CI secret
              store (e.g. GitHub Secrets).
            </DialogDescription>
          </DialogHeader>
          {reveal.isPending && !revealed ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : reveal.isError ? (
            <p className="text-destructive text-sm">Could not reveal token.</p>
          ) : revealed ? (
            <code className="bg-muted max-h-40 overflow-auto break-all rounded-md p-3 text-xs">
              {revealed}
            </code>
          ) : null}
          <DialogFooter className="gap-2 sm:justify-start">
            {revealed ? (
              <Button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(revealed);
                    toast.success("Copied");
                  } catch {
                    toast.error("Could not copy");
                  }
                }}
              >
                Copy
              </Button>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              onClick={() => setRevealOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
