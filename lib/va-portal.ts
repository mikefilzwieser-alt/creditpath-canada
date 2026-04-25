/** Default VA portal password (exclamation is ASCII 0x21). */
export const VA_PORTAL_DEFAULT_PASSWORD = "Autocredit007!";

const fromEnv = process.env.VA_PORTAL_PASSWORD;
const envTrimmed = typeof fromEnv === "string" ? fromEnv.trim() : "";

/** Non-empty `VA_PORTAL_PASSWORD` env wins; empty/whitespace env falls back to default (avoid `"" ?? default` staying ""). */
export const VA_PORTAL_PASSWORD = envTrimmed.length > 0 ? envTrimmed : VA_PORTAL_DEFAULT_PASSWORD;

export function isValidVaPortalPassword(provided: string | undefined | null): boolean {
  if (typeof provided !== "string") return false;
  return provided.trim() === VA_PORTAL_PASSWORD;
}
