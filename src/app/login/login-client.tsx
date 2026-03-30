"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function LoginClient() {
  return (
    <Button
      type="button"
      size="lg"
      className="gap-2"
      onClick={() => signIn("google", { callbackUrl: "/vault" })}
    >
      Continue with Google
    </Button>
  );
}
