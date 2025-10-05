# folder-sync README

This is the `folder-sync` extension for Visual Studio Code. It allows you to synchronize files between different folders based on your configuration.

## Features

## Extension Settings

Un archivo `foldersync.config.json` que tenga esta forma:

```json
{
  "foldersync": [
    ["./back/types", "./front/types"],
    ["./a", "./b"]
  ]
}
```

O en el workspace (`.code-workspace`), dentro de su sección settings :

```json
	"settings": {
    "foldersync.folderPairs": [
      ["./back/types", "./front/types"],
      ["./a", "./b"]
    ]
  },
```

o también se puede escribir así:

```json
  "settings": {
    "foldersync": {
      "globalEnabled": true,
      "folderPairs": [
        ["./back/types", "./front/types"],
        ["./a", "./b"]
      ]
    },
  }
```

## Release Notes

### 0.0.1

Initial release of `folder-sync` extension.

For more information, please refer to the [CHANGELOG.md](CHANGELOG.md) file.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
