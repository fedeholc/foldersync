import * as vscode from 'vscode';

export class SyncPanel {
  public static currentPanel: SyncPanel | undefined;

  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel) {
    this._panel = panel;

    // Handle panel being disposed
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Set initial HTML
    this._panel.webview.html = this._getHtmlForWebview([]);
  }

  public static createOrShow(context: vscode.ExtensionContext) {
    const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

    // If we already have a panel, reveal it
    if (SyncPanel.currentPanel) {
      SyncPanel.currentPanel._panel.reveal(column);
      return SyncPanel.currentPanel;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel('filesyncSyncPanel', 'File Sync', column || vscode.ViewColumn.One, {
      enableScripts: true,
      retainContextWhenHidden: true,
    });

    SyncPanel.currentPanel = new SyncPanel(panel);
    return SyncPanel.currentPanel;
  }

  public update(files: [string, string][]) {
    this._panel.webview.html = this._getHtmlForWebview(files);
  }

  public dispose() {
    SyncPanel.currentPanel = undefined;

    // Clean up our resources
    this._panel.dispose();

    while (this._disposables.length) {
      const d = this._disposables.pop();
      if (d) { d.dispose(); }
    }
  }

  private _getHtmlForWebview(files: [string, string][]) {
    const items = files.map(([a, b]) => `
      <li>
        <strong>A:</strong> <code>${this._escapeHtml(a)}</code><br/>
        <strong>B:</strong> <code>${this._escapeHtml(b)}</code>
      </li>
    `).join('\n');

    const content = files.length ? `<ul>${items}</ul>` : '<p>No files configured to sync.</p>';

    return `<!doctype html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>File Sync</title>
      <style>
        body { font-family: system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial; padding: 12px; }
        code { background:#f3f3f3; color: black; padding:2px 4px; border-radius:3px; }
        li { margin-bottom: 12px; }
      </style>
    </head>
    <body>
      <h2>Files configured to sync</h2>
      ${content}
    </body>
    </html>`;
  }

  private _escapeHtml(str: string) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
