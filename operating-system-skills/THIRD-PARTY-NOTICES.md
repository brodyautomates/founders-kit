# Third-Party Notices

Almost everything in this pack — the skills, prompts, templates, and docs — is Brody's work and is covered by `LICENSE`.

Two folders are third-party **open-source** software, bundled so the skills work out of the box. They keep their own upstream licenses. Brody's license does not apply to them, and they are not sold as Brody's own:

1. **Relay fork** — `skills/team-os/reference/brody-relay-fork/`
   A fork of Relay, a real-time collaboration plugin by System3 (https://system3.md). Drives the team-sharing skill. Subject to Relay's upstream license.

2. **MCP server** — `skills/os-mcp/reference/relay-mcp-server/`
   An MCP server that puts the vault behind an always-on endpoint. Drives the deploy/reach-anywhere skill. Subject to its upstream license.

If you plan to resell or widely redistribute this pack, check each component's upstream license first. The simplest path is to pull those two from their upstream repos at deploy time rather than shipping them inside a paid product.
