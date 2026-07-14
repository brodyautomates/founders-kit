# Third-Party Notices

The Brody Operating System is Brody Automates's original work, covered by `LICENSE`. It uses and references some third-party open-source software, which keeps its own upstream licenses. None of it is sold as Brody's own.

## `os-mcp` (the MCP server)

The server in `skills/os-mcp/reference/` is Brody's own implementation, but it depends on open-source libraries and a third-party protocol:
- **@modelcontextprotocol/sdk**, the Model Context Protocol SDK.
- **Express**, **zod**, and related npm packages, pulled at install time from npm under their own licenses.
- **Relay.md sync protocol / PocketBase**, the server is a client of Relay's HTTP API. Relay is a third-party service/protocol under its own terms.

These are installed as dependencies from their sources; none of their code is claimed here.

## `team-os` (team sharing)

This skill does **not** bundle any plugin. It tells you to install the upstream **Relay** plugin for Obsidian (by System3, https://system3.md) yourself and configure it. Relay is third-party open source under its own license; it is referenced, not included.

If you plan to resell or widely redistribute this pack, review each dependency's upstream license first.
