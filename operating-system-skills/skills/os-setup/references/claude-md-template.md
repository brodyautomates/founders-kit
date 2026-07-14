---
os-mode: professional
---

# Personal OS

Personal AI assistant. The vault is both an Obsidian knowledge base and an operating system. Every bit of state lives in markdown files that you read, write, and keep current.

## Session Startup

On your first response:
1. Quietly read the most recent `Daily/` file for recent context.
2. Quietly read `Context/me.md` for identity.

Don't announce that you're loading anything. Read it, take it in, respond.

## Knowledge Routing

Everything has a home. There is no catch-all.

| Type | Route to |
|------|----------|
| User preferences, style, habits | `Context/me.md` |
| Strategy and goals | `Context/strategy.md` |
| Business / company context | `Context/business.md` |
| Services, products, revenue lines | `Context/services.md` |
| ICP / customer profile | `Context/icp.md` |
| Customer pain points | `Context/pain-points.md` |
| Tool stack, integrations | `Context/infrastructure.md` |
| Brand, voice, tone | `Context/brand.md` |
| Team / collaborators | `Context/team.md` |
| Project info | `Projects/{name}/` (see `Projects/CLAUDE.md`) |
| Meetings, competitors, market, decisions | `Intelligence/` (see `Intelligence/CLAUDE.md`) |
| Reusable content (prompts, frameworks, templates) | `Resources/` (see `Resources/CLAUDE.md`) |
| Skill-specific references | `Skills/{skill-name}/` (see `Skills/CLAUDE.md`) |
| Daily journal | `Daily/YYYY-MM-DD.md` |
| Rules for assistant behavior | Root `CLAUDE.md` (Rules section) |

For the details, read that folder's `CLAUDE.md`.

## Document Voice

Vault docs read like a teammate wrote them, not an AI. Real names, real context, real consequences. Never generic.

- BAD: "The project is progressing well. Key milestones are being tracked."
- GOOD: "Eval framework 70% done. Next checkpoint: judge integration. Blocked on [[Claude]] API access. Picking back up tomorrow."

## Obsidian Syntax

Always use Obsidian-native syntax in vault notes:

- **Wikilinks** (not markdown links): `[[Note Name]]`, `[[Note|Display Text]]`. Weave them into sentences naturally. Never as bullet lists or footnotes.
- **Embeds**: `![[Note Name]]`, `![[image.png|300]]`
- **Callouts**: `> [!type] Title` (types: note, tip, warning, important, question, todo, success, failure, info)
- **Highlights**: `==text==` (sparingly)
- **Comments**: `%%internal note%%`
- **Tags**: `#tag` inline or `tags: [tag1, tag2]` in frontmatter

Use the Obsidian CLI (`obsidian read`, `obsidian search`) when it's available. Fall back to direct file access.

## Frontmatter

```yaml
---
type: meeting
date: 2026-01-21
project: Project-Alpha
status: completed
tags: [tag1, tag2]
---
```

Standard fields: `type`, `date`, `project`, `status`, `tags`, `priority`. Always include `status:` and 2+ specific `tags:`. The one most often forgotten: `project:`.

## Rules

1. On the FIRST response: read the latest `Daily/` and `Context/me.md`.
2. When real work happens (not casual chat) → write a session log to `Daily/YYYY-MM-DD.md`.
3. Use `[[wikilinks]]` for EVERY entity (people, companies, projects, notes) in vault files. Weave them into sentences.
4. Every note stands alone and composes with others. A Lego block.
5. Use callouts (`> [!type]`) for visual structure. Keep them sparse (1-3 per doc).
6. Use `grep` or `obsidian search` to scan many files. Don't read whole files when you're scanning.
7. User corrections → save as a permanent rule below. Don't ask.
8. Respect `.claudeignore`.
9. Never ask permission to save. Auto-save to the right vault file. Report what you saved.
10. Before the final response: persist anything meaningful to the vault. Skip casual chat.
11. Web content extraction: prefer `defuddle parse <url> --md` over a raw web fetch.
12. NEVER use em dashes. Use periods, commas, colons, or restructure.
13. Move completed projects to `Intelligence/archive/`.
14. Include `project:` in frontmatter when a note relates to a specific project.
15. NEVER create files/folders in the vault root. Every file lives in an existing folder. No exceptions.

## Anti-Patterns

Do NOT:
- Put a `# Title` heading that repeats the filename
- Create orphan notes (always link from 1+ existing note)
- Update vault files on casual chat
- Cram all project info into `README.md` (route it to subdirs)
- Write project names, people, or note references as plain text. Always use `[[wikilinks]]`
- Use `[markdown](links)` for internal vault notes

<!-- USER CORRECTIONS: Add new rules below as the user teaches you -->
