```ts
// Define el tipo de datos
type FileOrFolder = {
  name: string;
  type: "folder" | "file";
  children?: FileOrFolder[];
};

// Ejemplo de datos
const data: FileOrFolder[] = [
  {
    name: "Carpeta1",
    type: "folder",
    children: [
      { name: "archivo1.txt", type: "file" },
      { name: "archivo2.txt", type: "file" },
    ],
  },
  {
    name: "Carpeta2",
    type: "folder",
    children: [{ name: "archivo3.txt", type: "file" }],
  },
];

// TreeItem personalizado
class MyTreeItem extends vscode.TreeItem {
  constructor(public readonly item: FileOrFolder) {
    super(
      item.name,
      item.type === "folder"
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );
    this.contextValue = item.type;
  }
}

// TreeDataProvider
class MyTreeProvider implements vscode.TreeDataProvider<MyTreeItem> {
  getTreeItem(element: MyTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: MyTreeItem): Thenable<MyTreeItem[]> {
    if (!element) {
      // Elementos raíz (folders)
      return Promise.resolve(data.map((d) => new MyTreeItem(d)));
    }
    if (element.item.type === "folder" && element.item.children) {
      // Hijos de la carpeta
      return Promise.resolve(
        element.item.children.map((child) => new MyTreeItem(child))
      );
    }
    // Los archivos no tienen hijos
    return Promise.resolve([]);
  }
}
```
