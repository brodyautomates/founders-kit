<!-- © 2026 Brody Glanville. All rights reserved. The Brody Operating System. -->

# Practitioner field notes

Cross-creator synthesis. These sit alongside the official frameworks rather than overriding them. They are observations from creators running the same setup at scale. Production friction, not theory.

## Contents

1. [camelCase — "Stop Writing Bad CLAUDE.md Files"](#camelcase--stop-writing-bad-claudemd-files-2026-02-04)
2. [Mark Kashef — "Claude Code Turned Obsidian Into My Dream Second Brain"](#mark-kashef--claude-code-turned-obsidian-into-my-dream-second-brain-2026-03-15)
3. [Dave Ebbelaar — "Effective Context Engineering for AI Agents"](#dave-ebbelaar--effective-context-engineering-for-ai-agents-2025-12-19)
4. [Nate B Jones — "Karpathy's Wiki vs. Open Brain"](#nate-b-jones--karpathys-wiki-vs-open-brain-2026-04-22)
5. [Anthropic — "Claude Agent Skills Explained"](#anthropic--claude-agent-skills-explained-2025-11-26)
6. [Developers Digest — "Progressive Disclosure in Claude Code"](#developers-digest--progressive-disclosure-in-claude-code-2026-01-12)
7. [Cross-creator patterns](#cross-creator-patterns)
8. [Auditable signals derived from practitioner notes](#auditable-signals-derived-from-practitioner-notes)

---

## camelCase — "Stop Writing Bad CLAUDE.md Files" *(2026-02-04)*

Source: https://www.youtube.com/watch?v=lJNjDoJi6hQ

### Headline insight

> *"One line of bad code only affects exactly that code location. One line of bad CLAUDE.md has negative effects on every prompt and every action that Claude executes for you and for other developers — for years."*

### Specific takeaways

- **Don't run `/init`.** It produces a verbose CLAUDE.md by default. AI-written documentation runs long, hedged, and vague, which is the opposite of what works. Treat it as scaffolding, then prune it hard.
- **Don't include code style rules** (`use 2 spaces`, `single quotes`, `JS uses camelCase`). Code style is a deterministic problem. Handle it with linters and formatters via the `post tool use` hook in `.claude/settings.json`. Spending CLAUDE.md tokens on style is bad twice over: Claude already picks up most style from the existing code, and Claude won't apply style deterministically anyway (your CI pipeline still aborts).
- **Three core building blocks every CLAUDE.md needs:**
  1. **One-liner** describing the project (framework, language, audience, domain)
  2. **Key bash commands** used in daily work (build, test, typecheck, lint, deploy)
  3. **Caveats** — non-obvious project warnings ("Never modify schema.prisma directly, run `npm run db:generate`")
- **Use `.claude/rules/`** with `paths:` frontmatter for path-scoped rules. They only load when Claude reads matching files.
- **Schedule a monthly CLAUDE.md audit.** It's a living document, code drifts, and instructions go stale.
- **The Anthropic GitHub integration** lets you tag Claude in a PR review comment and ask it to update CLAUDE.md based on what came up. Cuts the overhead.
- **Position effect:** LLMs over-attend to the start and end and neglect the middle. Put the most important rules at the top.
- **Anthropic's own system reminder says it plainly:** *"This context may or may not be relevant to your tasks."* The model gets told CLAUDE.md content might not apply. Specificity beats that; vagueness does not.

### What to NOT do

- Don't run `/init` and ship the result.
- Don't put code style rules in CLAUDE.md.
- Don't write CLAUDE.md files >300 lines (the practical ceiling for adherence).
- Don't list every npm script — only the ones used in daily work.
- Don't inline detailed schema docs; reference them with progressive disclosure (`Read docs/schema.md when modifying models`).

### Quotes worth preserving

> *"Less is more. Under 300 lines, but ideally even shorter."*

> *"The most powerful large language models like Claude Opus 4.5 can follow about 150 to 200 instructions with reasonable consistency."*

> *"What happens when Claude gets too many instructions? Unfortunately, it's not the case that Claude just ignores the 151st instruction but takes the others perfectly. The overall quality of responses degrades massively."*

> *"One line of bad CLAUDE.md has negative effects on every prompt and every action that Claude executes — for years."*

---

## Mark Kashef — "Claude Code Turned Obsidian Into My Dream Second Brain" *(2026-03-15)*

Source: https://www.youtube.com/watch?v=2kbINqpluM0

### Headline insight

Mark quit Obsidian five times before he paired it with Claude Code. Once Claude Code became the writing layer, the abandonment stopped, because the real blocker was the friction of organizing notes by hand.

> *"This changed on the sixth time when I combined Obsidian with Cloud Code."*

### Specific takeaways

- **Inbox folder pattern** — orphan ideas land in `Inbox/`, and Claude autocategorizes them later. Lowers capture friction.
- **Slash commands earn their keep:** `/daily` for a daily brief, `/standup` for a project briefing, `/tldr` for end-of-conversation captures. The tldr pattern stands out. Type it at the end of any conversation and a structured note lands in Obsidian.
- **PDF/binary ingest pipeline** — keep raw PDFs out of the vault Claude actively reads:
  1. Raw files → folder organization (group by file type)
  2. Cheap LLM with large context window (Gemini 3 Flash) → markdown cheat sheets
  3. Cheat sheets → vault
- **The Obsidian CLI** has 95 commands. Claude Code can drive all of them. Skills can wrap the most-used ones.
- **Multiple-choice prompts** via `AskUserInput` cut setup friction more than free-text. Especially handy for onboarding skills (vault setup, profile setup).
- **The vault setup skill asks 4 questions:** what do you do for work? what falls through the cracks? work-only or personal too? existing files to import?
- **Canvas feature** — Obsidian ships a native canvas (mermaid-diagrams, NotebookLM-style). Skills can populate canvases from prompts.

### Architecture pattern observed

```
Obsidian Vault/
├── Inbox/                  # orphan capture, autocategorized later
├── Work/                   # business categories
├── Personal/               # life categories
├── Projects/{name}/
└── .obsidian/             # plugin config (Relay, etc.)
```

Claude Code points at the vault root. Skills wrap the Obsidian CLI for programmatic access.

### Quotes

> *"If you ever have a brand new idea that doesn't necessarily have a designated home, it can land in the inbox until you, or in this case, Cloud Code can autocategorize and place it where it fits best."*

> *"You can literally tell your CLAUDE.md, hey, always refer to insert path of all of these markdown files when I ask you about XYZ."*

---

## Dave Ebbelaar — "Effective Context Engineering for AI Agents" *(2025-12-19)*

Source: https://www.youtube.com/watch?v=nkJXADeI62c

### Headline insight

> *"In most of those cases, those AI agents fail not really because they can't reason or because the model isn't smart enough, but because they're reasoning over bad context."*

The top production failure mode for agents is not the model. It is bad context engineering. And bad context engineering hides during development, because dev sessions run short. It only shows up at turn 10 or turn 20.

### Specific takeaways

- **LLMs are bad at negative examples.** Swap `don't do X` for `do Y`. Show what good looks like with positive examples. *"A picture says more than a thousand words. A positive example is so much better than a negative example saying don't do this."*
- **System prompt evolution failure mode:**
  1. Start: vague system prompt
  2. Ship it
  3. Users complain
  4. Engineer hardcodes if/else for each complaint
  5. System prompt bloats, performance drops
  6. Repeat
- **Solution: split into router + sub-prompts.** A router LLM call picks which sub-prompt applies. Each sub-prompt stays small and focused.
- **State machines beat one giant prompt.** Track user state in a database. On each user message, pull the system prompt that matches the state. Skip trying to cram every state into one prompt with "first do A, then if X do B" branches.
- **Use tracing tools (Langfuse) to see full conversation traces.** Most "the AI is dumb" problems are really "the context is broken," and that only shows up once you view system prompt + tool calls + history together.
- **Tools should be short, descriptive, focused, non-overlapping.** A bloated tool description taxes context on every call. Skip the 20 tools where 5 would do.
- **Conversation memory:** prune or summarize once history runs long. Problems usually surface at turn 10–20, almost never turn 1–2 (the development testing window).
- **Workflows vs agents:** most use cases are workflows (deterministic sequences with LLM calls), not agents (autonomous tool-use loops). Reach for "workflow" before "agent."
- **Knowing when to use a workflow vs an agent is the most underrated skill in AI engineering.**

### Quotes

> *"Calibrating the system prompt is all about being just specific enough but also letting the LLM be creative rather than giving it line by line if-else statements."*

> *"LLMs are not really good at handling negative examples. They really thrive on giving them positive examples."*

> *"In most of those cases, those AI agents fail not because they can't reason but because they're reasoning over bad context."*

> *"The key to building effective AI systems is that it doesn't need to pass once. It doesn't need to pass twice, but it also needs to pass on turn 10 and also on turn 20."*

---

## Nate B Jones — "Karpathy's Wiki vs. Open Brain" *(2026-04-22)*

Source: https://www.youtube.com/watch?v=dxq7WtWxi44

### Headline insight

> *"The Wiki idea is great when you want to think in connections. It is fragile when you need exact retrieval from structured data."*

The wiki is one tool, not the only tool. Pair it with the right structured-data layer when exact lookup is the job.

### Specific takeaways

- **The wiki is for connections and synthesis.** Cross-references, accumulated reasoning, narrative knowledge.
- **The wiki is fragile for structured data lookup.** Catalog queries, customer records, financial transactions, anything that needs aggregation or filtering.
- **Hybrid stacks are the production pattern:**
  - Markdown wiki for narrative
  - Postgres for entities and full-text search
  - pgvector for similarity search (when needed)
  - Graph database (Neo4j, Graphiti) for relational reasoning (optional)
  - All unified through an MCP server
- **Don't put product catalogs or transaction logs in markdown.** Wrong shape — markdown stores strings, not entities.
- **You as engineer/PM still have to decide.** No tool stands in for the architectural thinking.

### Quotes

> *"It is up to you. It is not up to me. We all have to wrestle with this. And if you are an engineer thinking about this or a product manager thinking about this in an org, you cannot substitute for that level of thoughtfulness. I'm sorry, you got to do the thinking."*

---

## Anthropic — "Claude Agent Skills Explained" *(2025-11-26)*

Source: https://www.youtube.com/watch?v=fOxC44g8vig

### Headline insight

The official walkthrough of the L1/L2/L3 progressive disclosure model. The key operational fact:

> *"At startup only the name and description of every installed skill is loaded in the system prompt. This is going to consume about 30 to 50 tokens per skill."*

### Specific takeaways

- **L1 metadata (~30–50 tokens per skill)** loads at startup. Only the `name` and `description` from frontmatter.
- **L2 SKILL.md body** loads when Claude judges the skill relevant to the prompt.
- **L3 references** load only when SKILL.md links to them and Claude reads them.
- **Skills are portable** across Claude Code, the API, and claude.ai.
- **MCP servers connect data; sub-agents specialize in roles; skills bring expertise.** Three separate layers, often confused for one another.

### Use cases highlighted

- Onboarding new hires to coding standards
- Ensuring every PR follows security best practices
- Sharing data analysis methodology across a team

### Quote

> *"Skills let you package workflows into reusable capabilities."*

---

## Developers Digest — "Progressive Disclosure in Claude Code" *(2026-01-12)*

Source: https://www.youtube.com/watch?v=DQHFow2NoQc

### Headline insight

> *"Tools as files, loaded on demand, bash + filesystem, progressive disclosure. Bash is all you need."*

The industry is converging. Cloudflare, Anthropic, Vercel, Cursor, all independently, landed on the same architecture for building agents.

### Specific takeaways

- **Industry convergence is real.** Multiple top AI infrastructure companies independently arrived at:
  - Tools represented as files
  - Loaded on demand
  - Bash + filesystem as the universal interface
  - Progressive disclosure as the loading model
- **It's a counter-intuitive answer.** 6 months ago the conventional wisdom was "use vector embeddings for everything" and "agents need orchestration frameworks." That assumption broke.
- **The pattern works because file systems are debuggable.** A human can `cat` the same file the agent reads. You can't do that with embeddings or hidden orchestration state.

### Quote

> *"Tools as files, loaded on demand, bills, progressive disclosure, bash is all you need."*

---

## Cross-creator patterns

Stack the practitioner notes and several patterns keep repeating:

1. **Specificity beats vagueness everywhere.** Anthropic's research, camelCase's CLAUDE.md guidance, Dave's prompt engineering, Mark's vault setup — all land on *concrete > general*.

2. **Progressive disclosure is now standard.** Anthropic ships it for skills. Karpathy arrives at it independently for wikis. Cloudflare/Vercel/Cursor converge on the same. The vault gets it through per-folder CLAUDE.md.

3. **Files-not-vectors is the architectural bet.** Anthropic's Managed Memory, Karpathy's Wiki, Mark's Obsidian, the Developers Digest convergence note — all file-based.

4. **Hybrid stacks for hybrid problems.** Nate B Jones's caveat: don't make markdown do a database's job. Pair the wiki with structured stores when the task needs them.

5. **Living documents need scheduled maintenance.** camelCase's monthly audit, Karpathy's lint operation, Anthropic's pruning test, this skill's design — all assume the system rots without active care.

6. **Production failure modes are context, not model.** Dave Ebbelaar's main thesis lines up with Anthropic's "context engineering" framing. The model is rarely the bottleneck. The context fed to the model usually is.

7. **The first month is a slog.** This theme keeps showing up in creator commentary on adoption. Solo for 2–3 weeks, then add a curious teammate, then expand. Don't roll out top-down.

## Auditable signals derived from practitioner notes

These add to the framework-derived signals in the other reference files:

- **Skill-vault duplication**: a skill bundles its own ICP/voice/offer when the vault already holds them in `Context/` (Pass 8). This is what the linkedin-writer-vault skill demonstrates.
- **Code style rules in CLAUDE.md**: detect `\b(use|prefer)\s+\d+\s+(space|tab)`, indent rules, quote rules. Suggest moving to linter config + `.claude/rules/`.
- **`/init`-generated CLAUDE.md fingerprint**: detect long preamble paragraphs ("This project is...", "The codebase contains..."), file-by-file descriptions, generic platitudes. Suggest pruning or a rewrite from scratch.
- **Negative examples in skills/CLAUDE.md**: detect `\bdon't\b.*` rules with no matching positive example. Suggest converting to "do this" form.
- **Inbox folder presence**: in vaults claiming to be a second brain, flag if there's no orphan-capture folder (`Inbox/`, `Capture/`, `New/`). Suggest creating one.
- **Slash commands present**: a healthy vault often has `/daily`, `/tldr`, `/standup` style commands. Inform-only — flag if absent in a vault that's been active >2 weeks.
- **Raw binaries (PDFs, slides) in vault root or active folders**: Mark's pattern says synthesize first. Flag binary files in Claude-active folders.
- **Conversation log files growing past 2k tokens**: Dave's "turn 10–20" failure mode applies here. Flag long unprocessed conversation captures.
