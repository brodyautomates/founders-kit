<!-- © 2026 Brody Automates. All rights reserved. The Brody Operating System. -->

# F4 — Chroma Context Rot (pass implementation)

**Reference (the why):** `references/chroma-context-rot.md`.
**Applies to:** every `.md`. The position checks (F4.3, F4.4) put files that load early at the front of the queue. The distractor check (F4.5) works on auto-load files and same-folder pairs.

## How this pass works

Agentic. Length and position measure out mechanically, but **whether a number is a problem depends on the file's job and what is inside it**. A 200KB transcript is expected. A 200KB CLAUDE.md is a wreck. A warm-up paragraph in a daily journal reads as normal. The same paragraph in a routing index means a rule got buried. The agent reads each candidate and writes reasoning that tells those two cases apart.

Look at F1's intro for the full trigger, then judgment, then reasoning pattern.

## Contents

1. [F4.1 — File length distribution](#f41--file-length-distribution)
2. [F4.2 — Loaded-context-size budget](#f42--loaded-context-size-budget)
3. [F4.3 — Critical-info position](#f43--critical-info-position)
4. [F4.4 — Lead-in preamble](#f44--lead-in-preamble)
5. [F4.5 — Distractor density / similar-topic pairs](#f45--distractor-density--similar-topic-pairs)
6. [F4.6 — Top-of-file callout](#f46--top-of-file-callout)
7. [F4.7 — Daily file size](#f47--daily-file-size)
8. [Finding schema](#finding-schema)

---

## F4.1 — File length distribution

**Framework rule:** longer files degrade more, and the outliers pull attention away from everything else like distractors.

**Trigger heuristic:** compute project-median byte size. Files > median × 5 → candidate.

**Agent judgment:** for each candidate, read the file (or skim if huge):
- Is it long on purpose (transcripts, reference docs, course content)? → it may be fine. Still flag it if it gets pulled into auto-context.
- Is it bloated because several unrelated topics share one file? → strong flag. Recommend a split with specific section breakpoints.
- Reasoning describes the file's structure and either backs a split or states why the length is legitimate.

**False positives to skip:**
- Files inside `*transcript*/`, `*archive*/` where length is expected.

**Severity:**
- > median × 10 → fail
- > median × 5 → warn

**Finding format:**
```
{path} — {KB}KB ({Nx} project median)
Reasoning: {what's actually in the file — number of H2 sections, range of topics; whether it's one topic at length vs many topics jammed together}
Action: {specific: "split at {section breakpoints}" OR "leave as-is — legitimately long for {reason}"}
```

**Auto-fix:** none.

---

## F4.2 — Loaded-context-size budget

**Framework rule:** auto-load context is a fixed attention budget. Soft target sits around 3K tokens.

**Trigger heuristic:** sum bytes of root CLAUDE.md (the only auto-load file per Anthropic rule 13; folder CLAUDE.mds load on demand). Tokens ≈ bytes/4. Compare to 3,000 token budget.

**Agent judgment:** if the file is over budget, read the root CLAUDE.md and work out:
- Which sections are just noise (they could move to references/, .claude/rules/, or skills)?
- Which sections earn their place in every session, and which are niche?
- Reasoning names the exact section headings that should move and where they go.

**False positives to skip:**
- Vaults where the user has deliberately chosen a heavy auto-load (rare; ask if there is a stated preference).

**Severity:**
- > 6,000 tokens → fail
- > 3,000 tokens → warn

**Finding format:**
```
Auto-load context = {tokens}t (root CLAUDE.md = {bytes}B)
Reasoning: {names of sections that could move and where} — together those would save ~{est}t
Action: extract {section-A} → references/, {section-B} → .claude/rules/{topic}.md with paths: scope
Citation: chroma-context-rot.md → Loaded context size
```

**Auto-fix:** none.

---

## F4.3 — Critical-info position

**Framework rule:** unique words placed early get read with higher accuracy. Rules buried deep get skipped.

**Trigger heuristic:** for `root-claude`, `folder-claude`, `index`, `readme`, scan all lines and tag any that look load-bearing (imperatives at line start, routing-table rows, callouts, `IMPORTANT:` markers). For each load-bearing line past the 30% mark → candidate.

**Agent judgment:** read the file structure:
- Is the buried rule genuinely critical? Some imperatives like "Save the report" are operational but low-stakes. Do not over-flag.
- Is the file even long enough for "30%" to mean anything? In a 50-line file, line 20 is not really buried.
- Reasoning names the specific buried rule and states what is sitting at the top in its place.

**False positives to skip:**
- Files where the top is deliberately a frontmatter plus summary callout, with the rules right below it.
- Files <30 lines where position carries less weight.

**Severity:** warn.

**Finding format:**
```
{path} — {n} load-bearing rules buried past 30%
Examples:
  L{line} ({pct}% in): "{excerpt}"
Reasoning: {what the top of the file currently contains, and why the buried rule deserves higher placement}
Action: move {specific rules} to the top; demote {currently-top section} below
```

**Auto-fix:** none.

---

## F4.4 — Lead-in preamble

**Framework rule:** open with the rule, save the rationale for after.

**Trigger heuristic:** read first 30 lines (excluding frontmatter and H1). Detect preamble patterns:
```
\b(This document explains|In this guide|Welcome to|The purpose of this|Below you will find|We will cover|This file describes|Overview of)\b
```
If present and no imperative/routing table appears before line 20 → candidate.

**Agent judgment:** read the top 30 lines.
- Is the preamble setting up needed context, like naming the file's scope? → it may be fine at low severity.
- Is the preamble pure throat-clearing? → flag.
- Reasoning states what the preamble currently says and what should sit there instead.

**False positives to skip:**
- Files where the preamble is a one-line scope summary followed straight away by load-bearing content.

**Severity:** warn.

**Finding format:**
```
{path} — preamble before any load-bearing content
Excerpt: "{first 100 chars}…"
Reasoning: {what the preamble adds — likely nothing operational; what's actually load-bearing further down}
Action: lead with {specific lower section}; move preamble below or delete
```

**Auto-fix:** none.

---

## F4.5 — Distractor density / similar-topic pairs

**Framework rule:** similar files in the same load path distract each other (the "shuffled > structured" finding).

**Trigger heuristic:** for pairs of files in the same folder where Levenshtein ≤4 between basenames AND vocabulary Jaccard >0.4 (after stopword removal, drop protected zones).

**Agent judgment:** for each candidate pair, read both files briefly:
- Do they truly overlap on topic, or do they just share generic vocabulary because they are both notes?
- If they always load together (say both are referenced from the same CLAUDE.md), the distractor effect is real → flag with reasoning.
- If they load on their own through different routing paths, the distractor risk is lower → flag at lower severity or skip.

**False positives to skip:**
- Pairs where one file is clearly an index of the other.
- Pairs already separated by frontmatter scope.

**Severity:** warn.

**Finding format:**
```
Distractor pair in {folder}/:
  - {path1}
  - {path2}
Reasoning: vocabulary overlap = {jaccard}; both files are referenced from {load path}, so they load together; specific overlapping content: {section names}
Action: consolidate, differentiate vocabulary explicitly, or split load paths (move one to .claude/rules/{topic}.md with paths: scope)
```

**Auto-fix:** none.

---

## F4.6 — Top-of-file callout

**Framework rule:** critical decisions read better with a `> [!type]` callout near the top.

**Trigger heuristic:** for files classified as `decision` OR containing `decision`/`rule`/`policy` in H1 or frontmatter, check first 30 lines for `^>\s*\[!(important|warning|note|info|tip|caution)\]`.

**Agent judgment:** for each candidate that has no callout:
- Read the file. Find the load-bearing claim. Is there one sentence that captures the decision or rule?
- Reasoning gives that sentence as a suggested callout body.

**False positives to skip:**
- Files that already open with an H1 plus a one-sentence summary. That works as a callout without the syntax.

**Severity:** warn.

**Finding format:**
```
{path} — no top-of-file callout
Reasoning: this is a {decision/rule/policy} file; the load-bearing claim appears to be "{one-sentence summary the agent extracts}"
Action: add `> [!important]\n> {summary}` at the top
```

**Auto-fix:** none.

---

## F4.7 — Daily file size

**Framework rule:** a focused 300-token prompt beats a full 113K context. Daily bloat is a known anti-pattern.

**Trigger heuristic:** every `daily` file. Tokens ≈ bytes/4. Soft budget 2,000 tokens.

**Agent judgment:** for each candidate over budget, read the file:
- What is bloating it? Pasted conversation history? Long meeting transcripts? Action items that belong somewhere else?
- Reasoning names the bloat source and points to where it should live.

**False positives to skip:**
- Daily entries that record one substantial event, like a major decision written up in detail. Flag at low severity.

**Severity:**
- > 4,000 tokens → fail
- > 2,000 tokens → warn

**Finding format:**
```
{path} — daily note {tokens}t (>{budget}t)
Reasoning: {what's bloating it — pasted X, transcript of Y, etc.}
Action: extract {specific content type} to {specific destination} (e.g., decisions to Intelligence/decisions/, meeting transcripts to Intelligence/meetings/)
```

**Auto-fix:** none.

---

## Finding schema

Same shape as F1. Every finding carries a `reasoning` field. See SKILL.md Step 2.4.
