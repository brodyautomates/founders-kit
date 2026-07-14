This folder holds org-level daily notes. In business mode these are AGGREGATED views compiled from the individual profile dailies. In professional mode this is the operator's primary daily journal.

## Critical Rule (Business mode)

Do NOT write directly to this folder during profile sessions. All session output goes to the active profile's daily folder at `Team/{org}/Profiles/{name}/Daily/YYYY-MM-DD.md`.

If the org sets up aggregation schedules later (for example a `Team Schedules/` folder with scheduled scripts), those would fill this folder by scanning every profile daily and compiling them into one org-level view. By default this folder stays empty in business mode.

## When You CAN Write Here

- **Professional mode**: Always. This is the operator's daily journal.
- **Business mode**: Only when running a team schedule that explicitly aggregates profile dailies, or when no active profile session is running.

## Daily Note Frontmatter

```yaml
---
type: daily-note
date: YYYY-MM-DD
---
```
