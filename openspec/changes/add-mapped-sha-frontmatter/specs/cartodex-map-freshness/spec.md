## ADDED Requirements

### Requirement: Generated maps record a git baseline
Cartodex map generation and refresh workflows SHALL write a `mapped_sha` frontmatter field containing the full git commit SHA used as the map baseline.

#### Scenario: Fresh map records mapped SHA
- **WHEN** Cartodex writes a new map in a git repository
- **THEN** the map frontmatter includes `mapped_sha: <full commit sha>`
- **AND** the map frontmatter still includes `last_mapped`, `total_files`, and `total_tokens`

#### Scenario: Refreshed map updates mapped SHA
- **WHEN** Cartodex refreshes an existing map with current-format frontmatter
- **THEN** the refreshed map frontmatter updates `mapped_sha` to the current `HEAD` commit SHA
- **AND** the visible "Last mapped" text continues to match `last_mapped`

### Requirement: Update mode uses SHA-based change detection
Cartodex update mode SHALL use the `mapped_sha` frontmatter value as the git baseline for changed-file detection.

#### Scenario: Current-format map is updated
- **WHEN** update mode reads an existing map with `mapped_sha`
- **THEN** it uses `git diff --name-only <mapped_sha>..HEAD` to identify changed files
- **AND** it does not use `last_mapped` or `git log --since` for change detection

### Requirement: Old timestamp-only maps are rejected
Cartodex update mode SHALL stop with an old-format error when an existing map lacks `mapped_sha`.

#### Scenario: Existing map lacks mapped SHA
- **WHEN** update mode reads an existing map without `mapped_sha`
- **THEN** it stops update mode with an old-format error
- **AND** it directs the agent to read `resources/update-guide.md`
- **AND** it does not use `last_mapped` or `git log --since` as fallback change detection

### Requirement: Update guide is installed with Cartodex assets
Cartodex init SHALL install an `update-guide.md` resource with guidance for handling old Cartodex map and asset formats.

#### Scenario: Cartodex assets are installed
- **WHEN** `cartodex init` installs managed skill resources
- **THEN** `.agents/skills/cartodex/resources/update-guide.md` exists
- **AND** the installed Cartodex skill references the guide when old formats are detected

#### Scenario: Old timestamp-only map guidance is available
- **WHEN** an agent reads `resources/update-guide.md`
- **THEN** the guide identifies maps without `mapped_sha` as old format
- **AND** it instructs agents not to run normal update mode against timestamp-only maps
