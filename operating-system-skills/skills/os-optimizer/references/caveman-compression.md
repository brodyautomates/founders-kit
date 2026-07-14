<!-- © 2026 Brody Glanville. All rights reserved. The Brody Operating System. -->

# Caveman — compression discipline

## Contents

1. [Core thesis](#core-thesis)
2. [The Brevity Constraints paper](#the-brevity-constraints-paper)
3. [Compression rules — what to strip](#compression-rules--what-to-strip)
4. [Allowed structures](#allowed-structures)
5. [Hard-protected zones — never compress](#hard-protected-zones--never-compress)
6. [Symbol substitution table](#symbol-substitution-table)
7. [Intensity levels](#intensity-levels)
8. [Real benchmark — verbatim](#real-benchmark--verbatim)
9. [Before / after examples](#before--after-examples)
10. [Companion skills](#companion-skills)
11. [Where to apply caveman in a vault](#where-to-apply-caveman-in-a-vault)
12. [Where NOT to apply caveman in a vault](#where-not-to-apply-caveman-in-a-vault)
13. [Dos](#dos)
14. [Don'ts](#donts)
15. [Verbatim quotes](#verbatim-quotes)
16. [Auditable signals](#auditable-signals)
17. [Sources](#sources)

---

## Core thesis

> *"why use many token when few token do trick"*

Cut the fluff, keep the technical accuracy. Token cost stacks up: each article, each "really," each hedge gets paid over and over across thousands of conversations. The fix is simple. Remove anything that doesn't pay for its own tokens.

Across the published benchmark the average cut is **65%**. The range runs **22–87%**. The largest wins land on prose-heavy explanations. The smallest land on code reviews and architecture comparisons, where the structural reasoning is doing the work.

## The Brevity Constraints paper

A March 2026 paper, *"Brevity Constraints Reverse Performance Hierarchies in Language Models,"* reported that brevity constraints raised accuracy by **+26 percentage points** on certain benchmarks. Here is the mechanism: when the model is forced to be brief, it has to find the load-bearing claim and put it on the surface rather than hiding it under a pile of qualifications.

That gives caveman academic footing. Brevity saves tokens, and it also raises quality.

## Compression rules — what to strip

### Articles
Cut "a," "an," "the" anywhere the meaning survives.

✅ Strip: *"the README"* → *"README"*
✅ Strip: *"a function that returns"* → *"function returns"*
❌ Keep when meaning shifts: *"the API"* (specific) vs *"an API"* (any)

### Filler
- "just"
- "really"
- "basically"
- "simply"
- "please"
- "actually"
- "definitely"
- "literally"

These carry zero information. Strip them every time.

### Pleasantries
- "Sure!"
- "I'd be happy to..."
- "Let me explain..."
- "Great question!"
- "Thanks for asking..."
- Closing "Hope that helps!" / "Let me know if..."
- Throat-clearing apologies ("Sorry for the confusion...")

### Hedging
- "I think"
- "I believe"
- "I guess"
- "maybe"
- "perhaps"
- "might be"
- "could be"
- "kind of"
- "sort of"
- "in a way"

Give the imperative instead. *"I think you should run npm test"* → *"Run `npm test`"*.

### Throat-clearing preambles
- "Before we dive in..."
- "First, let me explain..."
- "It's worth noting..."
- "Let's start by..."

Say the thing.

### Verbose connectors
- "in order to" → "to"
- "due to the fact that" → "because"
- "at this point in time" → "now"
- "in the event that" → "if"
- "with regards to" → "for" / "on"

## Allowed structures

- **Fragments are good.** "Node by node." "In real time." A single-thought line lands hardest.
- **Pattern:** `[thing] [action] [reason]. [next step].`
  - Example: *"Add `withAuth()`. Wraps handler in JWT check. Then redeploy."*
- **Imperatives over conditionals.** "Run X" beats "You might want to run X."
- **Routing tables over prose.** Once you have ≥3 categorical mappings, move to a markdown table.

## Hard-protected zones — never compress

Compressing these breaks them:

| Zone | Why |
|---|---|
| **Code blocks** (` ``` ` fences) | Whitespace/syntax matter |
| **URLs** | Single character change = broken link |
| **File paths** | Path resolution is exact |
| **Commands and version numbers** | `npm@9.5.1` ≠ `npm 9.5` |
| **Headings** | Anchor links break |
| **Dates** | `2026-04-30` is canonical |
| **Frontmatter keys** (YAML) | Schema-validated downstream |
| **Inline code** (` `code` `) | Same as code blocks |
| **Wikilinks** `[[Target]]` | Filename matching is exact |
| **Markdown table delimiters** | Structural |
| **Identifier names** | API contracts |

Simple test: if a tool reads it, leave it alone. If a human reads it, compress it.

## Symbol substitution table

Where the context makes it unambiguous, swap verbose connectors for symbols. **Use sparingly.** Prose stuffed with symbols stops being readable to humans.

| Verbose | Symbol | When safe |
|---|---|---|
| "leads to" / "results in" / "produces" | `→` | Cause/effect chains, routing tables |
| "and" | `&` | Compound subjects/objects, never as conjunction in prose |
| "or" | `\|` | Alternatives in tables/options |
| "approximately" / "about" | `~` | Numeric estimates |
| "less than" / "greater than" | `<` / `>` | Numeric thresholds |
| "equals" | `=` | Definitions/assignments |
| "increase" / "decrease" | `↑` / `↓` | Trend tables |
| "implies" / "therefore" | `⇒` / `∴` | Logical chains (rare in vault content) |

## Intensity levels

| Level | Trigger (in caveman repo) | Approach | When to use |
|---|---|---|---|
| **Lite** | `/caveman lite` | Drop filler, preserve grammar | Customer-facing docs that still need to read smoothly |
| **Full** *(default)* | `/caveman full` | Strip articles, fragments OK, full caveman | Internal CLAUDE.md, instruction files, `references/*.md` |
| **Ultra** | `/caveman ultra` | Telegraphic; aggressive abbreviation | Token-budget-critical contexts; expert audience only |
| **文言文 (wenyan)** | `/caveman wenyan` | Classical Chinese literary compression | Same philosophy, different language |

On a normal vault audit, run **Full** as the default. Save Lite for the human-facing surface docs.

## Real benchmark — verbatim

| Task | Normal tokens | Caveman tokens | Savings |
|---|---|---|---|
| Explain React re-render bug | 1,180 | 159 | **87%** |
| Set up PostgreSQL connection pool | 2,347 | 380 | **84%** |
| Fix auth middleware token expiry | 704 | 121 | **83%** |
| Debug PostgreSQL race condition | 1,200 | 232 | **81%** |
| Docker multi-stage build | 1,042 | 290 | **72%** |
| Explain git rebase vs merge | 702 | 292 | **58%** |
| Review PR for security issues | 678 | 398 | **41%** |
| Architecture: microservices vs monolith | 446 | 310 | **30%** |
| Refactor callback to async/await | 387 | 301 | **22%** |

The pattern is clear. Explanation-heavy tasks compress 70–87%. Reasoning-heavy tasks like architecture comparisons and code reviews compress 22–41%, because the structural argument is the payload.

## Before / after examples

### Example 1: React debug

> **Normal (69 tokens):**
> *"The reason your React component is re-rendering is likely because you're creating a new object reference every time the component renders. When you pass an inline object as a prop, React sees a new reference each render and treats it as a prop change."*
>
> **Caveman (19 tokens):**
> *"New object ref each render. Inline object prop = new ref = re-render. Wrap in `useMemo`."*

**73% reduction.** Identical operational value. The fix is easier to find in the second version.

### Example 2: CLAUDE.md instruction (vault-relevant)

> **Normal (38 tokens):**
> *"It's generally a good idea to make sure you always run the test suite before committing any changes, especially if you've modified files in the API directory."*
>
> **Caveman (14 tokens):**
> *"Run `npm test` before commit. Required for `src/api/**` changes."*

**63% reduction.** The soft "generally a good idea" turned into a hard imperative, and Anthropic's research says that alone moves compliance from 35% → 89%.

### Example 3: routing rule

> **Normal (32 tokens):**
> *"When the user shares a meeting transcript or any kind of meeting note, you should put it in the Intelligence folder under meetings, and pick the right subfolder based on the meeting type."*
>
> **Caveman (16 tokens):**
> *"Meeting → `Intelligence/meetings/{type}/`"*

**50% reduction.** One routing table stands in for a full paragraph.

## Companion skills

The caveman repo ships a few skills that carry the discipline into different layers:

| Skill | What it compresses |
|---|---|
| **caveman-commit** | Git commit messages — terse conventional commits, ≤50 char subject |
| **caveman-review** | PR review comments — one-line per issue (e.g., `L42: 🔴 bug: user null. Add guard.`) |
| **caveman-compress** | Memory files (CLAUDE.md, MEMORY.md) — ~46% input savings, originals preserved |

For vault audits the parallel would be a focused pass that runs caveman across the CLAUDE.md hierarchy. That one is on the roadmap. It is not in v0.

## Where to apply caveman in a vault

✅ **CLAUDE.md hierarchy** — root + per-folder. Highest ROI; loads on every session.
✅ **`.claude/rules/` files** — same logic.
✅ **Skills' SKILL.md frontmatter `description`** — tight 1024-char limit; brevity is mandatory.
✅ **`MEMORY.md` index** — first 200 lines are a per-session tax.
✅ **Routing tables and decision summaries** — easy compression wins.
✅ **Internal documentation** that only the agent reads.

## Where NOT to apply caveman in a vault

❌ **User-facing notes** that humans read for comprehension.
❌ **Meeting transcripts** — preserve speaker voice.
❌ **Daily notes** — natural-language reflection has value as-is.
❌ **Brand voice / writing samples** — voice matters.
❌ **Draft content** that's still being shaped.
❌ **Decision narratives** where the *reasoning chain* is the value.
❌ **Anything in raw sources / immutable canon.**
❌ **Code comments** — many tools/teammates rely on them.

The rule of thumb: **compress the agent-facing instruction layer, leave the human-facing knowledge layer alone.**

## Dos

- Strip articles, filler, hedging, and pleasantries from prose in instruction files.
- Use fragments wherever the grammar carries no weight.
- Use imperatives in place of conditionals.
- Use the `[thing] [action] [reason]. [next step].` pattern for procedures.
- Turn prose with ≥3 categorical mappings into a routing table.
- Use `→` for cause/effect; use `&` for compound subjects only when it stays unambiguous.
- Run Caveman Full on CLAUDE.md and `.claude/rules/`.
- Run Caveman Lite on surface-level docs that still need to read smoothly.
- Re-run compression on a schedule. Drift creeps back.

## Don'ts

- **Never** compress code blocks, URLs, file paths, commands, version numbers, headings, dates, frontmatter, wikilinks, or inline code.
- Don't strip technical terms or identifiers.
- Don't compress reasoning/thinking tokens (these are output, not instruction).
- Don't compress files teammates read by hand for human comprehension.
- Don't push team-shared instruction files to Ultra level. Reviewers need to read them.
- Don't over-symbolize. `→` and `&` are fine. Five symbols per sentence stops being readable.
- Don't compress brand voice docs, writing samples, or transcripts.
- Don't compress raw sources / immutable canon.

## Verbatim quotes

> *"why use many token when few token do trick"*

> *"free like mass mammoth on open plain"* (license)

## Auditable signals

When this skill runs Pass 4 (token estimate) for compression candidates:

- **Filler density**: count occurrences of `\b(just|really|basically|simply|please|actually|definitely|literally)\b` per 100 words. Flag files >2 per 100.
- **Hedging density**: count `\b(I (think|believe|guess)|maybe|perhaps|might be|could be|kind of|sort of)\b` per 100 words. Flag files >1 per 100.
- **Article density** in instruction files (CLAUDE.md, skills): count articles per non-protected sentence. Flag if dramatically higher than peer files.
- **Pleasantry preamble**: detect note tops starting with "Sure!", "I'd be happy to...", "Let me...", "Great question!". Almost always strippable.
- **Verbose connector usage**: detect `\b(in order to|due to the fact that|at this point in time|in the event that|with regards to)\b`. Suggest replacements.
- **Long prose vs routing-table candidates**: detect paragraphs with ≥3 list items that could be a table.
- **Section size in root CLAUDE.md**: identify the 3 largest h2/h3 sections. Estimate Caveman compression at ~25% per section. Surface as Pass 4 reduction targets.
- **Caveman protected-zone violations**: flag if any code block, URL, file path, or wikilink is missing/mangled in a way that suggests over-aggressive compression.

## Sources

- https://github.com/JuliusBrussee/caveman (canonical)
- https://raw.githubusercontent.com/JuliusBrussee/caveman/main/README.md (full README)
- *"Brevity Constraints Reverse Performance Hierarchies in Language Models"* — March 2026 paper cited by the caveman README
