# Repository Guidelines

## Project Structure & Module Organization

Cartodex is an npm-workspaces repository with two published TypeScript packages. `packages/cartodex/` contains the `cartodex` CLI and repository-asset templates: `src/cli.ts` is the executable entry point, `src/commands/` contains CLI commands, and `src/init/` handles repository asset installation. `packages/runtime/` contains the publishable `@cartodex/runtime` scanner implementation under `src/scanner/` and exposes it through `src/index.ts`. Each package owns its tests and generated `dist/` output; never edit `dist/` by hand.

## Build, Test, and Development Commands

- `npm install`: install all workspace dependencies using the committed root `package-lock.json`.
- `npm run build`: compile all publishable workspaces into their package-local `dist/` directories.
- `npm test`: run the Vitest suites for all workspaces once.
- `npm run typecheck`: type-check all workspaces without emitting files.
- `npm run pack:cartodex`: preview the `cartodex` workspace package contents after a successful build.
- `npm run pack:runtime`: preview the `@cartodex/runtime` workspace package contents after a successful build.

The package requires Node.js `>=20` and uses npm as its package manager.

## Coding Style & Naming Conventions

Use TypeScript ES modules with explicit `.js` extensions in relative imports, matching the existing NodeNext setup. Keep `strict` TypeScript compatibility. Follow the current style: two-space indentation, double quotes, semicolons, and small named functions for reusable logic. Use kebab-case for generated scripts and template filenames, and descriptive camelCase names for TypeScript functions and variables.

## Testing Guidelines

Tests use Vitest and are named `*.test.ts`. Place CLI and init tests under `packages/cartodex/tests/`; place scanner/runtime tests under `packages/runtime/tests/`. Prefer focused tests that exercise public behavior: CLI argument parsing, scanner filtering, template installation, and filesystem edge cases. Run `npm test` before opening a pull request, and run `npm run build` when changes touch either package's source or packaged templates.

## Commit & Pull Request Guidelines

Recent commits use short, imperative summaries such as `Add npm package metadata` or version-oriented messages like `v1.4.0: Add UV inline script dependencies`. Keep commits focused and avoid bundling unrelated refactors. Pull requests should explain the user-facing change, list validation performed (`npm test`, `npm run build`), link related issues when available, and mention any template or generated-file updates.

## Security & Configuration Tips

Do not commit local secrets, npm tokens, or user-specific Codex configuration. Be careful when changing `packages/cartodex/src/templates/AGENTS.cartodex.md` or files under `.codex`/`.agents` templates, because `cartodex init` installs them into user repositories.

## Generated Cartodex Assets

Do not directly edit installed Cartodex skill files under `.agents/skills/cartodex/`. Change the source templates under `packages/cartodex/src/templates/` instead, then let `cartodex init` install or refresh the managed skill assets.

Do not update `docs/CARTODEX_MAP.md` as part of ordinary code changes. Treat the map as generated documentation and refresh it only by running Cartodex as a separate mapping/update step.

<!-- CARTODEX:START -->
## Cartodex Map

This repository can be navigated with the generated Cartodex map at [docs/CARTODEX_MAP.md](docs/CARTODEX_MAP.md).

When you need architecture, module ownership, data flow, conventions, or common change paths, read that map before broad code exploration. If the map is missing or stale, ask Codex to use Cartodex to map or update this codebase.
<!-- CARTODEX:END -->
