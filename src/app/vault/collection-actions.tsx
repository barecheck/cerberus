"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { MoreHorizontalIcon } from "lucide-react";
import { toast } from "sonner";

type Props = { slug: string };

export function CollectionActions({ slug }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const utils = api.useUtils();
  const { data: accessMeta } = api.collections.accessMeta.useQuery({ slug });
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newSlug, setNewSlug] = useState(slug);

  const rename = api.collections.rename.useMutation({
    onSuccess: async (_, vars) => {
      toast.success("Collection renamed");
      setRenameOpen(false);
      await utils.collections.list.invalidate();
      const vaultBase = `/vault/${encodeURIComponent(vars.fromSlug)}`;
      if (pathname === vaultBase || pathname.startsWith(`${vaultBase}/`)) {
        const rest = pathname.slice(vaultBase.length);
        router.replace(`/vault/${encodeURIComponent(vars.toSlug)}${rest}`);
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteCollection = api.collections.delete.useMutation({
    onSuccess: async (_, vars) => {
      toast.success("Collection deleted");
      setDeleteOpen(false);
      await utils.collections.list.invalidate();
      const vaultBase = `/vault/${encodeURIComponent(vars.slug)}`;
      if (pathname === vaultBase || pathname.startsWith(`${vaultBase}/`)) {
        router.replace("/vault");
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const openRename = () => {
    setNewSlug(slug);
    setRenameOpen(true);
  };

  if (!accessMeta?.canRenameDelete) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          type="button"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "text-muted-foreground shrink-0",
          )}
          aria-label={`Actions for ${slug}`}
        >
          <MoreHorizontalIcon className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[140px]">
          <DropdownMenuItem onClick={openRename}>Rename…</DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            Delete…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={renameOpen}
        onOpenChange={(o) => {
          setRenameOpen(o);
          if (o) setNewSlug(slug);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const to = newSlug.trim();
              if (!to) {
                toast.error("Enter a new name");
                return;
              }
              rename.mutate({ fromSlug: slug, toSlug: to });
            }}
          >
            <DialogHeader>
              <DialogTitle>Rename collection</DialogTitle>
              <DialogDescription>
                Moves all objects in S3 from{" "}
                <code className="text-foreground">{slug}</code> to the new
                folder name. This can take a moment for large collections.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor={`rename-${slug}`}>New name</Label>
                <Input
                  id={`rename-${slug}`}
                  value={newSlug}
                  onChange={(ev) => setNewSlug(ev.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setRenameOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={rename.isPending}>
                {rename.isPending ? "Renaming…" : "Rename"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete collection</DialogTitle>
            <DialogDescription>
              Permanently delete folder{" "}
              <code className="text-foreground">{slug}</code> and{" "}
              <strong className="text-foreground">all encrypted files</strong>{" "}
              inside it from S3. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteCollection.isPending}
              onClick={() => deleteCollection.mutate({ slug })}
            >
              {deleteCollection.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
