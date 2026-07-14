<!-- © 2026 Brody Automates. All rights reserved. The Brody Operating System. -->

# F9 — Architecture & Discoverability (the why)

**Source:** practitioner field notes from operators running second brains under co-worker Claude. Not from a single canonical framework — distilled from where F1–G7 + F8 still leave gaps.

## Core thesis

Per-file lint can't tell you whether the **vault as a whole orients a fresh agent**. F1 audits the content quality of a CLAUDE.md. F2 audits wikilink integrity. F8 audits semantic synthesis. None of them walks the route a co-worker Claude actually takes:

> root `CLAUDE.md` → routing entry → folder index file (whatever the user's convention is) → file

Break any link in that chain, whether it's wrong, stale, or missing, and the agent never reaches the file, even when the file itself is written perfectly. F9 walks the chain from end to end and surfaces every break.

**F9 never assumes folder names — and never ignores folders that don't fit a standard pattern.** The Step 1.5 role-discovery pass classifies every folder. Standard roles (identity, context, projects, decisions, daily, meetings, transcripts, resources, skills, archive) are the patterns the agent recognizes. Anything outside those becomes a **custom role** — `Building/`, `Garden/`, `Inbox/`, `Sandbox/`, `Lab/`, whatever the user keeps — with an inferred *layer* (curated / session / archive / meta / unknown) and a one-line purpose. Both kinds take part in F9 fully: routing-table truthfulness checks coverage for every folder; folder-index enforcement runs on every non-trivial folder; the discoverability walk covers every folder no matter its role membership; reorg proposals reach across the whole vault.

F9.0 sorts structural needs into three tiers by how hard the agent pushes for action:

1. **Functional gaps** (severity: fail) — the optimizer's own job is at risk. The agent can't find any operator or identity context; the root has no routing of any shape; a custom role's layer won't classify. Form-agnostic: identity in CLAUDE.md frontmatter is fine, routing as agent prose is fine.
2. **Functional improvements** (severity: warn) — the agent has *judged that adopting a Brody Operating System convention would meaningfully improve this specific vault* given its current state, with reasoning tied to the case. ("You have 14 work-shaped notes scattered across 6 folders with no clear hub; centralizing them under a `Projects/` (or equivalent) folder would make project status discoverable in one hop.") If the user's existing structure already fills the function, say a custom `Lab/` folder already plays the projects role, no tier-2 finding fires.
3. **Inspiration** (severity: info, default decline) — the Brody Operating System standard taxonomy shown as a single info-level reference. The user picks whichever pieces fit how they work; the rest persist as declined and don't re-prompt.

The optimizer's stance on the Brody Operating System taxonomy: tested, useful, optional. The agent uses it as a recognition lens (Step 1.5 standard roles) and as a source of tier-2 recommendations *when concrete evidence shows it would help this vault*. Never as a target shape the user has to conform to. Custom roles the user already keeps are first-class: never ignored, never demoted.

Nothing the user has gets ignored for failing to match a pattern. Nothing gets prescribed just because the Brody Operating System uses it.

## What F9 catches that F1–F8 cannot

| Concern | Why F1–F8 miss it | F9 closes the gap |
|---|---|---|
| Routing entry points to a folder that no longer exists | F2.6 only checks the table is present and top-level folders are mapped | F9.1 verifies every routing entry's path resolves |
| Routing description claims `Projects/` holds X but it actually holds Y | No framework reads folder contents to compare against the description | F9.1 reads 3–5 sample files per folder and judges alignment |
| Folder has no folder-index file | Nothing checks per-folder index presence | F9.2 enforces the discovered convention per non-trivial folder; F9.0 proposes adopting one if no convention exists yet |
| Folder index exists but lists files that no longer exist or omits new files | No drift detection between index and reality | F9.2 diffs the index's children vs `ls` output |
| File is reachable by wikilink but not by navigation | F2.3 orphans use wikilinks, not the routing chain | F9.3 simulates the navigation walk and orphans by hop count |
| File is in the wrong folder despite passing F2.6 (technically valid, conceptually wrong) | F2.6 is structural; this is semantic | F9.4 reads file vs parent folder purpose and judges |
| Two folders are doing the same job under different names | No cross-folder semantic comparison | F9.5 compares stated purposes across folders |
| The vault could be reorganized for clarity but no individual rule is broken | All frameworks are atomic checks | F9.6 proposes 1–3 high-impact structural changes with reasoning |
| The root `CLAUDE.md` looks fine but a fresh agent can't actually orient from it | F1 is a content-quality lint, not a fitness test | F9.7 reads Context/ first, builds vault-specific orientation questions, then tries to answer them cold from CLAUDE.md |

## Operating principles

- **Walk the chain co-worker Claude walks.** F9 simulates the real discovery path; a failure of *that* path is a finding, whatever the state of wikilink integrity.
- **Every finding ships a concrete fix.** No flag-only. No warnings left sitting as warnings. When the user runs the optimizer in apply-mode, every F9 finding turns into either an applied edit or a saved migration step in the dated reorg plan, never deferred without end.
- **Vault-specific orientation, not generic.** F9.7 builds its orientation questions from the user's discovered identity and context roles (whatever folders or files play those parts in *this* vault), aimed at what *this* user's vault should orient an agent toward. A founder's vault orients differently from a researcher's.
- **Two modes for every fix:** *apply now* (walk and confirm each step in this run) or *save to plan* (write to the discovered decisions-equivalent folder for staged execution; falls back to `audits/` at vault root if no decisions role exists, with an F9.0 finding to formalize one). The user picks per item. Both modes commit the user to follow-through; neither lets a finding linger as flag-only.
- **Folder-index convention is discovered.** A lightweight markdown file under whatever name the user already uses (`README.md`, `Plot.md`, `index.md`, etc.): one-line folder purpose, list of children with a one-line description each, updated timestamp. Auto-generated when missing; auto-regenerated when stale; the user confirms the wording per folder.
- **Missing roles are findings, not silent assumptions.** No identity? No context? No decisions folder? F9.0 surfaces each gap with a concrete adoption proposal. The user can accept, decline (recorded as an explicit decision), or ask the agent to assign the role to an existing folder that already plays that part informally.
- **Never edit a CLAUDE.md without per-item user approval.** F9.1 routing rewrites and F9.7 orientation additions both walk per-section.

## Why this couldn't be a regex pass

Every F9 check needs the agent to:
1. **Read the structure** (folders, files, what sits inside each).
2. **Read the user's stated intent** (CLAUDE.md routing, folder Plot.md purposes, Context/ for personal context).
3. **Reason about alignment** between (1) and (2).
4. **Propose a concrete change** that closes the gap.

A regex can spot a missing path. Only an agent can decide whether the description matches reality, whether two folders are doing the same work, or whether the orientation chain actually orients.
