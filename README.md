# Cartodex

Cartodex is a standalone Codex-first package for mapping codebases. It
initializes repository-local Codex assets that help map a codebase with a
skill-driven workflow: scan the repository, delegate focused analysis to
subagents, synthesize their reports, and write `docs/CARTODEX_MAP.md`.

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
assets are current.

## How It Works

The installed skill runs:

```bash
node .agents/skills/cartodex/scripts/scan-codebase.mjs . --format json
```

The scanner respects common generated/dependency ignores, the repository root
`.gitignore`, and optional root `cartodex.config.json` ignore patterns. It skips
binary and very large files, and estimates tokens with `js-tiktoken`. The skill
uses scanner output to plan parallel subagent assignments, then writes or
updates `docs/CARTODEX_MAP.md` using the installed map structure resource.

To exclude files from Cartodex without adding them to `.gitignore`, create
`cartodex.config.json` at the repository root:

```json
{
  "ignore": ["docs/private/", "local-notes.md", "*.scratch.ts"]
}
```

`ignore` patterns use `.gitignore`-style matching, including anchored paths,
directory suffixes, globs, and `!` negation.

If `docs/CARTODEX_MAP.md` already exists, Cartodex uses its `last_mapped`
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

If Cartodex helped you, consider starring the original project:
https://github.com/kingbootoshi/cartographer - please!

## License

MIT
