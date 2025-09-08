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
let allFilesToSync = [];
async function activate(context) {
    // Use an OutputChannel for non-intrusive logging
    const output = vscode.window.createOutputChannel(types_1.APP_NAME);
    output.appendLine('filesync extension activated');
    context.subscriptions.push(output);
    // Run startup tasks immediately when extension activates
    await runStartupTasks(output);
    // Listen for file save events
    const saveListener = vscode.workspace.onDidSaveTextDocument((document) => (0, helpers_1.handleOnDidSaveTextDocument)(document, output, allFilesToSync));
    context.subscriptions.push(saveListener);
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
    allFilesToSync = await (0, helpers_1.getFilesToSyncFromWorkspaceSettings)() || [];
    const filesFromConfig = await (0, helpers_1.getFilesToSyncFromConfigFiles)(output);
    if (filesFromConfig) {
        allFilesToSync.push(...filesFromConfig);
    }
}
//# sourceMappingURL=extension.js.map