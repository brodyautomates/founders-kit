Each department gets a structured folder with a README and SOPs.

## Structure

```
Departments/{dept-name}/
  README.md    -- Team, goals, links to SOPs
  sops/        -- Department-specific standard operating procedures
```

## Rules

- When new department info shows up, create or update `Departments/{name}/README.md` with team, goals, and links to SOPs.
- When someone describes a repeatable department-specific process, capture it as an SOP in `Departments/{name}/sops/{name}.md`.
- Org-wide processes go to `Intelligence/processes/` instead, not here.
- Include `department:` in frontmatter whenever a note relates to a specific department.
