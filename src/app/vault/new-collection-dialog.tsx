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

export function NewCollectionDialog() {
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const utils = api.useUtils();
  const create = api.collections.create.useMutation({
    onSuccess: async () => {
      toast.success("Collection created");
      setOpen(false);
      setSlug("");
      await utils.collections.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = slug.trim();
    if (!name) {
      toast.error("Enter a collection name");
      return;
    }
    create.mutate({ slug: name });
  };

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        New collection
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>New collection</DialogTitle>
              <DialogDescription>
                Creates a folder in S3 under your configured root prefix. Use a single path segment (no
                slashes).
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="collection-name">Name</Label>
                <Input
                  id="collection-name"
                  placeholder="e.g. team-api"
                  value={slug}
                  onChange={(ev) => setSlug(ev.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
