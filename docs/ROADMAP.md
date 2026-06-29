# Cartodex Roadmap

## Product Thesis

Cartodex is an agent-facing repository memory layer. It helps agents understand structure, conventions, scenarios, freshness, and spec-driven development context before they change code.

## Current Pain Points

- Agents need team conventions, not just repository structure.
- Users need to know when the Cartodex map is stale enough to refresh.
- Important use scenarios and data flows are easy to lose between sessions.
- Dynamic areas, especially moved files and test changes, make static maps decay.
- Spec-driven development needs repository-aware context before implementation begins.

## Near-Term Bets

### Conventions Memory

Capture project and team rules that should steer agent behavior during implementation.

Examples:

- validation and error-handling philosophy
- fail-fast versus defensive normalization preferences
- test style and expected coverage boundaries
- dependency and abstraction preferences
- agent-specific guidance about what to inspect, preserve, or avoid

### Freshness and Drift Detection

Help users decide when to update the Cartodex map.

Possible signals:

- files or directories moved since the last map
- tests added, removed, or reorganized
- package scripts, dependencies, or toolchain files changed
- generated templates or installed Cartodex assets changed
- new architectural areas appeared

### Scenarios and Data Flows

Preserve reusable implementation paths and product flows so agents can reuse known context.

Examples:

- adding a new CLI command
- changing scanner behavior
- updating generated templates
- tracing user input through command parsing, scanning, output, and tests

### Task Briefs

Generate task-specific context before an agent edits code.

A brief should identify:

- likely files and modules to inspect
- relevant conventions
- expected tests and validation commands
- nearby scenarios or data flows
- risks and stale-map warnings

### Spec-Driven Development Integration

Provide repository-aware context during spec-driven development.

Cartodex should help:

- draft implementation-aware specs
- attach relevant conventions to specs
- identify likely files, tests, and risks
- preserve scenarios and data flows as spec context
- update repository memory after implementation

## Open Questions

- What should be generated, manually curated, or proposed for review?
- Should stale-map detection be command-driven, hook-based, or agent-invoked?
- What format should scenarios and data flows use?
- How should Cartodex context attach to specs without depending on one spec format?
- Which signals are strong enough to say the map should be refreshed?
