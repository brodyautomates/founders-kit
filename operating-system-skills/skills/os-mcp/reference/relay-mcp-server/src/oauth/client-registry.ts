// Dynamic Client Registration store. Claude registers itself here on first
// connect (DCR); we mint a client id (and, for confidential clients, a secret)
// and remember the registration on the volume so it survives restarts.

import crypto from "node:crypto";
import path from "node:path";
import { DATA_DIR } from "../env.js";
import { readJsonFile, writeJsonFile } from "./disk-store.js";
import type { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js";
import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";

const STORE_PATH = path.join(DATA_DIR, "clients.json");

type ClientMap = Record<string, OAuthClientInformationFull>;

let memo: ClientMap | null = null;

function read(): ClientMap {
  if (!memo) memo = readJsonFile<ClientMap>(STORE_PATH, {});
  return memo;
}

function flush(): void {
  if (memo) writeJsonFile(STORE_PATH, memo);
}

export const clientsStore: OAuthRegisteredClientsStore = {
  getClient(clientId) {
    return read()[clientId];
  },
  registerClient(client) {
    const map = read();
    const clientId = crypto.randomBytes(16).toString("hex");
    const isPublic = client.token_endpoint_auth_method === "none";
    const clientSecret = isPublic
      ? undefined
      : crypto.randomBytes(32).toString("hex");

    const registered: OAuthClientInformationFull = {
      ...client,
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      ...(clientSecret ? { client_secret: clientSecret } : {}),
    };

    map[clientId] = registered;
    flush();
    return registered;
  },
};
