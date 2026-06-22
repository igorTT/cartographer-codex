---
name: prepare-release
description: Prepare a repository release by determining or asking for the target version, bumping version fields, validating with tests/build/package dry-run, committing, pushing, merging to main, tagging, and leaving the package ready to publish. Use when the user asks to bump a version, prepare a release, cut a release, merge release work, tag a version, or get an npm/package repository ready for publication.
---

# Prepare Release

## Workflow

Use this skill for repository release preparation. Follow the repository's local instructions first, then adapt this workflow to the package manager and project conventions already present.

1. Determine the target version.
   - Use the version explicitly provided by the user.
   - If the current dialog already makes the version clear, use that version.
   - If no version is available, ask the user for the target version before editing files.
   - Prefer the repository's versioning convention. For npm packages, update both `package.json` and `package-lock.json` when present.

2. Inspect state before changing anything.
   - Run `git branch --show-current`, `git status --short`, and inspect relevant version files.
   - Identify unrelated untracked or modified files and leave them alone.
   - If staged changes already exist, preserve them and add only release-related files.
   - Use a release branch named `chore/release-vX.Y.Z`, for example `chore/release-v1.2.3`.
   - Create the release branch from an up-to-date `dev` branch.

3. Bump version fields consistently.
   - Update package metadata and lockfiles.
   - Update any CLI-visible hardcoded version strings when the project has them.
   - Search for the previous version with `rg` to catch obvious drift.
   - Regenerate generated artifacts if the repository build process expects it.

4. Validate before committing.
   - Run the repository's test command.
   - Run the build command when source or packaged artifacts changed.
   - Run the package dry-run command before publishing readiness, such as `npm pack --dry-run` for npm packages.
   - If a command fails because of sandbox/cache/network permissions and it is needed for release prep, rerun it with the required approval.

5. Commit and push.
   - Stage only release-related files.
   - Use an imperative or version-oriented commit message matching repository history, such as `v1.2.3: Prepare release`.
   - Push the working branch.

6. Merge to the primary branch, or open a release PR.
   - Use the repository's primary branch, usually `main`, unless the user or repo says otherwise.
   - Switch to the primary branch, update it with `git pull --ff-only`, then prefer a fast-forward merge from the release branch.
   - Push the primary branch after a successful merge.
   - If the primary branch is protected or rejects direct pushes, do not force-push or bypass protection. Open a PR from the release branch to the primary branch instead.
   - If repository policy blocks immediate merge because review, checks, or other requirements are pending, leave the PR open and report the blocker.
   - If auto-merge is unavailable or disabled, report that manual merge is required after branch protection requirements pass.
   - If a local fast-forward merge succeeded but the push was rejected by branch protection, treat the remote primary branch as the source of truth and leave tagging for after the PR is merged.

7. Tag the release.
   - Match existing tag style. If prior tags are lightweight `vX.Y.Z`, create the same style.
   - Create and push the tag only after the release commit is present on the remote primary branch.
   - If the release PR is still open or blocked, do not create the tag yet. Report the pending tag name and the condition required before tagging.

8. Prepare to publish.
   - Confirm `npm pack --dry-run` or the equivalent package dry-run passes and report package name, version, and notable tarball details.
   - Do not run the actual publish command unless the user explicitly asks to publish.
   - End with the final branch, commit, tag, validation performed, and any remaining unrelated local files.

## Git Safety

Never discard or overwrite unrelated user changes. If unrelated files are present, leave them unstaged and mention them in the final status.

Prefer non-interactive Git commands. Do not use destructive commands such as `git reset --hard` or `git checkout --` unless the user explicitly requests them.

When merging, prefer `--ff-only` if the release branch is directly ahead of the primary branch. If fast-forward is not possible, inspect the divergence and choose the least surprising repository-appropriate merge strategy.

## Final Response

Keep the release handoff concise. Include:

- target version
- commit hash and message
- pushed branch and primary branch
- PR URL and blocker status when primary-branch protection prevents direct merge
- tag pushed, or tag pending because the release PR is not merged yet
- validations run
- publish-readiness result
- remaining local changes, if any
