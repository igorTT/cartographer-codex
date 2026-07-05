## Context

Cartodex maps currently record `last_mapped` as human-readable metadata, and the installed skill tells update mode to use timestamp-based git history. That makes update decisions dependent on wall-clock time instead of the exact commit used as the map baseline.

The repo is still early enough to avoid legacy fallback behavior. Existing timestamp-only maps should be treated as old format and routed through explicit update guidance before normal update mode continues.

## Goals / Non-Goals

**Goals:**

- Add `mapped_sha` as required generated map frontmatter.
- Make update mode use `git diff --name-only <mapped_sha>..HEAD` for changed-file detection.
- Stop update mode when an existing map lacks `mapped_sha`.
- Add an installed `resources/update-guide.md` resource for old-format map and asset upgrade instructions.
- Keep `last_mapped` as visible human metadata, not as update-mode change detection.

**Non-Goals:**

- No timestamp fallback for old maps.
- No new CLI command for migration in this change.
- No marker parsing, drift scoring, validation command, or scoped stale-update behavior; those belong to later freshness work.

## Decisions

1. Require `mapped_sha` for update mode.

   Update mode should fail closed when `mapped_sha` is absent. This avoids ambiguous timestamp behavior and gives future freshness features a stable baseline.

2. Keep `last_mapped` for humans only.

   The generated map should still show when it was created or refreshed. Agents must not use it for changed-file detection once this change lands.

3. Install a separate update guide.

   `resources/update-guide.md` keeps migration guidance out of the main configuration guide and gives agents one place to look when old formats are detected. The main skill should point to it only when relevant.

4. Treat the bundled skill/template files as the implementation surface.

   The current update workflow is instruction-driven, so this change primarily updates managed templates, resource registration, README docs, and tests that guard generated asset content.

## Risks / Trade-offs

- Old generated maps become incompatible with normal update mode -> Mitigation: the error explicitly directs agents to `resources/update-guide.md`.
- Agents may try to repair old maps casually -> Mitigation: the guide states that timestamp-only maps must be regenerated or explicitly upgraded before update mode continues.
- Template-only behavior can regress silently -> Mitigation: add focused tests asserting `mapped_sha`, SHA-based diffing, old-format error guidance, and update-guide installation.

## Migration Plan

After implementation, users refresh managed assets with `cartodex init --force`. Existing timestamp-only maps are not updated incrementally; when detected, agents stop update mode, read `resources/update-guide.md`, and regenerate or explicitly upgrade the map to include `mapped_sha`.

## Open Questions

None.
