# Founder Kit

Everything from the talk, in one place. Four resources to stand up your own AI operating system and content engine.

## What's inside

1. **`operating-system-skills/`** — the operating-system skill pack. Five installable skills (plain-text instruction files your AI agent loads) that stand up the whole system from an empty folder: set it up, run it on a schedule, keep it clean as it grows, share it across a team with permissions, and reach it from anywhere.
2. **`voice-setup/`** — a skill file that reads your existing posts, captures how you actually write, and applies that voice to everything the system drafts. Keeps learning from every post you approve.
3. **`content-tracker/`** — an automation (a scheduled workflow) that pulls your best-performing content into one sheet every day and hands it to an AI to break down what's working.
4. **`company-brain/`** — the open-source base for a context layer: a self-hosted repo that ingests everything you feed it and answers questions across it with sources.

## How to use it

Start with `operating-system-skills/`. Read its top-level notes, install the skills into your agent (Claude Code or any harness that loads skill files), and run `os-setup` first. Layer in the voice setup and content tracker once the base is running.

## Licensing

The operating-system skill pack and the voice setup are **original work, © 2026 Brody, all rights reserved** — licensed to you for use, not for resale (see `operating-system-skills/LICENSE`). Where a skill deploys an open-source tool (an MCP server, a team-sharing backend), that tool stays under its own upstream license; the pack drives it, it doesn't include it.

The company brain is **third-party open source** — use its upstream repo directly and follow its license; don't re-host it as your own.

Built by Brody / Merydian. Questions: merydian.ai
