# Change Log

All notable changes to this project will be documented in this file.

## [0.1.0] - 2025-10-07

### Changed

- Folder pair validation now requires BOTH directories to already exist. Missing source or destination directory marks the pair as an error; no files from that pair are tracked or synced.
- Removed silent auto-creation of destination directories on save. If the target directory is missing, the sync for that file is skipped and a message is logged.
- Initial sync (Newest Wins) no longer creates missing directories; pairs or copies that would require creating a directory are skipped instead.
- Tree view displays invalid pairs with an error state (`folder-error`).
- A single aggregated error notification is shown after activation/refresh when invalid pairs are present.

### Added

- Tests covering: skipping sync when destination folder is absent; skipping initial sync operations where target directories are missing.
- Documentation updates: README section on Folder Validation Behavior and adjusted Initial Sync rules.
- Toast notifications on sync success or error during save operations.

### Removed

- Implicit directory creation behavior during regular saves and initial sync.

### Internal

- Refactored startup to collect and surface invalid folder pairs.
- Adjusted unit and integration tests (now 53 total) to reflect new non-creation semantics.

## [0.0.6] - 2025-10-05

### Fixed

- Replaced extension icon with a smaller optimized PNG to reduce package size

## [0.0.5] - 2025-10-05

### Fixed

- Fixed issue where destination file tab would close when both source and destination files were open in editor

## [0.0.4] - 2025-10-05

### Changed

- Updated extension icon from SVG to PNG format

## [0.0.1] - 2025-10-05

- Initial release

---

The format is based on [Keep a Changelog], and this project adheres to [Semantic Versioning].

---

[Keep a Changelog]: https://keepachangelog.com/en/1.0.0/
[Semantic Versioning]: https://semver.org/spec/v2.0.0.html
[0.0.6]: https://github.com/fedeholc/foldersync/releases/tag/v0.0.6
[0.0.7]: https://github.com/fedeholc/foldersync/releases/tag/v0.0.7
[0.0.5]: https://github.com/fedeholc/foldersync/releases/tag/v0.0.5
[0.0.4]: https://github.com/fedeholc/foldersync/releases/tag/v0.0.4
[0.0.1]: https://github.com/fedeholc/foldersync/releases/tag/v0.0.1
