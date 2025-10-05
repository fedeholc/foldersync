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
const helpers_1 = require("./helpers");
const syncTree_1 = require("./syncTree");
const types_1 = require("./types");
exports.allFilesToSync = new Map();
exports.fsTree = [];
exports.fsTreeProvider = null;
exports.output = vscode.window.createOutputChannel(types_1.APP_NAME);
async function activate(context) {
    exports.output.appendLine('foldersync extension activated');
    context.subscriptions.push(exports.output);
    // Run startup tasks immediately when extension activates
    await runStartupTasks(exports.output);
    // Register tree view provider and create a TreeView so we can react to visibility changes
    exports.fsTreeProvider = new syncTree_1.FsTreeProvider(exports.fsTree);
    const treeView = vscode.window.createTreeView('foldersync.syncView', { treeDataProvider: exports.fsTreeProvider });
    context.subscriptions.push(treeView);
    // Register command to refresh the tree view
    context.subscriptions.push(vscode.commands.registerCommand('foldersync.refreshView', async () => {
        await runStartupTasks(exports.output);
        exports.fsTreeProvider?.refresh();
    }));
    // Register command to open the foldersync tree view
    context.subscriptions.push(vscode.commands.registerCommand('foldersync.openView', () => {
        // Open the view container registered in package.json (id: foldersync_container)
        vscode.commands.executeCommand('workbench.view.extension.foldersync_container');
    }));
    // Listen for file save events
    const saveListener = vscode.workspace.onDidSaveTextDocument((document) => (0, helpers_1.handleOnDidSaveTextDocument)(document, exports.allFilesToSync));
    context.subscriptions.push(saveListener);
    // Listen for new file creation events
    const saveNewFileListener = vscode.workspace.onDidCreateFiles(helpers_1.handleDidCreateFiles);
    context.subscriptions.push(saveNewFileListener);
    // Update tree provider after startup tasks resolved
    exports.fsTreeProvider?.setTree(exports.fsTree);
}
// This method is called when your extension is deactivated
function deactivate() { }
async function runStartupTasks(output) {
    output.appendLine('Running startup tasks...');
    const { allFilesToSync: filesFromWorkspace, fsTree: workspaceFsTree } = await (0, helpers_1.getFilesToSyncFromWorkspaceSettings)(output);
    if (workspaceFsTree) {
        exports.fsTree.push(workspaceFsTree);
    }
    const { allFilesToSync: filesFromConfig, fsTree: configFsTree } = await (0, helpers_1.getFilesToSyncFromConfigFiles)(output);
    if (configFsTree) {
        exports.fsTree.push(configFsTree);
    }
    exports.allFilesToSync = new Map([...filesFromWorkspace, ...filesFromConfig]);
    output.appendLine(`Total files to sync: ${exports.allFilesToSync.size}`);
    exports.fsTreeProvider?.setTree(exports.fsTree);
}
//# sourceMappingURL=extension.js.map