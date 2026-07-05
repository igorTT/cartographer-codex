## Context

The `add-mapped-sha-frontmatter` change gives Cartodex maps a stable git baseline, but the map body still has no machine-readable coverage metadata. Future freshness work needs to answer questions like "which sections cover this changed file?" and "which sections have no coverage marker?" without relying on prose interpretation.

Generated maps are instruction-driven assets produced by the installed Cartodex skill. This change should therefore update both the map structure resource and the skill workflow, and add deterministic parser code that later CLI commands can reuse.

## Goals / Non-Goals

**Goals:**

- Define the marker syntax: `<!-- cartodex:paths <path...> -->`.
- Require one marker directly under each structural map section heading.
- Treat marker paths as repo-relative literal files or directory prefixes, where trailing `/` denotes a subtree.
- Preserve existing markers during update-mode rewrites unless a section's coverage actually changes.
- Add a small internal parser that extracts marked sections and separately reports unmarked structural sections.
- Cover the template contract and parser behavior with focused tests.

**Non-Goals:**

- No glob syntax in marker paths for this change.
- No `cartodex status` command, drift scoring, or git diff interpretation.
- No `cartodex validate` command or coverage-gap enforcement.
- No scoped `cartodex update --stale` workflow.
- No public package API change.

## Decisions

1. Use HTML comments directly under headings.

   The marker should not affect rendered Markdown, and placing it immediately after the heading makes the section association deterministic. An alternative was YAML blocks or table metadata, but those would make generated maps noisier and harder for humans to skim.

2. Mark structural sections, not every nested heading.

   Structural sections are the map sections future freshness checks reason about, especially module entries under `## Module Guide` and other top-level workflow sections. This keeps the marker set useful without requiring every small subsection to carry metadata.

3. Keep path matching intentionally simple.

   Version one supports exact repo-relative file paths and directory prefixes ending in `/`. Gitignore-style globs can be added later if the deterministic commands prove they need them, but literal paths and prefixes cover the current scanner inventory shape.

4. Report unmarked sections instead of throwing.

   Existing or hand-edited maps may be partially marked. The parser should return enough information for `validate` to fail later, while allowing callers such as migration tools or diagnostics to inspect imperfect maps.

5. Keep the parser internal.

   The package currently has no public `exports` contract. Placing the parser under `src/map/` gives future commands a shared implementation without committing to a public library API.

## Risks / Trade-offs

- Agents may emit markers inconsistently → Mitigation: make the map structure example explicit and add template assertions.
- Marker coverage may become stale after section rewrites → Mitigation: update-mode guidance tells agents to preserve unchanged markers and revise markers only when coverage changes.
- Literal paths may be too limited for some repositories → Mitigation: document globs as a follow-up rather than designing an unused matching language now.
- Parser behavior may over-classify decorative headings as structural → Mitigation: parser should expose heading level and line data so later callers can choose which levels to enforce.

## Migration Plan

After implementation, users refresh managed assets with `cartodex init --force`. Existing current-format maps can continue to be read, but maps without section markers will be considered unmarked by the parser and future validation work.

## Open Questions

None.
