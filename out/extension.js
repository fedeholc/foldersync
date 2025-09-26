"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const types_1 = require("./types");
const helpers_1 = require("./helpers");
const panel_1 = require("./panel");
const syncTree_1 = require("./syncTree");
let allFilesToSync = [];
let syncTreeProvider = null;
async function activate(context) {
    // Use an OutputChannel for non-intrusive logging
    const output = vscode.window.createOutputChannel(types_1.APP_NAME);
    output.appendLine('filesync extension activated');
    context.subscriptions.push(output);
    // Run startup tasks immediately when extension activates
    await runStartupTasks(output);
    // Register tree view provider and create a TreeView so we can react to visibility changes
    syncTreeProvider = new syncTree_1.SyncTreeProvider(allFilesToSync);
    const treeView = vscode.window.createTreeView('filesync.syncView', { treeDataProvider: syncTreeProvider });
    context.subscriptions.push(treeView);
    // Register command to refresh the tree view
    context.subscriptions.push(vscode.commands.registerCommand('filesync.refreshView', () => syncTreeProvider?.refresh()));
    // Register command to reveal the tree view
    context.subscriptions.push(vscode.commands.registerCommand('filesync.revealView', async () => {
        await vscode.commands.executeCommand('workbench.view.explorer');
        // optionally focus selection
    }));
    // When the tree view becomes visible (user clicks the Activity Bar icon), open the webview panel as well
    const visibilityDisposable = treeView.onDidChangeVisibility((e) => {
        if (e.visible) {
            const syncPanel = panel_1.SyncPanel.createOrShow(context);
            syncPanel.update(allFilesToSync);
        }
    });
    context.subscriptions.push(visibilityDisposable);
    // Listen for file save events and update panel when appropriate
    const saveListener = vscode.workspace.onDidSaveTextDocument(async (document) => {
        await (0, helpers_1.handleOnDidSaveTextDocument)(document, output, allFilesToSync);
        if (panel_1.SyncPanel.currentPanel) {
            panel_1.SyncPanel.currentPanel.update(allFilesToSync);
        }
        // Update tree provider when files change
        syncTreeProvider?.setPairs(allFilesToSync);
    });
    context.subscriptions.push(saveListener);
    // Register existing helloWorld command
    const disposable = vscode.commands.registerCommand('filesync.helloWorld', async () => {
        vscode.window.showInformationMessage('Hello World from filesync!');
    });
    context.subscriptions.push(disposable);
    // Register command to show the sync panel
    const panelDisposable = vscode.commands.registerCommand('filesync.showSyncPanel', async () => {
        const syncPanel = panel_1.SyncPanel.createOrShow(context);
        syncPanel.update(allFilesToSync);
    });
    context.subscriptions.push(panelDisposable);
    // If the panel is open, update it with current data
    if (panel_1.SyncPanel.currentPanel) {
        panel_1.SyncPanel.currentPanel.update(allFilesToSync);
    }
    // Update tree provider after startup tasks resolved
    syncTreeProvider?.setPairs(allFilesToSync);
}
// This method is called when your extension is deactivated
function deactivate() { }
async function runStartupTasks(output) {
    output.appendLine('Running startup tasks...');
    allFilesToSync = await (0, helpers_1.getFilesToSyncFromWorkspaceSettings)() || [];
    const filesFromConfig = await (0, helpers_1.getFilesToSyncFromConfigFiles)(output);
    if (filesFromConfig) {
        allFilesToSync.push(...filesFromConfig);
    }
}
//# sourceMappingURL=extension.js.map