<!-- © 2026 Brody Automates. All rights reserved. The Brody Operating System. -->

# G7 — General Hygiene (pass implementation)

**Reference (the why):** project rules plus practitioner field notes. This one does not come from a single canonical framework.
**Applies to:** every `.md` file in the vault.

## How this pass works

Agentic. Em dash detection and H1=filename run mostly mechanically, but the agent reads each candidate to confirm the substitution or deletion is safe in context, then writes reasoning that explains why this exact case breaks the project rule. See F1's intro for the full pattern.

## Contents

1. [G7.1 — Em dashes](#g71--em-dashes)
2. [G7.2 — Frontmatter compliance](#g72--frontmatter-compliance)
3. [G7.3 — H1 duplicating filename](#g73--h1-duplicating-filename)
4. [G7.4 — Project README hygiene](#g74--project-readme-hygiene)
5. [Finding schema](#finding-schema)

---

## G7.1 — Em dashes

**Framework rule (project Rule 14):** never use em dashes. Use periods, commas, colons, or restructure.

**Trigger heuristic:** strip protected zones (code fences, inline code, URLs, frontmatter, wikilinks, paths). Grep for `—` (U+2014) and `–` (U+2013).

**Agent judgment:** for each candidate, read the whole sentence around it and pick the right swap:
- Em dash between two clauses where the second one expands on the first → `: ` (colon).
- Em dash wrapping a parenthetical → `, … ,` (commas).
- Em dash closing a clause and acting like a period → `. ` (period).
- En dash in a numeric range (`100–200`) → keep the en dash. This is canonical, not a Rule-14 violation.
- En dash in a date range → keep.

Reasoning names the right swap per occurrence and says why.

**False positives to skip:**
- Numeric ranges with en dash (`100–200`, `5–10 minutes`).
- Date ranges (`2026–2027`).
- Em dashes inside quoted speech (leave the original text alone).

**Severity:** warn.

**Finding format (one per file, aggregated):**
```
{path} — {n} em-dash uses
Examples:
  L{line}: "{full sentence}" → suggested: "{rewritten sentence}"
  …
Reasoning: {how the em dashes are used in this file — clause separators, parentheticals, etc.}
Action: replace each per the suggestion (substitutions vary by use)
```

**Auto-fix:** **fixable on user opt-in**. The agent applies the per-occurrence substitution it confirmed (not a bulk regex).

After the swap, re-strip protected zones and check that nothing inside code, URLs, or wikilinks changed. If any protected substring goes missing or gets mangled → abort that file's fix and report it.

---

## G7.2 — Frontmatter compliance

**Framework rule (project):** content notes need `status:` and 2+ specific `tags:`. Recommended: `type:`, `date:`, `project:`, `department:`.

**Trigger heuristic:** parse frontmatter for files in scope (`note`, `context`, `decision`, `meeting`, `daily`).

**Agent judgment:** for each missing field:
- Read the file. Can the agent work out the right value?
  - `status:` → look for completion signals (any "Done", "Shipped", "Decided") → suggest `done`. Otherwise `active` for current work.
  - `tags:` → pull 2+ tags from the file's H1, project context, and content.
  - `type:` → read it off the filename pattern and content (`meeting`, `decision`, `note`, `reference`).
  - `date:` → look for dates in the body.
  - `project:` / `department:` → read it off the folder location.
- Reasoning gives the inferred value with a confidence level: high when it is clearly visible, low when it is a best guess.

**False positives to skip:**
- `CLAUDE.md`, `README.md`, `index.md`, `MEMORY.md` (meta).
- `.trash/`, `Onboarding/templates/`.
- Tasks files (different format).

**Severity:** warn (per missing field).

**Finding format (one per file, aggregated):**
```
{path} — missing frontmatter: {fields}
Reasoning: inferable values — {field: inferred-value (high/low confidence)}; remaining need human input
Suggested frontmatter:
  ---
  status: {value}
  tags: [{tag1}, {tag2}]
  type: {value}
  ---
Action: add the suggested frontmatter
```

**Auto-fix:** none in v0. Confidence is too shaky to auto-write frontmatter values.

---

## G7.3 — H1 duplicating filename

**Framework rule:** do not add a `# Title` heading that just repeats the filename.

**Trigger heuristic:** read first non-frontmatter content line. If `# {Title}`, slugify both, compare.

**Agent judgment:** confirm:
- Is this a CLAUDE.md / README.md? Cross-check with F1.10 so you do not count it twice.
- For READMEs at a git repo root, the H1 may be there on purpose for GitHub display → flag at low severity, recommend keeping it if the user wants the GitHub render.

**Severity:** warn.

**Finding format:**
```
{path} — H1 "{title}" duplicates filename
Reasoning: Obsidian/Claude already shows the filename as the title; H1 is redundant
Action: remove the H1 and any blank line below
```

**Auto-fix:** **fixable**.

---

## G7.4 — Project README hygiene

**Framework rule:** a project README is the entry point. It carries overview, status, and next-steps, while subtopics route out to subdir files.

**Trigger heuristic:** files matching `Projects/*/README.md` or `Projects/*/*/README.md`. Check sections (Overview/What, Status, Next/Roadmap) and size (<200B = sparse, >8KB = bloated).

**Agent judgment:** for each candidate:
- Read the README. What is there, and what is missing?
- Sparse case: reasoning lists what the README actually says against what a project entry-point needs.
- Bloated case: reasoning names the subtopics that should extract out (research/, specs/, notes/).
- Reasoning describes the right structure for THIS specific project.

**Severity:** warn.

**Finding format (sparse):**
```
{path} — sparse README ({bytes}B)
Reasoning: README contains {what's there}; missing {Overview / Status / Next steps}
Action: add overview, current status, next steps
```

**Finding format (bloated):**
```
{path} — bloated README ({bytes}B)
Reasoning: README contains {N} distinct subtopics that should live in subdir files: {list}
Action: extract {subtopic-A} → research/{slug}.md, {subtopic-B} → specs/{slug}.md; keep README as the entry index
```

**Auto-fix:** none.

---

## Finding schema

Same shape as F1. Every finding carries a `reasoning` field. See SKILL.md Step 2.4.
