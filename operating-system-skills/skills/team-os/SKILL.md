---
name: team-os
description: Turn an Obsidian vault into a shared Team OS by installing the upstream open-source Relay plugin (by System3, https://system3.md) and configuring it for team-wide sharing with roles and access control (RBAC). Relay is a third-party tool under its own license, installed by the user from Obsidian's community plugin store. Use when the user wants to "set up team os", "share a vault with my team", "add roles and access control to Obsidian", "set up shared and private folders", or "give teammates read or write access to a vault".
---

<!-- © 2026 Brody Glanville. All rights reserved. The Brody Operating System. -->

# Team OS: Shared Vault with Roles and Access Control

This skill turns one Obsidian vault into the shared workspace for a team. Everyone works in the same vault, changes sync in real time, and you decide who sees what and who can edit what.

The sync engine is Relay, an open-source Obsidian plugin built by System3 (https://system3.md). Relay is a third-party product under its own license. The Brody Operating System does not ship or modify Relay. The user installs it directly from Obsidian's community plugin store, then this skill walks them through configuring it for team sharing with roles and access control.

## What the user provides

**Their Obsidian vault folder**: the one they open inside Obsidian. This is the vault they want the team to share.

If the user runs `/team-os` from inside the vault, auto-detect it. Otherwise walk them through finding it: in Obsidian, Settings then About then "Show vault folder", or right-click the vault name in the switcher and choose "Reveal in Finder/Explorer".

Paths look like `~/Documents/MyVault`, `/Users/jane/Obsidian/Work`, or `C:\Users\jane\Documents\MyVault`. The right folder is the one with a hidden `.obsidian` folder directly inside it, not the parent above it.

---

# Workflow

## Step 0: Explain what this does and locate the vault

Tell the user in plain language what is about to happen:

> I'm going to help you turn this Obsidian vault into a shared Team OS. You'll install the Relay plugin, connect the vault to a shared "Relay", invite your team, and set roles so people only see and edit what they should. Relay is a free open-source plugin by System3. You install it yourself from Obsidian's community store, and I'll walk you through the setup.

### Get the vault folder

Try this order:

**1. Check the current working directory.** If the cwd contains a `.obsidian/` folder, ask:

> This folder (`{cwd}`) is already an Obsidian vault. Is this the one you want to share with your team? (yes / no)

If yes, set `VAULT="$(pwd)"` and continue.

**2. Otherwise ask in plain language:**

> Where is your Obsidian vault, the folder you open inside Obsidian?
>
> The easy way to find it: open Obsidian, go to Settings then About, and click "Show vault folder". Drag that folder in here or paste its path.
> - On macOS it usually looks like `/Users/yourname/Documents/MyVault`.
> - On Windows it usually looks like `C:\Users\yourname\Documents\MyVault`.
> - It's the folder with a hidden `.obsidian` folder inside it.

Accept a pasted path, a dragged folder, or "I don't know" (in which case walk them through the Obsidian UI step). Normalize whatever they give you: strip quotes, expand `~`, drop the trailing slash. Save as `VAULT`. Do not continue until `VAULT` is set.

## Step 1: Verify it's a valid Obsidian vault

```bash
VAULT="<paste>"
test -d "$VAULT/.obsidian" || echo "NOT_A_VAULT"
```

If `NOT_A_VAULT` prints, the path points at the wrong folder or the parent. Ask the user to re-check using Settings then About then "Show vault folder". Do not continue.

## Step 2: Install Relay from Obsidian's community store

Relay installs the normal way, from inside Obsidian. Guide the user:

> 1. Open Obsidian and open this vault.
> 2. Go to Settings then "Community plugins". If you see a Safe Mode banner, click "Turn on community plugins".
> 3. Click "Browse", search for **Relay**, and install the one by **System3**.
> 4. Click "Enable".
> 5. In the left sidebar or Settings, open Relay and create an account or sign in.

You can confirm it landed by checking the vault (with Obsidian closed, so files aren't mid-write):

```bash
ls "$VAULT/.obsidian/plugins/" 2>/dev/null
cat "$VAULT/.obsidian/community-plugins.json" 2>/dev/null
```

You should see a Relay plugin folder listed and Relay's id present in the enabled list. If it isn't there yet, the user hasn't finished the install and enable step above.

Relay's exact plugin folder name is set by System3, so match on the folder that contains Relay's `manifest.json` naming System3 as the author rather than assuming a fixed id.

## Step 3: Create a Relay and attach this vault

A "Relay" is Relay's term for a shared space that one or more vaults connect to. The person setting this up is the owner.

Guide the user:

> 1. In Obsidian, open the Relay panel.
> 2. Choose "Create a Relay" and give it a name your team will recognize, like your company or project name.
> 3. Attach this vault to the Relay. Relay will start syncing the vault's contents to everyone you invite.

The owner controls the Relay. Keep ownership on the account that should have final say over membership and billing.

## Step 4: Decide the folder structure before inviting anyone

Access control is easiest when the vault is organized around who should see what. Plan the folders first, then invite people into the right level.

A clean pattern:

- `Shared/`: everything the whole team should see and work in. Playbooks, active projects, team notes.
- `Reference/`: read-only material the team consumes but shouldn't change. SOPs, brand assets, finalized docs.
- `Private/`: the owner's own working area that stays out of the shared Relay, or lives in a separate Relay only the owner is in.

Set this up as folders in the vault first. Have the user create them in Obsidian (or create them directly if Obsidian is closed):

```bash
mkdir -p "$VAULT/Shared" "$VAULT/Reference"
echo "Created Shared/ and Reference/"
```

Keep truly private material out of the shared Relay entirely. The reliable way to keep something private is to not attach it to a shared Relay, rather than relying only on a permission toggle.

## Step 5: Invite the team and assign roles

Relay handles invitations and per-person access from its panel. Roles map to what each person should be able to do.

Guide the user:

> 1. In the Relay panel, open the members or sharing section for your Relay.
> 2. Invite each teammate by email or invite link.
> 3. For each person, set their role.

Use these roles as the model:

- **Owner**: the person who created the Relay. Full control: membership, roles, billing, and every folder. Keep this to one or two trusted people.
- **Editor**: can read and write in the shared folders. This is the default for working team members who create and edit notes.
- **Viewer**: read-only. Can open and read shared material but can't change it. Use this for people who only consume Reference material, or for stakeholders who should see progress without editing.

Match the role to the folder plan from Step 4. Working teammates get Editor on `Shared/`. People who only need to read get Viewer. Anyone who shouldn't see a given area simply isn't given access to it.

Relay's exact labels and the granularity of folder-level versus Relay-level permissions are set by System3 and may change between versions. Read the current options in the Relay panel and map them onto Owner, Editor, and Viewer. If Relay only offers Relay-wide roles in the user's version, use separate Relays for material that needs different audiences: one Relay for the whole team, a second Relay for a smaller group.

## Step 6: Verify the setup

Confirm the shared vault is working end to end:

> 1. Have one teammate accept their invite and open the Relay in their own Obsidian.
> 2. Create a test note in `Shared/` on the owner's side and confirm it appears for the teammate within a few seconds.
> 3. Have a Viewer confirm they can read but not edit.
> 4. Confirm nobody outside the intended group can see `Private/` material.

Once a change made on one machine shows up on another and the roles behave as expected, the Team OS is live.

---

# Troubleshooting

**`NOT_A_VAULT`.** The path points at the wrong folder or the parent. The right folder has a hidden `.obsidian` folder directly inside it. Find it via Obsidian, Settings, About, "Show vault folder".

**Relay doesn't appear after install.** Confirm community plugins are turned on (Settings then Community plugins, disable Safe Mode) and that Relay is toggled Enabled. Restart Obsidian. Check that Relay's plugin id is present in `.obsidian/community-plugins.json`.

**Teammate can't see the shared notes.** Confirm they accepted the invite, signed into their Relay account, and attached the shared Relay to a vault on their machine. Sync only flows once their vault is joined to the Relay.

**Changes aren't syncing.** Both people need Obsidian open with the Relay connected. Check the Relay panel for a connection or status indicator. A dropped connection pauses sync until it reconnects.

**Someone can edit something they shouldn't.** Re-check their role in the Relay panel. If Relay only offers Relay-wide roles in this version, move the sensitive material into a separate Relay that only the right people belong to.

**Private material showing up for the team.** Anything attached to the shared Relay is shared. To keep something private, keep it out of the shared Relay: either don't attach that folder, or put it in a separate owner-only Relay or a separate local vault.

**Licensing and updates.** Relay is a third-party open-source plugin by System3 (https://system3.md), distributed under its own license and updated by System3 through Obsidian's community plugin store. Updates, account features, and any paid tiers are governed by System3, not by The Brody Operating System. Update it the normal way, through Obsidian's community plugin updates.
