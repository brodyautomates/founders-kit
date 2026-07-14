<!-- © 2026 Brody Glanville. All rights reserved. The Brody Operating System. -->

# Anthropic — Managed Agents Memory (April 2026)

## Contents

1. [Core thesis](#core-thesis)
2. [Why this validates the file-based vault](#why-this-validates-the-file-based-vault)
3. [Architecture facts](#architecture-facts)
4. [Hard rules](#hard-rules)
5. [Versioning and audit trail](#versioning-and-audit-trail)
6. [Concurrency model](#concurrency-model)
7. [Where memory excels](#where-memory-excels)
8. [Where memory does NOT replace vector search](#where-memory-does-not-replace-vector-search)
9. [Reported early-adopter results](#reported-early-adopter-results)
10. [File-naming and structure guidance](#file-naming-and-structure-guidance)
11. [Dos](#dos)
12. [Don'ts](#donts)
13. [Verbatim quotes](#verbatim-quotes)
14. [Auditable signals](#auditable-signals)
15. [Sources](#sources)

---

## Core thesis

In Anthropic's Managed Agents, memory mounts as **a real filesystem at `/mnt/memory/`**. Claude reads and writes it with **the same bash and file tools it already uses for everything else** — `cat`, `ls`, `Read`, `Write`. There's no new paradigm, no embedding model, no retrieval infrastructure to stand up.

> *"Files, not vectors. Claude reads and writes memory with the same bash and file tools it uses for everything else — no new paradigm, no embedding model, no retrieval infrastructure."*

This ships the same principle that sits under Karpathy's LLM Wiki and under every second-brain pattern that actually works: **markdown files in folders, navigated by name and structure, are the right substrate for agent knowledge that compounds.**

## Why this validates the file-based vault

For two years everyone assumed production agent memory meant vector embeddings, RAG pipelines, and chunking strategies. Then in April 2026 Anthropic shipped the opposite.

Here is the bet underneath it:

- **Compounding knowledge** (preferences, learnings, task history, structured patterns) is best served by named files an agent walks to on purpose.
- **Similarity search across thousands of entries** still wants vector stores, but that's a separate problem from memory.
- **Files are debuggable.** A person can open `/mnt/memory/preferences.md` and see exactly what the agent will see. Embeddings give you nothing like that.
- **Files are versionable** with standard tooling (git, diff, audit logs).

If you run an Obsidian-based vault alongside Claude Code, this is about as strong a signal as you get that the architecture is right. The lab that builds the model reached for files too.

## Architecture facts

| Fact | Value |
|---|---|
| Mount path | `/mnt/memory/` |
| Per-file size limit | **100KB (~25K tokens)** |
| Recommended per-file size | **<10KB** |
| Beta header | `managed-agents-2026-04-01` |
| Required toolset | `agent_toolset_20260401` |
| Total store cap | **No documented cap** in public beta |
| File-count cap | **No documented cap** in public beta |
| Attach lifecycle | Memory attaches at session creation only, via `resources` array |
| Cross-session | Workspace-scoped, not session-scoped — multiple agents can attach simultaneously |
| Concurrent access modes | Read-only and read-write supported in same session pool |
| Launch | April 23, 2026 (public beta) |

## Hard rules

| # | Rule | Auditable in vault context |
|---|---|---|
| 1 | Per-file size limit: 100KB / ~25K tokens | ✅ Pass 1 (size) |
| 2 | Recommended per-file size: <10KB | ✅ Pass 1 (split candidate) |
| 3 | Memory attaches **only at session creation** — cannot add mid-session | — |
| 4 | Concurrent writes: **last-write-wins** by default | — |
| 5 | Production should use `content_sha256` precondition checks | — |
| 6 | Every write produces an immutable named version (`memver_…`) | — |
| 7 | All changes surface as Console events (audit trail) | — |
| 8 | Multiple focused files > one mega-file | ✅ Pass 1 / Pass 9 |

## Versioning and audit trail

Each write to a memory file mints an **immutable named version** (`memver_…`). That buys you:

- **Audit trail** — who or what wrote what, and when
- **Point-in-time recovery** — roll back to any earlier version
- **Redaction without breaking the chain** — mark a version redacted while every version after it stays intact

It's the same pattern git gives you for code. Anthropic modeled memory on version-controlled file systems on purpose.

For vault analogues: an Obsidian vault kept under git or Relay sync gets the same properties. The vault audit doesn't enforce versioning (that belongs to the sync layer) but it flags a vault that is *not* under version control.

## Concurrency model

Memory is **workspace-scoped**, not session-scoped. Many agents can attach to the same memory store at once.

| Mode | When to use |
|---|---|
| **Read-only** | Sub-agents that only need context, never modify |
| **Read-write** | Primary agents that update memory after task completion |

The default way conflicts resolve is **last-write-wins**. In production:

```python
client.memory.create(
    name="preferences.md",
    content=new_content,
    parent="memver_abc123"  # explicit parent version
)
# OR
client.memory.create(
    name="preferences.md",
    content=new_content,
    content_sha256=expected_sha  # optimistic concurrency
)
```

Leave those guards off and two concurrent writes can quietly clobber each other.

## Where memory excels

✅ **Structured preferences** — user style, communication tone, recurring patterns
✅ **Task history** — what was done, when, with what outcome
✅ **Constants** — API keys (encrypted), endpoint URLs, dataset paths
✅ **Learning over time** — corrections accumulate, agent gets better
✅ **Cross-session consistency** — same agent feels coherent across days
✅ **Auditable knowledge** — humans can inspect what the agent "remembers"

This is precisely the kind of content that lives in a CLAUDE.md, a per-team profile, or an `Intelligence/decisions/` log.

## Where memory does NOT replace vector search

❌ **Similarity search across thousands of entries.** "Find me all customer complaints similar to this one" wants embeddings, not a file lookup.
❌ **Fuzzy semantic queries** over large corpora. Files navigate by name and folder, not by meaning.
❌ **Cross-document concept extraction** at scale. RAG pipelines still take this one.
❌ **Real-time analytical queries.** Memory is not a database.

That's the reason hybrid stacks exist. Markdown for narrative, Postgres for entities, pgvector for similarity: that's the production pattern. Memory covers *the narrative and preference layer*, not the analytical one.

## Reported early-adopter results

Anthropic's launch post and the follow-up coverage named:

- **Netflix**
- **Rakuten**
- **Wisedocs**
- **Ando**

Reported outcomes on document verification workflows:
- *"97 percent reduction in first-pass errors"*
- *"30 percent speed increase"*

Source: launch post, summarized by buildfastwithai.com, SDTimes, EdTech Innovation Hub, Techzine, DataCenter Knowledge.

> Caveat: the original Anthropic blog post was not directly fetchable at audit time. The 100KB / 25K-token / `/mnt/memory/` figures are widely reported and consistent across the secondary sources but should be verified against the canonical Anthropic announcement when accessible.

## File-naming and structure guidance

Names carry weight because the agent finds things by name. From the launch guidance:

✅ **Good names:**
- `preferences.md`
- `failed-payment-recovery-log-2026-04-25.md`
- `client-onboarding-checklist.md`
- `voice-tone-rules.md`
- `task-history-2026-q1.md`

❌ **Bad names:**
- `notes.md`
- `notes-2.md`
- `temp.md`
- `untitled.md`
- `file-1.md`

The same rule holds for vault files: descriptive, dated where it helps, and no ambiguous numbering.

### Recommended structure

```
/mnt/memory/
├── INDEX.md              # what's where (~equivalent of MEMORY.md)
├── preferences.md        # user preferences
├── tone-rules.md
├── task-history/
│   ├── 2026-q1.md
│   └── 2026-q2.md
├── projects/
│   ├── alpha.md
│   └── beta.md
└── learnings.md          # corrections accumulated over time
```

In a vault the same pattern shows up with vault-flavored names: `Context/`, `Team/`, `Projects/`, plus a top-level routing CLAUDE.md.

## Dos

- Split memory into focused files; keep each under 10KB.
- Give files descriptive names the agent can find by name (not `notes-2.md`).
- Use `content_sha256` precondition checks in production.
- Treat memory as workspace-shared infrastructure.
- Drop in a top-level index file (`INDEX.md` or `MEMORY.md`) so the agent can navigate.
- Date-stamp filenames for time-sensitive content (logs, reports).
- Handle memory writes like git commits: descriptive, atomic, easy to audit.
- Match the file structure to how a human would organize the same content.

## Don'ts

- Don't cram everything into one file. The 100KB cap is a ceiling, not a target.
- Don't expect vector-style semantic search.
- Don't attach memory mid-session. Attach at creation only.
- Don't trust last-write-wins under concurrency. Use `content_sha256`.
- Don't use ambiguous filenames. The agent navigates by name.
- Don't store transactional or relational data in memory. Use a database.
- Don't store binary blobs or large files. Memory is for structured text.
- Don't skip the index file. Without it the agent doesn't know what's there.

## Verbatim quotes

> *"Files, not vectors. Claude reads and writes memory with the same bash and file tools it uses for everything else — no new paradigm, no embedding model, no retrieval infrastructure."*

> *"Memory on Claude Managed Agents is now in public beta on the Claude Platform, letting agents learn and improve across different sessions."*

## Auditable signals

When this skill runs Pass 1 (size) and Pass 9 (anti-patterns) against memory-style files in a vault:

- **Per-file size**: flag any file > 100KB or > 25K tokens (over the memory-style budget for a single file).
- **Sub-budget**: flag > 10KB as a "split candidate" — past the recommended per-file size.
- **Topic mono-files**: catch single files carrying several unrelated topics. Heuristic: count distinct h2 headers; flag a file with >5 unrelated h2 sections as a split candidate.
- **File-naming descriptiveness**: flag files matching ambiguous patterns: `notes\d*\.md`, `untitled.*\.md`, `temp.*\.md`, `file-\d+\.md`, `new-document.*\.md`.
- **Memory index presence**: in any folder with >5 files, flag the absence of an `index.md`, `INDEX.md`, `MEMORY.md`, or `README.md` to navigate by name.
- **Date-naming consistency**: in folders that should be dated (Daily/, Intelligence/meetings/), flag files that skip the `YYYY-MM-DD` prefix.
- **Versioning**: flag a vault that isn't under git or some sync layer (Relay, etc.). No versioning means no audit trail and no rollback.

## Sources

- https://www.anthropic.com/news/memory (canonical launch post — reachable but didn't return memory content via WebFetch on audit date)
- https://claude.com/blog/memory (redirect target)
- https://www.buildfastwithai.com/blogs/claude-managed-agents-memory-2026 (extracted operational details)
- https://www.testingcatalog.com/anthropic-launches-memory-in-claude-agents-for-enterprise/
- https://sdtimes.com/anthropic/anthropic-adds-memory-to-claude-managed-agents/

> Verification note: when working with this file, prefer fetching the original Anthropic announcement directly to confirm the limits and beta header. Secondary sources are consistent but third-party.
