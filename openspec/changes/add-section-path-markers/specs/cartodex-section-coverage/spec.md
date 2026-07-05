## ADDED Requirements

### Requirement: Generated maps declare section path coverage
Cartodex map generation workflows SHALL write a `<!-- cartodex:paths ... -->` marker directly under each structural map section heading.

#### Scenario: Module section declares covered paths
- **WHEN** Cartodex writes a structural map section for a repository module
- **THEN** the first non-blank content after the section heading is a `cartodex:paths` marker
- **AND** the marker lists one or more repo-relative paths covered by that section

#### Scenario: Directory coverage is explicit
- **WHEN** a section covers a directory subtree
- **THEN** the marker path for that directory ends with `/`
- **AND** the marker represents coverage for files beneath that directory

#### Scenario: File coverage is explicit
- **WHEN** a section covers a single file
- **THEN** the marker path is the repo-relative file path without a trailing `/`

### Requirement: Update mode preserves section markers
Cartodex update mode SHALL preserve existing section path markers for sections whose coverage does not change.

#### Scenario: Section prose changes but coverage remains
- **WHEN** update mode rewrites the prose for an existing section
- **AND** the section still covers the same repository paths
- **THEN** the rewritten section keeps the same `cartodex:paths` marker

#### Scenario: Section coverage changes
- **WHEN** update mode changes which repository paths a section covers
- **THEN** the rewritten section updates the `cartodex:paths` marker to match the new coverage

### Requirement: Marker parser exposes marked and unmarked sections
Cartodex SHALL provide an internal parser for map section path markers that returns marked sections and reports structural sections without markers.

#### Scenario: Parser reads marker paths
- **WHEN** the parser receives Markdown containing a structural heading followed by `<!-- cartodex:paths src/scanner/ src/cli.ts -->`
- **THEN** it returns that section with marker paths `src/scanner/` and `src/cli.ts`
- **AND** it includes enough section metadata for callers to identify the heading and source line

#### Scenario: Parser tolerates unmarked sections
- **WHEN** the parser receives Markdown containing a structural heading without a following `cartodex:paths` marker
- **THEN** it reports that section as unmarked
- **AND** it does not throw solely because the marker is missing

#### Scenario: Parser keeps matching policy simple
- **WHEN** the parser reads marker paths
- **THEN** it treats paths ending in `/` as directory prefixes
- **AND** it treats paths without a trailing `/` as literal file paths
- **AND** it does not interpret gitignore-style globs
