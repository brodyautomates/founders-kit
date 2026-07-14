// Thin wrapper over the PocketBase auth endpoints that back Relay.md accounts.
// Handles password sign-in, the "send me a reset email" request, and refreshing
// an existing PocketBase token.

import { PB_AUTH_URL, PB_COLLECTION } from "../env.js";

export interface PbSession {
  pbToken: string;
  pbTokenExp: number;
  email: string;
  recordId: string;
}

// Pull the `exp` claim out of a PocketBase JWT without verifying it — we only
// need it to schedule refreshes.
function readTokenExpiry(token: string): number {
  const segments = token.split(".");
  if (segments.length < 2) return 0;
  try {
    const claims = JSON.parse(Buffer.from(segments[1], "base64url").toString("utf8"));
    return typeof claims.exp === "number" ? claims.exp : 0;
  } catch {
    return 0;
  }
}

function collectionUrl(action: string): string {
  return `${PB_AUTH_URL}/api/collections/${PB_COLLECTION}/${action}`;
}

interface AuthResponse {
  token: string;
  record: { id: string; email: string };
}

function toPbSession(body: AuthResponse): PbSession {
  return {
    pbToken: body.token,
    pbTokenExp: readTokenExpiry(body.token),
    email: String(body.record.email || "").toLowerCase(),
    recordId: body.record.id,
  };
}

export async function authWithPassword(credentials: {
  identity: string;
  password: string;
}): Promise<PbSession> {
  const res = await fetch(collectionUrl("auth-with-password"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identity: credentials.identity,
      password: credentials.password,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    if (res.status === 400) throw new Error("invalid email or password");
    throw new Error(`PocketBase sign-in failed (${res.status}): ${detail}`);
  }

  return toPbSession((await res.json()) as AuthResponse);
}

export async function requestPasswordReset(email: string): Promise<void> {
  const res = await fetch(collectionUrl("request-password-reset"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(
      `PocketBase reset request failed (${res.status}): ${await res.text()}`,
    );
  }
}

export async function refreshPbToken(pbToken: string): Promise<PbSession> {
  const res = await fetch(collectionUrl("auth-refresh"), {
    method: "POST",
    headers: { Authorization: pbToken },
  });
  if (!res.ok) {
    throw new Error(
      `PocketBase token refresh failed (${res.status}): ${await res.text()}`,
    );
  }
  return toPbSession((await res.json()) as AuthResponse);
}
