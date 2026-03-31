import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { isOwnerEmail } from "@/lib/owners";
import { prisma } from "@/lib/prisma";

const domain = process.env.ALLOWED_EMAIL_DOMAIN?.trim().toLowerCase();

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
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
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id!;
        session.user.isOwner = isOwnerEmail(user.email);
      }
      return session;
    },
  },
});
