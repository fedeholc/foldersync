import * as vscode from 'vscode';
import { fsTree, fsTreeElement } from './extension';

export type SyncPair = { a: string; b: string };



class FsTreeItem extends vscode.TreeItem {
  constructor(public readonly item: fsTreeElement) {
    super(
      item.name,
      item.type === "container"
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );
    this.contextValue = item.type;
  }
}


export class FsTreeProvider implements vscode.TreeDataProvider<FsTreeItem> {
  getTreeItem(element: FsTreeItem): vscode.TreeItem {
    return element;
  }

  private _onDidChangeTreeData: vscode.EventEmitter<FsTreeItem | undefined | void> = new vscode.EventEmitter<FsTreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<FsTreeItem | undefined | void> = this._onDidChangeTreeData.event;


  private _myTree: fsTreeElement[] = [];

  constructor(initialTree: fsTreeElement[] = []) {
    this.setTree(initialTree);
  }

  setTree(tree: fsTreeElement[]) {
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
    if (element.item.type === "container" && element.item.children) {
      // Hijos de la carpeta
      return Promise.resolve(
        element.item.children.map((child) => new FsTreeItem(child))
      );
    }
    // Los archivos no tienen hijos
    return Promise.resolve([]);
  }
}
