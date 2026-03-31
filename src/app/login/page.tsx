import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { LoginClient } from "@/app/login/login-client";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/vault");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6">
      <div className="max-w-md space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Cerberus</h1>
        <p className="text-muted-foreground text-sm">
          Sign in with your Google workspace account. Only emails on the
          configured domain are allowed.
        </p>
      </div>
      <LoginClient />
    </div>
  );
}
