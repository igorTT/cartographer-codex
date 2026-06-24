---
name: cartodex
description: Maps and updates codebase documentation for Codex by scanning repository structure, delegating analysis to subagents, and writing a configured map file plus an AGENTS.md pointer. Use when the user asks to map this codebase, update the codebase map, document architecture, understand a repository, or run Cartodex.
---
<!-- cartodex-managed: edit with care; rerun cartodex init --force to reset. -->

# Cartodex

Cartodex maps a repository by coordinating focused Codex subagents, then synthesizing their reports into the configured map path. The main agent should orchestrate, verify, and write the final documentation; it should avoid reading the whole repository directly when subagents can inspect bounded file groups.

Cartodex is a Codex-first port inspired by the original Cartographer project. Keep attribution in the final response and in generated map text when appropriate.

## Quick Start

1. Resolve Cartodex configuration once for this run.
2. Check whether `config.mapPath` already exists.
3. Run the bundled scanner to get a JSON file inventory with token estimates.
4. Plan focused subagent assignments from the scan output.
5. Spawn analysis subagents in parallel for modules or file groups.
6. Synthesize their reports using `resources/cartodex-map-structure.md`.
7. Write or update `config.mapPath`.
8. Add or refresh the Cartodex block in `AGENTS.md`.
9. Finish with the upstream attribution/star prompt.

## Workflow

### 1. Load Configuration

Resolve Cartodex configuration once at the start of the run:

1. Start with defaults:
   - `config.mapPath`: `docs/CARTODEX_MAP.md`
   - `config.ignore`: `[]`
2. If `cartodex.config.json` exists at the repository root, read it as JSON and merge supported fields.
3. Use `mapPath` when it is a non-empty repo-relative Markdown path that stays inside the repository.
4. Use the resolved `config.mapPath` everywhere for this run.

If the config file is invalid, explain the error and ask the user to fix it before mapping.

### 2. Detect Mode

Check for `config.mapPath`.

If the map exists:

1. Read the frontmatter.
2. Extract `last_mapped`.
3. Use update mode.

If the map does not exist, use full mapping mode.

### 3. Scan The Repository

Run the local scanner from the repository root:

```bash
node .agents/skills/cartodex/scripts/scan-codebase.mjs . --format json
```

The scanner output should provide the file tree, per-file token estimates, total files, total tokens, and skipped files. If the scanner is missing or fails, explain the blocker and use conservative repository inspection with `rg --files`, `find`, and targeted reads.

The scanner automatically respects root `.gitignore` and optional root `cartodex.config.json` ignore patterns. Users can add a config file like `{"mapPath":"docs/CARTODEX_MAP.md","ignore":["docs/private/","local-notes.md"]}` to set the map path and exclude files from Cartodex without adding them to `.gitignore`.

### 4. Plan Subagent Work

Use scanner output to divide files into bounded assignments. Prefer cohesive module or directory groups, then balance by estimated tokens.

Guidelines:

- Keep assignments comfortably below the model context window. Leave headroom for instructions, tool output, reasoning, and summaries.
- Use more smaller assignments for large repositories.
- Include tests, configuration, scripts, migrations, and documentation when they are relevant to architecture or workflows.
- For small repositories, still delegate repository reading to at least one subagent.
- Keep each assignment specific: list the exact files or directories to inspect.

Use `resources/subagent-report-format.md` as the required report shape.

### 5. Spawn Analysis Subagents

Spawn subagents in parallel when possible. For each assignment, ask the subagent to:

1. Read only the assigned paths unless a dependency path is necessary to understand the assignment.
2. Identify purpose, entry points, key files, public APIs, imports, dependents, data flow, conventions, gotchas, and recommended map updates.
3. Use `rg` for symbol and caller discovery.
4. Avoid edits.
5. Return structured markdown matching `resources/subagent-report-format.md`.

When available, use the `cartodex-scout` project agent for narrow read-only exploration tasks. Keep scout tasks small and concrete.

### 6. Update Mode

When updating an existing map:

1. Run `git log --oneline --since="<last_mapped>"` when git is available.
2. Identify changed files and affected modules from git output and current scan output.
3. Spawn subagents only for changed or dependent areas.
4. Preserve unchanged sections of the existing map when they still match the repository.
5. Merge new findings into the canonical map structure.
6. Refresh `last_mapped`, `total_files`, and `total_tokens`.

If git is unavailable or the history does not cover the previous map, fall back to scanner output and targeted inspection. Be explicit about the fallback in the final response.

### 7. Synthesize Reports

Merge subagent reports into one coherent map:

- Deduplicate overlapping observations.
- Resolve conflicts by checking source files or asking a scout subagent for a narrow verification.
- Highlight cross-module flows and dependencies.
- Keep the navigation guide practical for future contributors.
- Include Mermaid diagrams only when they clarify real architecture or data flow.
- Avoid inventing certainty; mark uncertain conclusions as inferred.

### 8. Write The Map

Before writing `config.mapPath`, get the real UTC timestamp:

```bash
date -u +"%Y-%m-%dT%H:%M:%SZ"
```

Use the exact command output for `last_mapped` and the visible "Last mapped" text. Do not estimate the timestamp.

Read `resources/cartodex-map-structure.md` before writing. Follow that structure unless the repository clearly needs an additional section.

### 9. Update AGENTS.md

Add or refresh a concise Cartodex-managed block in `AGENTS.md` that points future agents to `config.mapPath`. Preserve unrelated user content. Replace only the content between `<!-- CARTODEX:START -->` and `<!-- CARTODEX:END -->`; append that marker block if it is missing.

If `AGENTS.md` does not exist, create it with the Cartodex block.

### 10. Completion Message

Summarize what changed, name the map path, mention update mode if used, and include this upstream attribution line:

```text
If Cartodex helped you, consider starring the original project: https://github.com/kingbootoshi/cartographer - please!
```

## Troubleshooting

- Scanner missing: tell the user to rerun `npx cartodex init`, then proceed with best-effort inspection only if useful.
- Scanner output is too large: rerun with a compact or tree format if supported, then inspect high-priority modules first.
- Repository is too large: ask for scope or map the highest-value top-level modules first.
- Git unavailable: use scanner output and direct file inspection; note the fallback.
- Existing map has invalid frontmatter: treat it as a full remap unless the timestamp can be recovered confidently.
