// Central place for reading and validating everything the process needs from
// the environment. Every other module pulls its settings from here so that the
// env-parsing rules (trailing-slash trimming, defaults, list splitting) live in
// exactly one file.

import path from "node:path";
import os from "node:os";

const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

// --- Relay / upstream ---
export const RELAY_API_URL = stripTrailingSlash(process.env.RELAY_API_URL || "");
export const RELAY_AUTH_TOKEN = process.env.RELAY_AUTH_TOKEN || "";
export const RELAY_ID = process.env.RELAY_ID || "";

// --- Web server ---
export const PORT = Number.parseInt(process.env.PORT || "3000", 10);
export const PUBLIC_URL = stripTrailingSlash(
  process.env.PUBLIC_URL || `http://localhost:${PORT}`,
);

// --- Secrets ---
export const JWT_SECRET = process.env.JWT_SECRET || "";
export const STATIC_MCP_BEARER = process.env.STATIC_MCP_BEARER || "";

// Comma-separated allow-list, normalised to lowercase with blanks dropped.
export const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || "")
  .split(",")
  .map((entry) => entry.trim().toLowerCase())
  .filter((entry) => entry.length > 0);

// --- Persistence ---
export const DATA_DIR =
  process.env.DATA_DIR || path.join(os.tmpdir(), "brody-os-mcp");

// --- PocketBase identity ---
export const PB_AUTH_URL = stripTrailingSlash(process.env.PB_AUTH_URL || "");
export const PB_COLLECTION = process.env.PB_COLLECTION || "users";

/**
 * Fail fast at boot if anything the server can't run without is missing.
 * RELAY_ID is deliberately absent from this check: when it isn't set the vault
 * is discovered from the signed-in user's PocketBase relays at request time.
 */
export function verifyEnvironment(): void {
  const problems: string[] = [];

  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    problems.push("JWT_SECRET (>=32 chars)");
  }
  if (!PUBLIC_URL) problems.push("PUBLIC_URL");
  if (!RELAY_API_URL) problems.push("RELAY_API_URL");
  if (!PB_AUTH_URL) problems.push("PB_AUTH_URL");

  if (problems.length > 0) {
    throw new Error(`Environment is missing/invalid: ${problems.join(", ")}`);
  }

  if (ALLOWED_EMAILS.length === 0) {
    console.warn(
      "[env] ALLOWED_EMAILS not set — every authenticated Relay.md account may sign in.",
    );
  }
}
