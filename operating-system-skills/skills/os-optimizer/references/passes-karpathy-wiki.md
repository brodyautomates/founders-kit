<!-- © 2026 Brody Glanville. All rights reserved. The Brody Operating System. -->

# F2 — Karpathy LLM Wiki (pass implementation)

**Reference (the why):** `references/karpathy-llm-wiki.md`.
**Applies to:** the wiki content layer, meaning every file classified as `note`, `context`, `decision`, `meeting`, `index`, `readme`. F2.6 also runs against `root-claude` (schema doc check).

## How this pass works

Agentic. Each check pairs a **trigger heuristic** (a cheap way to surface candidates) with **agent judgment** (read the context, reason, decide). Findings carry `reasoning` written for the specific case. See F1's intro for the full pattern.

Build the indexes from SKILL.md Step 1.3 once before running F2 (filename index, inbound-link index, routing table).

## Contents

1. [F2.1 — Schema doc completeness](#f21--schema-doc-completeness)
2. [F2.2 — Dead wikilinks](#f22--dead-wikilinks)
3. [F2.3 — Orphan pages](#f23--orphan-pages)
4. [F2.4 — Missing cross-references](#f24--missing-cross-references)
5. [F2.5 — Same-role duplicates](#f25--same-role-duplicates)
6. [F2.6 — Schema non-compliance (routing)](#f26--schema-non-compliance-routing)
7. [F2.7 — Stub notes](#f27--stub-notes)
8. [F2.8 — Undigested sources](#f28--undigested-sources)
9. [F2.9 — Raw source modification](#f29--raw-source-modification)
10. [Finding schema](#finding-schema)

---

## F2.1 — Schema doc completeness

**Framework rule:** the schema doc (root CLAUDE.md) sets the folder layout, naming, page types, cross-reference rules, ingest/query/lint workflows, and frontmatter. Without it the wiki drifts into folders nobody can find again.

**Trigger heuristic:** read root CLAUDE.md. Score for the seven schema components by section heading + body content (not just heading match; a heading without body content doesn't count).

**Agent judgment:**
- For each missing component, decide whether it is truly absent or whether the project handles it another way. A naming convention documented in a separate `Resources/conventions.md` and linked from CLAUDE.md still counts.
- Reasoning names *which* components are weak and what that costs users who run the ingest/query workflows.

**False positives to skip:**
- Tiny vaults (<20 files) where a formal schema is overkill → flag at lower severity, recommend a lightweight schema.

**Severity:** fail if <4 components present, warn if 4–6.

**Finding format:**
```
./CLAUDE.md — schema doc missing components: {list}
Reasoning: {what specifically is missing and how it affects ingest/query — e.g., "no naming convention defined → meeting files named inconsistently across folders, search by name fails"}
Action: add the missing components (link to existing docs if they live elsewhere)
Citation: karpathy-llm-wiki.md → Schema doc structure
```

**Auto-fix:** none.

---

## F2.2 — Dead wikilinks

**Framework rule:** a dead link is a lint failure.

**Trigger heuristic:** for every `[[target]]` (regex `\[\[([^\]|#]+)(?:\|[^\]]+)?\]\]`), strip section anchors and aliases, lookup in `vault_filename_index`. If absent → candidate.

**Agent judgment:** for each dead candidate:
- Read the line around it. Is the link a real reference, or is it inside a code fence showing off wikilink syntax? Skip the syntax demos.
- Compute the top-3 closest filenames by Levenshtein.
- Read the candidate target files briefly. Pick the best repoint by reasoning about what the surrounding line actually means.
- If nothing repoints well → recommend "remove link, keep text".
- Reasoning: why this repoint over the others.

**False positives to skip:**
- Wikilinks inside code fences or inline code (syntax demonstrations).
- Wikilinks to external systems (`[[external://something]]` patterns).

**Severity:** warn.

**Finding format:**
```
{file}:{line} — dead wikilink [[{target}]]
Excerpt: "{line content}"
Reasoning: {why the suggested repoint is the right one — what the surrounding sentence is referring to}
Closest matches: {top-3}
Action: (a) repoint to [[{best-match}]] OR (b) remove link, keep text
Citation: karpathy-llm-wiki.md → Lint catches dead links
```

**Auto-fix:** **fixable** with user confirmation per finding.

---

## F2.3 — Orphan pages

**Framework rule:** every wiki page needs ≥1 inbound link.

**Trigger heuristic:** files where `inbound_link_index[file] == 0`.

**Agent judgment:** for each orphan candidate:
- Is it orphaned on purpose? (Date-indexed daily, profile root, archive, transcripts.) The pass file lists the known intentional-orphan patterns. The agent confirms by reading the file's role and content.
- If it really is unreachable, what should happen? Options:
  - Link it from a parent/index note (which one?)
  - Move it to archive (is the content stale?)
  - Delete it (is the content redundant?)
- Reasoning picks the right action by reading the file's content.

**Intentional orphans** (skipped from findings):
- `Daily/*.md`, `**/*\d{4}-\d{2}-\d{2}\.md`
- `**/index.md`, `**/README.md`, `**/CLAUDE.md`, `**/MEMORY.md`
- Files in `Intelligence/archive/`
- Profile root files (`Team/*/Profiles/*/{Name}.md`)

**Severity:** warn.

**Finding format:**
```
{path} — orphan (no inbound wikilinks)
Reasoning: {what the file contains and why it should be reachable — e.g., "this captures the X decision but no other note links to it; it'd be lost if anyone looked for X-related context"}
Action: {specific recommendation: "link from {index file}", "move to archive", or "delete"}
```

**Auto-fix:** none.

---

## F2.4 — Missing cross-references

**Framework rule:** an entity name shows up as plain text while a file with that name exists → it should be a `[[wikilink]]`.

**Trigger heuristic:** for each entity-shaped filename (multiword, PascalCase, or with capitals; skip generics like `notes`, `index`, `readme`), search the vault for plain-text occurrences NOT inside `[[...]]`, `[...](...)`, code fences, or inline code.

**Agent judgment:** for each plain-text occurrence:
- Read the full sentence. Is the name used as the entity (pointing at the wiki page) or just in passing or in quoted speech?
- "Stripe" in "Set up Stripe webhook" → entity reference, link it.
- "Stripe" in "We're not using Stripe anymore" → still an entity reference, link it.
- "Stripe" inside a quoted message from a user → judgment call. If the quote is about the same Stripe entity, link it. If it is word-coincidence, skip.
- Reasoning states why this exact occurrence should or should not be linked.

**False positives to skip:**
- Headings (the heading itself usually should not be a wikilink).
- Frontmatter values.
- The file that IS the entity's page (do not link a file to itself).
- Generic word matches (skip filenames < 4 chars, skip ambiguous single words).

**Severity:** warn.

**Finding format:**
```
{file}:{line} — entity "{name}" appears as plain text; {target}.md exists
Excerpt: "{surrounding sentence}"
Reasoning: {why this specific occurrence is an entity reference, not a generic word}
Action: convert to [[{name}]]
Citation: karpathy-llm-wiki.md → Missing cross-references
```

**Auto-fix:** **fixable on user opt-in**, per-occurrence (don't bulk-replace; some occurrences are intentional plain text).

---

## F2.5 — Same-role duplicates

**Framework rule:** two pages both claiming to be the canonical record for one entity is a lint failure.

**Trigger heuristic:** filename clusters in `Context/` (voice/brand/tone, icp/customer-profile/audience, services/offers/products, me/profile/operator, strategy/goals/okrs, team/org). Plus pairs in any folder where Levenshtein ≤3 between basenames.

**Agent judgment:** for each candidate pair, **read both files**.
- Do they actually overlap, or do they cover different angles? For example `voice.md` = how we sound, `brand.md` = visual identity plus voice plus values.
- Find which sections overlap. Reasoning cites the overlapping sections by heading.
- If they complement each other → recommend differentiating by frontmatter scope or renaming to disambiguate.
- If they overlap → recommend consolidation. Pick the canonical filename by reasoning about which name is more conventional and more linked.

**False positives to skip:**
- Files where one is a current draft and the other is archived (read frontmatter `status:`).
- Pairs where one file is clearly a parent index and the other is a leaf.

**Severity:** warn.

**Finding format:**
```
Potential overlap in {folder}/:
  - {path1} ({bytes-a}B)
  - {path2} ({bytes-b}B)
Reasoning: {what the overlap is — name 2-3 sections present in both, paraphrase what they say in each}
Action: {specific: "consolidate into {chosen-canonical}.md" OR "differentiate by adding scope: {field} to frontmatter" OR "rename {path2} to {disambiguated-name}.md"}
```

**Auto-fix:** none.

---

## F2.6 — Schema non-compliance (routing)

**Framework rule:** the schema doc sets the folder routing. Files that break it are lint failures.

**Trigger heuristic:**
1. Read root CLAUDE.md, extract routing/knowledge-routing table.
2. List every top-level entry (folder, file).
3. Vault-root files that aren't `CLAUDE.md`/`README.md`/`MEMORY.md`/`index.md` → candidate.
4. Top-level folders not in routing table → candidate.

**Agent judgment:**
- For each vault-root file: read it. Decide whether it is misplaced (move it where?) or legitimate (rare; recommend adding it to the allowed exceptions list).
- For each unmapped folder: read its content. Decide whether to expand the routing table or relocate the folder's contents.
- Reasoning names the right destination for each non-compliant item.

**False positives to skip:**
- `LICENSE.md`, `CHANGELOG.md`, `CONTRIBUTING.md`: conventional repo-root files.
- `.github/`, `.vscode/`, `.cursor/`, `.claude/`: tooling folders.

**Severity:**
- vault-root file violation → fail
- unmapped folder → warn
- no routing table → fail (one finding total)

**Finding format (vault-root file):**
```
./{filename} — file in vault root
Reasoning: {what the file contains and where it belongs per the routing table}
Action: move to {specific folder}, or delete if obsolete
```

**Finding format (unmapped folder):**
```
./{folder}/ — top-level folder not in routing
Reasoning: {what the folder holds and how it relates to mapped folders}
Action: add to routing table OR relocate contents to {specific mapped folder}
```

**Finding format (no routing table):**
```
./CLAUDE.md — no routing table found
Reasoning: without a routing table, the wiki schema is unenforceable; new content drifts into ad-hoc folders
Action: add a routing table that maps every top-level folder to a content type
```

**Auto-fix:** none.

---

## F2.7 — Stub notes

**Framework rule:** undigested or empty notes pollute the wiki.

**Trigger heuristic:**
- byte size < 200 after stripping frontmatter (hard stub)
- Body matches: just an H1, just frontmatter, or only `TODO`, `WIP`, `Coming soon`, `Placeholder`, `Lorem ipsum`, `Draft`, `xxx`.

**Agent judgment:**
- For each candidate, read the file. Is it a one-line index on purpose (say `Resources/quick-links.md` with three bullets)? → not a stub.
- Is it a real stub, a file created but never filled in? → flag.
- Reasoning judges whether the file is salvageable (fill it in), redundant (delete), or in-progress (move to drafts/).

**False positives to skip:**
- Onboarding/templates/ files (templates by design).
- Index/README files that legitimately route in 1 line.
- Files explicitly marked `status: draft` in frontmatter (already known WIP).

**Severity:** warn.

**Finding format:**
```
{path} — stub ({bytes}B, {n} content lines)
Excerpt: "{first 80 chars}"
Reasoning: {what the file appears to be aiming at, based on filename + any present headings; what the user can recover}
Action: {specific: "fill in: {what's missing}" OR "delete (redundant with {other-file})" OR "move to drafts/"}
```

**Auto-fix:** none.

---

## F2.8 — Undigested sources

**Framework rule:** one ingest usually touches 10–15 wiki pages. A source that produced only a single summary file was not fully digested.

**Trigger heuristic:** for `meeting` and `transcript` files:
1. Extract the source's date.
2. Look at git log (or filesystem mtime if git unavailable) for files modified within ±2 days.
3. Count distinct files modified outside the source's own folder. <3 → candidate.

**Agent judgment:** for each candidate:
- Read the source file. What entities, projects, and decisions does it mention?
- Check whether those entity/project files exist in the vault and got updated near the source's date.
- If the source is short or minor, like a 5-min call → low fan-out is fine. Skip.
- If the source is substantive but nothing downstream moved → flag with reasoning that lists the missed propagations.

**False positives to skip:**
- Source files explicitly marked `processed: true` in frontmatter.
- Trivial sources (very short transcripts).
- Vaults without git history (skip; the agent has no signal).

**Severity:** warn.

**Finding format:**
```
{path} — possibly undigested source
Reasoning: source mentions {entities/projects/decisions} but only {n} downstream files modified near the source date; {specific entity-file} appears to need updating
Action: revisit; update {entity-file-1}, {project-file-2}, etc.
Citation: karpathy-llm-wiki.md → 10–15 page fan-out
```

**Auto-fix:** none.

---

## F2.9 — Raw source modification

**Framework rule:** raw sources are immutable.

**Trigger heuristic:** detect raw-source folders (`Raw/`, `Sources/`, `sources/`, `raw-sources/`, `inputs/`). Check git log for non-human commit authors.

**Agent judgment:** for each modified raw source:
- Read the git diff. Was the change content (the LLM rewrote the source) or metadata (the LLM added frontmatter)? Both break the rule, but the reasoning differs.
- Reasoning describes what got modified and why it matters.

**False positives to skip:**
- Vaults without git → skip silently.
- Folders that are *named* `raw` but are not actually source archives.

**Severity:** fail.

**Finding format:**
```
{path} — raw source modified by automated commit
Reasoning: {what was changed and why immutability matters for this source's downstream wiki pages}
Action: revert; raw sources are immutable canon
```

**Auto-fix:** none.

---

## Finding schema

Same shape as F1. Every finding carries a `reasoning` field. See SKILL.md Step 2.4.
