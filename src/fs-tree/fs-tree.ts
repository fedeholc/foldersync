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
    // Provide a stable id so VS Code can properly diff and update labels after configuration changes.
    // If names change (e.g. folder pair renamed) we want VS Code to treat it as a different element.
    // Using type + name is sufficient given the current data model (names are unique per level in our tree construction).
    // Prefer an explicit id on the model if present (helps avoid collisions when same name appears under different parents)
    this.id = item.id ? item.id : `${item.type}:${item.name}`;
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
  private _version = 0; // bump to help VS Code identify change cycles

  constructor(initialTree: FsTreeElement[] = []) {
    this.setTree(initialTree);
  }

  setTree(tree: FsTreeElement[]) {
    // Always clone to ensure reference changes (avoids shallow equality optimizations in VS Code)
    this._myTree = [...tree];
    this._version++;
    this.refresh();
  }

  refresh(element?: FsTreeItem): void {
    // Passing undefined explicitly signals a full refresh; VS Code will re-query getChildren
    this._onDidChangeTreeData.fire(element);
  }

  getChildren(element?: FsTreeItem): Thenable<FsTreeItem[]> {
    if (!element) {
      // Root elements (folders)
      return Promise.resolve(this._myTree.map((d) => new FsTreeItem(d)));
    }
    if (element.item.children) {
      if (element.item.type === "container" || element.item.type === "folder-error" || element.item.type === "folder") {
        // Children of the folder
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
    // Files have no children
    return Promise.resolve([]);
  }

  // Optional getParent implementation (not strictly needed but can help with granular refresh logic later)
  getParent?(element: FsTreeItem): vscode.ProviderResult<FsTreeItem> {
    // Our data model currently does not track parent references; implement if needed later.
    return null;
  }
}
