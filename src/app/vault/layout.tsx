import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

export default async function VaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-card px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Link href="/vault" className="font-semibold tracking-tight">
              Cerberus
            </Link>
            <span className="text-muted-foreground min-w-0 truncate text-sm">
              {session.user.email}
            </span>
            {session.user.isOwner ? (
              <span className="border-border bg-muted text-muted-foreground shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium">
                Owner
              </span>
            ) : null}
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
