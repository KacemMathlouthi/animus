/** A name to show for a user. Real name when we have one, otherwise a friendly
 * title-cased version of the email's local part (magic-link sign-ups don't
 * provide a name). */
export function displayNameFrom(
  name: string | null | undefined,
  email: string
): string {
  const trimmed = name?.trim();
  if (trimmed) {
    return trimmed;
  }
  const local = email.split("@")[0] ?? email;
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
