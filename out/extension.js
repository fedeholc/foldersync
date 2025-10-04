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
exports.output = exports.fsTreeProvider = exports.fsTree = exports.allFilesToSync = void 0;
exports.activate = activate;
exports.deactivate = deactivate;
exports.runStartupTasks = runStartupTasks;
const vscode = __importStar(require("vscode"));
const types_1 = require("./types");
const helpers_1 = require("./helpers");
const panel_1 = require("./panel");
const syncTree_1 = require("./syncTree");
exports.allFilesToSync = [];
exports.fsTree = [];
exports.fsTreeProvider = null;
exports.output = vscode.window.createOutputChannel(types_1.APP_NAME);
async function activate(context) {
    exports.output.appendLine('filesync extension activated');
    context.subscriptions.push(exports.output);
    // Run startup tasks immediately when extension activates
    await runStartupTasks(exports.output);
    // Register tree view provider and create a TreeView so we can react to visibility changes
    exports.fsTreeProvider = new syncTree_1.FsTreeProvider(exports.fsTree);
    const treeView = vscode.window.createTreeView('filesync.syncView', { treeDataProvider: exports.fsTreeProvider });
    context.subscriptions.push(treeView);
    // Register command to refresh the tree view
    context.subscriptions.push(vscode.commands.registerCommand('filesync.refreshView', () => exports.fsTreeProvider?.refresh()));
    // Register command to reveal the tree view
    context.subscriptions.push(vscode.commands.registerCommand('filesync.revealView', async () => {
        await vscode.commands.executeCommand('workbench.view.explorer');
    }));
    // When the tree view becomes visible (user clicks the Activity Bar icon), open the webview panel as well
    const visibilityDisposable = treeView.onDidChangeVisibility((e) => {
        if (e.visible) {
            const syncPanel = panel_1.SyncPanel.createOrShow(context);
            syncPanel.update(exports.allFilesToSync, exports.fsTree);
        }
    });
    context.subscriptions.push(visibilityDisposable);
    // Listen for file save events
    const saveListener = vscode.workspace.onDidSaveTextDocument(async (document) => {
        // main logic to handle file save
        await (0, helpers_1.handleOnDidSaveTextDocument)(document, exports.output, exports.allFilesToSync);
        // Update the panel if it's open
        if (panel_1.SyncPanel.currentPanel) {
            panel_1.SyncPanel.currentPanel.update(exports.allFilesToSync, exports.fsTree);
        }
        // Update tree provider
        exports.fsTreeProvider?.setTree(exports.fsTree);
    });
    context.subscriptions.push(saveListener);
    // Listen for new file creation events
    const saveNewFileListener = vscode.workspace.onDidCreateFiles(helpers_1.handleDidCreateFiles);
    context.subscriptions.push(saveNewFileListener);
    // Register command to show the sync panel
    const panelDisposable = vscode.commands.registerCommand('filesync.showSyncPanel', async () => {
        const syncPanel = panel_1.SyncPanel.createOrShow(context);
        syncPanel.update(exports.allFilesToSync, exports.fsTree);
    });
    context.subscriptions.push(panelDisposable);
    // If the panel is open, update it with current data
    if (panel_1.SyncPanel.currentPanel) {
        panel_1.SyncPanel.currentPanel.update(exports.allFilesToSync, exports.fsTree);
    }
    // Update tree provider after startup tasks resolved
    exports.fsTreeProvider?.setTree(exports.fsTree);
    exports.output.appendLine(`\n\n\n\nfsTree	post task: ${JSON.stringify(exports.fsTree)}`);
}
// This method is called when your extension is deactivated
function deactivate() { }
async function runStartupTasks(output) {
    output.appendLine('Running startup tasks...');
    ({ allFilesToSync: exports.allFilesToSync, fsTree: exports.fsTree } = await (0, helpers_1.getFilesToSyncFromWorkspaceSettings)(output));
    output.appendLine(`fstree to sync from workspace settings: ${JSON.stringify(exports.fsTree)}`);
    //VER aún no estoy trayendo el configFsTree de getFilesToSyncFromConfigFiles
    // estoy armando el fstree a continuación, pero en algún momento voy a tener que hacerlo dentro para poder dividir por config files también
    const { allFilesToSync: filesFromConfig, fsTree: configFsTree } = await (0, helpers_1.getFilesToSyncFromConfigFiles)(output);
    output.appendLine(`fstree to sync from config files: ${JSON.stringify(configFsTree)}`);
    if (filesFromConfig) {
        exports.allFilesToSync.push(...filesFromConfig);
    }
    if (configFsTree) {
        exports.fsTree.push(configFsTree);
    }
    output.appendLine(`\n\nfstree fstree final: ${JSON.stringify(exports.fsTree)}`);
}
//# sourceMappingURL=extension.js.map