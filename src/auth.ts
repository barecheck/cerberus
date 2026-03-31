import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { isOwnerEmail } from "@/lib/owners";
import { prisma } from "@/lib/prisma";

const domain = process.env.ALLOWED_EMAIL_DOMAIN?.trim().toLowerCase();

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase();
      if (!domain || !email) return false;
      return email.endsWith(`@${domain}`);
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const email = user.email.trim().toLowerCase();
        const dbUser = await prisma.user.upsert({
          where: { email },
          create: {
            email,
            name: user.name,
          },
          update: {
            name: user.name ?? undefined,
          },
        });
        token.sub = dbUser.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.sub) session.user.id = token.sub;
        const email =
          session.user.email ?? (typeof token.email === "string" ? token.email : undefined);
        session.user.isOwner = isOwnerEmail(email);
      }
      return session;
    },
  },
});
