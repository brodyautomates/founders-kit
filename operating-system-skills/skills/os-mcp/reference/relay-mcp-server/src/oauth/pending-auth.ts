// Short-lived record created the moment Claude hits /authorize and consumed
// once the user finishes the sign-in form. It parks Claude's own OAuth
// parameters (client, redirect, PKCE challenge, ...) behind a random handle we
// call `localState`, which is the value we round-trip through our login page.

import crypto from "node:crypto";
import path from "node:path";
import { DATA_DIR } from "../env.js";
import { readJsonFile, writeJsonFile } from "./disk-store.js";

export interface PendingAuth {
  localState: string;
  claudeClientId: string;
  claudeRedirectUri: string;
  claudeState?: string;
  claudeCodeChallenge: string;
  claudeResource?: string;
  expiresAt: number;
}

const STORE_PATH = path.join(DATA_DIR, "pending.json");
const LIFETIME_MS = 30 * 60_000;

type PendingMap = Record<string, PendingAuth>;

let memo: PendingMap | null = null;

function read(): PendingMap {
  if (!memo) memo = readJsonFile<PendingMap>(STORE_PATH, {});
  return memo;
}

function flush(): void {
  if (memo) writeJsonFile(STORE_PATH, memo);
}

// Drop expired handles; returns whether anything changed.
function pruneExpired(): boolean {
  const map = read();
  const now = Date.now();
  let changed = false;
  for (const handle of Object.keys(map)) {
    if (map[handle].expiresAt < now) {
      delete map[handle];
      changed = true;
    }
  }
  return changed;
}

export function createPending(
  data: Omit<PendingAuth, "localState" | "expiresAt">,
): PendingAuth {
  pruneExpired();
  const map = read();
  const localState = crypto.randomBytes(24).toString("hex");
  const record: PendingAuth = {
    ...data,
    localState,
    expiresAt: Date.now() + LIFETIME_MS,
  };
  map[localState] = record;
  flush();
  return record;
}

export function consumePending(localState: string): PendingAuth | undefined {
  pruneExpired();
  const map = read();
  const record = map[localState];
  if (!record) return undefined;
  delete map[localState];
  flush();
  return record;
}

export function peekPending(localState: string): PendingAuth | undefined {
  if (pruneExpired()) flush();
  return read()[localState];
}

/**
 * Read a pending record without removing it, and push its expiry back out.
 * Used by the password-reset flow, where the user may sit on the page for a
 * while waiting for a reset email before completing sign-in.
 */
export function touchPending(localState: string): PendingAuth | undefined {
  pruneExpired();
  const map = read();
  const record = map[localState];
  if (!record) return undefined;
  record.expiresAt = Date.now() + LIFETIME_MS;
  flush();
  return record;
}
