# Testing Extension

Un archivo `filesync.config.json` que tenga esta forma:

```json
{
  "filesToSync": [
    ["./a/f.txt", "./b/f.txt"],
    ["./a/g.txt", "./b/g.txt"]
  ]
}
```

O en el workspace (`.code-workspace`), dentro de su sección settings :

```json
	"settings": { "filesync.filesToSync": [
    ["./a/f.txt", "./b/f.txt"],
    ["./a/g.txt", "./b/g.txt"]
  ] },
```
