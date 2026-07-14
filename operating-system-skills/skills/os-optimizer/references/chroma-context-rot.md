<!-- © 2026 Brody Glanville. All rights reserved. The Brody Operating System. -->

# Chroma — Context Rot research

## Contents

1. [Core thesis](#core-thesis)
2. [The 18 models tested](#the-18-models-tested)
3. [Methodology — six experiments](#methodology--six-experiments)
4. [Hard findings](#hard-findings)
5. [The shuffled vs structured paradox](#the-shuffled-vs-structured-paradox)
6. [Distractor effects](#distractor-effects)
7. [Position effect](#position-effect)
8. [Family-level differences](#family-level-differences)
9. [LongMemEval — focused vs full context](#longmemeval--focused-vs-full-context)
10. [The attention budget concept](#the-attention-budget-concept)
11. [Implications for vault architecture](#implications-for-vault-architecture)
12. [Dos](#dos)
13. [Don'ts](#donts)
14. [Verbatim quotes](#verbatim-quotes)
15. [Auditable signals](#auditable-signals)
16. [Sources](#sources)

---

## Core thesis

Standard NIAH (Needle In A Haystack) benchmarks paint modern LLMs as reliable on long context. They are not.

Testing **18 frontier models** across Anthropic, OpenAI, Google, and Alibaba, the Chroma study found:

> *"Model performance consistently degrades with increasing input length."*

It gets worse. **Structured, logically coherent context can score below shuffled context.** The thing that decides the outcome is not whether the information sits somewhere in the context. It is how the information is presented and how much noise sits around it.

That one finding changes how you design a vault. "Just put it in the context" does not hold. Curation, position, and signal-to-noise beat raw volume of information.

## The 18 models tested

| Family | Models |
|---|---|
| **Anthropic (5)** | Claude Opus 4, Claude Sonnet 4, Claude Sonnet 3.7, Claude Sonnet 3.5, Claude Haiku 3.5 |
| **OpenAI (7)** | o3, GPT-4.1, GPT-4.1 mini, GPT-4.1 nano, GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo |
| **Google (3)** | Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 2.0 Flash |
| **Alibaba (3)** | Qwen3-235B-A22B, Qwen3-32B, Qwen3-8B |

The pattern showed up in **every model family**. No model dodged the degradation. They only differed in how steeply they fell.

## Methodology — six experiments

The study ran six controlled experiments to pin down which factors actually cause the degradation:

| Experiment | What it varied | What it tested |
|---|---|---|
| **1. Needle-Question Similarity** | Cosine similarity 0.445–0.829 across 5 embedding models | Does semantic similarity between needle and question affect retrieval? |
| **2. Distractor Impact** | Baseline (needle only) vs 1 distractor vs 4 distractors | Does adding similar-but-wrong content hurt? |
| **3. Needle-Haystack Similarity** | Topical alignment between filler and target | Does the topical relationship of filler matter? |
| **4. Haystack Structure** | Coherent ordering vs randomized sentence ordering | Does logical structure help or hurt? |
| **5. LongMemEval** | Conversational QA at ~113k tokens vs focused ~300-token variants | What does real-world long context cost? |
| **6. Repeated Words** | Text replication, 25–10,000 word sequences with embedded unique words | Position effect — where do unique words survive? |

This setup separates the variables. NIAH-style benchmarks blend them together. That is why models look stronger on NIAH than they hold up in real use.

## Hard findings

| Finding | Implication |
|---|---|
| **Length degrades all models** in every experiment | Context is a finite budget — spend it on signal |
| **Shuffled > structured** across all 18 models | Don't assume logical structure helps retrieval |
| **One distractor measurably hurts** the baseline; **four distractors compound** | Filler isn't free — every irrelevant chunk costs |
| **Distractors 2 and 3** (specific positions) appear most often in hallucinated responses | Some distractors are worse than others |
| **Claude family**: lowest hallucination rates across the board | Match model family to task risk |
| **GPT family**: highest hallucination rates — confident but wrong | Don't deploy GPT in fact-critical pipelines without guardrails |
| **Position effect**: unique words placed early have higher accuracy than buried ones | Lead with critical info, not preamble |
| **LongMemEval**: focused 300-token prompts substantially outperformed full 113k contexts | Just-in-time retrieval beats upfront dumps |
| **Claude Opus 4** showed the most pronounced focused-vs-full divergence | Even the strongest model loses meaningful capability when context bloats |
| **Low needle-question similarity** → markedly steeper degradation curves | Semantic alignment matters more at length |

## The shuffled vs structured paradox

The finding that breaks intuition:

> *"Across all 18 models and needle-haystack configurations, we observe a consistent pattern that models perform better on shuffled haystacks."*

Why does logical structure hurt? Adjacent documents in a well-ordered set share vocabulary and patterns, so they read like **plausible distractors**. The model struggles to separate the target from its neighbors. Shuffling breaks that similarity, and the target pops out.

**Implication for vaults:** the "well-organized folder structure" instinct carries a cost. When two adjacent files reach for similar vocabulary (say `voice.md` and `brand.md` both covering tone), they pull attention away from each other whenever both load. Your options:
- Consolidate them
- Differentiate the vocabulary
- Load only one at a time (per-folder CLAUDE.md / progressive disclosure)

## Distractor effects

The study tested baseline (needle only), 1 distractor, and 4 distractors:

- **1 distractor drops performance** below baseline, measurably and consistently.
- **4 distractors compound** the damage, but not on a straight line. Each extra distractor hurts less than the first one did.
- **Distractors at positions 2 and 3** (early but not first in the haystack) show up most in hallucinated responses. Likely the model leans hard on early content while the very first item gets special treatment.

**Implication for vaults:** every irrelevant file you load acts as a distractor. The cost does not scale linearly with file count. The *first* irrelevant file does the most harm. That is exactly why progressive disclosure (folder CLAUDE.md loading on demand) beats simply shrinking the root CLAUDE.md.

## Position effect

The repeated-words experiment showed that unique words placed **early** in a long sequence scored higher than ones placed deeper.

**Implication for any markdown file:**
- The first ~10–20% gets the most attention.
- The last ~10–20% gets significant attention.
- The middle gets least attention.

This lines up with Anthropic's CLAUDE.md guidance to put critical rules at the top.

For vault docs:
- **Lead with the decision**, not the rationale.
- **Lead with the rule**, then the reasoning.
- **Lead with the action**, then the context.
- Use callouts at the top for `> [!important]` summaries.

## Family-level differences

Models fall apart in different ways:

- **Claude family**: degrades gracefully, lowest hallucination. Under uncertainty it tends to defer or ask. Best fit for high-risk fact retrieval.
- **GPT family**: hallucinates confidently at length. Produces answers that sound right and are wrong. Needs a validation layer in production.
- **Gemini family**: middle of the pack on both axes; a long context window does not turn into long-context quality.
- **Qwen family**: strong at shorter lengths; falls off faster than Claude and GPT at extreme lengths.

The takeaway: a long context window is not the same as long context capability. Pick models on measured long-context performance, not on the advertised window size.

## LongMemEval — focused vs full context

LongMemEval ran conversational QA in two formats:

1. **Focused** — ~300-token prompt with just the relevant prior turn
2. **Full** — ~113k-token full conversation history

Result: **focused beat full by a wide margin** across every model tested. Claude Opus 4 had the largest gap, which means even the strongest model gives up real capability when it has to find a needle in 113k tokens of history.

**Implication for vaults:** the urge to "just load the whole conversation history" or "include the full daily note from last week" is a mistake. Curate down to the relevant 300 tokens. The compaction plus just-in-time retrieval pattern Anthropic recommends maps straight onto this finding.

## The attention budget concept

Transformer attention creates **n² pairwise relationships for n tokens**, so attention thins out per pair as n grows. That is the structural cause of context rot.

> Attention is a finite budget. As n grows, each token's "share" of attention shrinks. Past a certain n, the load-bearing rules in your CLAUDE.md don't get enough attention to influence behavior.

It also explains why models with 200k+ context windows show degradation long before the window fills. The attention budget rots faster than the window fills.

## Implications for vault architecture

| Chroma finding | Vault design rule |
|---|---|
| Length degrades all models | Keep root CLAUDE.md under 200 lines |
| Shuffled > structured | Either consolidate similar files or load them on demand, not together |
| Distractors hurt; first one is worst | Every irrelevant file in context is costly |
| Position matters | Critical rules at the top of every file |
| Focused 300 tokens > full 113k | Use progressive disclosure (per-folder CLAUDE.md, on-demand references) |
| Claude family lowest hallucination | Match model to risk profile |
| Attention is n² | Treat context as a finite budget |

## Dos

- Curate context down to the smallest relevant slice.
- Put the most important info **first** in every file, not just in CLAUDE.md.
- Use progressive disclosure: per-folder CLAUDE.md, on-demand references.
- Keep root CLAUDE.md lean. It loads on every session.
- Use the Claude family when the cost of hallucination is high.
- Treat the attention budget as finite even while the window still has room.
- Use just-in-time retrieval over full-corpus dumps.
- When files share a topic, either consolidate them or load them on demand.
- Compact hard at 60–70% context usage.

## Don'ts

- Don't assume "in context = retrievable." It isn't.
- Don't add filler "for completeness" — every irrelevant chunk is a distractor.
- Don't count on logical structure to save you (it can hurt retrieval).
- Don't bury critical facts deep in long files.
- Don't max out the context window just because it's available.
- Don't load the full daily/conversation history when you can curate to the relevant turn.
- Don't confuse window size with capability — always test long-context performance for your task.
- Don't put two similar topical files (e.g., `voice.md` + `brand.md`) in the same load path without differentiation.

## Verbatim quotes

> *"Whether relevant information is present in a model's context is not all that matters; what matters more is how that information is presented."*

> *"Model performance consistently degrades with increasing input length."*

> *"Across all 18 models and needle-haystack configurations, we observe a consistent pattern that models perform better on shuffled haystacks."*

> *"Even a single distractor reduces performance relative to the baseline."*

> Claude models *"consistently exhibit the lowest hallucination rates"*; GPT models *"show the highest rates of hallucination, often generating confident but incorrect responses."*

## Auditable signals

When this skill runs Pass 4 (token estimate) and Pass 9 (anti-pattern sweep) for context-rot signals:

- **File length distribution**: compute median markdown file size; flag files ≫ project median (likely distractor-heavy, split candidate).
- **Critical-info position**: in CLAUDE.md and routing files, detect rules/decisions that appear after line N (where N = ~30% of total lines). Suggest moving up.
- **Lead-in preamble**: detect note tops with backstory/setup before the actual decision. Suggest leading with the decision.
- **Distractor density**: notes with many similar entities/topics in one file — these load as collective distractors when the file is read.
- **Loaded context size**: sum of files that load at session start (root CLAUDE.md + walked-up CLAUDE.md + MEMORY.md if present). Flag if > soft budget (~3k tokens).
- **Similar-topic file pairs**: filename heuristic — `voice.md` + `brand.md` + `tone.md` likely overlap and distract each other when both loaded.
- **Top-of-file callout**: vault rule says every doc should have a `> [!type]` callout for visual structure. Specifically check that critical decisions have one near the top.
- **Daily/conversation file size**: in `Daily/`, flag files growing past ~2k tokens — suggests bloat from copy-pasting conversation history rather than curating.

## Sources

- https://www.trychroma.com/research/context-rot (canonical study)
- https://research.trychroma.com/context-rot (redirects to above)
- https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents (Anthropic's framing of "attention budget")
