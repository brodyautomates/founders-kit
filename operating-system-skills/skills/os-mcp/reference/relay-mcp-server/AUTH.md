# The Brody Operating System, MCP Auth

This server is both an OAuth 2.1 resource server and its own authorization
server. Identity is delegated to Relay.md through PocketBase password auth.
Inbound MCP calls are authenticated with a signed JWT issued after sign-in, or
with a static bearer meant for CLI and scripts. Calls out to `api.system3.md`
use each session's PocketBase token, which is refreshed automatically.

## Environment variables

| Var | Required | What it does |
|-----|----------|--------------|
| `PUBLIC_URL` | yes | The externally reachable URL of this server (e.g. `https://your-app.up.railway.app`). Used as the OAuth issuer and audience. |
| `JWT_SECRET` | yes (>=32 chars) | HS256 key that signs access tokens and encrypts the session store at rest. Change it and restart to rotate, everyone signs in again. |
| `RELAY_API_URL` | yes | The Relay backend (e.g. `https://api.system3.md`). No default. |
| `PB_AUTH_URL` | yes | The PocketBase auth host (e.g. `https://auth.system3.md`). No default. |
| `DATA_DIR` | yes | Directory for `clients.json` (registered clients) and `sessions.enc` (encrypted PocketBase tokens). Point it at a mounted volume, e.g. `/data`. |
| `STATIC_MCP_BEARER` | recommended | Long-lived token for CLI, scripts, or a legacy connector entry. Accepted on `/mcp` and `/diag` with no OAuth. |
| `PB_COLLECTION` | optional | PocketBase collection name. Defaults to `users`. |
| `ALLOWED_EMAILS` | optional | Comma-separated allow-list of Relay.md emails. Anyone else gets a 403. Leave blank to allow any authenticated Relay.md account. |
| `RELAY_AUTH_TOKEN` | optional | Only consulted on the static-bearer path. The OAuth path ignores it and uses each user's own PocketBase token. |
| `RELAY_ID` | optional | Pins a specific vault GUID. When blank, the vault is discovered from the signed-in user's PocketBase relays at runtime. Folders inside the vault are always discovered at runtime. |
| `PORT` | optional | Defaults to 3000. |

## Setting a Relay.md password

Accounts created through Google, GitHub, or Microsoft sign-in start with no
password. One-time setup:

1. Kick off a reset:
   `curl -X POST https://auth.system3.md/api/collections/users/request-password-reset -H "Content-Type: application/json" -d '{"email":"you@example.com"}'`
2. Open the "reset your password" email from Relay.md.
3. Follow the link and choose a password.
4. Social sign-in in the plugin keeps working, adding a password doesn't turn it off.

## Adding the connector in Claude

Hosted (claude.ai): Settings, then Connectors, then Add custom connector, and
paste `${PUBLIC_URL}/mcp`. Claude discovers the OAuth endpoints, registers
itself, and opens a browser tab on our `/authorize` page. Enter your Relay.md
email and password and sign in. The tab redirects back to Claude and the
session is live. Token refresh happens quietly in the background.

Claude Code: `claude mcp add --transport http vault ${PUBLIC_URL}/mcp`. Same
flow, over a loopback callback.

## Skipping OAuth for CLI and scripts

Set `STATIC_MCP_BEARER`, then send `Authorization: Bearer <STATIC_MCP_BEARER>`.
On this path the upstream Relay call uses `RELAY_AUTH_TOKEN`. Keep it around for
convenience and for any existing connector entry during a migration.

## Operational notes

- **Token refresh**: a background sweep runs every 30 minutes and renews any
  PocketBase token within 6 hours of expiry via `/api/collections/users/auth-refresh`.
  A token within 5 minutes of expiry is also renewed inline right before a tool call.
- **Revoke one session**: stop the server, remove the matching entry from
  `${DATA_DIR}/sessions.enc` (or delete the whole file), and restart. The user
  signs in again on their next request.
- **Rotate `JWT_SECRET`**: change it and restart. Every existing MCP JWT and the
  encrypted session store become unreadable, so everyone signs in again.
- **Force one client to re-register**: delete its entry from
  `${DATA_DIR}/clients.json`. Claude re-registers on the next connect.
- **After a Relay.md password change**: reset via the email flow above. Existing
  PocketBase sessions keep working until a refresh fails (PocketBase doesn't
  invalidate old tokens on a password change by default), so also delete the
  session from `sessions.enc` if you want it cut off immediately.

## Deploy to Railway

1. Create a Railway service from this directory (or point it at the Git path).
2. Attach a volume and mount it at `/data`.
3. Set the required env vars above, with `DATA_DIR=/data`.
4. Deploy. Take the domain Railway assigns, set it as `PUBLIC_URL`, and redeploy
   once so the OAuth discovery URLs line up.
