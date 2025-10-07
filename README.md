# foldersync - vscode extension

foldersync is a Visual Studio Code extension that synchronizes files between pairs of folders. It helps you mirror shared code across repositories without submodules, symlinks, or publishing a package.

## Features

- **Recursive Bidirectional Sync on Save**: All files (recursively) inside each configured folder pair are tracked. Saving a file copies it to its counterpart folder if contents differ.
- **On-Create Mapping Refresh**: Creating a file under a tracked folder updates the mapping; first save triggers the actual copy.
- **Delete Propagation**: Deleting a tracked file deletes its counterpart.
- **Rename Propagation**: Renaming a tracked file renames its counterpart to the same basename (overwriting if necessary).
- **Flexible Configuration**: Configure folder pairs in workspace settings or one/many `foldersync.config.json` files; paths can be relative or absolute.
- **Tree View**: Activity Bar view groups pairs from workspace settings and each config file; shows relative paths of paired files.
- **Commands**:
  - `foldersync.refreshView` – Rebuild mappings and refresh the tree.
  - `foldersync.openView` – Focus the foldersync view.
  - `foldersync.initialSyncLatest` – Perform a one-off initial sync where, for every tracked pair, the most recently modified file overwrites the older (or creates the missing counterpart). Useful as a first alignment before regular save-based sync.

## Warnings & Safety

- Overwrites are silent: the last saved (or renamed) file wins.
- Delete and rename propagation is immediate; there is no undo within the extension. Use version control for safety.
- If you rename a file and a counterpart file with the target name already exists, it will be overwritten.
- Directory-level renames in VS Code are treated as multiple file rename events; each file rename is propagated individually.
- No conflict resolution strategy beyond “who saved/renamed last”.

Always keep important content under version control before enabling aggressive sync operations.

## Extension Settings

FolderSync can be configured in two ways:

### 1. Workspace Settings

You can configure FolderSync by adding the `foldersync.folders` setting to your workspace configuration file (`.code-workspace`). This setting is an array of folder pairs to synchronize.

**Example:**

```json
{
  "settings": {
    "foldersync.folders": [
      ["/path/to/your/source/folder", "/path/to/your/destination/folder"],
      ["/another/source/folder", "/another/destination/folder"]
    ]
  }
}
```

### 2. `foldersync.config.json` Configuration File

You can also configure FolderSync by creating a `foldersync.config.json` file in the root of your workspace folder. This file should contain a JSON object with a `folders` property, which is an array of folder pairs to synchronize.

Paths in the `foldersync.config.json` file can be absolute or relative to the location of the file.

**Example `foldersync.config.json`:**

```json
{
  "folders": [
    ["./source", "./destination"],
    ["/path/to/another/source", "/path/to/another/destination"]
  ]
}
```

## Usage

1. Install the extension.
2. Configure folder pairs via workspace settings and/or `foldersync.config.json` files.
3. Open the Activity Bar view (command: `foldersync.openView`) to inspect tracked pairs.
4. Save a file: its counterpart is created/overwritten if content differs (hash-based comparison avoids redundant copies).
5. Delete a tracked file: counterpart is deleted.
6. Rename a tracked file: counterpart renamed (basename aligned, overwrite if exists).
7. Create a new file: mapping updates; first save copies it across.
8. (Optional) Run an initial bulk alignment: execute the command `foldersync.initialSyncLatest` to copy the newest side of every pair onto the older/missing counterpart. This is safe to run multiple times; only differing or absent files are overwritten/created.

### Status Bar Indicator

When the extension is active a left-side status bar item appears labeled `foldersync` with a sync icon. When a file is synchronized (copied after a save) a short-lived message like `Synced myfile.ts` is displayed next to the icon for a few seconds and then reverts to the base label. Clicking the item opens the foldersync view.

### Initial Sync (Newest Wins)

If you start tracking folders that already contain divergent versions of the same files, you might want a deterministic first reconciliation. Use the command palette and run:

`foldersync: Initial Sync (Newest Wins)`

Behavior per logical pair (fileA, fileB):

- Only one exists and the counterpart's directory already exists: it is copied to create the missing counterpart.
- Only one exists and the counterpart's parent directory is missing: skipped (no directories are auto-created).
- Both exist with different modified times: the newer (by mtime) overwrites the older.
- Both exist with (roughly) identical mtimes (difference < ~5ms): skipped to avoid unnecessary churn.
- Copy operations ensure destination directories exist.

This command does not delete anything nor attempts merge/conflict resolution; it simply enforces "newest timestamp wins" and skips operations that would require creating missing directories.

### How It Works (Internals)

1. On activation or refresh, each configured folder pair is recursively scanned; relative file paths are unioned.
2. A bidirectional mapping (A→B and B→A) is stored for every discovered or potential file path (even if only present on one side yet).
3. On save the extension hashes both files (if counterpart exists) and copies only if different.
4. Delete & rename events use VS Code’s file system events and apply the operation to the counterpart inside a guarded internal operation (to avoid loops), then rebuild mappings.
5. The tree view shows groups: `from Workspace` and `from config files` (with per-config-file containers).

### Overwrite Semantics

- Save: Source overwrites destination if hashes differ.
- Rename: Counterpart is renamed; existing file with same name is replaced.
- Delete: Counterpart removed if it exists (no trash usage currently).

### Folder Validation Behavior (Changed)

Previously, if one side of a configured folder pair did not exist yet, the extension would silently create folders on first sync (when saving a file) and proceed. This could hide typos in configuration (e.g. a misspelled destination path). Now, if either folder in a pair does not exist at activation/refresh time, that pair is marked as invalid:

- It appears in the tree with an error state.
- An error message is shown summarizing how many pairs are invalid.
- No files will be synchronized for that pair until both folders exist.

Create (or correct) the missing directory and run the command `foldersync.refreshView` to re-validate.

### Limitations

- No ignore patterns yet (e.g., to skip `node_modules`, binaries, etc.).
- No conflict detection / merging.
- No partial sync filters (all files are considered).
- Potential performance impact on very large trees.

## Contributing

If you find any issues or have suggestions for improvements, please feel free to open an issue or submit a pull request on the [GitHub repository](https://github.com/fedeholc/foldersync).

## License

This extension is licensed under the [MIT License](LICENSE).
