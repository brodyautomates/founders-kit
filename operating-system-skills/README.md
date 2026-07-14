# The Brody Operating System

Five skills that turn any folder into a working AI operating system: a persistent context layer (your second brain) plus agents that stand it up, run it, tune it, share it, and put it online.

## The skills

| Command | What it does |
|---------|--------------|
| `/os-setup` | Stand up the whole vault from an empty folder: structure, system files, config, then a guided interview to make it yours. Solo or team mode. |
| `/os-operator` | Build and schedule an operator that keeps the vault current on a recurring cadence: pulls new context, files it, reports. |
| `/os-optimizer` | Audit the vault against a set of quality frameworks and fix what it finds, with an HTML report. |
| `/team-os` | Share the vault across a team with roles and access control. |
| `/os-mcp` | Put the vault behind an always-on MCP server so your agents can reach it from anywhere. |

## Install

Drop `skills/` into your agent's skills directory (Claude Code: `~/.claude/skills/` or a project `.claude/skills/`). Run `/os-setup` first.

## License

© 2026 Brody Automates. All rights reserved. Licensed, not sold, see `LICENSE`. Two skills build on or install third-party open-source tools, which keep their own upstream licenses, see `THIRD-PARTY-NOTICES.md`.
