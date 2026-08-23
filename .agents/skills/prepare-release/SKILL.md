---
name: prepare-release
description: Prepare a Cartodex monorepo release by coordinating the independently versioned cartodex and @cartodex/runtime packages, validating their tarballs, and handling the runtime-first publication boundary when the installer adopts a new runtime. Use when the user asks to bump a version, prepare or cut a release, merge release work, tag a version, or get Cartodex ready for npm publication.
---

# Prepare Release

## Cartodex Release Invariants

- Version `cartodex` and `@cartodex/runtime` independently according to the changes in each package. A coordinated release may use versions such as `cartodex@0.4.0` with `@cartodex/runtime@0.1.0`.
- Pin the exact published `@cartodex/runtime` version consumed by the installer in `packages/cartodex/src/templates/skill/scripts/tools/package.json`.
- Treat the nested tools `package-lock.json` as a shipped runtime asset. Generate it with npm from the published runtime; never hand-edit its registry URL or integrity.
- When `cartodex` adopts an unpublished runtime version, publish `@cartodex/runtime` first. The installer cannot be declared registry-ready until its nested lockfile has been regenerated and verified against that published runtime.
- Treat the root `package-lock.json` as monorepo development state, not as a file shipped by either package.

## Workflow

Use two release stages when the installer adopts a new runtime because its shipped lockfile cannot be finalized until that runtime exists on npm. Runtime-only and installer-only releases do not need artificial companion version bumps.

1. Determine the package targets.
   - Identify which package or packages are being released and use the versions explicitly provided by the user or already established in the dialog.
   - If a required version is unavailable, ask before editing files.
   - Choose each version independently. For the first runtime release alongside the next Cartodex feature release, `@cartodex/runtime@0.1.0` and `cartodex@0.4.0` are valid targets.
   - Record the exact published runtime version that the installer will consume, whether it is new in this release or already available.

2. Inspect state and prepare the release branch.
   - Run `git branch --show-current`, `git status --short`, and inspect all relevant manifests and lockfiles.
   - Preserve unrelated changes and stage only release work.
   - Use a package-specific release branch such as `chore/release-runtime-vX.Y.Z` or `chore/release-cartodex-vX.Y.Z`, created from the repository's up-to-date release base branch. A coordinated release may use a concise branch name that identifies both stages.

3. Prepare the runtime stage when a runtime release is required.
   - Bump `packages/runtime/package.json` and its workspace entry in the root lockfile.
   - Search for the previous version and update runtime-facing documentation or metadata that must match it.
   - Run tests, type-checking, the build, and `npm run pack:runtime`.
   - Inspect the runtime tarball for compiled ESM, declarations, production metadata, license, and notice. It must not contain workspace-only files or a binary.
   - Commit and push the runtime candidate. Get that commit onto the primary branch through the repository's normal merge or PR process before publication.

4. Cross the runtime publication boundary only with explicit authorization when publishing a new runtime.
   - Without authorization to publish, stop here. Report that runtime publication and any installer stage adopting it are still pending; do not claim that `cartodex` is registry-ready.
   - With authorization, publish `@cartodex/runtime`, then verify that the exact version and tarball metadata are available from npm.
   - Record the runtime package version and source commit independently from the installer version.

5. Prepare the installer stage after its selected runtime is available.
   - Bump `packages/cartodex/package.json` and its workspace entry in the root lockfile to the independently selected installer version.
   - Pin the exact selected runtime version in the nested tools `package.json`; it does not need to match the installer version.
   - From the nested tools directory, regenerate `package-lock.json` with npm against the published runtime. Verify its registry URL and integrity; never copy or fabricate those values.
   - Search for the previous version and update CLI-visible metadata or documentation when required.
   - Run tests, type-checking, the build, `npm run pack:runtime`, and `npm run pack:cartodex`.
   - Confirm the `cartodex` tarball contains the thin launcher, nested manifests, and `.gitignore` template without `node_modules`, install stamps, or a bundled scanner implementation.
   - Run a cold and warm temporary-consumer smoke test when the bootstrap or nested lockfile changed.

6. Commit and push the completed release.
   - Stage only release-related files and use the repository's version-oriented commit style.
   - Push the release branch, including the registry-generated nested lockfile.

7. Merge to the primary branch, or open a release PR.
   - Prefer the repository's normal primary-branch and review workflow. Use fast-forward merges when appropriate.
   - Never bypass branch protection or force-push. If review or checks are pending, leave the PR open and report the blocker.
   - Treat the remote primary branch as the source of truth before tagging.

8. Tag and optionally publish the installer.
   - Create and push the repository's normal `vX.Y.Z` tag for the installer version only after all required runtime and installer stages are present on the remote primary branch.
   - Publish `cartodex` only with explicit user authorization and only after the runtime and nested lockfile are verified.
   - Track any runtime tag or release record independently according to the repository's runtime release convention.
   - End with the final branch, runtime and installer versions and commits, tag status, validations, publication status for each package, and any remaining unrelated local files.

## Git Safety

Never discard or overwrite unrelated user changes. If unrelated files are present, leave them unstaged and mention them in the final status.

Prefer non-interactive Git commands. Do not use destructive commands such as `git reset --hard` or `git checkout --` unless the user explicitly requests them.

When merging, prefer `--ff-only` if the release branch is directly ahead of the primary branch. If fast-forward is not possible, inspect the divergence and choose the least surprising repository-appropriate merge strategy.

## Final Response

Keep the release handoff concise. Include:

- target version for each package in scope
- commit hash and message
- pushed branch and primary branch
- PR URL and blocker status when primary-branch protection prevents direct merge
- tag pushed, or tag pending because the release PR is not merged yet
- validations run
- publish/readiness result for both `@cartodex/runtime` and `cartodex`
- remaining local changes, if any
