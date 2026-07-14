---
name: os-mcp
description: Deploys the Brody OS MCP server to the user's own Railway account so Claude can read and write their Obsidian vault over the Relay.md sync protocol. The full server source ships inside the skill, so there is nothing to clone. The user pastes one Railway account token. The vault and its folders are discovered automatically after they sign in with OAuth. Use when the user wants to "set up the os MCP", "deploy relay MCP to Railway", "self-host the Obsidian MCP server", or "give Claude access to my Obsidian vault".
---
<!-- © 2026 Brody Automates. All rights reserved. The Brody Operating System. -->

# OS MCP, Railway Deploy

This skill ships The Brody Operating System MCP server (id `brody-ai-os`) and deploys it to the user's own Railway account. The source lives at `${CLAUDE_PLUGIN_ROOT}/skills/os-mcp/reference/relay-mcp-server/`. Copy it from there and nowhere else. Once it is live, any Claude client (Claude Code or claude.ai) can read and write the user's Obsidian vault by talking to the Relay.md sync protocol.

## What you need from the user

Just one thing: a Railway account token, created at `https://railway.com/account/tokens`.

That covers it. After the deploy, the user signs in with their Relay.md email and password through OAuth. From there the server finds their vault and the folders inside it on its own, using PocketBase. No vault GUIDs to copy, no folder maps to build.

## Values the skill sets for you

| Var | Where it comes from | Value |
|-----|--------|-------|
| `RELAY_API_URL` | preset | `https://api.system3.md` |
| `PB_AUTH_URL` | preset | `https://auth.system3.md` |
| `PB_COLLECTION` | preset | `users` |
| `DATA_DIR` | preset | `/data` |
| `PORT` | preset | `3000` |
| `JWT_SECRET` | generated | `openssl rand -hex 32` |
| `STATIC_MCP_BEARER` | generated | `openssl rand -hex 24` |
| `ALLOWED_EMAILS` | preset | blank (any authenticated Relay.md user) |
| `RELAY_AUTH_TOKEN` | preset | blank (OAuth only, no static fallback) |
| `RELAY_ID` | not set | discovered per user at runtime |
| `PUBLIC_URL` | derived | comes from `railway domain` after the first deploy |

Hold on to the generated `STATIC_MCP_BEARER` and give it back to the user in chat. They use it for any CLI or script access that needs to skip OAuth.

If the user has more than one Relay vault, the server picks the first one. They can run the `vault_relays` tool after connecting to see which vault is active, and pin a different one by setting `RELAY_ID` in `railway variables`.

---

# Workflow

Run these in order. Confirm each step before you move to the next.

## Step 1, Check the Railway CLI

```bash
railway --version
```

If it is not installed:
- macOS: `brew install railway`
- Anywhere: `npm i -g @railway/cli`

Run the version command again to confirm.

## Step 2, Get the Railway token

Tell the user:

> Go to `https://railway.com/account/tokens`, click **Create Token**, name it `os-mcp-deploy`, copy the value, and paste it here.

Once they paste it:

```bash
export RAILWAY_API_TOKEN="<paste>"
railway whoami
```

`railway whoami` should print the user's Railway email. An error means the token is wrong, so ask them to make a new one.

## Step 3, Deploy the bundled source

```bash
cd "${CLAUDE_PLUGIN_ROOT}/skills/os-mcp/reference/relay-mcp-server"

# New Railway project. This is interactive, so let the user pick the name.
railway init

# Persistent volume that holds clients.json and sessions.enc
railway volume add --mount-path /data

# Upload the source, build it from the Dockerfile, and deploy
railway up
```

Wait for the deploy to finish. Tail the logs if you want to watch it: `railway logs`.

## Step 4, Set the environment variables

Generate the two secrets:

```bash
JWT_SECRET=$(openssl rand -hex 32)
STATIC_MCP_BEARER=$(openssl rand -hex 24)
```

Set everything at once. Leave `RELAY_ID` out on purpose, since it is discovered at runtime:

```bash
railway variables \
  --set "RELAY_API_URL=https://api.system3.md" \
  --set "PB_AUTH_URL=https://auth.system3.md" \
  --set "PB_COLLECTION=users" \
  --set "DATA_DIR=/data" \
  --set "PORT=3000" \
  --set "JWT_SECRET=$JWT_SECRET" \
  --set "STATIC_MCP_BEARER=$STATIC_MCP_BEARER"
```

The service redeploys itself after `--set`. Wait for it to come back up.

## Step 5, Set PUBLIC_URL and redeploy

```bash
railway domain                      # assigns and prints the public domain
```

Copy the URL, then:

```bash
railway variables --set "PUBLIC_URL=https://<the-domain>"
railway up                          # final redeploy so the OAuth issuer and audience match
```

## Step 6, Verify

```bash
curl https://<the-domain>/health
```

You want a `200 OK` with JSON like `{"status":"ok","version":"2.0.0",...}`.

## Step 7, Connect from Claude

Print these for the user:

**Claude Code:**
```
claude mcp add --transport http vault https://<the-domain>/mcp
```

**Claude.ai (web):** Settings, then Connectors, then Add custom connector, then paste `https://<the-domain>/mcp`. When the OAuth window opens, sign in with their Relay.md email and password.

Also hand them the value: their `STATIC_MCP_BEARER` is `<value>`. Tell them to keep it for any CLI or script access that skips OAuth.

## Step 8, Test discovery

In a fresh Claude conversation, have Claude call `vault_relays` (or have the user say "list my Relay vaults"). You want at least one vault back, with `*` marking the active one.

Then call `vault_folders`. You want a non-empty list of folder names. An empty list usually means the user has no folder access in that vault yet.

If the user has several vaults and the wrong one is active, pin the right one:

```bash
railway variables --set "RELAY_ID=<the-vault-guid-from-vault_relays>"
```

One redeploy later, the next OAuth session uses that vault.

---

# Troubleshooting

**`railway whoami` fails after pasting the Railway token.** The token is expired or has the wrong scope. Make a new one at https://railway.com/account/tokens.

**Build fails with TypeScript errors.** Do not touch the bundled `package.json` or `tsconfig.json`. Recopy the source fresh from `${CLAUDE_PLUGIN_ROOT}/skills/os-mcp/reference/relay-mcp-server/`.

**`/health` returns a 5xx.** Run `railway logs`. The boot check names the missing env var, since `verifyEnvironment` lists what is absent on startup.

**`vault_relays` says no vaults are reachable.** The signed-in Relay.md account does not own or belong to any vault. Have the user create one in the Relay.md Obsidian plugin first.

**`vault_folders` is empty but `vault_relays` shows the vault.** Folders live in the `shared_folders` PocketBase collection. Either the user has no folders in that vault yet, or the active vault is not the one they meant. Check the active marker in the `vault_relays` output.

**OAuth sign-in keeps looping.** `PUBLIC_URL` does not match the real Railway domain. Redo Step 5.

**You want to limit access to specific emails.** `railway variables --set "ALLOWED_EMAILS=email1@x.com,email2@x.com"` and redeploy.

**You want to start over.** `railway down` to tear it down, then run again from Step 3.
