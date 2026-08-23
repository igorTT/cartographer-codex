## 1. Template Contract

- [x] 1.1 Update `src/templates/skill/resources/cartodex-map-structure.md` so generated map frontmatter includes required `mapped_sha`.
- [x] 1.2 Update `src/templates/skill/SKILL.md` so full mapping and refresh flows capture `git rev-parse HEAD` and write it as `mapped_sha`.
- [x] 1.3 Update `src/templates/skill/SKILL.md` so update mode uses `git diff --name-only <mapped_sha>..HEAD`.
- [x] 1.4 Update `src/templates/skill/SKILL.md` so maps without `mapped_sha` stop update mode with an old-format error and direct agents to `resources/update-guide.md`.

## 2. Update Guide Resource

- [x] 2.1 Add `src/templates/skill/resources/update-guide.md` with old-format handling guidance for timestamp-only maps.
- [x] 2.2 Register `update-guide.md` in the init template manifest so `cartodex init` installs it with managed resources.
- [x] 2.3 Ensure the installed skill references the update guide only for old-format or migration situations.

## 3. Documentation And Tests

- [x] 3.1 Update README examples and update-mode documentation to describe `mapped_sha` and SHA-based update behavior.
- [x] 3.2 Add or update template tests that assert `mapped_sha`, `git rev-parse HEAD`, `git diff --name-only`, old-format error guidance, and update-guide installation.
- [x] 3.3 Run `npm test`.
- [x] 3.4 Run `npm run build`.
