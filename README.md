# Testing Extension

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
