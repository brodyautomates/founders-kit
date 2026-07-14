This folder holds the org-level context files. These are the foundational documents that inform all vault work.

## Files

Which files are present depends on the mode (professional vs business) and on the onboarding answers. Not every file exists in every vault.

| File | Purpose | When created |
|---|---|---|
| `me.md` | Operator identity, working style, unclosed loops | Professional mode, always |
| `operator.md` | Operator role, decision authority, current state, unclosed loops | Business mode, always |
| `organization.md` | Company structure, mission, products | Business mode, always |
| `business.md` | Solo business / company context | Professional mode, if applicable |
| `services.md` | Active services / products, revenue baseline, tech stack | If revenue lines exist |
| `icp.md` | Ideal customer profile | If a target customer was named |
| `pain-points.md` | Customer pain points and how we address them | If pains were listed |
| `infrastructure.md` | Tool stack and integrations | If tools were listed |
| `brand.md` | Voice, tone, messaging, visual identity | If a brand exists |
| `team.md` | Team roster, working agreements, external contacts | If collaborators exist |
| `strategy.md` | Goals / OKRs / quarterly priorities | If strategy exists |
| `stakeholders.md` | Vendors, partners, investors, advisors, key clients | Business mode, if applicable |

## Rules

- Operator preferences, style, habits → `me.md` (professional) or `operator.md` (business)
- Org structure, company info, products → `organization.md` (business) or `business.md` (professional)
- Revenue lines, services, products → `services.md`
- ICP / customer profile → `icp.md`; customer pains → `pain-points.md`
- Tool stack changes → `infrastructure.md`
- Brand / voice / tone / messaging / visual identity → `brand.md`
- Team roster, working agreements → `team.md`
- Strategy, OKRs, quarterly goals → `strategy.md`
- Vendors, partners, investors, advisors → `stakeholders.md`
- These files are the authoritative sources. Don't duplicate their content elsewhere.
- During weekly reviews, flag any goals / OKRs in `strategy.md` that have no active project.
