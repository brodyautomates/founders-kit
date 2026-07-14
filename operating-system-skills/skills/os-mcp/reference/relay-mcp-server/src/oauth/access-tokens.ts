// Access + refresh token machinery.
//
// Access tokens are stateless HS256 JWTs (issuer and audience both pinned to
// PUBLIC_URL) that carry the session id, email and originating client. Refresh
// tokens are opaque random strings tracked in an in-memory table with their own
// expiry.

import crypto from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { JWT_SECRET, PUBLIC_URL } from "../env.js";

export const ACCESS_TOKEN_TTL_SEC = 60 * 60; // 1 hour
export const REFRESH_TOKEN_TTL_SEC = 30 * 24 * 60 * 60; // 30 days

function signingKey(): Uint8Array {
  if (!JWT_SECRET) throw new Error("JWT_SECRET required");
  return new TextEncoder().encode(JWT_SECRET);
}

export async function signAccessToken(claims: {
  sid: string;
  email: string;
  clientId: string;
}): Promise<string> {
  return new SignJWT({
    sid: claims.sid,
    email: claims.email,
    client_id: claims.clientId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(PUBLIC_URL)
    .setAudience(PUBLIC_URL)
    .setSubject(claims.email)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SEC}s`)
    .sign(signingKey());
}

export interface VerifiedAccessToken {
  sid: string;
  email: string;
  clientId: string;
  expSec: number;
}

export async function verifyAccessJwt(token: string): Promise<VerifiedAccessToken> {
  const { payload } = await jwtVerify(token, signingKey(), {
    issuer: PUBLIC_URL,
    audience: PUBLIC_URL,
  });

  const sid = String(payload.sid || "");
  const email = String(payload.email || "");
  const clientId = String(payload.client_id || "");
  const expSec = typeof payload.exp === "number" ? payload.exp : 0;

  if (!sid || !email || !clientId) {
    throw new Error("access token is missing required claims");
  }
  return { sid, email, clientId, expSec };
}

interface RefreshRecord {
  sid: string;
  clientId: string;
  expiresAt: number;
}

const refreshLedger = new Map<string, RefreshRecord>();

export function issueRefreshToken(sid: string, clientId: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  refreshLedger.set(token, {
    sid,
    clientId,
    expiresAt: Date.now() + REFRESH_TOKEN_TTL_SEC * 1000,
  });
  return token;
}

export function redeemRefreshToken(
  token: string,
): { sid: string; clientId: string } | undefined {
  const record = refreshLedger.get(token);
  if (!record) return undefined;
  if (record.expiresAt < Date.now()) {
    refreshLedger.delete(token);
    return undefined;
  }
  return { sid: record.sid, clientId: record.clientId };
}

export function revokeRefreshToken(token: string): void {
  refreshLedger.delete(token);
}
