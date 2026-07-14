---
name: os-operator
description: Build and schedule a personalized Operator prompt that keeps the user's second brain current on a recurring cadence. Run it from inside the vault folder locally. It reads `Context/` and `CLAUDE.md` first to work out the org, team, brand voice, and paths, then asks only the gaps it cannot read for itself (cadence, connectors, DM recipient, budgets, signature). It fills `references/operator-prompt-template.md`, saves the rendered prompt locally, then calls the `schedule` skill to wire the recurring trigger for you. The template is a generic version of a proven vault Operator spec: cadence awareness, freshness, daily-as-state, idle-timeout protection, principles, hard rules, failure handling, report schema. Use when the user says "set up the operator", "build my operator prompt", "operate my second brain", "schedule my OS", "os operator", "vault operator", or runs /os-operator.
---
<!-- © 2026 Brody Automates. All rights reserved. The Brody Operating System. -->

# OS Operator

Build a personalized Operator prompt that keeps the user's second brain current on a recurring schedule. The Operator is a fully autonomous maintenance agent. One session equals one run. No questions, no confirmations. It executes and reports.

The skill does **four** jobs, in this order:

1. **Discover** what the vault already knows. Read `Context/` and `CLAUDE.md` quietly and pull out the org name, team scope, brand voice, vault folders, and runtime conventions.
2. **Ask only the gaps.** Cadence, connectors, DM recipient, budgets, signature. Never re-ask anything Phase 0 already read out of the vault.
3. **Render and save** the personalized prompt locally.
4. **Schedule it.** Hand off to the `schedule` skill (through the `Skill` tool) so the trigger is live before the run ends. The user does not need to run `/schedule create` by hand.

## Reference files

- `references/operator-prompt-template.md`, the parameterized prompt. Around 400 lines, and it keeps every critical rule from the source spec.
- `references/connector-fragments.md`, the body blocks you splice in per connector (transcripts, chat, community).

Read both before you generate any output.

---

## Phase 0, Silent discovery (no questions, no MCP calls)

The user runs this skill **from inside their vault folder locally**. Everything in this phase is filesystem-only. Do NOT call any `vault_*` MCP tools. The Vault MCP only matters at *runtime*, once the rendered Operator agent runs.

1. **Confirm the cwd is a vault.** `claude.md` or `CLAUDE.md` has to exist at the cwd root. If neither is there, ask the user to `cd` into their vault and run it again. Do not go further.
2. **List the top-level folders.** `Glob` the pattern `*/` at cwd. Cache the result as `{{VAULT_FOLDERS}}`, one folder name per line.
3. **Read `CLAUDE.md`.** Pull the conventions: signature style, em-dash rule, voice rules, folder routing, any explicit operator paths, `os-mode` (professional vs business).
4. **Read every file in `Context/`.** Whichever ones exist:
   - `Context/me.md`, operator profile (name, role, focus)
   - `Context/operator.md`, the same thing, business-mode version
   - `Context/business.md` / `Context/organization.md`, **org name**, mission, products, locations
   - `Context/team.md`, **team member full names**, roles, who owns what
   - `Context/brand.md`, voice, colors (watch for hex codes that could seed the signature)
   - `Context/strategy.md`, current focus, OKRs (tells you which workstreams the operator should lean into)
   - `Context/stakeholders.md`, external people the operator should know about (outside the team scope, but referenced)
5. **Cache the inferred values:**
   - `{{ORG_NAME}}` ← from `Context/business.md` or `organization.md` (title heading or `name:` frontmatter). If there is none, fall back to the cwd folder name.
   - `{{TEAM_MEMBERS}}` ← comma-separated full names from `Context/team.md`. If solo (`os-mode: professional`), use the operator's own name from `Context/me.md`.
   - `{{EXAMPLE_TEAM_MEMBER}}` ← first name in `{{TEAM_MEMBERS}}`.
   - `{{OPERATOR_NAME}}` (default) ← `{{ORG_NAME}} Vault Operator`.
   - `{{OPERATOR_HANDLE}}` ← slugified, e.g. `Vault-Operator`.
   - `{{OPERATOR_BASE_PATH}}` ← `/Team/{{ORG_NAME}}/Profiles/Vault-Operator/` if `Team/` is one of the discovered top-level folders, otherwise `/{{ORG_NAME}}/Vault-Operator/`.
   - `{{PROFILE_BASE_PATH_PATTERN}}` ← `/Team/{{ORG_NAME}}/Profiles/{Name}/` when that applies.
   - `{{SIGNATURE_BG_COLOR}}` ← any brand color hex found in `Context/brand.md`, otherwise `#D2ECD0`.
   - `{{SIGNATURE_FG_COLOR}}` ← `#020309`.

After Phase 0, give the user a 4 to 6 line summary of what you found. Format:

> **Discovered from your vault:**
> - Org: `{{ORG_NAME}}`
> - Team: `{{TEAM_MEMBERS}}`
> - Top-level folders: `{count}` ({list first 5})
> - Operator path (proposed): `{{OPERATOR_BASE_PATH}}`
> - Brand signature color (proposed): `{{SIGNATURE_BG_COLOR}}`
>
> Anything to override? (Type the field name, or say "looks good" to continue.)

If the user wants to override something, take it inline (one short follow-up) and update the cache. If they say "looks good", go straight to Phase 1.

**Do not re-ask any of the above as a standalone question.** These were inferred. Phase 1 is only for things the vault genuinely cannot tell you.

---

## Phase 1, Ask only the gaps

These are the questions the vault cannot answer. Ask them one at a time with `AskUserQuestion`.

### Q1, Cadence

`AskUserQuestion` with these options:

- **Hourly**, every hour, max throughput. Best for active teams.
- **Every 4 hours**, balanced. Catches new transcripts and chat without spamming.
- **Daily**, one run per day. Best for solo or low-volume.
- **Custom**, user types a cron expression or a phrase.

Save as `{{CADENCE_HUMAN}}` and `{{CADENCE_TAG}}`.

### Q2, Connectors (probe live, do not just ask)

Don't hand the user a checklist of connectors and take their word for it. **Probe what is actually wired up in this environment**, then confirm.

#### Step 2a, Detect

Look at the tools the running session has available. Match tool names against these prefixes (any namespace: `mcp__*`, plain, or vendor-specific):

| Category | Detection signal | Live probe (read-only) |
|----------|------------------|------------------------|
| **Vault** | `vault_*` (e.g. `vault_folders`, `vault_relays`, `vault_list`) | Call `vault_folders` (or equivalent). Success = a list of folder names. |
| **Transcripts** | `fireflies_*`, `otter_*`, `granola_*`, `read_ai_*` | Call the connector's "list recent" / "get transcripts" with a 1-item or 24h window. Success = 0 or more results, no auth error. |
| **Chat** | `slack_*`, `teams_*`, `discord_*`, `telegram_*` | Call the connector's "list channels" / "search users" / equivalent read-only call. Success = a response, no auth error. |
| **Community** | `circle_*`, `discourse_*` | Call `list_spaces` / `categories` with `per_page: 1`. Success = a response. |

Run every detected probe **in parallel** in one batch. Narrate before the batch ("Probing 3 connectors live: vault, fireflies, slack…") and after ("Vault OK (13 folders). Fireflies OK. Slack auth error.").

For each connector:

- ✅ **Found and the probe succeeds** → mark it enabled. Capture the actual MCP/tool prefix as `{{*_MCP_NAME}}` and work out the product name (e.g. `fireflies` → `Fireflies`).
- ⚠️ **Found but the probe fails** (auth error, 401, empty creds) → mark it "wired but broken". Give the user the exact error and ask whether to (a) skip this connector, (b) pause so they can fix the credentials and re-run the probe, or (c) include it anyway.
- ❌ **Not found** → mark it disabled. Do not ask "do you want to add it?" That is a separate setup task. The user can re-run `/os-operator` later once they wire a new MCP.

#### Step 2b, Confirm with the user

Show one summary block:

> **Connectors detected:**
> - ✅ Vault MCP, `relay-mcp` (13 folders)
> - ✅ Transcripts, `fireflies` (last transcript: 2 hours ago)
> - ✅ Chat, `slack` (12 channels visible)
> - ❌ Community, none detected
>
> Use these in the Operator? (yes / customize)

If the user says "customize", let them switch individual entries off (but never on for something that was not detected, since they need to wire that MCP first). If they say "yes" or just confirm, move on.

#### Save

- `{{TRANSCRIPT_PRODUCT_NAME}}` and `{{TRANSCRIPT_MCP_NAME}}`
- `{{CHAT_PRODUCT_NAME}}` and `{{CHAT_MCP_NAME}}`
- `{{COMMUNITY_PRODUCT_NAME}}` and `{{COMMUNITY_MCP_NAME}}`
- `{{VAULT_MCP_NAME}}` (whatever the probe identified, default `relay-mcp` if it is ambiguous)

Probes are read-only by design. Never call a write or send tool during detection. No DMs, no posts, no file writes.

### Q3, Vault MCP root-folder convention (only if Vault MCP)

Some MCP servers (Relay-style) expose vault-root files under a named folder like `Shared Files (root)` instead of `/`. The rendered prompt needs to know this exact string so the Operator's `vault_*` calls land.

`AskUserQuestion` with these options:

- **`Shared Files (root)`**, Relay MCP default.
- **`/`**, most other MCPs.
- **Custom**, user types the literal folder name.

Save as `{{ROOT_FOLDER_NAME}}`.

### Q4, DM escalation recipient (only if a chat connector is enabled)

> When the Operator finds a community post or chat thread that needs a human on it, who gets the 1:1 escalation DM? **One person only.** No channels, no groups.

Default the picker to the names in `{{TEAM_MEMBERS}}` so the user can pick instead of retyping. Save as `{{DM_RECIPIENT_NAME}}`.

If no chat connector is enabled, skip this question. Set `{{DM_RECIPIENT_NAME}}` to the operator's own name from `Context/me.md` / `operator.md`. The placeholder shows up in a few sections that get stripped during render anyway.

### Q5, Budgets

`AskUserQuestion` with these options:

- **Defaults**, 50 reads, 30 writes, 20 transcripts, 5 DMs, 10 housekeeping fixes per run.
- **Light**, 25 / 15 / 10 / 3 / 5. Solo or low-volume.
- **Heavy**, 100 / 60 / 40 / 10 / 20. Large teams or daily cadence.
- **Custom**, user types overrides.

Save as `{{BUDGET_READS}}`, `{{BUDGET_WRITES}}`, `{{BUDGET_TRANSCRIPTS}}`, `{{BUDGET_DMS}}`, `{{BUDGET_HOUSEKEEPING}}`.

### Q6, Signature color (only if Phase 0 did not infer one)

If `Context/brand.md` already gave you a brand color, skip this. Otherwise:

> The Operator stamps every file it edits with a colored span. Pick a background color (default: `#D2ECD0`, soft mint green). Foreground default: `#020309`.

Save as `{{SIGNATURE_BG_COLOR}}` and `{{SIGNATURE_FG_COLOR}}`.

---

## Phase 2, Render

1. Read `references/operator-prompt-template.md`.
2. Read `references/connector-fragments.md`.
3. Replace every `{{PLACEHOLDER}}` with the captured value. For the connector-specific placeholders (`{{TRANSCRIPTS_BOOTSTRAP_LINE}}`, `{{CHAT_BOOTSTRAP_LINE}}`, `{{COMMUNITY_BOOTSTRAP_LINE}}`, `{{TRANSCRIPTS_STEP_BODY}}`, `{{COMMUNITY_STEP_BODY}}`, `{{CHAT_STEP_BODY}}`, `{{ENABLED_CONNECTORS_LINE}}`, `{{MCP_BLOCK}}`):
   - Enabled connector → splice in the **Enabled** block from `connector-fragments.md`, then run placeholder substitution again on any nested placeholders.
   - Disabled → drop the section header AND the placeholder. Strip every remaining mention of that connector's product name from Hard Rules, Failure Handling, and Report Schema.
4. **Derive the path-split values** from `{{OPERATOR_BASE_PATH}}` and `{{PROFILE_BASE_PATH_PATTERN}}` so the MCP examples come out correct:
   - `{{OPERATOR_TASK_LIST_PATH}}` = `{{OPERATOR_BASE_PATH}}task-list/Tasks.md`
   - `{{OPERATOR_TASK_LIST_FOLDER}}` and `{{OPERATOR_TASK_LIST_SUBPATH}}`
   - `{{OPERATOR_REPORT_PATH_PATTERN}}` = `{{OPERATOR_BASE_PATH}}Daily/{YYYY-MM-DD}-daily.md`
   - `{{PROFILE_DAILY_PATH_PATTERN}}`, `{{PROFILE_DAILY_FOLDER}}`, `{{PROFILE_DAILY_PATH_FORMAT}}`, `{{PROFILE_DAILY_PATH_EXAMPLE}}`, `{{PROFILE_DAILY_SUBPATH_EXAMPLE}}`
5. Sanity pass: scan the rendered output for any `{{...}}` strings. If any are left, fix them or flag them to the user before saving.

Show the user a short preview (title, cadence line, team scope, the rendered MCP block) and ask one yes/no: "Save it?"

---

## Phase 3, Save

If yes:

- Use the `Write` tool against the local filesystem.
- Path: `{{OPERATOR_BASE_PATH}}operator-prompt.md`, resolved relative to the cwd (the vault root). Strip the leading `/` off `{{OPERATOR_BASE_PATH}}` when you resolve it locally.
- `Read` it back to confirm the content is there.

If the file already exists, ask before you overwrite it.

---

## Phase 4, Schedule it (do not stop at "saved")

Once the prompt is saved, **call the `schedule` skill through the `Skill` tool right away**. Do not stop at "saved". Do not tell the user to run `/schedule create` themselves. Wire the trigger now.

### Map cadence → cron

Turn `{{CADENCE_HUMAN}}` into a cron expression for the schedule skill:

| Cadence | Cron |
|---------|------|
| Hourly | `0 * * * *` |
| Every 4 hours | `0 */4 * * *` |
| Daily | `0 9 * * *` (9am local; ask if they want a different hour) |
| Custom | use what the user typed |

### Build the trigger payload

The `schedule` skill sets up a remote trigger that runs Claude Code on a cron. Hand it:

- **Cron expression**, from the table above.
- **Working directory**, the cwd (the vault root). The Operator agent has to run inside the vault so its file ops resolve correctly.
- **Prompt**, a short instruction: `"Run the Operator. Read and execute @{{OPERATOR_BASE_PATH}}operator-prompt.md exactly as written. One run = one report. Stop when done."`
- **Trigger name**, `{{OPERATOR_HANDLE}}-{{CADENCE_TAG}}` (e.g. `Vault-Operator-hourly`).
- **Description**, `"{{OPERATOR_NAME}}, {{CADENCE_HUMAN}}"`.

### Call the schedule skill

Call the `Skill` tool with `skill: "schedule"` and pass the args above. Let the schedule skill run its own confirmation flow with the user (timezone, confirm cron, and so on). That interaction is its to own.

If the schedule skill is not installed in the user's environment, fall back to a clear text instruction with the exact cron expression and prompt to paste. Do not pretend the trigger is wired when it is not.

### After the schedule skill returns

Tell the user, in one short paragraph:

> Operator prompt saved to `{{OPERATOR_BASE_PATH}}operator-prompt.md` and scheduled `{{CADENCE_HUMAN}}` (cron `{cron}`). First run fires on the next tick. Manage the trigger anytime with `/schedule list` or `/schedule update`.

Stop. Do not propose other follow-ups.

---

## Hard rules for this skill

- **Discovery first.** Read `Context/` and `CLAUDE.md` before you ask anything. Never ask for a value the vault already holds.
- **Local-first for vault content.** Use `Glob`, `Read`, and `Write` against the local filesystem for everything except the connector probes. Vault MCP is only used at runtime by the rendered Operator agent, or briefly in Phase 1 Q2 as a *live probe* to confirm the MCP is wired and authenticated.
- **Probe, don't ask.** For Q2 (connectors), look at the tools in the session and run a read-only probe per connector. Never ask the user "do you have Slack?" Detect it.
- **Always finish by scheduling.** Phase 4 is mandatory. Save, then call the `schedule` skill in the same run. Do not stop at "saved" and tell the user to schedule it themselves.
- **Never modify `CLAUDE.md`.** The Operator owns that file at runtime, not the builder.
- **Strip disabled connectors fully.** Vault plus Fireflies only? `Slack` and `Circle` should not show up anywhere in the rendered prompt.
- **One sanity pass for `{{` after render.** Catch any unfilled placeholders before you save.
- **Default to defaults.** Don't pester for individual budget fields when the user picked "Defaults".
