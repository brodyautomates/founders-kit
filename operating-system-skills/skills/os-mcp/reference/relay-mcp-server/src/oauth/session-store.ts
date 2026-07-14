// Persistent, encrypted-at-rest store for user sessions. Each session holds the
// upstream PocketBase token for one signed-in Relay.md account. The file is
// sealed with AES-256-GCM using a key derived from JWT_SECRET, so leaking the
// volume alone doesn't expose live upstream tokens.

import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs";
import { DATA_DIR, JWT_SECRET } from "../env.js";

const STORE_PATH = path.join(DATA_DIR, "sessions.enc");

export interface Session {
  sid: string;
  pbToken: string;
  pbTokenExp: number;
  email: string;
  recordId: string;
  createdAt: number;
  lastRefreshedAt: number;
}

let memo: Record<string, Session> | null = null;
let derivedKey: Buffer | null = null;

function encryptionKey(): Buffer {
  if (!derivedKey) {
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is required to derive the session encryption key");
    }
    derivedKey = crypto
      .createHash("sha256")
      .update(`sessions:${JWT_SECRET}`)
      .digest();
  }
  return derivedKey;
}

function seal(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const body = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), body.toString("base64")].join(".");
}

function unseal(packed: string): string {
  const [ivB64, tagB64, bodyB64] = packed.split(".");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const body = Buffer.from(bodyB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
}

function read(): Record<string, Session> {
  if (memo) return memo;
  try {
    if (!fs.existsSync(STORE_PATH)) {
      memo = {};
      return memo;
    }
    const packed = fs.readFileSync(STORE_PATH, "utf8").trim();
    memo = packed ? JSON.parse(unseal(packed)) : {};
    return memo!;
  } catch (error: any) {
    console.error(`[sessions] could not open store (${error.message}); starting empty`);
    memo = {};
    return memo;
  }
}

function flush(): void {
  if (!memo) return;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const staging = `${STORE_PATH}.tmp`;
  fs.writeFileSync(staging, seal(JSON.stringify(memo)));
  fs.renameSync(staging, STORE_PATH);
}

export function createSession(
  fields: Omit<Session, "sid" | "createdAt" | "lastRefreshedAt">,
): Session {
  const sid = crypto.randomBytes(24).toString("hex");
  const nowSec = Math.floor(Date.now() / 1000);
  const session: Session = {
    sid,
    ...fields,
    createdAt: nowSec,
    lastRefreshedAt: nowSec,
  };
  const map = read();
  map[sid] = session;
  flush();
  return session;
}

export function getSession(sid: string): Session | undefined {
  return read()[sid];
}

export function updateSession(sid: string, patch: Partial<Session>): Session | undefined {
  const map = read();
  const current = map[sid];
  if (!current) return undefined;
  map[sid] = { ...current, ...patch, lastRefreshedAt: Math.floor(Date.now() / 1000) };
  flush();
  return map[sid];
}

export function deleteSession(sid: string): void {
  const map = read();
  if (map[sid]) {
    delete map[sid];
    flush();
  }
}

export function listSessions(): Session[] {
  return Object.values(read());
}
