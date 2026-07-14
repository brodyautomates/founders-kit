// Runtime discovery of the user's relay (vault) and its folders via PocketBase.
//
// Because discovery is driven entirely by the signed-in user's PocketBase token
// (row-level rules scope results to what they can see), the only deploy-time
// config the server needs is auth. RELAY_ID is an optional pin for people who
// have several vaults and want a specific one.

import PocketBase from "pocketbase";
import { RELAY_ID, PB_AUTH_URL } from "../env.js";

const CACHE_TTL_MS = 5 * 60 * 1000;

export interface RelayInfo {
  id: string; // PocketBase record id
  guid: string; // user-facing vault UUID
  name: string;
}

interface RelayCache {
  byGuid: Record<string, RelayInfo>;
  cachedAt: number;
}
interface FolderCache {
  byName: Record<string, string>;
  cachedAt: number;
}

const relayCache = new Map<string, RelayCache>();
const folderCache = new Map<string, FolderCache>();

// Per-user cache bucket keyed off the tail of the token (tokens rotate on
// refresh, which naturally invalidates stale buckets).
function bucketFor(pbToken: string): string {
  return pbToken.slice(-32);
}

function pbClient(pbToken: string): PocketBase {
  const pb = new PocketBase(PB_AUTH_URL);
  pb.authStore.save(pbToken, null);
  return pb;
}

async function loadRelays(pbToken: string): Promise<Record<string, RelayInfo>> {
  const bucket = bucketFor(pbToken);
  const hit = relayCache.get(bucket);
  if (hit && Date.now() - hit.cachedAt < CACHE_TTL_MS) return hit.byGuid;

  const rows = await pbClient(pbToken).collection("relays").getFullList();
  const byGuid: Record<string, RelayInfo> = {};
  for (const row of rows as any[]) {
    if (row.guid) {
      byGuid[row.guid] = { id: row.id, guid: row.guid, name: row.name || "" };
    }
  }

  relayCache.set(bucket, { byGuid, cachedAt: Date.now() });
  return byGuid;
}

export async function resolveRelayId(pbToken: string): Promise<string> {
  // An explicit RELAY_ID wins, but only if the user can actually reach it.
  if (RELAY_ID) {
    const relays = await loadRelays(pbToken);
    if (!relays[RELAY_ID]) {
      const reachable = Object.keys(relays).join(", ") || "(none)";
      throw new Error(
        `RELAY_ID "${RELAY_ID}" is not reachable by the signed-in user. Reachable vault GUIDs: ${reachable}`,
      );
    }
    return RELAY_ID;
  }

  const relays = await loadRelays(pbToken);
  const guids = Object.keys(relays);
  if (guids.length === 0) {
    throw new Error(
      "This user has no Relay vaults. Create one in the Relay.md Obsidian plugin first.",
    );
  }
  if (guids.length === 1) return guids[0];

  console.log(
    `[discovery] ${guids.length} vaults available; defaulting to "${relays[guids[0]].name}" (${guids[0]}). Pin one with RELAY_ID.`,
  );
  return guids[0];
}

export async function listAccessibleRelays(pbToken: string): Promise<RelayInfo[]> {
  return Object.values(await loadRelays(pbToken));
}

async function loadFolders(
  pbToken: string,
  relayGuid: string,
): Promise<Record<string, string>> {
  const bucket = `${relayGuid}:${bucketFor(pbToken)}`;
  const hit = folderCache.get(bucket);
  if (hit && Date.now() - hit.cachedAt < CACHE_TTL_MS) return hit.byName;

  // shared_folders.relay is a relation to relays.id (a 15-char PB record id),
  // not the relay's guid — so PB can't filter by guid for us. We pull every
  // folder the user can see, expand the relay, then keep the ones whose relay
  // guid matches the one we want.
  const rows = await pbClient(pbToken)
    .collection("shared_folders")
    .getFullList({ expand: "relay" });

  const byName: Record<string, string> = {};
  for (const row of rows as any[]) {
    if (row.expand?.relay?.guid !== relayGuid) continue;
    if (row.name && row.guid) byName[row.name] = row.guid;
  }

  folderCache.set(bucket, { byName, cachedAt: Date.now() });
  return byName;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function looksLikeGuid(value: string): boolean {
  return UUID_RE.test(value);
}

/**
 * Turn a folder reference into a folder GUID. If the caller already passed a
 * GUID, it's returned as-is; otherwise it's resolved by name against the user's
 * discovered folders.
 */
export async function resolveFolderGuid(
  pbToken: string,
  relayId: string,
  folderRef: string,
): Promise<string> {
  if (looksLikeGuid(folderRef)) return folderRef;

  const folders = await loadFolders(pbToken, relayId);
  const guid = folders[folderRef];
  if (!guid) {
    const options = Object.keys(folders).join(", ") || "(no folders in this vault)";
    throw new Error(`No folder named "${folderRef}". Available: ${options}`);
  }
  return guid;
}

export async function getAvailableFolders(pbToken: string): Promise<string[]> {
  const relayId = await resolveRelayId(pbToken);
  const folders = await loadFolders(pbToken, relayId);
  return Object.keys(folders).sort();
}
