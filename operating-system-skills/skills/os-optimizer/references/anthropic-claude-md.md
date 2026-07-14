<!-- © 2026 Brody Automates. All rights reserved. The Brody Operating System. -->

# Anthropic — CLAUDE.md best practices

## Contents

1. [Core thesis](#core-thesis)
2. [Hard rules](#hard-rules)
3. [The pruning test](#the-pruning-test)
4. [CLAUDE.md hierarchy and precedence](#claudemd-hierarchy-and-precedence)
5. [The three core building blocks](#the-three-core-building-blocks-every-claudemd-needs)
6. [Specificity beats vagueness — examples](#specificity-beats-vagueness--examples)
7. [Path-scoped rules in `.claude/rules/`](#path-scoped-rules-in-claude-rules)
8. [The `@import` pattern](#the-import-pattern)
9. [`claudeMdExcludes` and managed policy](#claudemd-excludes-and-managed-policy)
10. [Position effect — why ordering matters](#position-effect--why-ordering-matters)
11. [Emphasis markers](#emphasis-markers)
12. [The `MEMORY.md` system](#the-memorymd-system)
13. [Compaction behavior](#compaction-behavior)
14. [HTML comments are stripped](#html-comments-are-stripped)
15. [Dos](#dos)
16. [Don'ts](#donts)
17. [Verbatim quotes worth preserving](#verbatim-quotes-worth-preserving)
18. [Auditable signals](#auditable-signals)
19. [Sources](#sources)

---

## Core thesis

CLAUDE.md arrives as a **user message at the start of every session**, not as part of the system prompt. Claude reads it and does its best to follow it, but you get **no guarantee of strict compliance**, and that is most true for rules that are vague or that fight each other. The CLAUDE.md you want is the smallest set of concrete instructions that still passes the pruning test.

Anthropic frames context engineering directly: *"finding the smallest possible set of high-signal tokens that maximizes the likelihood of some desired outcome."* CLAUDE.md is that same problem, pointed at the instruction layer of your project.

## Hard rules

| # | Rule | Auditable |
|---|---|---|
| 1 | Keep CLAUDE.md under **200 lines** (community ceiling: 300) | ✅ Pass 1 |
| 2 | Specific rules get **89% compliance**; vague rules get **35%** | ✅ Pass 2 (specificity heuristic) |
| 3 | Bloated CLAUDE.md → Claude **ignores instructions entirely** (not just the overflow ones) | ✅ Pass 1 (size) |
| 4 | LLMs prefer instructions at the **start and end** of a prompt; the middle is neglected | ✅ Pass 9 (position heuristic) |
| 5 | Models follow ~150–200 instructions reasonably (Opus 4.5); fewer for smaller models. The Claude Code system prompt alone uses ~50 instructions | ⚠️ Inform-only |
| 6 | Imports via `@path/to/import` resolve relative to the importing file; **max 5 hops** | ✅ Pass 9 |
| 7 | Imports do **not** save tokens — they only organize. Imported content fully loads at launch | ⚠️ Inform-only |
| 8 | `MEMORY.md` loads first **200 lines or 25KB**, whichever first | ⚠️ Inform-only |
| 9 | Block-level HTML comments `<!-- ... -->` are stripped before context injection | — |
| 10 | Project-root CLAUDE.md is **re-injected after `/compact`**. Nested CLAUDE.md is **not** re-injected | — |
| 11 | Two contradicting rules → Claude may pick one **arbitrarily**. Resolve conflicts; don't assume specificity wins | ⚠️ Pass 6 (duplication) |
| 12 | Path-scoped rules in `.claude/rules/` only load when Claude reads matching files (via `paths:` frontmatter) | ✅ Pass 9 |
| 13 | Subdirectory CLAUDE.md is **not auto-loaded at launch** — only when Claude reads files in that directory | ⚠️ Inform-only |

## The pruning test

Take every line in CLAUDE.md and put one question to it:

> **"Would removing this cause Claude to make mistakes? If not, cut it."**

Be ruthless about it. Most teams do the reverse. They keep piling on lines, hoping that more guidance lands as more control. Past roughly 200 lines the next line **costs** you signal, because Claude's grip on the whole file loosens as it grows.

> *"If Claude keeps doing something you don't want despite having a rule against it, the file is probably too long and the rule is getting lost."*

## CLAUDE.md hierarchy and precedence

Every file that gets discovered is **concatenated**, none overrides another. When two rules collide, the more specific scope takes it. Discovery walks up the directory tree starting from your working directory.

| Scope | Path (default) | Shared with | Notes |
|---|---|---|---|
| Managed policy | `/Library/Application Support/ClaudeCode/CLAUDE.md` (macOS) | Org-wide | **Cannot be excluded** even via `claudeMdExcludes` |
| Managed policy | `/etc/claude-code/CLAUDE.md` (Linux/WSL) | Org-wide | Same |
| Managed policy | `C:\Program Files\ClaudeCode\CLAUDE.md` (Windows) | Org-wide | Same |
| Project | `./CLAUDE.md` or `./.claude/CLAUDE.md` | Team via git | The main file most teams maintain |
| User | `~/.claude/CLAUDE.md` | Just you, all projects | Personal preferences (response style, language) |
| Local | `./CLAUDE.local.md` (gitignored) | Just you, this project | Sandbox URLs, personal credentials, machine-local quirks |

### Monorepo behavior

Say you launch Claude Code inside `root/foo/`:
- `root/foo/CLAUDE.md` loads (the cwd)
- `root/CLAUDE.md` loads too (the parent walk)
- When Claude opens files in `root/foo/bar/`, `root/foo/bar/CLAUDE.md` loads on demand

That setup lets the monorepo root push rules down across every subproject while each subproject layers its own on top.

## The three core building blocks every CLAUDE.md needs

Source: camelCase, "Stop Writing Bad CLAUDE.md Files." Backed by Anthropic's specificity guidance.

### 1. One-liner describing the project

A single sentence that hands Claude the framework, the language, the audience, and the domain.

✅ Good:
- *"This is our customer-facing payment portal built with Next.js 15 and Stripe."*
- *"This is a documentation site built with Astro for an open-source CLI."*
- *"This is an Angular-based portfolio site with no backend."*

❌ Bad:
- *"This is a project."*
- (No description at all)

### 2. Key bash commands

The commands Claude can't guess on its own and that show up in **daily** work.

✅ Good:
- `npm run build` — builds the production bundle
- `npm run typecheck` — runs TypeScript checks
- `pytest -k "not integration"` — runs unit tests, skipping integration

❌ Bad:
- Listing every npm script even ones used once a month
- Listing standard commands Claude knows (`git log`, `cd`)

### 3. Caveats — non-obvious project warnings

The things the code won't reveal on its own, the ones that will trip Claude up.

✅ Good:
- *"Never modify `schema.prisma` directly — run `npm run db:generate` instead."*
- *"The API webhook expects a raw body — don't use `body-parser` middleware."*
- *"Images in `/public` must be optimized — anything over 200KB fails CI."*
- *"The `legacy/` folder is read-only and scheduled for deletion. Don't add new code there."*

❌ Bad:
- Generic warnings ("be careful with the database")
- Warnings the linter would catch anyway

## Specificity beats vagueness — examples

Specific rules pull around 89% compliance. Vague ones fall to about 35%. Here are Anthropic's documented examples:

| ❌ Vague (low compliance) | ✅ Specific (high compliance) |
|---|---|
| "Format code properly" | "Use 2-space indentation" |
| "Test your changes" | "Run `npm test` before committing" |
| "Keep files organized" | "API handlers live in `src/api/handlers/`" |
| "Write clean code" | (just delete this) |
| "Be careful with auth" | "All `/api/admin/*` routes must call `requireAdmin()` from `src/auth/middleware.ts`" |
| "Document complex code" | "Functions with >3 parameters need a JSDoc block listing each param" |

## Path-scoped rules in `.claude/rules/`

On a bigger project, split your instructions into topic files inside `.claude/rules/`. One `.md` file per topic. You scope each set of rules to file paths through YAML frontmatter:

```yaml
---
paths:
  - "src/api/**/*.ts"
  - "src/handlers/**/*.ts"
---

# API Handler Rules

- Always wrap handlers in `withAuth()`.
- Return errors as `{ error: { code, message } }`.
- Use the shared logger from `src/lib/logger.ts`.
```

Files that have **no** `paths:` frontmatter load unconditionally at launch, so they behave like a CLAUDE.md. Files that **do** carry `paths:` load only when Claude reads files that match the glob, which is progressive disclosure done right.

This is where code style rules, testing conventions, and security patterns belong. **Move them out of CLAUDE.md.**

## The `@import` pattern

Syntax: `@path/to/file.md` inside a CLAUDE.md.

- Relative paths resolve **relative to the importing file**.
- Maximum recursion depth: **5 hops**. Anything past that gets dropped.
- Imported content **fully loads** at launch — imports don't save tokens, only organize.

Use case: shared rules across multiple repos.

```markdown
# Project CLAUDE.md

@~/.claude/shared-rules/typescript.md
@~/.claude/shared-rules/security.md

## Project-specific
- ...
```

## `claudeMdExcludes` and managed policy

Inside `.claude/settings.local.json` you can skip ancestor CLAUDE.md files by glob:

```json
{
  "claudeMdExcludes": [
    "../../legacy-monorepo/**"
  ]
}
```

Handy when you're deep inside a giant org monorepo and most of the ancestor CLAUDE.md content is just noise.

**Managed policy CLAUDE.md cannot be excluded.** Org-wide rules apply no matter what. That is deliberate: a developer should not be able to switch off security and compliance rules.

## Position effect — why ordering matters

LLMs over-attend to **the start and end** of a prompt and under-attend to **the middle**. This comes from how transformer attention is built, and multiple studies document it.

For CLAUDE.md:
- Put the **most important rules at the top**.
- Put the **building blocks** (project description, commands, caveats) early.
- Put **edge cases and lower-priority guidance** in the middle (or move to `.claude/rules/`).
- The very end is also a high-attention zone — use it for `IMPORTANT` final reminders.

Anthropic's own system reminder points the same direction:

> *"important: This context may or may not be relevant to your tasks. You should not respond to this context unless it is highly relevant to your task."*

The model is literally *told* the CLAUDE.md content might not matter. So vague rules and rules buried in the middle get read as background noise. **Specificity and position are how you beat that.**

## Emphasis markers

Anthropic confirms that emphasis markers raise adherence on the rules that count:

- `IMPORTANT:`
- `YOU MUST`
- `CRITICAL:`
- ALL CAPS for the rule itself
- Exclamation marks (sparingly)

Save these for the rules where a miss actually costs you. Mark everything `IMPORTANT` and none of it reads as important.

## The `MEMORY.md` system

Auto-memory at `~/.claude/projects/<project>/memory/`:

- `MEMORY.md` is the index. **First 200 lines or 25KB** — whichever first — loads at startup.
- Topic files in the same directory load on demand.
- Claude judges what is worth keeping by how useful it looks for later.
- Memory is machine-local and shared across worktrees of the same git repo.

Handle `MEMORY.md` the way you handle CLAUDE.md: prune hard, keep every entry specific.

## Compaction behavior

Here is what happens on `/compact`:

- The **project-root CLAUDE.md is re-injected** automatically. Your rules make it through.
- **Nested CLAUDE.md is not re-injected.** Whatever subdirectory rules mattered during the conversation are gone once compaction runs.
- You can shape compaction from CLAUDE.md itself: *"When compacting, always preserve the full list of modified files and any test commands."*

## HTML comments are stripped

Block-level HTML comments get pulled out before the context injection:

```markdown
<!-- This note is for the human maintainer only.
     Claude never sees it. -->
```

Use that for maintainer notes, an audit trail, or the "why this rule exists" history, all without spending tokens. Comments inside ` ``` ` code fences are **preserved**.

## Dos

- Run `/init` only to get a starting point — then prune hard. AI-generated CLAUDE.md is verbose out of the box.
- Treat CLAUDE.md like code: review it when things break, prune it on a schedule, and test changes by watching behavior.
- Group related instructions with markdown headers and bullets so the file reads cleanly.
- Reserve `IMPORTANT` / `YOU MUST` for the rules where a miss is costly.
- Push multi-step procedures into Skills.
- Push path-specific rules into `.claude/rules/` with `paths:` frontmatter.
- Add a rule to CLAUDE.md once Claude makes the same mistake **twice**.
- Keep the most important rules at the **top** of the file.
- Book monthly audits — CLAUDE.md is a living document, code drifts, and rules go stale.
- Use `<!-- HTML comments -->` for maintainer notes that cost no tokens.
- Use the Anthropic GitHub integration to have Claude update CLAUDE.md from what it sees in PRs.

## Don'ts

- Don't include code style rules (`use 2 spaces`, `single quotes`). Push that to linters and formatters via the `post tool use` hook.
- Don't include anything Claude can work out by reading the code.
- Don't restate standard language conventions Claude already knows.
- Don't paste detailed API documentation — link to the docs instead.
- Don't include anything that changes often (deploy URLs, the current sprint, who's on call).
- Don't include long explanations or tutorials.
- Don't include file-by-file descriptions of the codebase.
- Don't include self-evident practices ("write clean code", "follow best practices", "be careful").
- Don't add a `# Title` heading that just repeats the filename.
- Don't lean on `@imports` to "save tokens" — they don't.
- Don't let CLAUDE.md creep past 200 lines without splitting into Skills, `.claude/rules/`, or imports.
- Don't leave generic warnings in — say exactly what fails and how.
- Don't write rules that fight each other; settle them or one gets picked arbitrarily.

## Verbatim quotes worth preserving

> *"CLAUDE.md content is delivered as a user message after the system prompt, not as part of the system prompt itself. Claude reads it and tries to follow it, but there's no guarantee of strict compliance, especially for vague or conflicting instructions."*

> *"If Claude keeps doing something you don't want despite having a rule against it, the file is probably too long and the rule is getting lost."*

> *"Treat CLAUDE.md like code: review it when things go wrong, prune it regularly, and test changes by observing whether Claude's behavior actually shifts."*

> *"Treating context as a precious, finite resource will remain central to building reliable, effective agents."*

## Auditable signals

When this skill runs Pass 1 (size check) and Pass 2 (pruning) against CLAUDE.md files, watch for:

- **Total line count** per CLAUDE.md (>200 = warn, >300 = fail).
- **Vague rules**: rules with no concrete value, command, file path, or measurable threshold. Heuristic: a rule containing `properly`, `correctly`, `clean`, `good`, `appropriate` gets flagged for review.
- **Code-style rules**: catch `\b(use|prefer)\s+\d+\s+(space|tab)`, single-quote rules, and formatting opinions. Recommend moving them to linter config plus `.claude/rules/`.
- **File-by-file descriptions**: long stretches describing each file in a folder. Recommend a short routing table instead, or removal.
- **Standard convention restatements**: rules that only echo what the language enforces (`Use camelCase for JS`, `Use snake_case for Python`).
- **Self-evident platitudes**: `write clean code`, `follow best practices`, `be careful`, `test your changes`. Cut.
- **Generic emphasis**: every rule tagged `IMPORTANT`. That signals no real prioritization. Flag it.
- **Top-of-file content**: the first 20 lines should hold the project description, key commands, or critical caveats. If it's preamble or rationale, recommend moving it up.
- **Imports**: detect `@imports`. Walk them up to 5 hops. Flag any depth >5 (it gets dropped).
- **Heading duplication**: an `# H1` that matches the filename → cut.
- **Imported content that nothing else in CLAUDE.md references** → recommend removing.

## Sources

- https://code.claude.com/docs/en/best-practices
- https://code.claude.com/docs/en/memory
- https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
- camelCase, "Stop Writing Bad CLAUDE.md Files" (2026-02-04) — practitioner field notes
