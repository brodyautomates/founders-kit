// One-time authorization codes handed back to Claude after a successful login.
// Each code points at an established session and carries the PKCE challenge so
// the eventual token exchange can be verified. Codes live for a minute.

import crypto from "node:crypto";
import path from "node:path";
import { DATA_DIR } from "../env.js";
import { readJsonFile, writeJsonFile } from "./disk-store.js";

export interface GrantCode {
  code: string;
  sid: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  resource?: string;
  expiresAt: number;
}

const STORE_PATH = path.join(DATA_DIR, "codes.json");
const LIFETIME_MS = 60_000;

type CodeMap = Record<string, GrantCode>;

let memo: CodeMap | null = null;

function read(): CodeMap {
  if (!memo) memo = readJsonFile<CodeMap>(STORE_PATH, {});
  return memo;
}

function flush(): void {
  if (memo) writeJsonFile(STORE_PATH, memo);
}

function pruneExpired(): boolean {
  const map = read();
  const now = Date.now();
  let changed = false;
  for (const key of Object.keys(map)) {
    if (map[key].expiresAt < now) {
      delete map[key];
      changed = true;
    }
  }
  return changed;
}

export function createCode(
  data: Omit<GrantCode, "code" | "expiresAt">,
): GrantCode {
  pruneExpired();
  const map = read();
  const code = crypto.randomBytes(24).toString("hex");
  const record: GrantCode = { ...data, code, expiresAt: Date.now() + LIFETIME_MS };
  map[code] = record;
  flush();
  return record;
}

export function consumeCode(code: string): GrantCode | undefined {
  pruneExpired();
  const map = read();
  const record = map[code];
  if (!record) return undefined;
  delete map[code];
  flush();
  return record;
}

export function peekCode(code: string): GrantCode | undefined {
  if (pruneExpired()) flush();
  return read()[code];
}
