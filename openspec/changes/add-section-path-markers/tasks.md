## 1. Template Contract

- [x] 1.1 Update `src/templates/skill/resources/cartodex-map-structure.md` to show `<!-- cartodex:paths ... -->` directly under structural section headings.
- [x] 1.2 Document marker path rules in the map structure resource: repo-relative paths, trailing `/` for directory subtrees, and no glob semantics in this change.
- [x] 1.3 Update `src/templates/skill/SKILL.md` so full-map synthesis emits one marker per structural section.
- [x] 1.4 Update `src/templates/skill/SKILL.md` so update mode preserves markers for unchanged coverage and revises markers when coverage changes.

## 2. Marker Parser

- [x] 2.1 Add an internal parser module under `src/map/` for reading Cartodex section path markers from Markdown.
- [x] 2.2 Return marked sections with heading text, heading level, source line, and marker paths.
- [x] 2.3 Return unmarked structural sections without throwing solely because markers are absent.
- [x] 2.4 Represent marker paths as simple repo-relative entries, distinguishing directory prefixes by trailing `/` and file paths by no trailing `/`.

## 3. Tests And Documentation

- [x] 3.1 Add Vitest coverage for parsing marked sections with file and directory paths.
- [x] 3.2 Add Vitest coverage for reporting unmarked structural sections.
- [x] 3.3 Add template assertions that generated map guidance includes `cartodex:paths` marker syntax and marker preservation instructions.
- [x] 3.4 Update README only if the implementation introduces user-facing behavior beyond installed map guidance.

## 4. Verification

- [x] 4.1 Run `npm test`.
- [x] 4.2 Run `npm run build`.
