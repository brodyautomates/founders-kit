// Builds an MCP server instance for a single request and registers the vault
// tools on it. Every tool call first turns the request's auth info into a live
// Relay token (either the static bearer's upstream token, or the OAuth
// session's freshly-refreshed PocketBase token) before doing any work.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Request } from "express";
import { z } from "zod";

import {
  listFiles,
  readFile,
  writeFile,
  updateFile,
  appendFile,
  deleteFile,
  moveFile,
  searchFiles,
} from "./vault/operations.js";
import {
  getAvailableFolders,
  listAccessibleRelays,
  resolveRelayId,
} from "./vault/discovery.js";
import { RELAY_AUTH_TOKEN } from "./env.js";
import { ensureFreshPbToken } from "./oauth/refresher.js";

/**
 * Map an authenticated request onto the upstream token used for Relay calls.
 * Static-bearer callers borrow the configured RELAY_AUTH_TOKEN; OAuth callers
 * use their own session token, refreshed if it's about to expire.
 */
export async function resolveRelayToken(req: Request): Promise<string> {
  const auth = req.auth;
  if (!auth) throw new Error("request carries no auth info");

  const extra = (auth.extra || {}) as { mode?: string; sid?: string };

  if (extra.mode === "static") {
    if (!RELAY_AUTH_TOKEN) {
      throw new Error("static bearer was used but RELAY_AUTH_TOKEN is not configured");
    }
    return RELAY_AUTH_TOKEN;
  }

  if (extra.mode === "oauth" && extra.sid) {
    const pbToken = await ensureFreshPbToken(extra.sid);
    if (!pbToken) throw new Error("your session has expired — please sign in again");
    return pbToken;
  }

  throw new Error("unrecognized auth mode");
}

// Wrap a tool body so any thrown error becomes an MCP error result instead of
// crashing the transport.
function guarded<A>(
  run: (args: A) => Promise<{ content: Array<{ type: "text"; text: string }> }>,
) {
  return async (args: A) => {
    try {
      return await run(args);
    } catch (error: any) {
      return {
        content: [{ type: "text" as const, text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  };
}

const text = (value: string) => ({
  content: [{ type: "text" as const, text: value }],
});

const SERVER_GUIDANCE = [
  "This connects to the user's Obsidian vault through the Relay sync protocol. It holds their notes, daily logs, projects, and personal knowledge base.",
  "",
  "Reach for it any time the user talks about their vault, Obsidian, notes, daily notes, meeting notes, a journal, a second brain, a knowledge base, or Zettelkasten.",
  "",
  "Everything is markdown, and it syncs live. Anything you write here shows up in every open Obsidian client within seconds.",
  "",
  "Folders come from the user's Relay account and are discovered at runtime. Run vault_folders to see the folder names before using a folder-scoped tool, or pass a folder GUID straight through.",
  "",
  "Tools:",
  "- vault_relays: show the Relay vaults this user can reach",
  "- vault_folders: show the top-level folders in the active vault",
  "- vault_list: list the files inside a folder",
  "- vault_read: return the markdown of a single file",
  "- vault_search: search filenames and content for a term",
  "- vault_write: create a file or replace it whole",
  "- vault_update: edit part of a file with exact find-and-replace",
  "- vault_append: add to the end of a file (creates it if missing)",
  "- vault_move: rename or relocate a file",
  "- vault_delete: remove a file (permanent, syncs everywhere)",
  "",
  "When the user names a topic instead of a path, start with vault_search. For edits, prefer vault_update or vault_append over vault_write: they send only the change, so they stay fast on large notes and keep concurrent Obsidian edits intact. Use vault_write for new files or full rewrites.",
].join("\n");

export function buildVaultServer(req: Request): McpServer {
  const server = new McpServer(
    {
      name: "brody-ai-os",
      title: "The Brody Operating System (Vault)",
      version: "2.0.0",
      description:
        "Read, write, search, move, and delete markdown notes in an Obsidian vault synced through the Relay protocol. Vault folders are discovered from the user's Relay account at runtime.",
      websiteUrl: "https://relay.md",
    } as any,
    { instructions: SERVER_GUIDANCE },
  );

  server.registerTool(
    "vault_relays",
    {
      title: "Lists the Relay vaults this user can reach.",
      description:
        "List every Relay vault the signed-in user can access. Handy when someone has more than one vault and you want to confirm which is being used. The active vault is whatever the server is bound to (the RELAY_ID override, or the first vault when that's unset).",
      inputSchema: {},
      annotations: {
        title: "Lists the Relay vaults this user can reach.",
        readOnlyHint: true,
        openWorldHint: false,
      },
    },
    guarded(async () => {
      const token = await resolveRelayToken(req);
      const [relays, activeId] = await Promise.all([
        listAccessibleRelays(token),
        resolveRelayId(token).catch((e) => `<error: ${e.message}>`),
      ]);
      if (relays.length === 0) {
        return text(
          "No vaults are reachable by this user. Create one in your Relay.md Obsidian plugin first.",
        );
      }
      const lines = relays.map(
        (r) => `${r.guid === activeId ? "* " : "  "}${r.name || "(unnamed)"} — ${r.guid}`,
      );
      return text(`The active vault is marked with *.\n\n${lines.join("\n")}`);
    }),
  );

  server.registerTool(
    "vault_folders",
    {
      title: "Lists the top-level folders in the active vault.",
      description:
        "List the top-level folders in the active Relay vault. Call this first whenever the user names a folder you don't already recognize. The names it returns can be passed as the `folder` argument to the other vault_* tools.",
      inputSchema: {},
      annotations: {
        title: "Lists the top-level folders in the active vault.",
        readOnlyHint: true,
        openWorldHint: false,
      },
    },
    guarded(async () => {
      const token = await resolveRelayToken(req);
      const folders = await getAvailableFolders(token);
      return text(
        folders.length
          ? folders.join("\n")
          : "(no folders in the active vault — run vault_relays to check which vaults you can reach)",
      );
    }),
  );

  server.registerTool(
    "vault_list",
    {
      title: "Lists the files in a vault folder.",
      description:
        "List the files in one folder of the vault. Use it to browse or to see what a folder holds. Returns file paths with their document ids. Pass a folder name (run vault_folders first if unsure) or a folder GUID.",
      inputSchema: {
        folder: z.string().describe("Folder name (e.g. from vault_folders) or folder GUID"),
      },
      annotations: {
        title: "Lists the files in a vault folder.",
        readOnlyHint: true,
        openWorldHint: false,
      },
    },
    guarded(async ({ folder }: { folder: string }) => {
      const token = await resolveRelayToken(req);
      const files = await listFiles(token, folder);
      return text(JSON.stringify(files, null, 2));
    }),
  );

  server.registerTool(
    "vault_read",
    {
      title: "Reads the contents of a vault note.",
      description:
        "Read one markdown file from the vault. Use it when the user points at a specific note, daily log, or project file and you already know the path. If you only have a topic, run vault_search first. Returns the whole file as plain text.",
      inputSchema: {
        folder: z.string().describe("Folder name (from vault_folders) or folder GUID"),
        path: z
          .string()
          .describe("Relative file path inside the folder, e.g. '2026-04-10.md' or 'subfolder/file.md'"),
      },
      annotations: {
        title: "Reads the contents of a vault note.",
        readOnlyHint: true,
        openWorldHint: false,
      },
    },
    guarded(async ({ folder, path }: { folder: string; path: string }) => {
      const token = await resolveRelayToken(req);
      return text(await readFile(token, folder, path));
    }),
  );

  server.registerTool(
    "vault_search",
    {
      title: "Searches vault notes by filename and content.",
      description:
        "Search the vault by filename or content. Start here whenever the user mentions a topic, person, project, meeting, or idea without an exact path — it's the quickest way to find the right note. Returns matching paths with context snippets (content is scanned across up to 20 files).",
      inputSchema: {
        folder: z.string().describe("Folder name (from vault_folders) or folder GUID"),
        query: z.string().describe("Search term (matched against filenames and file content)"),
      },
      annotations: {
        title: "Searches vault notes by filename and content.",
        readOnlyHint: true,
        openWorldHint: false,
      },
    },
    guarded(async ({ folder, query }: { folder: string; query: string }) => {
      const token = await resolveRelayToken(req);
      const results = await searchFiles(token, folder, query);
      if (results.length === 0) {
        return text(`Nothing matched "${query}" in ${folder}.`);
      }
      return text(JSON.stringify(results, null, 2));
    }),
  );

  server.registerTool(
    "vault_write",
    {
      title: "Creates or overwrites a vault note.",
      description:
        "Create or overwrite a markdown file in the vault. Use it to save daily notes, meeting summaries, project artifacts, journal entries, or anything the user wants kept. Replaces the entire file. Changes sync live to every connected Obsidian client.",
      inputSchema: {
        folder: z.string().describe("Folder name (from vault_folders) or folder GUID"),
        path: z.string().describe("Relative file path inside the folder"),
        content: z.string().describe("Full markdown content to write"),
      },
      annotations: {
        title: "Creates or overwrites a vault note.",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    guarded(
      async ({ folder, path, content }: { folder: string; path: string; content: string }) => {
        const token = await resolveRelayToken(req);
        await writeFile(token, folder, path, content);
        return text(
          `Wrote ${path} in ${folder}. The change is syncing to every connected Obsidian client.`,
        );
      },
    ),
  );

  server.registerTool(
    "vault_update",
    {
      title: "Edits a vault note in place with find-and-replace.",
      description:
        "Update an existing markdown file by swapping one occurrence (or all occurrences) of an exact string. Prefer this over vault_write whenever you only need to change part of a file: it sends the change rather than the whole file, which avoids idle-timeout on large notes and preserves any edits made in Obsidian at the same time. old_string must match exactly, whitespace and newlines included, and must be unique unless replace_all is true.",
      inputSchema: {
        folder: z.string().describe("Folder name (from vault_folders) or folder GUID"),
        path: z.string().describe("Relative file path inside the folder. The file must already exist."),
        old_string: z
          .string()
          .describe("Exact text to find. Must be unique unless replace_all=true. Include enough surrounding context to be unambiguous."),
        new_string: z
          .string()
          .describe("Replacement text. May be empty to delete the matched span."),
        replace_all: z
          .boolean()
          .optional()
          .describe("When true, replace every occurrence. Default false (errors on multiple matches)."),
      },
      annotations: {
        title: "Edits a vault note in place with find-and-replace.",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    guarded(
      async ({
        folder,
        path,
        old_string,
        new_string,
        replace_all,
      }: {
        folder: string;
        path: string;
        old_string: string;
        new_string: string;
        replace_all?: boolean;
      }) => {
        const token = await resolveRelayToken(req);
        const result = await updateFile(
          token,
          folder,
          path,
          old_string,
          new_string,
          replace_all ?? false,
        );
        const plural = result.replacements === 1 ? "" : "s";
        return text(
          `Updated ${path} in ${folder}: ${result.replacements} replacement${plural}. Synced to every connected Obsidian client.`,
        );
      },
    ),
  );

  server.registerTool(
    "vault_append",
    {
      title: "Appends content to the end of a vault note.",
      description:
        "Append text to the end of an existing file, or create the file if it isn't there yet. Prefer this over vault_write when you're accumulating content (daily logs, running notes, append-only journals): it sends only the new text, not the whole file. If the path doesn't exist, the file is created with this content as its body.",
      inputSchema: {
        folder: z.string().describe("Folder name (from vault_folders) or folder GUID"),
        path: z.string().describe("Relative file path inside the folder. Created if missing."),
        content: z
          .string()
          .describe("Text to append. Include any leading newline you want between the existing content and the new text."),
      },
      annotations: {
        title: "Appends content to the end of a vault note.",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    guarded(
      async ({ folder, path, content }: { folder: string; path: string; content: string }) => {
        const token = await resolveRelayToken(req);
        const result = await appendFile(token, folder, path, content);
        const verb = result.created ? "Created" : "Appended to";
        return text(
          `${verb} ${path} in ${folder} (+${result.bytesAppended} chars). Synced to every connected Obsidian client.`,
        );
      },
    ),
  );

  server.registerTool(
    "vault_move",
    {
      title: "Renames or moves a vault note.",
      description:
        "Rename or relocate a file within a vault folder. Use it when the user wants to rename a note or move a file. The new path syncs to every connected Obsidian client.",
      inputSchema: {
        folder: z.string().describe("Folder name (from vault_folders) or folder GUID"),
        old_path: z.string().describe("Current relative file path"),
        new_path: z.string().describe("New relative file path"),
      },
      annotations: {
        title: "Renames or moves a vault note.",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    guarded(
      async ({ folder, old_path, new_path }: { folder: string; old_path: string; new_path: string }) => {
        const token = await resolveRelayToken(req);
        await moveFile(token, folder, old_path, new_path);
        return text(`Moved ${old_path} to ${new_path} in ${folder}.`);
      },
    ),
  );

  server.registerTool(
    "vault_delete",
    {
      title: "Deletes a vault note (irreversible).",
      description:
        "Delete a file from the vault. Destructive: it leaves the sync store, so it vanishes from every connected Obsidian client. Use it only when the user explicitly asks to delete, remove, or trash a note.",
      inputSchema: {
        folder: z.string().describe("Folder name (from vault_folders) or folder GUID"),
        path: z.string().describe("Relative file path inside the folder to delete"),
      },
      annotations: {
        title: "Deletes a vault note (irreversible).",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    guarded(async ({ folder, path }: { folder: string; path: string }) => {
      const token = await resolveRelayToken(req);
      await deleteFile(token, folder, path);
      return text(`Deleted ${path} from ${folder}.`);
    }),
  );

  return server;
}
