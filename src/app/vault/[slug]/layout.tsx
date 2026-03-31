import { auth } from "@/auth";
import { assertValidCollectionSlug } from "@/lib/paths";
import { userCanOpenVaultCollection } from "@/server/access/collections";
import { notFound, redirect } from "next/navigation";

type Props = { children: React.ReactNode; params: Promise<{ slug: string }> };

export default async function VaultCollectionLayout({
  children,
  params,
}: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw);
  try {
    assertValidCollectionSlug(slug);
  } catch {
    notFound();
  }

  const allowed = await userCanOpenVaultCollection({
    userId: session.user.id,
    email: session.user.email,
    slug,
  });
  if (!allowed) notFound();

  return children;
}
