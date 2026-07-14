// The vault file operations that the MCP tools call into. Everything here
// resolves the active relay + folder, opens the relevant Yjs documents, mutates
// or reads them, and lets edits settle so they propagate to the sync backend
// before the socket is torn down.

import { resolveRelayId, resolveFolderGuid } from "./discovery.js";
import { requestDocToken, openDoc, readFolderIndex, type OpenDoc } from "./gateway.js";

// Yjs edits are async over the wire; give them a beat to flush before closing.
const SETTLE_MS = 1500;
const CONTENT_SCAN_CAP = 20;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Resolve a folder reference to the concrete relay + folder guids we sync with.
async function locate(
  authToken: string,
  folderRef: string,
): Promise<{ relayId: string; folderGuid: string }> {
  const relayId = await resolveRelayId(authToken);
  const folderGuid = await resolveFolderGuid(authToken, relayId, folderRef);
  return { relayId, folderGuid };
}

// Open the folder-level document (its maps are the file index).
async function openFolder(
  authToken: string,
  relayId: string,
  folderGuid: string,
): Promise<OpenDoc> {
  const token = await requestDocToken(authToken, relayId, folderGuid, folderGuid);
  return openDoc(token);
}

// Open a single file's document.
async function openFile(
  authToken: string,
  relayId: string,
  docId: string,
  folderGuid: string,
  timeoutMs?: number,
): Promise<OpenDoc> {
  const token = await requestDocToken(authToken, relayId, docId, folderGuid);
  return openDoc(token, timeoutMs);
}

function teardown(open: OpenDoc): void {
  open.provider.destroy();
  open.doc.destroy();
}

// Look up an existing file's document id within an already-open folder doc.
function lookupDocId(folder: OpenDoc, filePath: string): string | undefined {
  return readFolderIndex(folder.doc).get(filePath);
}

// Register a brand-new file in the folder index and return its fresh doc id.
function registerNewFile(folder: OpenDoc, filePath: string): string {
  const docId = crypto.randomUUID();
  folder.doc.transact(() => {
    folder.doc.getMap("docs").set(filePath, docId);
    folder.doc
      .getMap("filemeta_v0")
      .set(filePath, { id: docId, type: "markdown", version: 0 });
  });
  return docId;
}

export async function listFiles(
  authToken: string,
  folderRef: string,
): Promise<Array<{ path: string; docId: string }>> {
  const { relayId, folderGuid } = await locate(authToken, folderRef);
  const folder = await openFolder(authToken, relayId, folderGuid);
  try {
    const entries: Array<{ path: string; docId: string }> = [];
    readFolderIndex(folder.doc).forEach((docId, path) => entries.push({ path, docId }));
    return entries.sort((a, b) => a.path.localeCompare(b.path));
  } finally {
    teardown(folder);
  }
}

export async function readFile(
  authToken: string,
  folderRef: string,
  filePath: string,
): Promise<string> {
  const { relayId, folderGuid } = await locate(authToken, folderRef);

  const folder = await openFolder(authToken, relayId, folderGuid);
  let docId: string;
  try {
    const found = lookupDocId(folder, filePath);
    if (!found) {
      const sample = readFolderIndex(folder.doc);
      const names = Array.from(sample.keys()).slice(0, 20).join(", ");
      throw new Error(`"${filePath}" is not in folder "${folderRef}". A few files: ${names}`);
    }
    docId = found;
  } finally {
    teardown(folder);
  }

  const file = await openFile(authToken, relayId, docId, folderGuid);
  try {
    return file.doc.getText("contents").toString();
  } finally {
    teardown(file);
  }
}

export async function writeFile(
  authToken: string,
  folderRef: string,
  filePath: string,
  content: string,
): Promise<void> {
  const { relayId, folderGuid } = await locate(authToken, folderRef);

  const folder = await openFolder(authToken, relayId, folderGuid);
  let docId: string;
  try {
    const existing = lookupDocId(folder, filePath);
    if (existing) {
      docId = existing;
    } else {
      docId = registerNewFile(folder, filePath);
      await wait(SETTLE_MS);
    }
  } finally {
    teardown(folder);
  }

  const file = await openFile(authToken, relayId, docId, folderGuid);
  try {
    const text = file.doc.getText("contents");
    file.doc.transact(() => {
      if (text.length > 0) text.delete(0, text.length);
      text.insert(0, content);
    });
    await wait(SETTLE_MS);
  } finally {
    teardown(file);
  }
}

export async function updateFile(
  authToken: string,
  folderRef: string,
  filePath: string,
  oldString: string,
  newString: string,
  replaceAll: boolean = false,
): Promise<{ replacements: number }> {
  if (!oldString) {
    throw new Error(
      "old_string cannot be empty. Use vault_append to add to the end of a file, or vault_write to create/overwrite it.",
    );
  }

  const { relayId, folderGuid } = await locate(authToken, folderRef);

  const folder = await openFolder(authToken, relayId, folderGuid);
  let docId: string;
  try {
    const found = lookupDocId(folder, filePath);
    if (!found) {
      throw new Error(`"${filePath}" is not in folder "${folderRef}". Create it with vault_write first.`);
    }
    docId = found;
  } finally {
    teardown(folder);
  }

  const file = await openFile(authToken, relayId, docId, folderGuid);
  try {
    const text = file.doc.getText("contents");
    const body = text.toString();

    // Collect every match first; we splice back-to-front so earlier offsets
    // stay valid as we edit.
    const positions: number[] = [];
    let at = body.indexOf(oldString);
    while (at !== -1) {
      positions.push(at);
      at = body.indexOf(oldString, at + oldString.length);
    }

    if (positions.length === 0) {
      throw new Error(`old_string was not found in "${filePath}".`);
    }
    if (positions.length > 1 && !replaceAll) {
      throw new Error(
        `old_string matches ${positions.length} spots in "${filePath}". Add surrounding context to make it unique, or pass replace_all=true.`,
      );
    }

    file.doc.transact(() => {
      for (let i = positions.length - 1; i >= 0; i--) {
        text.delete(positions[i], oldString.length);
        text.insert(positions[i], newString);
      }
    });

    await wait(SETTLE_MS);
    return { replacements: positions.length };
  } finally {
    teardown(file);
  }
}

export async function appendFile(
  authToken: string,
  folderRef: string,
  filePath: string,
  content: string,
): Promise<{ created: boolean; bytesAppended: number }> {
  const { relayId, folderGuid } = await locate(authToken, folderRef);

  const folder = await openFolder(authToken, relayId, folderGuid);
  let docId: string;
  let created = false;
  try {
    const existing = lookupDocId(folder, filePath);
    if (existing) {
      docId = existing;
    } else {
      docId = registerNewFile(folder, filePath);
      created = true;
      await wait(SETTLE_MS);
    }
  } finally {
    teardown(folder);
  }

  const file = await openFile(authToken, relayId, docId, folderGuid);
  try {
    const text = file.doc.getText("contents");
    file.doc.transact(() => text.insert(text.length, content));
    await wait(SETTLE_MS);
  } finally {
    teardown(file);
  }

  return { created, bytesAppended: content.length };
}

export async function deleteFile(
  authToken: string,
  folderRef: string,
  filePath: string,
): Promise<void> {
  const { relayId, folderGuid } = await locate(authToken, folderRef);

  const folder = await openFolder(authToken, relayId, folderGuid);
  try {
    if (!readFolderIndex(folder.doc).has(filePath)) {
      throw new Error(`"${filePath}" is not in folder "${folderRef}".`);
    }
    folder.doc.transact(() => {
      folder.doc.getMap("docs").delete(filePath);
      folder.doc.getMap("filemeta_v0").delete(filePath);
    });
    await wait(SETTLE_MS);
  } finally {
    teardown(folder);
  }
}

export async function moveFile(
  authToken: string,
  folderRef: string,
  oldPath: string,
  newPath: string,
): Promise<void> {
  const { relayId, folderGuid } = await locate(authToken, folderRef);

  const folder = await openFolder(authToken, relayId, folderGuid);
  try {
    const docsMap = folder.doc.getMap("docs");
    const metaMap = folder.doc.getMap("filemeta_v0");

    const docId = docsMap.get(oldPath) as string | undefined;
    const meta = metaMap.get(oldPath);

    if (!docId && !meta) {
      throw new Error(`"${oldPath}" is not in folder "${folderRef}".`);
    }

    folder.doc.transact(() => {
      if (docId) {
        docsMap.delete(oldPath);
        docsMap.set(newPath, docId);
      }
      if (meta) {
        metaMap.delete(oldPath);
        metaMap.set(newPath, meta);
      }
    });
    await wait(SETTLE_MS);
  } finally {
    teardown(folder);
  }
}

export async function searchFiles(
  authToken: string,
  folderRef: string,
  query: string,
): Promise<Array<{ path: string; snippet: string }>> {
  const { relayId, folderGuid } = await locate(authToken, folderRef);

  const folder = await openFolder(authToken, relayId, folderGuid);
  let index: Map<string, string>;
  try {
    index = readFolderIndex(folder.doc);
  } finally {
    teardown(folder);
  }

  const needle = query.toLowerCase();
  const hits: Array<{ path: string; snippet: string }> = [];

  // Cheap pass: filename matches, no document loads required.
  for (const [path] of index) {
    if (path.toLowerCase().includes(needle)) {
      hits.push({ path, snippet: "(filename match)" });
    }
  }

  // Expensive pass: open up to CONTENT_SCAN_CAP files and grep their bodies.
  let scanned = 0;
  for (const [path, docId] of index) {
    if (scanned >= CONTENT_SCAN_CAP) break;
    if (hits.some((h) => h.path === path)) continue;

    try {
      const file = await openFile(authToken, relayId, docId, folderGuid, 5000);
      try {
        const body = file.doc.getText("contents").toString();
        const idx = body.toLowerCase().indexOf(needle);
        if (idx !== -1) {
          const from = Math.max(0, idx - 50);
          const to = Math.min(body.length, idx + query.length + 50);
          hits.push({ path, snippet: body.slice(from, to).replace(/\n/g, " ") });
        }
      } finally {
        teardown(file);
      }
      scanned++;
    } catch {
      // A file that won't load just gets skipped.
    }
  }

  return hits;
}
