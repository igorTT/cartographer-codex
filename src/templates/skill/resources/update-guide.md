# Cartodex Update Guide

Use this guide only when normal Cartodex update mode detects an old map or asset format, or when the user explicitly asks how to migrate Cartodex-managed assets.

## Timestamp-Only Maps

Maps without `mapped_sha` frontmatter are old format. Do not run normal update mode against timestamp-only maps, and do not use `last_mapped` or `git log --since` as fallback change detection.

When a map lacks `mapped_sha`:

1. Stop update mode and tell the user the map is old format.
2. Explain that Cartodex now requires `mapped_sha` as the git baseline for updates.
3. Offer to run a full remap, or explicitly upgrade the map by regenerating it from the current repository state.
4. After regeneration or explicit upgrade, write `mapped_sha` from `git rev-parse HEAD`, refresh `last_mapped`, and continue only with the current-format map.

If the repository has no usable git `HEAD`, ask whether to continue with a full map that cannot support SHA-based incremental updates.

## Managed Asset Refresh

If the installed Cartodex skill or resources are old, tell the user to refresh managed assets with:

```bash
npx cartodex init --force
```

Do not manually edit installed files under `.agents/skills/cartodex/` unless the user is intentionally repairing local generated assets. Prefer updating the package templates and reinstalling managed assets.
