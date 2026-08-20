# Cartodex

[![npm](https://img.shields.io/npm/v/cartodex)](https://www.npmjs.com/package/cartodex)
[![license](https://img.shields.io/npm/l/cartodex)](LICENSE)

Cartodex is a standalone Codex-first package for mapping codebases. It
installs a repo-local Codex skill that scans your project, asks focused
subagents to inspect the important areas, and writes a navigable architecture
map for future Codex threads.

Cartodex is distributed as an npm package, not as a Codex plugin.

## Install

Run this inside the git repository you want to map:

```bash
npx cartodex init
```

The command installs:

```text
.agents/skills/cartodex/
  SKILL.md
  resources/
    cartodex-map-structure.md
    configuration-guide.md
    subagent-report-format.md
  scripts/
    scan-codebase.mjs

.codex/agents/
  cartodex-scout.toml

AGENTS.md
```

Then open a fresh Codex thread so the repo-local skill and read-only scout
agent are loaded, and ask:

```text
Use Cartodex to map this codebase.
```

## Quick Example

Cartodex writes the map to `docs/CARTODEX_MAP.md` by default. The result is a
Markdown guide Codex can read before changing the repository:

```markdown
---
cartodex_version: 0.3.1
last_mapped: 2026-06-25T19:25:02Z
map_path: docs/CARTODEX_MAP.md
---

# Cartodex Map

## Repository Overview

Cartodex is a TypeScript CLI that installs repository-local Codex assets for
codebase mapping. The scanner summarizes files, ignore rules, and token counts;
the Cartodex skill turns that scan into focused subagent assignments and a
durable Markdown map.

## Common Change Paths

| Change | Start Here |
| --- | --- |
| Add or adjust CLI behavior | `src/cli.ts`, `src/commands/` |
| Change installed skill assets | `src/templates/skill/` |
```

Once the map exists, ask things like:

```text
Read the Cartodex map, then add support for a new scanner ignore pattern.
```

## Configuration

Create `cartodex.config.json` at the repository root to customize where the map
is written or to exclude files from Cartodex without changing `.gitignore`:

```json
{
  "mapPath": "docs/CARTODEX_MAP.md",
  "ignore": ["docs/private/", "local-notes.md", "*.scratch.ts"],
  "scoutAgent": {
    "model": "gpt-5.6-luna",
    "reasoningEffort": "high"
  }
}
```

`mapPath` defaults to `docs/CARTODEX_MAP.md`. It must be a repo-relative
Markdown path, stay inside the repository, and end with `.md`.

`ignore` patterns are applied after the root `.gitignore` and use
`.gitignore`-style matching, including anchored paths, directory suffixes,
globs, and `!` negation.

`scoutAgent.model` defaults to `gpt-5.6-luna`. Set it to another Codex-supported
model, such as `gpt-5.3-codex-spark` on eligible Pro plans, to change the
installed read-only scout agent. `scoutAgent.reasoningEffort` defaults to
`high`.

If you add or change `mapPath`, `scoutAgent.model`, or
`scoutAgent.reasoningEffort` after installing Cartodex, rerun `npx cartodex
init` so the managed files match the configured values.

The installed skill also includes `resources/configuration-guide.md`, a
user-facing draft guide for configuration philosophy, common recipes, and
choosing the smallest useful setting for a repository.

## Init Behavior

`init` is safe to rerun:

- Missing Cartodex-managed files are restored.
- Current files are left unchanged.
- Changed managed files are not overwritten unless `--force` is provided.
- Existing unrelated `AGENTS.md` content is preserved.

Useful commands:

```bash
npx cartodex init
npx cartodex init --check
npx cartodex init --force
```

`--check` performs a dry run and exits with `0` only when installed Cartodex
assets are current. Because `init` renders the configured map path into
`AGENTS.md`, changing `cartodex.config.json` may make `AGENTS.md` stale; rerun
`npx cartodex init --force` to refresh managed Cartodex files.

## How It Works

The installed skill runs:

```bash
node .agents/skills/cartodex/scripts/scan-codebase.mjs . --format json
```

The scanner respects common generated/dependency ignores, the repository root
`.gitignore`, and optional root `cartodex.config.json` ignore patterns. It also
omits Cartodex's installed scanner script and the config file itself from scan
output. It includes directory token summaries so agents do not have to
recompute nested totals. It skips binary and very large files, and estimates
tokens with `js-tiktoken`. The skill uses scanner output to plan parallel
subagent assignments, then writes or updates the configured map path using the
installed map structure resource.

If the configured map path already exists, Cartodex uses its `last_mapped`
frontmatter plus git history when available to focus update work on changed
areas.

## Scout Agent

`init` installs `.codex/agents/cartodex-scout.toml`, a read-only project agent
for narrow codebase exploration tasks.

## Attribution

Cartodex is independently maintained as a Codex/npm package by Igor TT. It is
adapted from the original
[Cartographer](https://github.com/kingbootoshi/cartographer) project by
Bootoshi and keeps upstream attribution in [NOTICE.md](NOTICE.md).

## License

MIT
