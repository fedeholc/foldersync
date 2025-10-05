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
exports.output = exports.CONFIG_FOLDER_PAIRS_NAME = exports.fsTreeProvider = exports.allFilesToSync = exports.fsTree = void 0;
exports.activate = activate;
exports.deactivate = deactivate;
exports.runStartupTasks = runStartupTasks;
const vscode = __importStar(require("vscode"));
const helpers_1 = require("./helpers/helpers");
const fs_tree_1 = require("./fs-tree/fs-tree");
const types_1 = require("./types/types");
const handle_save_doc_1 = require("./event-handlers/handle-save-doc");
const handle_create_file_1 = require("./event-handlers/handle-create-file");
const handle_delete_file_1 = require("./event-handlers/handle-delete-file");
const handle_rename_file_1 = require("./event-handlers/handle-rename-file");
const initial_sync_1 = require("./event-handlers/initial-sync");
exports.fsTree = [];
exports.allFilesToSync = new Map();
exports.fsTreeProvider = new fs_tree_1.FsTreeProvider(exports.fsTree);
exports.CONFIG_FOLDER_PAIRS_NAME = "folderPairs";
exports.output = vscode.window.createOutputChannel(types_1.APP_NAME);
async function activate(context) {
    exports.output.appendLine('foldersync extension activated');
    context.subscriptions.push(exports.output);
    // Run startup tasks immediately when extension activates
    await runStartupTasks();
    // Register tree view provider and create a TreeView so we can react to visibility changes
    const treeView = vscode.window.createTreeView('foldersync.syncView', { treeDataProvider: exports.fsTreeProvider });
    context.subscriptions.push(treeView);
    // Register command to refresh the tree view
    context.subscriptions.push(vscode.commands.registerCommand('foldersync.refreshView', async () => {
        await runStartupTasks();
        exports.fsTreeProvider?.refresh();
    }));
    // Register command to open the foldersync tree view
    context.subscriptions.push(vscode.commands.registerCommand('foldersync.openView', () => {
        // Open the view container registered in package.json (id: foldersync_container)
        vscode.commands.executeCommand('workbench.view.extension.foldersync_container');
    }));
    // Register initial sync command (newest file wins per pair)
    context.subscriptions.push(vscode.commands.registerCommand('foldersync.initialSyncLatest', async () => {
        exports.output.appendLine('Executing initial sync (newest wins)...');
        await (0, initial_sync_1.initialSyncLatest)(exports.allFilesToSync);
    }));
    // Listen for file save events
    const saveListener = vscode.workspace.onDidSaveTextDocument((document) => (0, handle_save_doc_1.handleOnDidSaveTextDocument)(document, exports.allFilesToSync));
    context.subscriptions.push(saveListener);
    // Listen for new file creation events
    const saveNewFileListener = vscode.workspace.onDidCreateFiles(handle_create_file_1.handleDidCreateFiles);
    context.subscriptions.push(saveNewFileListener);
    // Listen for deletions
    const deleteListener = vscode.workspace.onDidDeleteFiles((e) => (0, handle_delete_file_1.handleDidDeleteFiles)(e, exports.allFilesToSync));
    context.subscriptions.push(deleteListener);
    // Listen for renames
    const renameListener = vscode.workspace.onDidRenameFiles((e) => (0, handle_rename_file_1.handleDidRenameFiles)(e, exports.allFilesToSync));
    context.subscriptions.push(renameListener);
    // Update tree provider after startup tasks resolved
    exports.fsTreeProvider?.setTree(exports.fsTree);
}
// This method is called when the extension is deactivated
function deactivate() { }
/**
 * Runs the startup tasks to initialize the file synchronization settings.
 * It reads the workspace and configuration files to determine which files
 * and folders need to be synchronized. It updates the global allFilesToSync
 * map and the fsTree structure used by the tree view provider.
 * If any errors occur during the process, they are logged to the output
 * channel.
 * @returns {Promise<void>}
 */
async function runStartupTasks() {
    exports.output.appendLine('Running startup tasks...');
    const { filesMap: filesFromWorkspace, fsTree: workspaceFsTree } = await (0, helpers_1.getFilesToSyncFromWorkspace)();
    exports.fsTree = [];
    if (workspaceFsTree) {
        exports.fsTree.push(workspaceFsTree);
    }
    const { filesMap: filesFromConfig, fsTree: configFsTree } = await (0, helpers_1.getFilesToSyncFromConfigFiles)();
    if (configFsTree) {
        exports.fsTree.push(configFsTree);
    }
    exports.allFilesToSync = new Map([...filesFromWorkspace, ...filesFromConfig]);
    exports.output.appendLine(`Total files to sync: ${exports.allFilesToSync.size}`);
    exports.fsTreeProvider?.setTree(exports.fsTree);
}
//# sourceMappingURL=extension.js.map