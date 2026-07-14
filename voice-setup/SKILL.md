---
name: voice-setup
description: Reads your existing posts, learns how you actually write, and applies that voice to anything the system drafts. Loads at the start of every run and keeps learning from posts you approve.
---

# Voice Setup

A skill file, not software. Your agent loads it at the start of every run so anything it drafts sounds like you, not like AI.

## What it does

1. **Reads your existing posts.** Point it at a folder or export of your best posts, captions, and scripts.
2. **Extracts your voice.** It pulls out the patterns that make your writing yours: sentence length and rhythm, the words you use and the ones you never use, how you open and close, your level of formality, punctuation habits.
3. **Writes a voice profile.** It saves those patterns to a plain-text profile the agent reads before drafting anything.
4. **Applies it everywhere.** Every draft the system produces runs through the profile.
5. **Keeps learning.** When you approve or edit a post, the change is fed back so the profile sharpens over time.

## Setup

1. Drop 15-30 of your best posts into `voice/samples/` (raw text, one file each).
2. Run the skill once to generate `voice/PROFILE.md`.
3. Load `PROFILE.md` in your agent's context (or reference this skill) before any drafting task.
4. After each post goes out, save the final approved version back into `voice/samples/` and re-run to refresh the profile.

## The rules the profile should capture

- Sentence shapes: short declaratives vs longer cause-effect lines, and the mix.
- Banned words and tics (the AI-sounding words you would never write).
- Openings and hooks: how you actually start.
- Formatting: dashes, emoji, capitalization, list style.
- Tone: direct, plain, no hedging, no guru language.

Keep the profile short and specific. A profile that lists real patterns beats one full of adjectives.
