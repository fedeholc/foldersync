# FolderSync

FolderSync is a Visual Studio Code extension that synchronizes files between folders. It's designed to help you keep the content of two folders in sync, which is useful when you need to share files between two repos, but don't want to use submodules or symlinks or publish a package.

## Features

- **Folder Synchronization**: Synchronize the content of two folders. The first synchronization is unidirectional, from source to destination, then it is bidirectional based on the last modification time of the files.
- **Automatic Synchronization**: Automatically synchronizes files when you save them or when you create new files.
- **Flexible Configuration**: Configure the folders to sync through the VS Code workspace settings or using a `foldersync.config.json` configuration file.
- **Tree View**: A dedicated view in the activity bar to visualize the synchronized folders and files.
- **Commands**:
  - `foldersync.refreshView`: Manually refresh the synchronized folders view.
  - `foldersync.openView`: Open the FolderSync view.

## Warnings

The first time you synchronize two folders, all files from the source folder will be copied to the destination folder without any confirmation. If there are files in the destination folder with the same name, they will be overwritten. If there are files in the destination folder that do not exist in the source folder, they will be copied to the source folder.

Please ensure that you have backups of any important data before using this extension. Use git so you can revert any unwanted changes.

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

1.  Install the FolderSync extension.
2.  Configure the folders you want to synchronize using either the workspace settings or a `sync.json` file as described above.
3.  Open the FolderSync view from the activity bar to see the synchronized folders.
4.  When you create, modify, or delete a file in one of the synchronized folders, the changes will be automatically reflected in the other folder.

## Contributing

If you find any issues or have suggestions for improvements, please feel free to open an issue or submit a pull request on the [GitHub repository](https://github.com/fedeholc/foldersync).

## License

This extension is licensed under the [MIT License](LICENSE).
