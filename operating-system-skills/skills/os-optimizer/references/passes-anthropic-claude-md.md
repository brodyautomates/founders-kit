<!-- © 2026 Brody Glanville. All rights reserved. The Brody Operating System. -->

# F1 — Anthropic CLAUDE.md (pass implementation)

**Reference (the why):** `references/anthropic-claude-md.md`.
**Applies to:** every file classified as `root-claude` or `folder-claude` (and `claude-rules` where noted).

## How this pass works

This pass is **agentic, not regex-driven**. Each check spells out:

- **Framework rule** — the claim Anthropic makes and the reason it counts.
- **Trigger heuristic** — a quick pattern that pulls up candidate matches. Treat the trigger as a lead, not a ruling. Some checks have no trigger, in which case the file itself is the candidate.
- **Agent judgment** — what the agent has to read and think through before it writes a finding.
- **False positives to skip** — cases that resemble the trigger but are not real violations.
- **Finding format** — every finding carries `reasoning` (1–2 sentences tied to this exact case).

The agent reads the whole file, runs every check, and **writes findings only where the reasoning step confirms them**. If the trigger fires 47 times but only 5 of those actually break the rule in context, the run reports 5 findings, not 47.

## Contents

1. [F1.1 — Size check](#f11--size-check)
2. [F1.2 — Specificity heuristic](#f12--specificity-heuristic)
3. [F1.3 — Code-style rules](#f13--code-style-rules)
4. [F1.4 — File-by-file descriptions](#f14--file-by-file-descriptions)
5. [F1.5 — Self-evident platitudes](#f15--self-evident-platitudes)
6. [F1.6 — Generic emphasis ratio](#f16--generic-emphasis-ratio)
7. [F1.7 — Position effect (top-of-file lead)](#f17--position-effect-top-of-file-lead)
8. [F1.8 — `@import` depth walk](#f18--import-depth-walk)
9. [F1.9 — `.claude/rules/` recommendation](#f19--clauderules-recommendation)
10. [F1.10 — Heading duplicates filename](#f110--heading-duplicates-filename)
11. [F1.11 — Conflicting rules](#f111--conflicting-rules)
12. [F1.12 — Standard-convention restatements](#f112--standard-convention-restatements)
13. [Finding schema](#finding-schema)

---

## F1.1 — Size check

**Framework rule:** hold CLAUDE.md under 200 lines (community ceiling 300). Past roughly 200, each extra line costs you signal instead of adding it.

**Trigger heuristic:** `wc -l` and `stat`. >200 lines = candidate. >300 lines = strong candidate.

**Agent judgment:**
- Read the file. Work out whether the length itself is the problem, or whether the file is mostly a routing table or structured tables, which stay dense in attention.
- A 247-line CLAUDE.md that runs 80% bullet rules and prose is real specificity drag, so flag it.
- A 247-line CLAUDE.md that runs 70% routing tables is less of an attention cost. Flag it at lower severity and point at pulling out only the prose sections.
- For **folder-claude**, the budget is tighter because folder CLAUDE.mds stack on top of the root. Flag at >120 lines.

**Severity:**
- root: warn 200–300, fail >300
- folder: warn 120–200, fail >200

**Finding format:**
```
{path} — {N} lines, {bytes}B (~{tokens}t)
Reasoning: {why this size is hurting THIS file's compliance — cite the structure (prose vs table) you observed}
Action: extract {specific section name} to references/, or split by domain
Citation: anthropic-claude-md.md → Hard rules (200-line target)
```

**Auto-fix:** none.

---

## F1.2 — Specificity heuristic

**Framework rule:** specific rules land around 89% compliance; vague rules land around 35%. This is the single biggest lever on CLAUDE.md quality.

**Trigger heuristic:** scan for vague terms (case-insensitive):
```
\b(properly|correctly|clean|good|appropriate|reasonable|sensible|nicely|carefully|thoughtfully|as needed|when appropriate|as you see fit)\b
```
Plus known-vague phrases: "be careful", "follow best practices", "write clean code", "test your changes", "format code properly", "keep things organized", "use good judgment".

**Agent judgment:** for each candidate line, decide whether it is genuinely a vague rule:
- Is the line a numbered rule, bullet, or imperative? (Not a heading, quote, or reference.)
- Does the rule carry a concrete anchor: a file path, function name, command, threshold, or named system? If yes, it is not vague.
- Is the vagueness on purpose? For creative tasks ("Write in a thoughtful tone") the judgment can't be reduced further, so flag it at lower severity.
- Is the rule a closing reminder ("Be careful with auth") sitting inside an otherwise specific file? Lower severity, because it is a gentle echo rather than the primary instruction.
- A rule like "Be careful with payments — see `payments/README.md`" is **specific** because it names the anchor. Leave it.

**False positives to skip:**
- Headings, quotes, references to external docs.
- Rules that already name a specific file, function, or threshold.
- Brand voice files where the vagueness reflects subjective intent.
- The word "carefully" sitting inside a code block or a quoted user message.

**Severity:** warn (one per genuinely vague rule). Cap at 25 per file.

**Finding format:**
```
{path}:{line} — vague rule
Excerpt: "{exact line}"
Reasoning: {why this rule is vague in THIS file — what context it's missing, what Claude couldn't determine from the rule alone}
Suggested rewrite: {a concrete version using anchors visible in the project (file path, function name, command)}
Citation: anthropic-claude-md.md → Specificity beats vagueness
```

**Auto-fix:** none.

---

## F1.3 — Code-style rules

**Framework rule:** code-style rules belong in linter config plus `.claude/rules/`, not in CLAUDE.md. Linters run deterministically; CLAUDE.md does not.

**Trigger heuristic:**
```
\b(use|prefer)\s+\d+[- ]?(space|tab)
(single|double)\s+quotes
\b(camelCase|snake_case|kebab-case|PascalCase)\b
\b(semicolon|trailing comma|line break)\b
\b(eslint|prettier|biome|ruff|black|rustfmt|gofmt)\b
```

**Agent judgment:** read the candidate line in context.
- Is it truly a code-style rule (formatting, naming), or a substantive constraint (for example "API responses must be JSON", which is a contract, not style)?
- Does the project already carry a linter config (`.eslintrc`, `.prettierrc`, `pyproject.toml` with `[tool.ruff]`, and so on)? If yes, flag it and recommend deletion. If no, flag it and recommend creating linter config plus moving the rule.
- Is the rule path-scoped (for example "TS files use 2 spaces, JSON uses 4")? That is a `.claude/rules/{language}.md` candidate. Flag it with that recommendation.

**False positives to skip:**
- Naming-convention mentions in *prose* describing a codebase pattern ("the API uses snake_case keys" documents external behavior, it does not enforce style).
- Linter directive strings inside code blocks (`/* eslint-disable */` and similar).

**Severity:** warn.

**Finding format:**
```
{path}:{line} — code-style rule
Excerpt: "{matched line}"
Reasoning: {why this is style-not-substance, and what the project's linter status is}
Action: {move to {tool} config OR create .claude/rules/{topic}.md with paths: scope}
Citation: anthropic-claude-md.md → Don'ts ("don't include code style rules")
```

**Auto-fix:** none.

---

## F1.4 — File-by-file descriptions

**Framework rule:** skip file-by-file descriptions of the codebase. Claude reads code.

**Trigger heuristic:** detect runs of ≥6 contiguous list items or table rows where ≥4 items contain a path or folder reference followed by descriptive prose.

**Agent judgment:**
- Read the section. Is it a routing table (short cells, ≤1 line each) or a long descriptive list?
- A routing table is fine. It is a navigation index, not file documentation. Skip it.
- A list where each item runs ">40 chars of description per file" is the anti-pattern. Flag it.
- Is the file describing **external** API surfaces (for example a reference SKILL listing endpoints)? That is documentation, not a file-by-file project description. Skip it.

**False positives to skip:**
- Routing tables (short cells).
- API reference lists in skills.
- Lists where each item describes a *concept* rather than a file.

**Severity:** warn.

**Finding format:**
```
{path}:{line-start}-{line-end} — file-by-file description block ({N} items)
Excerpt: first 2 items
Reasoning: {why these descriptions duplicate what reading the code would tell Claude}
Action: collapse to a {N}-line routing table, or delete entirely
```

**Auto-fix:** none.

---

## F1.5 — Self-evident platitudes

**Framework rule:** leave out self-evident practices ("write clean code", "follow best practices", "be careful").

**Trigger heuristic:** whole-line patterns:
```
^\s*[-*0-9.]*\s*(write clean code|follow best practices|be careful|use common sense|do your best|test your changes|review your work|think before|stay focused|be thorough|be thoughtful|pay attention)\b
```

**Agent judgment:**
- For each candidate, is it the whole rule, or is an anchor attached? "Be thorough — run all 4 tests in `tests/integration/`" is not a platitude, so skip it.
- Is the platitude sitting inside a callout or summary that is deliberately high-level? Lower severity.
- Many platitudes overlap with F1.2. Deduplicate: if both fire, prefer F1.5, because it is the stronger signal (delete beats rewrite).

**False positives to skip:**
- Platitudes carrying a specific anchor on the same line.
- Quotes from external sources (Karpathy quotes, Anthropic quotes).
- Platitudes inside a `<details>` block kept for historical reasons.

**Severity:** warn.

**Finding format:**
```
{path}:{line} — platitude
Excerpt: "{matched line}"
Reasoning: {why this rule has zero operational value in THIS file's context}
Action: delete (preferred) or replace with a concrete imperative tied to a project anchor
```

**Auto-fix:** none.

---

## F1.6 — Generic emphasis ratio

**Framework rule:** "If everything is IMPORTANT, nothing is."

**Trigger heuristic:** count standalone emphasis markers:
```
\b(IMPORTANT|YOU MUST|CRITICAL|NEVER|ALWAYS|MUST|REQUIRED)\b
```
Then count total numbered or bulleted rules. Compute the ratio.

**Agent judgment:** read the file.
- A high ratio in a short, all-critical file (security policy, deployment guard) is *earned*: every rule really is must-not-fail. Lower severity, or skip.
- A high ratio in a 250-line CLAUDE.md is the anti-pattern. Flag it.
- For each `IMPORTANT` rule, ask: would Claude failing this cause a real production incident? If that holds for most of them, the emphasis is earned. If not, the emphasis is inflation.

**False positives to skip:**
- Files where every rule is genuinely critical (security, payments, irreversible ops).
- Emphasis inside callouts (`> [!important]`), where the callout already does the marking.

**Severity:**
- ratio > 0.5 → fail
- ratio > 0.3 → warn

**Finding format:**
```
{path} — {n} emphasis markers across {m} rules ({pct}%)
Reasoning: {why the emphasis is inflated here — sample 2-3 rules that are NOT mission-critical but use IMPORTANT}
Action: reserve emphasis for rules where failure is genuinely costly; demote the rest
```

**Auto-fix:** none.

---

## F1.7 — Position effect (top-of-file lead)

**Framework rule:** LLMs over-attend to the start and the end. Lead with the load-bearing rule.

**Trigger heuristic:** read the first 30 lines (or the first 30%, whichever is more). Score it for "load-bearing" presence.

**Agent judgment:** the agent reads the top of the file and asks:
- If Claude had only the first 30 lines, would it know the most important things this file is trying to enforce?
- Is the top a routing table, a numbered list of rules, or a callout? Then it leads well.
- Is the top a long descriptive prose block, an introduction ("This document explains…"), or a personality preamble? Then the lead is buried.
- Sometimes preamble is required (for example a skill SKILL.md needs its description and frontmatter). Judge what is load-bearing **for this file's role**.

**False positives to skip:**
- Files where preamble is mandated (frontmatter blocks, license headers).
- Files where the H1 plus a single one-line summary at the top IS the load-bearing claim.

**Severity:** warn.

**Finding format:**
```
{path} — top-of-file is preamble, not load-bearing rules
Excerpt: "{first 100 chars}…"
Reasoning: {what's actually at the top vs what should be there given the file's role}
Action: lead with {specific section name observed deeper in the file} that's actually load-bearing
```

**Auto-fix:** none.

---

## F1.8 — `@import` depth walk

**Framework rule:** imports cap at 5 hops. Past that they get dropped. Imports do NOT save tokens.

**Trigger heuristic:** grep `^@(\S+)`. Resolve each one, recurse, track depth.

**Agent judgment:** mostly mechanical, since the depth count is the rule. The agent still reads the file to:
- Confirm the import line is not inside a code fence (code samples about imports).
- Decide whether a depth-5 file is warn or fail, given that one more hop is a hard drop.
- Detect cycles by tracking visited paths.

**False positives to skip:**
- `@`-prefixed strings inside code fences or inline code.
- Git tags or npm scoped names that start with `@` but are not markdown imports.

**Severity:**
- depth > 5 → fail (will be dropped)
- depth = 5 → warn (at ceiling)
- cycle detected → fail
- import target missing → fail

**Finding format:**
```
{path}:{line} — @import {target}
Reasoning: depth {n} from root via {path-1} → {path-2} → … (or "cycle: {path} re-imports itself")
Action: flatten the chain or remove the deepest import; imports don't save tokens
```

**Auto-fix:** none.

---

## F1.9 — `.claude/rules/` recommendation

**Framework rule:** path-scoped rules belong in `.claude/rules/*.md` with `paths:` frontmatter.

**Trigger heuristic:**
1. Did F1.3 fire ≥3 times across the CLAUDE.md tree?
2. Does `.claude/rules/` exist? If it does, do its files carry `paths:` frontmatter?

**Agent judgment:**
- If F1.3 fired and `.claude/rules/` is missing, make a strong recommendation. The reasoning lists the specific style rules that would move there.
- If `.claude/rules/` exists but its files lack `paths:`, those files load unconditionally and behave like CLAUDE.md. Flag each one, with reasoning that spells out the lost progressive disclosure.
- If `.claude/rules/` exists with proper `paths:` frontmatter, write no finding.

**False positives to skip:**
- Vaults with no code-style rules in CLAUDE.md need no recommendation.

**Severity:** warn.

**Finding format (no rules dir):**
```
.claude/rules/ does not exist
Reasoning: {n} code-style rules found in CLAUDE.md ({list 2-3 with line numbers}) — they should be path-scoped
Action: create .claude/rules/{topic}.md per topic with paths: frontmatter; move the listed rules there
```

**Finding format (rule file missing paths):**
```
.claude/rules/{file} — missing paths: frontmatter
Reasoning: this file currently loads unconditionally on every session, defeating the path-scoping benefit
Action: add a paths: array so the rule only loads when matching files are read
```

**Auto-fix:** none.

---

## F1.10 — Heading duplicates filename

**Framework rule:** don't add a `# Title` heading that repeats the filename.

**Trigger heuristic:** read the first non-frontmatter content line. If it is `# {Title}`, slugify both `{Title}` and the filename. If they match, it is a candidate.

**Agent judgment:** mostly mechanical, but the agent reads to confirm:
- Is the H1 really a title repeating the filename, or a section heading (for example `# Overview`) that happens to overlap?
- For `CLAUDE.md` files, the H1 is usually the literal `# CLAUDE.md`. That is the duplicate to remove.
- For `README.md`, an H1 of `# Project Name` may be intentional GitHub display. Flag it at lower severity.

**False positives to skip:**
- READMEs at repo root where the H1 displays in the GitHub UI (a judgment call: flag it, but recommend keeping it if the user prefers the GitHub render).

**Severity:** warn.

**Finding format:**
```
{path} — H1 "{title}" duplicates filename
Reasoning: Obsidian/Claude already shows the filename as the title; the H1 is redundant
Action: remove the H1 line and any blank line below
```

**Auto-fix:** **fixable** (deduplicated with G7.3 — runs once per file).

---

## F1.11 — Conflicting rules

**Framework rule:** two rules that contradict each other leave Claude to pick one at random. Resolve the conflict.

**Trigger heuristic:** for each line containing `Always|Never|Must|Don't|Do not`, scan the rest of the file for another line with the opposite modal that shares ≥3 content tokens (after stopword removal).

**Agent judgment:** read both candidate lines.
- Do they really contradict, or are they scoped differently? "Always commit before pushing" plus "Never commit on main" have different scopes and no conflict. Skip.
- Are they sequenced ("first do X; never do X without Y")? Then it is not a conflict.
- Do they truly clash? Then flag it, with reasoning that shows the contradiction.

**False positives to skip:**
- Rules with different scopes.
- Rules where one is a default and the other an exception ("Always run tests; never run tests on the deploy branch").

**Severity:** warn.

**Finding format:**
```
{path} — rules at L{a} and L{b} appear to conflict
Excerpt:
  L{a}: "{text-a}"
  L{b}: "{text-b}"
Reasoning: {why these contradict — what action a confused Claude would take based on which rule it gives weight to}
Action: resolve which rule wins; remove or qualify the other
```

**Auto-fix:** none.

---

## F1.12 — Standard-convention restatements

**Framework rule:** don't restate language conventions Claude already knows.

**Trigger heuristic:**
```
\b(Use|Prefer)\s+(camelCase|snake_case|kebab-case|PascalCase)\b
\b(JS|JavaScript|Python|Go|Rust|Ruby)\s+uses\s+\w+
\bAlways use semicolons in (JS|JavaScript)\b
\bIndent with (2|4) spaces in (JS|JavaScript|Python|TypeScript)\b
```

**Agent judgment:** read the line.
- Is it restating a default convention the language already enforces? Then flag it.
- Is it overriding a convention (for example "We use snake_case in JS for legacy reasons")? That is not a restatement, it is a valid project rule. Skip it.
- Is it documentation about an external API's conventions? Skip it.

**False positives to skip:**
- Project-specific overrides.
- Documentation of external systems.

**Severity:** warn.

**Finding format:**
```
{path}:{line} — restates a standard language convention
Excerpt: "{matched line}"
Reasoning: {language} already enforces this; Claude knows it without being told
Action: delete
```

**Auto-fix:** none.

---

## Finding schema

```json
{
  "framework": "F1",
  "check_id": "F1.x",
  "check_name": "name",
  "path": "./CLAUDE.md",
  "line": 42,
  "severity": "fail|warn",
  "excerpt": "matched line or surrounding context",
  "reasoning": "1-2 sentences specific to this case",
  "action": "remediation",
  "fixable": false,
  "citation": "anthropic-claude-md.md → section"
}
```

The `reasoning` field is mandatory. Every finding carries it. A finding without reasoning is a bug, not a finding.
