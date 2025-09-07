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
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = __importStar(require("vscode"));
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
const APP_NAME = 'filesync';
const SETTINGS_NAMES = {
    globalEnabled: 'globalEnabled',
    filesToSync: 'filesToSync'
};
const DEFAULT_CONFIG_FILE_NAME = 'filesync.config.json';
function activate(context) {
    // Use an OutputChannel for non-intrusive logging
    const output = vscode.window.createOutputChannel(APP_NAME);
    output.appendLine('filesync extension activated');
    context.subscriptions.push(output);
    // Run startup tasks immediately when extension activates
    runStartupTasks(output);
    // Register the command as before
    const disposable = vscode.commands.registerCommand('filesync.helloWorld', async () => {
        vscode.window.showInformationMessage('Hello World from filesync!');
        //runStartupTasks(output);
    });
    context.subscriptions.push(disposable);
}
// This method is called when your extension is deactivated
function deactivate() { }
async function runStartupTasks(output) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const filesToSyncFromWorkspace = vscode.workspace.getConfiguration(APP_NAME).get(SETTINGS_NAMES.filesToSync) || [];
    output.appendLine(`Workspace Configuration filesToSync: ${JSON.stringify(filesToSyncFromWorkspace)}`);
    filesToSyncFromWorkspace?.forEach((file) => {
        output.appendLine(`Syncing file: ${file[0]} with ${file[1]}`);
    });
    const configFileName = DEFAULT_CONFIG_FILE_NAME;
    if (workspaceFolders && workspaceFolders.length > 0) {
        output.appendLine(`Workspace folders: ${JSON.stringify(workspaceFolders)}`);
        let filesToSyncFromConfigFiles = [];
        for (const folder of workspaceFolders) {
            const folderUri = folder.uri;
            const fileUri = vscode.Uri.joinPath(folderUri, configFileName);
            try {
                const data = await vscode.workspace.fs.readFile(fileUri);
                const json = JSON.parse(data.toString());
                output.appendLine(`Read from ${configFileName} in folder ${folder.name}: ${JSON.stringify(json)}`);
                if (Array.isArray(json.filesToSync)) {
                    filesToSyncFromConfigFiles.push(...json.filesToSync);
                }
            }
            catch (err) {
                output.appendLine(`Error reading ${configFileName} in folder ${folder.name}: ${err}`);
            }
        }
        ;
        output.appendLine(`Final accumulated filesToSync from config files: ${JSON.stringify(filesToSyncFromConfigFiles)}`);
        const allFilesToSync = [...filesToSyncFromWorkspace, ...filesToSyncFromConfigFiles];
        output.appendLine(`All files to sync: ${JSON.stringify(allFilesToSync)}`);
        // Additionally, read from the
        /* 	const folderUri = workspaceFolders[0].uri;
            const fileUri = vscode.Uri.joinPath(folderUri, configFileName);
            vscode.workspace.fs.readFile(fileUri).then((data) => {
                const json = JSON.parse(data.toString());
                output.appendLine(`Read from ${configFileName}: ${JSON.stringify(json)}`);
            }, (err) => {
                output.appendLine(`Error reading ${configFileName}: ${err}`);
            }); */
    }
    else {
        output.appendLine('No workspace folder open');
    }
}
//# sourceMappingURL=extension.js.map