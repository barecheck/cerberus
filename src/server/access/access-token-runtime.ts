import { isOwnerEmail } from "@/lib/owners";

export function tokenCreatorHasCollectionAccess(params: {
  creatorUserId: string;
  creatorEmail: string | null;
  collectionCreatedById: string | null;
  hasDirectGrant: boolean;
}): boolean {
  if (isOwnerEmail(params.creatorEmail)) return true;
  if (params.collectionCreatedById === params.creatorUserId) return true;
  return params.hasDirectGrant;
}
