## Why

Cartodex update mode currently anchors freshness to `last_mapped` timestamps, which are not a stable point in git history. Since Cartodex is still early, this is the right moment to make map freshness deterministic and reject old timestamp-only map formats instead of carrying legacy fallback behavior.

## What Changes

- Generated Cartodex maps include a `mapped_sha` frontmatter field containing the full commit SHA used as the mapping baseline.
- Update mode reads `mapped_sha` and uses SHA-based git diffing to identify changed files.
- **BREAKING**: Existing maps without `mapped_sha` are treated as old format and update mode must stop with an error instead of falling back to `last_mapped`.
- Add a new `resources/update-guide.md` managed skill resource that tells agents how to handle old map or asset formats.
- Update the Cartodex skill and map structure guidance so agents know when to read the update guide.
- Update README and template tests to document and protect the new metadata contract.

## Capabilities

### New Capabilities

- `cartodex-map-freshness`: Defines how Cartodex maps record their git baseline, how update mode detects changed files, and how old map formats are rejected.

### Modified Capabilities

None.

## Impact

- Affects `src/templates/skill/SKILL.md`, especially update-mode instructions.
- Affects `src/templates/skill/resources/cartodex-map-structure.md` and a new `src/templates/skill/resources/update-guide.md`.
- Affects init template registration so the new guide is installed with Cartodex assets.
- Affects README documentation and Vitest coverage for installed templates.
