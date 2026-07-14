---
os-mode: business
---

# Organization

Org AI assistant. The vault is both an Obsidian knowledge base and an operating system. Every bit of state lives in markdown files that you read, write, and keep current.

## Session Startup

On your first response:
1. Quietly read the latest `Daily/` file for org context.
2. Ask: "Who is this session for?" to identify the active profile.
3. Quietly read `Team/{org}/Profiles/{name}/{Name}.md` and the latest entry in `Team/{org}/Profiles/{name}/Daily/`.

The active profile is where session output goes. Don't announce that you're loading anything. Read it, take it in, respond.

## Knowledge Routing

Everything has a home. There is no catch-all.

| Type | Route to |
|------|----------|
| Operator preferences, style, habits | `Context/operator.md` |
| Org structure, company info, products | `Context/organization.md` |
| Strategy, OKRs, quarterly goals | `Context/strategy.md` |
| Services, products, revenue lines | `Context/services.md` |
| ICP / customer profile | `Context/icp.md` |
| Customer pain points | `Context/pain-points.md` |
| Tool stack, integrations | `Context/infrastructure.md` |
| Brand voice, tone, messaging | `Context/brand.md` |
| Vendor / partner / investor info | `Context/stakeholders.md` |
| Team roster, agreements | `Context/team.md` |
| Department info, charter, KPIs | `Departments/{name}/` (see `Departments/CLAUDE.md`) |
| Person profile, daily notes, tasks | `Team/{org}/Profiles/{name}/` (see `Team/CLAUDE.md`) |
| Contractor profile | `Team/External/contractors/{name}/` |
| Project info | `Projects/{name}/` (see `Projects/CLAUDE.md`) |
| Meetings, competitors, market, decisions, processes | `Intelligence/` (see `Intelligence/CLAUDE.md`) |
| Onboarding docs | `Onboarding/{name}.md` (see `Onboarding/CLAUDE.md`) |
| Reusable content (prompts, frameworks, templates) | `Resources/` (see `Resources/CLAUDE.md`) |
| Skill-specific references | `Skills/{skill-name}/` (see `Skills/CLAUDE.md`) |
| Tasks, action items | Active profile's `task-list/Tasks.md` |
| Rules for assistant behavior | Root `CLAUDE.md` (Rules section) |

For the details, read that folder's `CLAUDE.md`.

## Document Voice

Vault docs read like a teammate wrote them, not an AI. Real names, real context, real consequences. Never generic.

- BAD: "The project is progressing well. Key milestones are being tracked."
- GOOD: "Eval framework 70% done. Next checkpoint: judge integration. Blocked on [[Claude]] API access. [[Jordan]] debugging the pipeline edge case."

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
department: Engineering
status: completed
tags: [tag1, tag2]
---
```

Standard fields: `type`, `date`, `project`, `department`, `status`, `tags`, `priority`. Always include `status:` and 2+ specific `tags:`. The two most often forgotten: `project:` and `department:`.

## Rules

1. On the FIRST response: read the latest `Daily/`, then ask who the session is for.
2. Real work → `Team/{org}/Profiles/{name}/Daily/YYYY-MM-DD.md`. Never the root `Daily/`.
3. Use `[[wikilinks]]` for EVERY entity (people, companies, departments, projects, notes) in vault files. Weave them into sentences.
4. Every note stands alone and composes with others. A Lego block.
5. Use callouts (`> [!type]`) for visual structure. Keep them sparse (1-3 per doc).
6. Use `grep` or `obsidian search` to scan many files. Don't read whole files when you're scanning.
7. User corrections → save as a permanent rule below. Don't ask.
8. Respect `.claudeignore`.
9. Never ask permission to save. Auto-save to the right vault file. Report what you saved.
10. Before the final response: persist anything meaningful to the vault. Skip casual chat.
11. Tasks → the active profile's `task-list/Tasks.md` (Task Board emoji format). Never a root `Tasks/`.
12. Web content extraction: prefer `defuddle parse <url> --md` over a raw web fetch.
13. Never save drafts or assets to the root. Store them in the right folder.
14. NEVER use em dashes. Use periods, commas, colons, or restructure.
15. Include `project:` in frontmatter for project-related notes; `department:` for department-related notes.
16. NEVER create files/folders in the vault root. Every file lives in an existing folder. No exceptions.

## Anti-Patterns

Do NOT:
- Put a `# Title` heading that repeats the filename
- Create orphan notes (always link from 1+ existing note)
- Update vault files on casual chat
- Cram all project info into `README.md` (route it to subdirs)
- Store department SOPs in `Intelligence/processes/` (use `Departments/{name}/sops/`)
- Write daily notes or tasks to the root `Daily/` or root `Tasks/` during a profile session
- Write project names, people, departments, or note references as plain text. Always use `[[wikilinks]]`
- Use `[markdown](links)` for internal vault notes

<!-- USER CORRECTIONS: Add new rules below as the user teaches you -->
