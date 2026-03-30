"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { encodeObjectKeyToken } from "@/lib/key-token";
import { api } from "@/trpc/react";
import { toast } from "sonner";

export function NewObjectDialog({ collectionSlug }: { collectionSlug: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [relativePath, setRelativePath] = useState("");
  const [initialContent, setInitialContent] = useState("");
  const utils = api.useUtils();
  const create = api.objects.putByPath.useMutation({
    onSuccess: async (result) => {
      toast.success("File created");
      setOpen(false);
      setRelativePath("");
      setInitialContent("");
      await utils.objects.list.invalidate({ collectionSlug });
      const token = encodeObjectKeyToken(result.objectKey);
      router.push(`/vault/${encodeURIComponent(collectionSlug)}/file?k=${encodeURIComponent(token)}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const path = relativePath.trim().replace(/^\/+/, "");
    if (!path) {
      toast.error("Enter a path (e.g. backend/.env)");
      return;
    }
    create.mutate({
      collectionSlug,
      relativePath: path,
      content: initialContent,
    });
  };

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        New file
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>New encrypted file</DialogTitle>
              <DialogDescription>
                Path is relative to the collection folder. Use a <code>.env</code> suffix for key/value
                editing.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="path">Relative path</Label>
                <Input
                  id="path"
                  placeholder="e.g. api/.env"
                  value={relativePath}
                  onChange={(ev) => setRelativePath(ev.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="body">Initial content (optional)</Label>
                <Input
                  id="body"
                  placeholder={relativePath.endsWith(".env") ? "API_KEY=..." : "paste text…"}
                  value={initialContent}
                  onChange={(ev) => setInitialContent(ev.target.value)}
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
