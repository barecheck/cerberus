"use client";

import { useState } from "react";
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

export function CollectionManageAccess({ collectionSlug }: Props) {
  const utils = api.useUtils();
  const { data: meta } = api.collections.accessMeta.useQuery({
    slug: collectionSlug,
  });

  const grantsQuery = api.collections.listGrants.useQuery(
    { slug: collectionSlug },
    { enabled: meta?.canManageAccess === true },
  );
  const usersQuery = api.collections.listDomainUsers.useQuery(undefined, {
    enabled: meta?.canManageAccess === true,
  });

  const [open, setOpen] = useState(false);
  const [grantEmail, setGrantEmail] = useState("");

  const setGrant = api.collections.setGrant.useMutation({
    onSuccess: async () => {
      toast.success("Access updated");
      setGrantEmail("");
      await utils.collections.listGrants.invalidate({ slug: collectionSlug });
      await utils.collections.listDomainUsers.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const revokeGrant = api.collections.revokeGrant.useMutation({
    onSuccess: async () => {
      toast.success("Access removed");
      await utils.collections.listGrants.invalidate({ slug: collectionSlug });
    },
    onError: (e) => toast.error(e.message),
  });

  if (!meta?.canManageAccess) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        Manage access
      </Button>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Collection access</DialogTitle>
          <DialogDescription>
            Share this entire collection with someone in your domain by email.
            If they have not signed in yet, a user record is created and they
            will have access as soon as they log in with Google.
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-4 py-2"
          onSubmit={(e) => {
            e.preventDefault();
            const email = grantEmail.trim();
            if (!email) {
              toast.error("Choose or enter an email");
              return;
            }
            setGrant.mutate({
              slug: collectionSlug,
              userEmail: email,
            });
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="grant-user-email">User email</Label>
            <Input
              id="grant-user-email"
              list={`domain-users-${collectionSlug}`}
              value={grantEmail}
              onChange={(ev) => setGrantEmail(ev.target.value)}
              placeholder="colleague@company.com"
              autoComplete="off"
            />
            <datalist id={`domain-users-${collectionSlug}`}>
              {(usersQuery.data ?? []).map((u) => (
                <option key={u.id} value={u.email} label={u.name ?? u.email} />
              ))}
            </datalist>
          </div>
          <DialogFooter className="sm:justify-start">
            <Button type="submit" disabled={setGrant.isPending}>
              {setGrant.isPending ? "Saving…" : "Share collection"}
            </Button>
          </DialogFooter>
        </form>

        <div className="border-t pt-4">
          <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
            People with access
          </p>
          {grantsQuery.isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : !grantsQuery.data?.length ? (
            <p className="text-muted-foreground text-sm">
              No shares yet (creator and owners still have access).
            </p>
          ) : (
            <ul className="flex max-h-48 flex-col gap-2 overflow-y-auto text-sm">
              {grantsQuery.data.map((g) => (
                <li
                  key={g.userId}
                  className="bg-muted/50 flex flex-wrap items-center justify-between gap-2 rounded-md px-3 py-2"
                >
                  <span className="min-w-0 truncate font-medium">
                    {g.email}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive shrink-0"
                    disabled={revokeGrant.isPending}
                    onClick={() =>
                      revokeGrant.mutate({
                        slug: collectionSlug,
                        userEmail: g.email,
                      })
                    }
                  >
                    Revoke
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
