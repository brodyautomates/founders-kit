// Wires the Express app together: OAuth discovery + endpoints, the sign-in
// form handlers, the authenticated /mcp transport, and the health/diagnostic
// routes. One MCP server + transport is kept per streamable-HTTP session.

import express, { type Request } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  mcpAuthRouter,
  getOAuthProtectedResourceMetadataUrl,
} from "@modelcontextprotocol/sdk/server/auth/router.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";

import { PORT, PUBLIC_URL, RELAY_API_URL } from "./env.js";
import {
  RelayOAuthProvider,
  handleLogin,
  handleResetRequest,
  LOGIN_PATH,
  RESET_PATH,
} from "./oauth/provider.js";
import { startRefreshLoop } from "./oauth/refresher.js";
import { buildVaultServer, resolveRelayToken } from "./vault-tools.js";
import { getAvailableFolders } from "./vault/discovery.js";

const RESOURCE_URL = new URL(`${PUBLIC_URL}/mcp`);
const ISSUER_URL = new URL(PUBLIC_URL);
const RESOURCE_METADATA_URL = getOAuthProtectedResourceMetadataUrl(RESOURCE_URL);

const RESOURCE_NAME = "The Brody Operating System (Vault)";
const SERVER_VERSION = "2.0.0";

interface McpSession {
  server: McpServer;
  transport: StreamableHTTPServerTransport;
}

export function startServer(): void {
  const app = express();

  // Railway terminates TLS in front of us.
  app.set("trust proxy", 1);

  // One-line request trace.
  app.use((req, _res, next) => {
    const ua = (req.headers["user-agent"] || "").slice(0, 60);
    console.log(`[http] ${req.method} ${req.originalUrl} ua=${ua}`);
    next();
  });

  const provider = new RelayOAuthProvider();

  // OAuth discovery documents + /authorize, /token, /register, etc.
  app.use(
    mcpAuthRouter({
      provider,
      issuerUrl: ISSUER_URL,
      baseUrl: ISSUER_URL,
      resourceServerUrl: RESOURCE_URL,
      resourceName: RESOURCE_NAME,
    }),
  );

  const parseForm = express.urlencoded({ extended: false });

  const field = (value: unknown): string => (typeof value === "string" ? value : "");

  // Sign-in form submission.
  app.post(LOGIN_PATH, parseForm, async (req, res) => {
    const outcome = await handleLogin({
      state: field(req.body.state),
      email: field(req.body.email),
      password: field(req.body.password),
    });
    if ("redirectUrl" in outcome) {
      res.redirect(outcome.redirectUrl);
      return;
    }
    res.status(outcome.status).type("text/html").send(outcome.pageHtml);
  });

  // Password-reset request submission.
  app.post(RESET_PATH, parseForm, async (req, res) => {
    const outcome = await handleResetRequest({
      state: field(req.body.state),
      email: field(req.body.email),
    });
    res.status(outcome.status).type("text/html").send(outcome.pageHtml);
  });

  const requireAuth = requireBearerAuth({
    verifier: provider,
    resourceMetadataUrl: RESOURCE_METADATA_URL,
  });

  const sessions = new Map<string, McpSession>();

  const existingSession = (req: Request): McpSession | undefined => {
    const id = req.headers["mcp-session-id"] as string | undefined;
    return id ? sessions.get(id) : undefined;
  };

  // New or continuing MCP request. A fresh POST with no session spins up a new
  // server+transport; subsequent requests reuse it by session id.
  app.post("/mcp", requireAuth, async (req, res) => {
    const active = existingSession(req);
    if (active) {
      await active.transport.handleRequest(req, res);
      return;
    }

    const server = buildVaultServer(req);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
      enableJsonResponse: true,
    });

    await server.connect(transport);
    await transport.handleRequest(req, res);

    const sid = (transport as any).sessionId as string | undefined;
    if (sid) {
      sessions.set(sid, { server, transport });
      transport.onclose = () => sessions.delete(sid);
    }
  });

  // The GET/DELETE halves of the streamable transport require an existing
  // session — there's nothing to attach to otherwise.
  app.get("/mcp", requireAuth, async (req, res) => {
    const active = existingSession(req);
    if (active) {
      await active.transport.handleRequest(req, res);
      return;
    }
    res.status(400).json({ error: "No session yet. POST to /mcp first." });
  });

  app.delete("/mcp", requireAuth, async (req, res) => {
    const active = existingSession(req);
    if (active) {
      await active.transport.handleRequest(req, res);
      return;
    }
    res.status(400).json({ error: "No such session." });
  });

  // Health check (also used as Railway's healthcheck path).
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", version: SERVER_VERSION, sessions: sessions.size });
  });

  // Authenticated diagnostics: confirm upstream reachability + folder discovery.
  app.get("/diag", requireAuth, async (req, res) => {
    const report: Record<string, any> = { nodeVersion: process.version };

    try {
      const upstream = await fetch(`${RELAY_API_URL}/api/health`);
      report.apiHealth = { status: upstream.status, ok: upstream.ok };
    } catch (error: any) {
      report.apiHealth = { error: error.message, cause: String(error.cause) };
    }

    try {
      const token = await resolveRelayToken(req);
      const folders = await getAvailableFolders(token);
      report.folderDiscovery = { count: folders.length, sample: folders.slice(0, 5) };
    } catch (error: any) {
      report.folderDiscovery = { error: error.message, cause: String(error.cause) };
    }

    res.json(report);
  });

  startRefreshLoop();

  app.listen(PORT, () => {
    console.log(`The Brody Operating System MCP server is listening on port ${PORT}`);
    console.log(`  Public URL: ${PUBLIC_URL}`);
    console.log(`  Resource metadata: ${RESOURCE_METADATA_URL}`);
  });
}
