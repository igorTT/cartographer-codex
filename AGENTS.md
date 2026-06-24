# Repository Guidelines

## Project Structure & Module Organization

Cartodex is a TypeScript CLI package. Source files live in `src/`: `src/cli.ts` is the executable entry point, `src/commands/` contains CLI commands, `src/init/` handles repository asset installation, and `src/scanner/` contains the codebase scanner. Package templates are stored in `src/templates/`, including the bundled scanner script generated at `src/templates/skill/scripts/scan-codebase.mjs`. Tests live in `tests/` and mirror the feature area they cover. `dist/` is build output and should not be edited by hand.

## Build, Test, and Development Commands

- `npm install`: install dependencies using the committed `package-lock.json`.
- `npm run build`: bundle the scanner template with esbuild, then compile TypeScript into `dist/`.
- `npm run build:scanner`: regenerate only `src/templates/skill/scripts/scan-codebase.mjs`.
- `npm test`: run the Vitest test suite once.
- `npm pack --dry-run`: preview the npm package contents after a successful build.

The package requires Node.js `>=20` and uses npm as its package manager.

## Coding Style & Naming Conventions

Use TypeScript ES modules with explicit `.js` extensions in relative imports, matching the existing NodeNext setup. Keep `strict` TypeScript compatibility. Follow the current style: two-space indentation, double quotes, semicolons, and small named functions for reusable logic. Use kebab-case for generated scripts and template filenames, and descriptive camelCase names for TypeScript functions and variables.

## Testing Guidelines

Tests use Vitest and are named `*.test.ts`. Place new tests under `tests/`, grouped by feature such as `tests/scanner/scan-codebase.test.ts`. Prefer focused tests that exercise public behavior: CLI argument parsing, scanner filtering, template installation, and filesystem edge cases. Run `npm test` before opening a pull request, and run `npm run build` when changes touch `src/` or packaged templates.

## Commit & Pull Request Guidelines

Recent commits use short, imperative summaries such as `Add npm package metadata` or version-oriented messages like `v1.4.0: Add UV inline script dependencies`. Keep commits focused and avoid bundling unrelated refactors. Pull requests should explain the user-facing change, list validation performed (`npm test`, `npm run build`), link related issues when available, and mention any template or generated-file updates.

## Security & Configuration Tips

Do not commit local secrets, npm tokens, or user-specific Codex configuration. Be careful when changing `src/templates/AGENTS.cartodex.md` or files under `.codex`/`.agents` templates, because `cartodex init` installs them into user repositories.

<!-- CARTODEX:START -->
## Cartodex Map

This repository can be navigated with the generated Cartodex map at [CARTODEX_MAP.md](CARTODEX_MAP.md).

When you need architecture, module ownership, data flow, conventions, or common change paths, read that map before broad code exploration. If the map is missing or stale, ask Codex to use Cartodex to map or update this codebase.
<!-- CARTODEX:END -->
