# Cartodex Roadmap

## Product Thesis

Cartodex is an agent-facing repository memory layer. It helps agents understand structure, scenarios, freshness, and spec-driven development context before they change code.

A map is only valuable while it is trustworthy. Anyone can generate a map once; the product is keeping it fresh cheaply. Freshness therefore comes first, and every other bet builds on it.

## Current Pain Points

- Users need to know when the Cartodex map is stale enough to refresh, and which parts of it drifted.
- Full remaps are expensive, so staleness accumulates between refreshes.
- Agents read the map without knowing which sections to distrust.
- Important use scenarios and data flows are easy to lose between sessions.
- Spec-driven development needs repository-aware context before implementation begins.

## Design Principle: Mechanism, Not Policy

Cartodex does not prescribe an update cadence. Some users refresh before releases, some on every merge, some only in CI. The core is command-driven and deterministic; hooks, CI checks, and agent-invoked flows are thin bindings documented as recipes, not built-in behavior. Nothing runs and no tokens are spent unless explicitly requested.

## Near-Term Bets

### 1. Freshness and Drift Detection (now)

Make staleness measurable, per section, deterministically, with no LLM calls.

Building blocks:

- `mapped_sha` in map frontmatter: track the exact commit the map describes instead of relying on timestamps, which break under rebases, squash merges, and divergent branches. Drift is computed from `git diff --name-only <mapped_sha>..HEAD`.
- Section path markers: each map section carries a machine-readable marker (`<!-- cartodex:paths src/scanner/ -->`) declaring which paths it covers. Markers declare coverage, not citation: a section describing a directory claims the whole directory, so changes to unmentioned files still flag it.
- `cartodex status`: diffs `mapped_sha..HEAD`, maps changed files to sections via markers, and reports a per-section drift score (changed files / covered files, optionally token-weighted). Also reports changed paths not covered by any marker: new, unmapped territory. Exit code makes it usable in CI.
- `cartodex validate`: deterministic consistency gate. Checks that every marker points to an existing path (a dead marker is itself drift signal), that source files are covered by some section, and that no section lacks a marker. The mapping skill runs validate before declaring a map done, so marker quality is checked, not trusted.
- `cartodex update --stale`: scoped refresh. Re-analyzes and rewrites only drifted sections (or `--paths <path>`), preserves fresh sections verbatim, stamps the new `mapped_sha`. Makes frequent refreshes cheap without prescribing when to run them.

Follow-up idea: a drift ledger appended to the map itself, so any agent reading the map sees which sections to verify before trusting them.

### 2. Task Briefs (next, once freshness is trustworthy)

Generate task-specific context before an agent edits code. Path markers double as a routing index: "which section covers `src/scanner/`" is the same data as "which section should an agent read before touching `src/scanner/`".

A brief should identify:

- likely files and modules to inspect
- expected tests and validation commands
- nearby scenarios or data flows
- risks and per-section stale warnings from `status`

### 3. Scenarios and Data Flows

Preserve reusable implementation paths and product flows so agents can reuse known context.

Examples:

- adding a new CLI command
- changing scanner behavior
- updating generated templates
- tracing user input through command parsing, scanning, output, and tests

### Spec-Driven Development Integration

Provide repository-aware context during spec-driven development: draft implementation-aware specs, identify likely files, tests, and risks, preserve scenarios as spec context, and update repository memory after implementation.

## Deprioritized

### Conventions Memory

Team conventions (validation philosophy, test style, dependency preferences) already have a canonical home in `AGENTS.md`, which agent platforms maintain and read natively. Cartodex should own where things are, not how to behave, and should complement `AGENTS.md` rather than compete with it.

### Automatic Background Updating

File watchers and auto-remap on commit are deliberately out of scope: they spend LLM tokens without consent and conflict with the explicit, deterministic positioning. Explicit cheap status; explicit scoped update.

## Open Questions

- Should drift scores be file-count or token-weighted, and what threshold defaults make sense for CI?
- Should the drift ledger live in the map, a sidecar file, or both?
- What format should scenarios and data flows use?
- How should Cartodex context attach to specs without depending on one spec format?
