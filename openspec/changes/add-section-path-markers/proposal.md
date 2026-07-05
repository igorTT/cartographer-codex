## Why

Cartodex can now identify the commit a map was generated from, but it cannot yet tell which map sections are responsible for which repository paths. Section path markers give later status, validation, and scoped update workflows a deterministic way to connect changed files back to map content.

## What Changes

- Generated Cartodex maps include `<!-- cartodex:paths ... -->` comments directly under each structural section heading.
- Markers declare section coverage using repo-relative literal file paths and directory prefixes ending in `/`.
- The Cartodex skill instructs full mapping to emit markers and update mode to preserve existing markers when rewriting sections.
- Add an internal marker parser that extracts marked sections and reports unmarked structural sections without failing.
- Add template and parser tests to protect the marker contract.

## Capabilities

### New Capabilities

- `cartodex-section-coverage`: Defines how generated maps declare section-to-path coverage and how Cartodex parses those markers for later freshness workflows.

### Modified Capabilities

None.

## Impact

- Affects `src/templates/skill/resources/cartodex-map-structure.md` marker guidance.
- Affects `src/templates/skill/SKILL.md` synthesis and update-mode instructions.
- Adds a new internal TypeScript parser module, likely under `src/map/`.
- Adds Vitest coverage for parser behavior and installed template expectations.
- Does not add `cartodex status`, `cartodex validate`, drift scoring, or scoped stale-update behavior in this change.
