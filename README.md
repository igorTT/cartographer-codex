# Cartodex

Cartodex is a standalone Codex-first package for mapping codebases. It
initializes repository-local Codex assets that help map a codebase with a
skill-driven workflow: scan the repository, delegate focused analysis to
subagents, synthesize their reports, and write a navigable Markdown map. By
default the map is written to `docs/CARTODEX_MAP.md`, and projects can choose a
different path with `cartodex.config.json`.

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

Then open a fresh Codex thread so the repo-local skill and project agent are
loaded, and ask:

```text
Use Cartodex to map this codebase.
```

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

## Configuration

Create `cartodex.config.json` at the repository root to customize where the map
is written or to exclude files from Cartodex without changing `.gitignore`:

```json
{
  "mapPath": "docs/CARTODEX_MAP.md",
  "ignore": ["docs/private/", "local-notes.md", "*.scratch.ts"],
  "scoutAgent": {
    "model": "gpt-5.4-mini",
    "reasoningEffort": "medium"
  }
}
```

`mapPath` defaults to `docs/CARTODEX_MAP.md`. It must be a repo-relative
Markdown path, stay inside the repository, and end with `.md`.

`ignore` patterns are applied after the root `.gitignore` and use
`.gitignore`-style matching, including anchored paths, directory suffixes,
globs, and `!` negation.

`scoutAgent.model` defaults to `gpt-5.4-mini`. Set it to another Codex-supported
model, such as `gpt-5.3-codex-spark` on eligible Pro plans, to change the
installed read-only scout agent. `scoutAgent.reasoningEffort` defaults to
`medium`.

If you add or change `mapPath`, `scoutAgent.model`, or
`scoutAgent.reasoningEffort` after installing Cartodex, rerun `npx cartodex
init` so the managed files match the configured values.

The installed skill also includes `resources/configuration-guide.md`, a
user-facing draft guide for configuration philosophy, common recipes, and
choosing the smallest useful setting for a repository.

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
for narrow codebase exploration tasks. The scout prompt is an original
Codex-specific prompt written for Cartodex; it does not vendor text from
third-party agent prompts.

## Attribution

Cartodex is independently maintained as a Codex/npm package by Igor TT. It is
adapted from the original Cartographer project and keeps upstream attribution
clear.

## License

MIT
