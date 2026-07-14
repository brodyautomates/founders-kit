// Low-level bridge to the Relay sync backend.
//
// Two primitives live here: minting a short-lived document token from the Relay
// HTTP API, and opening the corresponding Yjs document over a WebSocket and
// waiting for it to finish syncing. A folder in Relay is itself a Yjs document
// whose maps hold the file index; individual files are separate documents keyed
// by the ids found in that index.

import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import WebSocket from "ws";
import { RELAY_API_URL } from "../env.js";

// y-websocket reaches for a global WebSocket; Node doesn't ship one.
(globalThis as any).WebSocket = WebSocket;

export interface DocToken {
  url: string;
  baseUrl?: string;
  docId: string;
  token: string;
  authorization?: "full" | "read-only";
  expiryTime?: number;
}

/**
 * Ask the Relay API for a token that authorizes syncing one document (a folder
 * document or a file document) within a given relay + folder.
 */
export async function requestDocToken(
  authToken: string,
  relayId: string,
  docId: string,
  folderGuid: string,
): Promise<DocToken> {
  if (!authToken) {
    throw new Error("A Relay auth token is required (OAuth session or RELAY_AUTH_TOKEN)");
  }

  const endpoint = `${RELAY_API_URL}/token`;
  console.log(`[gateway] requesting doc token for ${docId.slice(0, 8)}… at ${endpoint}`);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
        "Relay-Version": "1.1.0",
      },
      body: JSON.stringify({ docId, relay: relayId, folder: folderGuid }),
    });
  } catch (error: any) {
    console.error("[gateway] token request network error:", error.message, error.cause);
    throw new Error(`Could not reach the Relay API at ${endpoint}: ${error.message}`);
  }

  if (!response.ok) {
    throw new Error(`Doc token request rejected (${response.status}): ${await response.text()}`);
  }

  return (await response.json()) as DocToken;
}

export interface OpenDoc {
  doc: Y.Doc;
  provider: WebsocketProvider;
}

/**
 * Open a Yjs document and resolve once the initial sync completes. Rejects if
 * sync doesn't land inside `timeoutMs` or the socket errors out. Callers are
 * responsible for tearing the returned provider/doc down.
 */
export function openDoc(token: DocToken, timeoutMs = 10_000): Promise<OpenDoc> {
  return new Promise((resolve, reject) => {
    const doc = new Y.Doc();

    const bail = setTimeout(() => {
      provider.destroy();
      doc.destroy();
      reject(new Error(`Timed out waiting for sync after ${timeoutMs}ms`));
    }, timeoutMs);

    const provider = new WebsocketProvider(token.url, token.docId, doc, {
      connect: true,
      params: { token: token.token },
      WebSocketPolyfill: WebSocket as any,
      disableBc: true,
    });

    provider.on("sync", (isSynced: boolean) => {
      if (isSynced) {
        clearTimeout(bail);
        resolve({ doc, provider });
      }
    });

    provider.on("connection-error", (event: any) => {
      clearTimeout(bail);
      provider.destroy();
      doc.destroy();
      reject(new Error(`WebSocket connection error: ${event?.message || "unknown"}`));
    });
  });
}

/**
 * Extract the folder's file index (path -> document id) from its Yjs maps.
 * The current schema stores this under `filemeta_v0`; older folders used a flat
 * `docs` map, which we merge in as a fallback for entries not already seen.
 */
export function readFolderIndex(folderDoc: Y.Doc): Map<string, string> {
  const index = new Map<string, string>();

  const filemeta = folderDoc.getMap("filemeta_v0");
  if (filemeta.size > 0) {
    filemeta.forEach((raw: any, filePath: string) => {
      if (raw && typeof raw === "object") {
        const meta = raw instanceof Y.Map ? Object.fromEntries(raw.entries()) : raw;
        if (meta.id) index.set(filePath, meta.id);
      } else if (typeof raw === "string") {
        index.set(filePath, raw);
      }
    });
  }

  const legacyDocs = folderDoc.getMap("docs");
  if (legacyDocs.size > 0) {
    legacyDocs.forEach((raw: any, filePath: string) => {
      if (!index.has(filePath) && typeof raw === "string") {
        index.set(filePath, raw);
      }
    });
  }

  return index;
}
