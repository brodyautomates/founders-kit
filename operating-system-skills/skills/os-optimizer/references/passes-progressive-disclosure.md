<!-- © 2026 Brody Automates. All rights reserved. The Brody Operating System. -->

# F6 — Progressive Disclosure (pass implementation)

**Reference (the why):** `references/progressive-disclosure.md`.
**Applies to:** every `SKILL.md`. F6.4–F6.5 walk into the skill's `references/`.

## How this pass works

Agentic. Frontmatter validation runs mostly mechanically, but the content-quality calls (description triggers, reference design, terminology consistency, voodoo constants) need the agent to read the SKILL.md and its references and reason about whether the framework rule is really broken. See F1's intro for the full pattern.

## Contents

1. [F6.1 — SKILL.md size](#f61--skillmd-size)
2. [F6.2 — Frontmatter `name`](#f62--frontmatter-name)
3. [F6.3 — Frontmatter `description`](#f63--frontmatter-description)
4. [F6.4 — Reference depth](#f64--reference-depth)
5. [F6.5 — Reference TOC](#f65--reference-toc)
6. [F6.6 — Windows-style paths](#f66--windows-style-paths)
7. [F6.7 — Time-sensitive language](#f67--time-sensitive-language)
8. [F6.8 — Voodoo constants](#f68--voodoo-constants)
9. [F6.9 — Inconsistent terminology](#f69--inconsistent-terminology)
10. [F6.10 — MCP `ServerName:` prefix](#f610--mcp-servername-prefix)
11. [F6.11 — Skill-vault duplication](#f611--skill-vault-duplication)
12. [F6.12 — First/second-person description](#f612--firstsecond-person-description)
13. [Finding schema](#finding-schema)

---

## F6.1 — SKILL.md size

**Framework rule:** SKILL.md body under 500 lines.

**Trigger heuristic:** `wc -l` on body (after frontmatter).

**Agent judgment:** for each oversized SKILL.md:
- Read it. Find which sections are detail-heavy and could move into `references/`.
- Reasoning names specific sections and a realistic split.

**Severity:** warn 400–500, fail >500.

**Finding format:**
```
{path} — {N} lines (target <500)
Reasoning: sections that look extractable: {names with line counts}
Action: extract {specific section} → references/{topic}.md; replace with a 1-line reference
```

**Auto-fix:** none.

---

## F6.2 — Frontmatter `name`

**Framework rule:** ≤64 chars, `[a-z0-9-]` only, no reserved words (`anthropic`, `claude`), no XML tags.

**Trigger heuristic:** parse frontmatter `name`. Apply the constraints above.

**Agent judgment:** mostly mechanical. The agent reads to suggest a better name when the current one breaks a rule:
- Too long → suggest a tighter gerund-form slug.
- Wrong chars → propose the cleaned version.
- Reserved word → propose an alternative that keeps the same intent.

**Severity:** fail.

**Finding format:**
```
{path} — frontmatter name "{value}" {issue}
Reasoning: {what the issue is and why it breaks skill loading}
Suggested name: {alternative}
Action: rename
```

**Auto-fix:** none.

---

## F6.3 — Frontmatter `description`

**Framework rule:** ≤1024 chars, non-empty, third person, includes triggers, no XML tags.

**Trigger heuristic:** parse frontmatter `description`. Check length, presence, person, trigger keywords.

**Agent judgment:** read the description and the SKILL.md body:
- Length violations → reasoning points to the bloat (a folded scalar wasting indentation, hedged phrasing, repeated content) and suggests a tightened version.
- Missing triggers → reasoning lists 3–5 phrasings the user would actually type to invoke this skill (pulled from reading the SKILL.md body).
- First or second person → suggest the third-person rewrite.
- Too-vague descriptions → flag even when the length is fine. Reasoning states what the skill does that the description leaves out.

**False positives to skip:**
- Descriptions that carry real product names that look like reserved words (e.g., "Claude API" is the product name, not a reserved-word violation).

**Severity:**
- length > 1024, missing, empty, XML tags → fail
- first/second person, missing triggers → warn

**Finding format:**
```
{path} — description {issue}
Reasoning: {specific to the description content}
Suggested rewrite: {tightened/third-person/triggers-added version}
Action: replace
Citation: progressive-disclosure.md → Description authoring
```

**Auto-fix:** none.

---

## F6.4 — Reference depth

**Framework rule:** keep references one level deep from SKILL.md.

**Trigger heuristic:** parse SKILL.md for markdown links → mark hop 1. Recurse hop 2.

**Agent judgment:** for each 2-hop reference:
- Read the chain. Is the deeper file secondary detail (good case for merging into hop-1) or a separate concern (good case for linking directly from SKILL.md)?
- Reasoning recommends the right restructure.

**Severity:** fail.

**Finding format:**
```
{skill}/SKILL.md → {ref-1}.md → {ref-2}.md
Reasoning: {what {ref-2} contains and whether it should merge into {ref-1} or get a direct link from SKILL.md}
Action: {specific restructure}
```

**Auto-fix:** none.

---

## F6.5 — Reference TOC

**Framework rule:** reference files >100 lines need a TOC at the top.

**Trigger heuristic:** for each `references/*.md` linked from a SKILL.md, count lines. >100 → check first 30 lines for a TOC (Contents / Table of Contents section with anchor links).

**Agent judgment:** for each candidate that has no TOC:
- Read the file's H2 list. Generate a suggested TOC.
- Reasoning hands back the H2 anchors as a copy-pastable list.

**Severity:** warn.

**Finding format:**
```
{path} — {N} lines, no TOC
Reasoning: file has {n} H2 sections; TOC helps Claude do whole-file reads (no `head -100` truncation)
Suggested TOC: {generated list of [Section](#section) links}
Action: add a "## Contents" section at the top
```

**Auto-fix:** none in v0 (auto-generation possible but TOC ordering needs user review).

---

## F6.6 — Windows-style paths

**Framework rule:** forward slashes only.

**Trigger heuristic:**
```
\b[A-Z]:\\
\\\\
\\(?![nrt"\\])
```

**Agent judgment:** for each match, read the line:
- Is it actually a Windows path, or a backslash that is part of escape syntax or a regex?
- Reasoning confirms which.

**False positives to skip:**
- Backslashes inside regex literals or escape sequences in code blocks (already protected).
- Documentation about Windows-specific behavior in `<details>`.

**Severity:** fail.

**Finding format:**
```
{path}:{line} — Windows-style path
Excerpt: "{matched line}"
Reasoning: {what the path resolves to; that forward slashes work on Windows too}
Action: convert to forward-slash path
```

**Auto-fix:** none.

---

## F6.7 — Time-sensitive language

**Framework rule:** no time-sensitive info inline outside `<details>`.

**Trigger heuristic:**
```
\b(After|Before|Since|Until|As of|Starting in|From)\s+(January|February|March|April|May|June|July|August|September|October|November|December|Q[1-4]|\d{4})
\b(Last|This|Next)\s+(year|quarter|sprint|week)\b
```

**Agent judgment:** for each match, read:
- Is the date pinned to a stable event ("After v2.0 release", "After feature X ships")? → not time-sensitive in the rotting sense. Skip.
- Is it actually time-rotting ("After August 2025", "Starting in Q3")? → flag.
- Is it inside `<details>` already? → skip.

**Severity:** warn.

**Finding format:**
```
{path}:{line} — time-sensitive language
Excerpt: "{matched line}"
Reasoning: this date will rot; replace with a stable anchor (version, feature flag, event)
Suggested replacement: {a stable anchor the agent infers from context}
Action: move into <details> or replace with the stable anchor
```

**Auto-fix:** none.

---

## F6.8 — Voodoo constants

**Framework rule:** no magic numbers without `# why` comments (in scripts referenced from SKILL.md).

**Trigger heuristic:** in scripts (not markdown), grep for numeric literals not followed by an explanatory comment. Filter out array indices, HTTP codes, common constants (60, 1000, 1024, 3600).

**Agent judgment:** for each match:
- Does the number explain itself from context (a function name, a variable name)?
- Or is it a real voodoo constant, like `30` in `if x > 30: …` with no obvious meaning?
- Reasoning supplies the likely meaning when it is inferrable, or asks for it.

**Severity:** warn.

**Finding format:**
```
{path}:{line} — magic number {value}
Excerpt: "{matched line}"
Reasoning: {what the number probably means based on surrounding code; or "meaning unclear from context"}
Action: add `# why ...` comment explaining the constant
```

**Auto-fix:** none.

---

## F6.9 — Inconsistent terminology

**Framework rule:** consistent terminology, meaning pick one term and use it throughout.

**Trigger heuristic:** scan for synonym pairs in same SKILL.md:

| Cluster | If both appear → flag |
|---|---|
| API endpoint / API path / endpoint | pick one |
| user / customer / client / account | pick one |
| repo / repository / project | pick one |
| folder / directory | pick one |
| node / step / stage | pick one |
| CLAUDE.md casing | pick one |
| skill / Skill / SKILL casing | pick one |

**Agent judgment:** for each cluster pair, read both occurrences:
- Are the terms genuinely synonyms in this skill, or do they name different things (say `customer` = paying user, `user` = end user in general)?
- Synonyms → flag. Reasoning picks the canonical term based on first-use or majority.
- Different things → skip. The skill is doing the right thing.

**Severity:** warn.

**Finding format:**
```
{path} — inconsistent terminology: "{term-a}" ({n}×) and "{term-b}" ({m}×)
Reasoning: {whether they're true synonyms here; which term is canonical}
Action: replace the non-canonical term throughout
```

**Auto-fix:** none.

---

## F6.10 — MCP `ServerName:` prefix

**Framework rule:** MCP tools always fully qualified.

**Trigger heuristic:** detect bare tool names that look like MCP tools: references to `slack_send`, `posts_create`, `vault_read` etc. without server prefix.

**Agent judgment:** for each candidate:
- Is the tool actually an MCP tool? Cross-reference with known patterns: `mcp__server__tool`, or context that implies MCP.
- Or is the bare name describing a generic concept ("the search tool") rather than a specific MCP call?
- Reasoning names which server the tool belongs to and proposes the qualified form.

**Severity:** warn.

**Finding format:**
```
{path}:{line} — possibly unqualified MCP tool reference
Excerpt: "{matched line}"
Reasoning: {whether this is an MCP tool, and if so which server}
Suggested form: {ServerName:tool_name} or {mcp__server__tool}
Action: qualify the tool reference
```

**Auto-fix:** none.

---

## F6.11 — Skill-vault duplication

**Framework rule:** skills should not carry their own copies of content the vault already holds in `Context/`.

**Trigger heuristic:** filename matches across skill `references/` and vault `Context/`:
- `icp*` / `ideal-customer*` / `customer-profile*` / `audience*` → `Context/icp.md`
- `voice*` / `tone*` / `brand*` → `Context/brand.md`
- `offers*` / `services*` / `what-we-do*` / `products*` → `Context/services.md`
- `me.md` / `profile*` / `operator*` / `background*` → `Context/operator.md`
- `strategy*` / `goals*` / `okrs*` → `Context/strategy.md`
- `team*` / `org*` → `Context/team.md` or `Context/organization.md`

**Agent judgment:** for each candidate pair, **read both files**:
- Do they truly duplicate, or does the skill ref add skill-specific augmentation?
- Confirm the skill's SKILL.md references the duplicate file (otherwise the ref is a stale orphan, which is a different problem).
- Reasoning quotes 2-3 sentences that overlap between the two files.

**Severity:** warn.

**Finding format:**
```
Skill: {skill-name}
Duplicate: {skill}/references/{file} ({bytes}B)
Vault file: Context/{vault-file}
Reasoning: {overlap evidence — quote 2-3 overlapping claims}
Action: rewrite SKILL.md to read Context/{vault-file}; delete the duplicate ref file (after grepping the skill folder)
```

**Auto-fix:** **fixable**. Agent rewrites SKILL.md to point at vault path, then greps the skill folder; if the ref isn't referenced elsewhere, deletes it. If still referenced → surfaces conflict, skips deletion.

---

## F6.12 — First/second-person description

**Framework rule:** descriptions should be third person.

**Trigger heuristic:**
```
\b(I can|I will|I'll|I help|Use me|I'm|I am)\b
\b(you can|you will|you'll)\b
\b(we can|we will|we'll)\b
```

**Agent judgment:** read the description:
- Is the first/second-person phrasing actually directing the user, or is it part of a quoted example?
- Reasoning explains why third person reads better for skill selection: Claude scans 100+ descriptions, and third person is less ambiguous.
- Suggest a rewrite.

**Severity:** warn.

**Finding format:**
```
{path} — description in first/second person
Excerpt: "{matched substring}"
Reasoning: {why third person reads better for skill selection}
Suggested rewrite: {third-person version}
Action: rewrite
```

**Auto-fix:** none.

---

## Finding schema

Same shape as F1. Every finding carries a `reasoning` field. See SKILL.md Step 2.4.
