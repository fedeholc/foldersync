import * as vscode from 'vscode';

export type SyncPair = { a: string; b: string };

export class SyncTreeItem extends vscode.TreeItem {
  constructor(public readonly pair: SyncPair) {
    super(pair.a, vscode.TreeItemCollapsibleState.None);
    this.description = pair.b;
    this.contextValue = 'syncPair';
    this.resourceUri = vscode.Uri.file(pair.a);
    this.iconPath = new vscode.ThemeIcon('file-symlink-file');
  }
}

export class SyncTreeProvider implements vscode.TreeDataProvider<SyncTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<SyncTreeItem | undefined | void> = new vscode.EventEmitter<SyncTreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<SyncTreeItem | undefined | void> = this._onDidChangeTreeData.event;

  private _pairs: SyncPair[] = [];

  constructor(initialPairs: [string, string][] = []) {
    this.setPairs(initialPairs);
  }

  setPairs(pairs: [string, string][]) {
    this._pairs = pairs.map(([a, b]) => ({ a, b }));
    this.refresh();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: SyncTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: SyncTreeItem): Thenable<SyncTreeItem[]> {
    if (element) {
      return Promise.resolve([]);
    }
    return Promise.resolve(this._pairs.map((p) => new SyncTreeItem(p)));
  }
}
