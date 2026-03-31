/** Comma-separated owner emails from env (trimmed, compared lowercase). */
export function parseOwnerEmails(): Set<string> {
  const raw = process.env.OWNER_EMAILS?.trim();
  if (!raw) return new Set();
  const emails = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return new Set(emails);
}

export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return parseOwnerEmails().has(email.trim().toLowerCase());
}

export function isEmailInAllowedDomain(
  email: string | null | undefined,
): boolean {
  const domain = process.env.ALLOWED_EMAIL_DOMAIN?.trim().toLowerCase();
  if (!domain || !email) return false;
  return email.trim().toLowerCase().endsWith(`@${domain}`);
}
