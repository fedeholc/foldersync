import * as vscode from 'vscode';
import { FsTreeElement } from '../types/types';

/**
 * Represents an item in the file synchronization tree view.
 * It extends the TreeItem class from VSCode and includes additional properties 
 * specific to the synchronization context.
 * Each item can represent a folder, a file pair, or a container.
 * The item type determines its icon and behavior in the tree view. 
 */
class FsTreeItem extends vscode.TreeItem {
  constructor(public readonly item: FsTreeElement) {
    super(
      item.name,
      item.type === "folder" || item.type === "folder-error"
        ? vscode.TreeItemCollapsibleState.Collapsed
        : item.type === "container" ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None
    );
    this.contextValue = item.type;
    // set a ThemeIcon depending on the element type so items show icons in the tree
    if (item.type === 'container') {
      this.iconPath = new vscode.ThemeIcon('gear');
    } else if (item.type === 'folder') {
      this.iconPath = new vscode.ThemeIcon('folder');
    } else if (item.type === 'folder-error') {
      this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'));
    } else {
      this.iconPath = new vscode.ThemeIcon('file');
    }
  }
}

/**
 * Provides data for the file synchronization tree view in the VSCode sidebar.
 * It implements the TreeDataProvider interface to supply tree items and their
 * hierarchical structure. The tree displays folders and file pairs that are
 * configured for synchronization.
 * The tree supports dynamic updates and refreshes when the underlying data
 * changes.
 */
export class FsTreeProvider implements vscode.TreeDataProvider<FsTreeItem> {
  getTreeItem(element: FsTreeItem): vscode.TreeItem {
    return element;
  }

  private _onDidChangeTreeData: vscode.EventEmitter<FsTreeItem | undefined | void> = new vscode.EventEmitter<FsTreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<FsTreeItem | undefined | void> = this._onDidChangeTreeData.event;


  private _myTree: FsTreeElement[] = [];

  constructor(initialTree: FsTreeElement[] = []) {
    this.setTree(initialTree);
  }

  setTree(tree: FsTreeElement[]) {
    this._myTree = tree;
    this.refresh();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getChildren(element?: FsTreeItem): Thenable<FsTreeItem[]> {
    if (!element) {
      // Elementos raíz (folders)
      return Promise.resolve(this._myTree.map((d) => new FsTreeItem(d)));
    }
    if (element.item.children) {
      if (element.item.type === "container" || element.item.type === "folder-error" || element.item.type === "folder") {
        // Hijos de la carpeta
        return Promise.resolve(
          element.item.children.map((child) => new FsTreeItem(child))
        );
      }
    } else {
      if (element.item.type === "container" || element.item.type === "folder-error" || element.item.type === "folder") {
        // show a child item indicating no children
        return Promise.resolve([
          new FsTreeItem({ name: "(empty)", type: "pair" })
        ]);

      }
    }
    // Los archivos no tienen hijos
    return Promise.resolve([]);
  }
}
